import { Plugin } from "../types/index.js";
import { pluginManager } from "../core/pluginManager.js";
import { db } from "../utils/database.js";
import { fmt } from "../utils/context.js";
import { logger } from "../utils/logger.js";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import axios from "axios";

const pluginPlugin: Plugin = {
  name: "plugin",
  version: "1.0.0",
  description: "插件管理器",
  author: "NexBot",

  commands: {
    plugin: {
      description: "插件管理",
      sudo: true,
      aliases: ["pm", "plugins"],
      examples: ["plugin list", "plugin install <name>", "plugin remove <name>"],
      handler: async (msg, args, ctx) => {
        const subCmd = args[0]?.toLowerCase();
        
        switch (subCmd) {
          case "list":
          case "ls": {
            const prefix = process.env.CMD_PREFIX || ".";
            
            // 从 GitHub 远程获取插件列表
            let remotePlugins: { name: string; description: string }[] = [];
            try {
              const repoUrl = "https://api.github.com/repos/Tumblr-code/my-telegram-bot/contents/plugins";
              const response = await axios.get(repoUrl, { timeout: 10000 });
              const files = response.data.filter((f: any) => f.name.endsWith(".ts"));
              
              for (const file of files) {
                const name = file.name.replace(".ts", "");
                // 获取插件描述（从文件内容中提取）
                try {
                  const rawUrl = file.download_url;
                  const contentResponse = await axios.get(rawUrl, { timeout: 5000 });
                  const content = contentResponse.data;
                  // 提取 description
                  const descMatch = content.match(/description\s*[:=]\s*["']([^"']+)["']/);
                  const description = descMatch ? descMatch[1] : "暂无描述";
                  remotePlugins.push({ name, description });
                } catch {
                  remotePlugins.push({ name, description: "暂无描述" });
                }
              }
            } catch (err) {
              logger.error("获取远程插件列表失败:", err);
              // 如果远程获取失败，使用本地列表
              const pluginsDir = join(process.cwd(), "plugins");
              if (existsSync(pluginsDir)) {
                const files = readdirSync(pluginsDir).filter(f => f.endsWith(".ts"));
                remotePlugins = files.map(f => ({ name: f.replace(".ts", ""), description: "本地插件" }));
              }
            }
            
            // 获取已启用的插件
            const enabledPlugins = db.getAllPluginsFromDB().filter(p => p.enabled);
            const enabledNames = new Set(enabledPlugins.map(p => p.name));
            
            let text = fmt.bold("📦 插件列表") + "\n";
            text += fmt.italic("数据来源: GitHub 远程仓库") + "\n\n";
            
            // 已启用的插件
            if (enabledPlugins.length > 0) {
              text += fmt.bold("✅ 已启用") + "\n";
              for (const plugin of enabledPlugins) {
                text += `  ${fmt.code(plugin.name)}\n`;
              }
              text += "\n";
            }
            
            // 可用插件列表（使用 blockquote 折叠显示）
            if (remotePlugins.length > 0) {
              text += fmt.bold("📥 可用插件（点击安装）") + "\n";
              
              // 构建插件列表文本（用于 blockquote）
              let pluginListText = "";
              for (const plugin of remotePlugins) {
                const status = enabledNames.has(plugin.name) ? "✅ " : "  ";
                const shortDesc = plugin.description.length > 25 
                  ? plugin.description.slice(0, 25) + "..." 
                  : plugin.description;
                pluginListText += `${status}${plugin.name.padEnd(15)} - ${shortDesc}\n`;
              }
              
              // 使用 blockquote 折叠显示
              text += `<blockquote expandable>${pluginListText}</blockquote>\n`;
            }
            
            text += `\n总计: ${enabledPlugins.length} 已启用 / ${remotePlugins.length} 可用\n`;
            text += `使用 ${fmt.code(`${prefix}plugin install <名称>`)} 安装插件`;
            
            await ctx.replyHTML(text);
            break;
          }

          case "reload":
          case "r": {
            const name = args[1];
            if (!name) {
              await ctx.reply("❓ 请指定插件名称");
              return;
            }
            
            const success = await pluginManager.reloadPlugin(name);
            if (success) {
              await ctx.reply(`✅ 插件 ${name} 已重载`);
            } else {
              await ctx.reply(`❌ 插件 ${name} 重载失败`);
            }
            break;
          }

          case "reloadall":
          case "ra": {
            await pluginManager.reloadAll();
            await ctx.reply("✅ 所有插件已重载");
            break;
          }

          case "install":
          case "i": {
            const name = args[1];
            if (!name) {
              await ctx.reply("❓ 请指定插件名称\n用法: plugin install <名称>");
              return;
            }
            
            // 检查插件文件是否存在
            const pluginsDir = join(process.cwd(), "plugins");
            const pluginFile = join(pluginsDir, `${name}.ts`);
            
            logger.info(`尝试安装插件: ${name}, 文件路径: ${pluginFile}`);
            
            if (!existsSync(pluginFile)) {
              logger.warn(`插件文件不存在: ${pluginFile}`);
              await ctx.reply(`❌ 插件 "${name}" 不存在\n使用 ${fmt.code(".plugin list")} 查看可用插件`);
              return;
            }
            
            // 检查是否已启用
            if (db.isPluginEnabled(name)) {
              await ctx.reply(`⚠️ 插件 "${name}" 已安装`);
              return;
            }
            
            // 尝试加载插件（先加载再启用，避免加载失败也标记为启用）
            try {
              const importPath = `../../plugins/${name}.ts`;
              logger.info(`导入插件: ${importPath}`);
              const module = await import(importPath);
              
              if (!module.default) {
                await ctx.reply(`❌ 插件 "${name}" 格式错误: 没有默认导出`);
                return;
              }
              
              // 检查插件是否有 name 属性
              if (!module.default.name) {
                logger.warn(`插件 ${name} 没有 name 属性`);
              }
              
              // 启用插件（保存到数据库）
              db.enablePlugin(name);
              
              // 注册插件
              await pluginManager.registerPlugin(module.default, pluginFile, true);
              await ctx.reply(`✅ 插件 "${name}" 安装成功`);
            } catch (err: any) {
              logger.error(`安装插件失败 ${name}:`, err);
              const errorMsg = err?.message || String(err);
              await ctx.reply(`❌ 插件 "${name}" 加载失败:\n${errorMsg}`);
            }
            break;
          }

          case "remove":
          case "uninstall":
          case "rm": {
            const name = args[1];
            if (!name) {
              await ctx.reply("❓ 请指定插件名称\n用法: plugin remove <名称>");
              return;
            }
            
            // 检查插件是否已启用
            if (!db.isPluginEnabled(name)) {
              await ctx.reply(`⚠️ 插件 "${name}" 未安装`);
              return;
            }
            
            // 卸载插件
            await pluginManager.unregisterPlugin(name);
            db.disablePlugin(name);
            await ctx.reply(`✅ 插件 "${name}" 已卸载`);
            break;
          }

          case "alias": {
            const action = args[1]?.toLowerCase();
            
            if (action === "add") {
              const alias = args[2];
              const command = args[3];
              if (!alias || !command) {
                await ctx.reply("❓ 用法: plugin alias add <别名> <命令>");
                return;
              }
              pluginManager.setAlias(alias, command);
              await ctx.reply(`✅ 别名已设置: ${alias} -> ${command}`);
            } else if (action === "remove" || action === "rm") {
              const alias = args[2];
              if (!alias) {
                await ctx.reply("❓ 请指定别名");
                return;
              }
              pluginManager.removeAlias(alias);
              await ctx.reply(`✅ 别名已删除: ${alias}`);
            } else {
              const aliases = pluginManager.getAliases();
              let text = fmt.bold("🏷️ 命令别名") + "\n\n";
              for (const [alias, cmd] of Object.entries(aliases)) {
                text += `${alias} -> ${cmd}\n`;
              }
              if (Object.keys(aliases).length === 0) {
                text += "暂无别名";
              }
              await ctx.replyHTML(text);
            }
            break;
          }

          default: {
            const prefix = process.env.CMD_PREFIX || ".";
            let text = fmt.bold("🔌 插件管理") + "\n\n";
            text += `${fmt.code(`${prefix}plugin list`)} - 列出可用插件\n`;
            text += `${fmt.code(`${prefix}plugin install <名称>`)} - 安装插件\n`;
            text += `${fmt.code(`${prefix}plugin remove <名称>`)} - 卸载插件\n`;
            text += `${fmt.code(`${prefix}plugin reload <name>`)} - 重载指定插件\n`;
            text += `${fmt.code(`${prefix}plugin reloadall`)} - 重载所有插件\n`;
            text += `${fmt.code(`${prefix}plugin alias`)} - 查看别名列表\n`;
            await ctx.replyHTML(text);
          }
        }
      },
    },
  },
};

export default pluginPlugin;
