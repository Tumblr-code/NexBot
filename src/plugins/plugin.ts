import { Plugin } from "../types/index.js";
import { pluginManager, getPrimaryPrefix } from "../core/pluginManager.js";
import { db } from "../utils/database.js";
import { fmt, escapeHTML } from "../utils/context.js";
import { logger } from "../utils/logger.js";
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { cleanPluginDescription } from "../utils/helpers.js";

// 生成点击复制命令
const copyCmd = (cmd: string, prefix: string = ".") => 
  `<a href="tg://copy?text=${encodeURIComponent(prefix + cmd)}">${fmt.code(prefix + cmd)}</a>`;

// 应用Emoji表情
const EMOJI = {
  PLUGIN: "🔌",
  DOWNLOAD: "📥",
  CHECK: "✅",
  TIP: "💡",
  COPY: "📋",
  LIST: "📃",
  INSTALL: "📦",
  REMOVE: "🗑️",
  RELOAD: "🔄",
  ALIAS: "🏷️",
  ADD: "➕",
  DELETE: "➖",
  WARNING: "⚠️",
  ERROR: "❌",
  QUESTION: "❓",
  SUCCESS: "✅",
  ARROW: "→",
  DOT: "•",
  PACKAGE: "📦",
  COMMAND: "⌨️",
  NONE: "🚫",
};

// 插件信息接口
interface PluginInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  commands: string[];
  installed: boolean;
}

function resolvePluginFile(baseDir: string, name: string): string | null {
  const candidates = [`${name}.ts`, `${name}.js`];

  for (const candidate of candidates) {
    const filePath = join(baseDir, candidate);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

async function importPluginFile(filePath: string) {
  const fileUrl = pathToFileURL(filePath);
  fileUrl.searchParams.set("t", Date.now().toString());
  return import(fileUrl.href);
}

const pluginPlugin: Plugin = {
  name: "plugin",
  version: "1.0.0",
  description: "插件管理器",
  author: "NexBot",

  commands: {
    plugin: {
      description: "插件管理",

      aliases: ["pm", "plugins"],
      examples: ["plugin list", "plugin install <name>", "plugin remove <name>"],
      handler: async (msg, args, ctx) => {
        const subCmd = args[0]?.toLowerCase();
        
        switch (subCmd) {
          case "list":
          case "ls": {
            const prefix = getPrimaryPrefix();
            
            // 扫描本地插件目录
            const pluginsDir = join(process.cwd(), "plugins");
            const availablePlugins: PluginInfo[] = [];
            
            if (existsSync(pluginsDir)) {
              const files = readdirSync(pluginsDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
              
              for (const file of files) {
                const name = file.replace(/\.(ts|js)$/, "");
                const pluginPath = join(pluginsDir, file);
                
                try {
                  // 读取文件内容提取信息
                  const content = readFileSync(pluginPath, "utf-8");
                  const info = extractPluginInfo(content, name);
                  info.installed =
                    db.isPluginEnabled(info.name) || db.isPluginEnabled(name);
                  availablePlugins.push(info);
                } catch (err) {
                  logger.warn(`解析插件 ${name} 信息失败`);
                }
              }
            }
            availablePlugins.sort((a, b) => a.name.localeCompare(b.name));
            
            // 获取已安装的内置插件
            const installedPlugins = pluginManager.getAllPlugins();
            const notInstalled = availablePlugins.filter(p => !p.installed);
            const externalInstalled = installedPlugins.filter(p => 
              !['help', 'plugin', 'debug', 'exec', 'sysinfo'].includes(p.name)
            ).sort((a, b) => a.name.localeCompare(b.name));
            
            // 构建消息
            let text = fmt.bold(`${EMOJI.PLUGIN} 插件中心`) + "\n";
            text += `${EMOJI.PACKAGE} 可用: ${availablePlugins.length}个 | ${EMOJI.CHECK} 已装: ${externalInstalled.length}个\n\n`;
            
            // 构建 inline keyboard 按钮（每行2个）
            const inlineKeyboard: any[] = [];
            let currentRow: any[] = [];
            
            // 1. 可安装插件（带折叠，使用 copyText 按钮）
            if (notInstalled.length > 0) {
              text += fmt.bold(`${EMOJI.DOWNLOAD} 可安装插件`) + "\n";
              
              let availableText = "";
              for (const plugin of notInstalled) {
                // 构建安装命令
                const installCmd = `${prefix}plugin install ${plugin.name}`;
                // 清理描述防止显示异常
                const cleanDesc = cleanPluginDescription(plugin.description);
                // 直接显示插件名（不带链接），描述紧随其后
                availableText += `${EMOJI.DOT} ${fmt.code(plugin.name)} ${EMOJI.ARROW} ${escapeHTML(cleanDesc)}\n`;
                
                // 添加复制按钮（每行2个）
                currentRow.push({
                  text: `${EMOJI.COPY} ${plugin.name}`,
                  copyText: installCmd,
                });
                if (currentRow.length === 2) {
                  inlineKeyboard.push(currentRow);
                  currentRow = [];
                }
              }
              
              text += `<blockquote expandable>${availableText.trim()}</blockquote>\n\n`;
            }
            
            // 添加剩余的按钮
            if (currentRow.length > 0) {
              inlineKeyboard.push(currentRow);
            }
            
            // 2. 已安装插件（带折叠，命令可点击复制）
            if (externalInstalled.length > 0) {
              text += fmt.bold(`${EMOJI.CHECK} 已安装插件`) + "\n";
              
              let installedText = "";
              for (const plugin of externalInstalled) {
                const cmds = getPluginCmds(plugin);
                // 命令做成可点击复制的代码格式（显示完整命令带前缀）
                const cmdList = cmds.length > 0 
                  ? cmds.map(c => `<a href="tg://copy?text=${encodeURIComponent(prefix + c)}">${fmt.code(prefix + c)}</a>`).join(" ")
                  : fmt.italic("无命令");
                installedText += `${EMOJI.DOT} ${plugin.name} ${EMOJI.ARROW} ${cmdList}\n`;
              }
              
              text += `<blockquote expandable>${installedText.trim()}</blockquote>\n\n`;
            }
            
            // 底部提示：可复制的前缀
            const installPrefix = `${prefix}plugin install `;
            text += `${EMOJI.TIP} ${fmt.code(installPrefix)} ${EMOJI.ARROW} 点击复制前缀，然后输入插件名`;
            
            await ctx.editHTML(text);
            break;
          }

          case "reload":
          case "r": {
            const name = args[1];
            if (!name) {
              await ctx.edit(`${EMOJI.QUESTION} 请指定插件名称`);
              return;
            }
            
            const success = await pluginManager.reloadPlugin(name);
            if (success) {
              await ctx.edit(`${EMOJI.RELOAD} 插件 ${name} 已重载`);
            } else {
              await ctx.edit(`${EMOJI.ERROR} 插件 ${name} 重载失败`);
            }
            break;
          }

          case "reloadall":
          case "ra": {
            await pluginManager.reloadAll();
            await ctx.edit(`${EMOJI.RELOAD} 所有插件已重载`);
            break;
          }

          case "install":
          case "i": {
            const name = args[1];
            if (!name) {
              await ctx.edit(`${EMOJI.QUESTION} 请指定插件名称\n用法: plugin install <名称>`);
              return;
            }
            
            // 检查插件文件是否存在
            const pluginsDir = join(process.cwd(), "plugins");
            const pluginFile = resolvePluginFile(pluginsDir, name);
            
            logger.info(`尝试安装插件: ${name}, 文件路径: ${pluginFile || "(未找到)"}`);
            
            if (!pluginFile) {
              logger.warn(`插件文件不存在: ${name}`);
              await ctx.edit(
                `${EMOJI.ERROR} 插件 "${name}" 不存在\n使用 "${fmt.code(`${getPrimaryPrefix()}plugin list`)}" 查看可用插件`
              );
              return;
            }
            
            // 尝试加载插件（先加载再启用，避免加载失败也标记为启用）
            try {
              const module = await importPluginFile(pluginFile);
              
              if (!module.default) {
                await ctx.edit(`${EMOJI.ERROR} 插件 "${name}" 格式错误: 没有默认导出`);
                return;
              }
              
              // 检查插件是否有 name 属性
              if (!module.default.name) {
                logger.warn(`插件 ${name} 没有 name 属性`);
              }

              const pluginName = module.default.name || name;

              if (db.isPluginEnabled(name) || db.isPluginEnabled(pluginName)) {
                await ctx.edit(`${EMOJI.WARNING} 插件 "${name}" 已安装`);
                return;
              }
              
              // 启用插件（保存到数据库）
              db.enablePlugin(pluginName);
              
              // 注册插件
              await pluginManager.registerPlugin(module.default, pluginFile, true);
              await ctx.edit(`${EMOJI.SUCCESS} 插件 "${name}" 安装成功`);
            } catch (err: any) {
              logger.error(`安装插件失败 ${name}:`, err);
              const errorMsg = err?.message || String(err);
              await ctx.edit(`${EMOJI.ERROR} 插件 "${name}" 加载失败:\n${errorMsg}`);
            }
            break;
          }

          case "remove":
          case "uninstall":
          case "rm": {
            const name = args[1];
            if (!name) {
              await ctx.reply(`${EMOJI.QUESTION} 请指定插件名称\n用法: plugin remove <名称>`);
              return;
            }

            const targetPlugin = pluginManager.getPlugin(name);
            const targetName = targetPlugin?.name || name;
            
            // 检查插件是否已启用
            if (!db.isPluginEnabled(targetName)) {
              await ctx.reply(`${EMOJI.WARNING} 插件 "${name}" 未安装`);
              return;
            }
            
            // 卸载插件
            await pluginManager.unregisterPlugin(targetName);
            db.disablePlugin(targetName);
            await ctx.reply(`${EMOJI.REMOVE} 插件 "${name}" 已卸载`);
            break;
          }

          case "alias": {
            const action = args[1]?.toLowerCase();
            
            if (action === "add") {
              const alias = args[2];
              const command = args[3];
              if (!alias || !command) {
                await ctx.edit(`${EMOJI.QUESTION} 用法: plugin alias add <别名> <命令>`);
                return;
              }
              pluginManager.setAlias(alias, command);
              await ctx.edit(`${EMOJI.ADD} 别名已设置: ${alias} ${EMOJI.ARROW} ${command}`);
            } else if (action === "remove" || action === "rm") {
              const alias = args[2];
              if (!alias) {
                await ctx.edit(`${EMOJI.QUESTION} 请指定别名`);
                return;
              }
              pluginManager.removeAlias(alias);
              await ctx.edit(`${EMOJI.DELETE} 别名已删除: ${alias}`);
            } else {
              const aliases = pluginManager.getAliases();
              
              if (Object.keys(aliases).length === 0) {
                await ctx.edit(fmt.bold(`${EMOJI.ALIAS} 命令别名`) + "\n\n暂无别名");
                return;
              }
              
              let aliasListText = "";
              for (const [alias, cmd] of Object.entries(aliases)) {
                aliasListText += `${alias} ${EMOJI.ARROW} ${cmd}\n`;
              }
              
              let text = fmt.bold(`${EMOJI.ALIAS} 命令别名`) + "\n\n";
              text += aliasListText;
              await ctx.editHTML(text);
            }
            break;
          }

          default: {
            const prefix = getPrimaryPrefix();
            
            let text = fmt.bold(`${EMOJI.PLUGIN} 插件管理`) + "\n\n";
            // 子命令做成可点击复制的格式
            text += `${copyCmd("plugin list", prefix)} ${EMOJI.ARROW} 查看插件列表\n`;
            text += `${copyCmd("plugin install <名称>", prefix)} ${EMOJI.ARROW} 安装插件\n`;
            text += `${copyCmd("plugin remove <名称>", prefix)} ${EMOJI.ARROW} 卸载插件\n`;
            text += `${copyCmd("plugin reload <名称>", prefix)} ${EMOJI.ARROW} 重载插件\n`;
            text += `${copyCmd("plugin alias", prefix)} ${EMOJI.ARROW} 命令别名管理`;
            await ctx.editHTML(text);
          }
        }
      },
    },
  },
};

// 从插件文件内容提取信息
function extractPluginInfo(content: string, defaultName: string): PluginInfo {
  const info: PluginInfo = {
    name: defaultName,
    version: "1.0.0",
    description: "暂无描述",
    author: "Unknown",
    commands: [],
    installed: false,
  };
  
  // 找到插件定义的开始位置
  // 支持两种格式：const xxx: Plugin = { 或 class Xxx extends Plugin {
  const objectMatch = content.match(/const\s+\w+\s*:\s*Plugin\s*=\s*\{/);
  const classMatch = content.match(/class\s+\w+\s+extends\s+Plugin\s*\{/);
  
  let pluginContent = content;
  let startIndex = 0;
  
  if (objectMatch && objectMatch.index !== undefined) {
    // 对象字面量格式
    startIndex = objectMatch.index;
    pluginContent = content.substring(startIndex);
  } else if (classMatch && classMatch.index !== undefined) {
    // 类格式
    startIndex = classMatch.index;
    pluginContent = content.substring(startIndex);
  }
  
  // 提取 name（使用单词边界 \b 避免匹配 short_name 等）
  // 支持 name: "xxx" 和 name = "xxx" 两种语法
  const nameMatch = pluginContent.match(/\bname\s*[:=]\s*["']([^"']+)["']/);
  if (nameMatch) info.name = nameMatch[1];
  
  // 提取 version（使用单词边界，支持 := 两种语法）
  const versionMatch = pluginContent.match(/\bversion\s*[:=]\s*["']([^"']+)["']/);
  if (versionMatch) info.version = versionMatch[1];
  
  // 提取 description（使用单词边界，支持字符串和模板字符串）
  const descMatch = pluginContent.match(/\bdescription\s*[:=]\s*["']([^"']+)["']/) || 
                    pluginContent.match(/\bdescription\s*[:=]\s*`([^`]+)`/);
  if (descMatch) {
    info.description = descMatch[1].replace(/\\n/g, "\n").trim();
  }
  
  // 提取 author（使用单词边界）
  const authorMatch = pluginContent.match(/\bauthor\s*[:=]\s*["']([^"']+)["']/);
  if (authorMatch) info.author = authorMatch[1];
  
  // 提取命令（从 cmdHandlers 或 commands）
  const cmdHandlerMatch = pluginContent.match(
    /cmdHandlers\s*(?:=|:)\s*\{([\s\S]*?)^\s{2}\}[,;]?/m
  );
  if (cmdHandlerMatch) {
    const cmdMatches = cmdHandlerMatch[1].matchAll(
      /^\s{4}["'`]?([^"'`\s:]+)["'`]?\s*:/gm
    );
    for (const match of cmdMatches) {
      if (!info.commands.includes(match[1])) {
        info.commands.push(match[1]);
      }
    }
  }
  
  // 从 commands 对象提取
  const commandsMatch = pluginContent.match(
    /commands\s*(?:=|:)\s*\{([\s\S]*?)^\s{2}\}[,;]?/m
  );
  if (commandsMatch) {
    const cmdMatches = commandsMatch[1].matchAll(
      /^\s{4}["'`]?([^"'`\s:]+)["'`]?\s*:\s*\{/gm
    );
    for (const match of cmdMatches) {
      if (!info.commands.includes(match[1])) {
        info.commands.push(match[1]);
      }
    }
  }
  
  return info;
}

// 获取插件的命令列表
function getPluginCmds(plugin: any): string[] {
  const cmds: string[] = [];
  if (plugin.commands) cmds.push(...Object.keys(plugin.commands));
  if (plugin.cmdHandlers) cmds.push(...Object.keys(plugin.cmdHandlers));
  return cmds;
}

export default pluginPlugin;
