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
            const copyCmd = (cmd: string) => `<a href="tg://copy?text=${encodeURIComponent(prefix + cmd)}">${fmt.code(cmd)}</a>`;
            
            // 获取远程仓库插件列表
            let remotePlugins: Record<string, any> = {};
            try {
              const registryUrl = process.env.PLUGIN_REGISTRY_URL || "https://raw.githubusercontent.com/nexbot/plugins/main/registry.json";
              const response = await axios.get(registryUrl, { timeout: 5000 });
              remotePlugins = response.data?.plugins || {};
            } catch (err) {
              logger.warn("获取远程插件列表失败");
            }
            
            // 获取已安装插件
            const installedPlugins = pluginManager.getAllPlugins();
            const installedNames = new Set(installedPlugins.map(p => p.name));
            
            // 构建消息
            let text = fmt.bold("🔌 NexBot 插件中心") + "\n\n";
            
            // 1. 远程可用插件（带详细介绍）
            const availablePlugins = Object.entries(remotePlugins).filter(([name]) => !installedNames.has(name));
            
            if (availablePlugins.length > 0) {
              text += fmt.bold("📥 可安装插件") + "\n";
              
              let availableText = "";
              for (const [name, info] of availablePlugins.slice(0, 10)) { // 最多显示10个
                const installBtn = `<a href="tg://copy?text=${encodeURIComponent(prefix + "plugin install " + name)}">⬇️ 安装</a>`;
                availableText += `${fmt.bold(name)} v${info.version || "1.0.0"} ${installBtn}\n`;
                if (info.description) {
                  availableText += `  ${info.description}\n`;
                }
                availableText += `  👤 ${info.author || "Unknown"}\n\n`;
              }
              
              if (availablePlugins.length > 10) {
                availableText += `... 还有 ${availablePlugins.length - 10} 个插件\n`;
              }
              
              text += `<blockquote expandable>${availableText.trim()}</blockquote>\n\n`;
            }
            
            // 2. 本地已安装插件（简洁显示）
            if (installedPlugins.length > 0) {
              text += fmt.bold("✅ 已安装插件") + "\n";
              
              let installedText = "";
              for (const plugin of installedPlugins) {
                const cmds: string[] = [];
                if (plugin.commands) cmds.push(...Object.keys(plugin.commands));
                if (plugin.cmdHandlers) cmds.push(...Object.keys(plugin.cmdHandlers));
                
                const cmdList = cmds.length > 0 ? cmds.slice(0, 3).join(", ") + (cmds.length > 3 ? "..." : "") : "无命令";
                installedText += `• ${fmt.bold(plugin.name)} — ${cmdList}\n`;
              }
              
              text += `<blockquote expandable>${installedText.trim()}</blockquote>\n\n`;
            }
            
            text += `💡 使用 ${copyCmd("plugin install <名称>")} 安装插件`;
            
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
              await ctx.reply("✅ 插件 " + name + " 已重载");
            } else {
              await ctx.reply("❌ 插件 " + name + " 重载失败");
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
              await ctx.reply("❌ 插件 \"" + name + "\" 不存在\n使用 " + fmt.code(".plugin list") + " 查看可用插件");
              return;
            }
            
            // 检查是否已启用
            if (db.isPluginEnabled(name)) {
              await ctx.reply("⚠️ 插件 \"" + name + "\" 已安装");
              return;
            }
            
            // 尝试加载插件（先加载再启用，避免加载失败也标记为启用）
            try {
              const importPath = `../../plugins/${name}.ts`;
              logger.info(`导入插件: ${importPath}`);
              const module = await import(importPath);
              
              if (!module.default) {
                await ctx.reply("❌ 插件 \"" + name + "\" 格式错误: 没有默认导出");
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
              await ctx.reply("✅ 插件 \"" + name + "\" 安装成功");
            } catch (err: any) {
              logger.error(`安装插件失败 ${name}:`, err);
              const errorMsg = err?.message || String(err);
              await ctx.reply("❌ 插件 \"" + name + "\" 加载失败:\n" + errorMsg);
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
              await ctx.reply("⚠️ 插件 \"" + name + "\" 未安装");
              return;
            }
            
            // 卸载插件
            await pluginManager.unregisterPlugin(name);
            db.disablePlugin(name);
            await ctx.reply("✅ 插件 \"" + name + "\" 已卸载");
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
              await ctx.reply("✅ 别名已设置: " + alias + " -> " + command);
            } else if (action === "remove" || action === "rm") {
              const alias = args[2];
              if (!alias) {
                await ctx.reply("❓ 请指定别名");
                return;
              }
              pluginManager.removeAlias(alias);
              await ctx.reply("✅ 别名已删除: " + alias);
            } else {
              const aliases = pluginManager.getAliases();
              
              if (Object.keys(aliases).length === 0) {
                await ctx.reply(fmt.bold("🏷️ 命令别名") + "\n\n暂无别名");
                return;
              }
              
              let aliasListText = "";
              for (const [alias, cmd] of Object.entries(aliases)) {
                aliasListText += `${alias} -> ${cmd}\n`;
              }
              
              let text = fmt.bold("🏷️ 命令别名") + "\n\n";
              text += `<blockquote expandable>${aliasListText.trim()}</blockquote>`;
              await ctx.replyHTML(text);
            }
            break;
          }

          default: {
            const prefix = process.env.CMD_PREFIX || ".";
            const copyCmd = (cmd: string, desc: string) => `<a href="tg://copy?text=${encodeURIComponent(prefix + cmd)}">${fmt.code(prefix + cmd)}</a> - ${desc}`;
            
            let text = fmt.bold("🔌 插件管理") + "\n\n";
            text += copyCmd("plugin list", "列出所有插件") + "\n";
            text += copyCmd("plugin install <名称>", "安装插件") + "\n";
            text += copyCmd("plugin remove <名称>", "卸载插件") + "\n";
            text += copyCmd("plugin reload <name>", "重载指定插件") + "\n";
            text += copyCmd("plugin reloadall", "重载所有插件") + "\n";
            text += copyCmd("plugin alias", "查看别名列表");
            await ctx.replyHTML(text);
          }
        }
      },
    },
  },
};

export default pluginPlugin;
