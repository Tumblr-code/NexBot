import { Plugin } from "../types/index.js";
import { pluginManager, getPrimaryPrefix } from "../core/pluginManager.js";
import { fmt, escapeHTML } from "../utils/context.js";
import { VERSION } from "../utils/version.js";
import { cleanPluginDescription } from "../utils/helpers.js";

// Emoji 定义
const EMOJI = {
  BOT: "🤖",
  VERSION: "🏷️",
  SPEED: "⚡",
  PLUGIN: "🔌",
  SHIELD: "🛡️",
  UNKNOWN: "❓",
  BOOK: "📖",
  INFO: "ℹ️",
  COMMAND: "⌨️",
  ALIAS: "🏷️",
  EXAMPLE: "📋",
  BASIC: "🎯",
  SYSTEM: "⚙️",
  EXTEND: "🧩",
  MANAGE: "🎛️",
  ARROW: "→",
  DOT: "•",
  COPY: "📋",
  LIST: "📃",
};

// 生成点击复制命令
const copyCmd = (cmd: string, prefix: string = ".") => 
  `<a href="tg://copy?text=${encodeURIComponent(prefix + cmd)}">${fmt.code(prefix + cmd)}</a>`;

// 命令中文说明映射
const COMMAND_DESCRIPTIONS: Record<string, string> = {
  // 内置命令
  "help": "显示帮助信息，支持查看命令和插件详情",
  "h": "显示帮助信息（help 别名）",
  "start": "显示帮助信息（help 别名）",
  "ping": "测试 Bot 响应速度和连接状态",
  "id": "查看当前聊天信息和用户ID",
  "echo": "回声测试，原样返回输入内容",
  "sysinfo": "查看系统运行状态和资源使用详情",
  "health": "查看 Bot 健康状态和运行指标",
  "db": "查看数据库统计信息和表状态",
  "update": "从 GitHub 拉取最新代码更新",
  "upgrade": "升级项目依赖包到最新版本",
  "restart": "重启 Bot 服务（重载所有组件）",
  "status": "查看系统状态、Git版本和运行时间",
  "logs": "查看最近日志（默认30行，可指定数量）",
  "exec": "执行 Shell 命令（带安全检查）",
  "shell": "执行 Shell 命令（exec 别名）",
  "sh": "执行 Shell 命令（exec 别名）",
  "cmd": "执行 Shell 命令（exec 别名）",
  "sys": "执行 Shell 命令（exec 别名）",
  "eval": "执行 JavaScript 代码（开发者调试）",
  "cache": "查看缓存命中率和统计信息",
  "ratelimit": "查看限流统计和触发记录",
  "plugin": "插件管理（安装/卸载/重载/列表）",
  
  // AI 插件命令和子命令
  "ai": "AI 智能对话，支持多服务商兼容",
  "ais": "AI 联网搜索当前信息",
  "aii": "AI 图片生成（根据描述生成图片）",
  "aiv": "AI 文本转语音（TTS朗读）",
  "aia": "AI 语音对话（语音回答）",
  "aisa": "AI 语音搜索（联网搜索+语音回答）",
  "aiprompt": "设置 AI 全局预设提示词",
  "aistats": "查看 AI 使用统计",
  "aiconfig": "配置 AI 服务商参数",
  "aicfg": "配置 AI 服务商参数（aiconfig 别名）",
  "aimodel": "设置 AI 功能模型分配",
  "aicontext": "管理 AI 对话上下文",
  "aictx": "管理 AI 对话上下文（aicontext 别名）",
  "aifold": "设置消息自动折叠阈值",
  "aitelegraph": "管理 Telegraph 长文发布",
  "aivoice": "配置 AI 语音音色",
  "aitimeout": "设置 AI 请求超时时间",
  "aimaxtokens": "设置 AI 最大输出 Token 数",
  "aipreview": "开启/关闭链接预览",
  "aihelp": "显示 AI 插件帮助信息",
  "aichat": "AI 对话聊天（默认模式）",
  "aisearch": "AI 联网搜索",
  "aiimage": "AI 图片生成",
  "aitts": "AI 文本转语音",
  "aiaudio": "AI 语音对话",
  "aisearchaudio": "AI 语音搜索",
  "aicollapse": "设置消息自动折叠阈值",
  "aistat": "查看 AI 使用统计（aistats 别名）",
  
  // AI config 子命令详细说明
  "aiconfigstatus": "查看所有服务商配置状态和可用性",
  "aiconfigadd": "添加新服务商（格式：名称 接口地址 API密钥）",
  "aiconfigupdate": "更新服务商配置",
  "aiconfigremove": "删除指定服务商",
  "aiconfiglist": "列出所有已配置的服务商",
  "aiconfigmodel": "查看服务商支持的所有模型列表",
  
  // AI model 子命令详细说明
  "aimodellist": "查看当前各功能分配的模型",
  "aimodeldefault": "清空所有模型设置，使用自动分配",
  "aimodelauto": "根据服务商自动分配最佳模型",
  "aimodelchat": "设置对话功能使用的模型（如 gpt-4o, claude-3-sonnet）",
  "aimodelsearch": "设置搜索功能使用的模型",
  "aimodelimage": "设置图片生成功能使用的模型（如 dall-e-3）",
  "aimodeltts": "设置语音合成功能使用的模型",
  
  // AI context 子命令详细说明
  "aicontexton": "开启上下文记忆，支持多轮对话",
  "aicontextoff": "关闭上下文记忆，每次独立对话",
  "aicontextshow": "查看当前会话的上下文内容",
  "aicontextdel": "删除当前会话的上下文记录",
  
  // AI collapse 子命令详细说明
  "aicollapseon": "开启长消息自动折叠（默认超过2000字）",
  "aicollapseoff": "关闭长消息折叠，完整显示",
  "aicollapselimit": "设置折叠字数阈值（默认2000字）",
  "aicollapselist": "查看当前折叠设置",
  
  // AI telegraph 子命令详细说明
  "aitelegraphon": "开启超长回复自动发布到 Telegraph",
  "aitelegraphoff": "关闭 Telegraph 发布",
  "aitelegraphlimit": "设置发布到 Telegraph 的字数阈值",
  "aitelegraphlist": "查看已发布的 Telegraph 文章列表",
  "aitelegraphdel": "删除已发布的 Telegraph 文章",
  
  // AI prompt 子命令详细说明
  "aipromptset": "设置全局系统提示词（Prompt）",
  "aipromptclear": "清除全局系统提示词",
  "aipromptshow": "查看当前设置的系统提示词",
  
  // 网盘搜索插件
  "pan": "网盘搜索，结果以 Telegraph 页面展示",
  "pansou": "网盘搜索（pan 别名）",
  
  // 科学计算器
  "calc": "科学计算器，支持复杂数学表达式",
  "calculator": "科学计算器（calc 别名）",
  "math": "科学计算器（calc 别名）",
  "计算": "科学计算器（calc 别名）",
  
  // IP 查询
  "ip": "查询 IP 地址或域名的地理位置",
  "ipinfo": "IP 查询（ip 别名）",
  "iplookup": "IP 查询（ip 别名）",
  "ip查询": "IP 查询（ip 别名）",
  
  // 天气插件
  "weather": "查询城市天气，生成精美海报图片",
  "wt": "天气查询（weather 别名）",
  "tq": "天气查询（weather 别名）",
  "天气": "天气查询（weather 别名）",
  
  // 一言插件
  "hitokoto": "获取随机一言（动画/文学/哲学等分类）",
  "yiyan": "一言（hitokoto 别名）",
  "yy": "一言（hitokoto 别名）",
  "一言": "一言（hitokoto 别名）",
  
  // 网速测试
  "speedtest": "测试服务器网络速度（延迟和下载速度）",
  "st": "网速测试（speedtest 别名）",
  "speed": "网速测试（speedtest 别名）",
  "测速": "网速测试（speedtest 别名）",
  
  // 疯狂星期四
  "crazy4": "发送疯狂星期四 V50 文案",
  "crazy": "疯狂星期四（crazy4 别名）",
  "kfc": "疯狂星期四（crazy4 别名）",
  "v50": "疯狂星期四（crazy4 别名）",
  "星期四": "疯狂星期四（crazy4 别名）",
  
  // 抽奖插件
  "lottery": "查看自动抽奖参与记录和历史",
  "lott": "抽奖记录（lottery 别名）",
  "抽奖记录": "抽奖记录（lottery 别名）",
  "lottstat": "查看抽奖统计数据和中奖率",
  "lottstats": "抽奖统计（lottstat 别名）",
  "抽奖统计": "抽奖统计（lottstat 别名）",
  "lottcfg": "查看抽奖插件当前配置",
  "lottconfig": "抽奖配置（lottcfg 别名）",
  "抽奖配置": "抽奖配置（lottcfg 别名）",
  "lottset": "设置抽奖插件参数（群组ID BotID）",
  "lottsetting": "抽奖设置（lottset 别名）",
  "抽奖设置": "抽奖设置（lottset 别名）",
  "lottreset": "重置抽奖配置为默认值",
  "lottrestore": "抽奖重置（lottreset 别名）",
  "抽奖重置": "抽奖重置（lottreset 别名）",
  "lotton": "开启自动参与抽奖",
  "lottoff": "关闭自动参与抽奖",
  "lottadd": "添加监控群组（群组ID BotID）",
  "lottdel": "删除监控群组",
  
  // 私聊保护插件
  "pglist": "查看私聊保护白名单列表",
  "pgallow": "添加用户到私聊白名单",
  "pgremove": "从私聊白名单移除用户",
  "pgreset": "重置私聊保护所有数据",
  "pgtype": "切换私聊验证类型（math/click/random）",
  "pgblocklist": "查看黑名单列表",
  "pgblock": "拉黑用户（禁止私聊）",
  "pgunblock": "解除拉黑用户",
};

// 获取命令中文说明
const getCommandDesc = (cmdName: string, originalDesc: string): string => {
  return COMMAND_DESCRIPTIONS[cmdName] || originalDesc;
};

const helpPlugin: Plugin = {
  name: "help",
  version: "1.2.0",
  description: "帮助系统和命令列表，支持 .help <命令> 或 .help <插件> 查看详情",
  author: "NexBot",

  commands: {
    help: {
      description: "显示帮助信息，支持 .help <命令> 或 .help <插件> 查看详情",
      aliases: ["h", "start", "帮助"],
      examples: ["help", "help ping", "help lottery", "help ip", "help system"],
      handler: async (msg, args, ctx) => {
        const prefix = getPrimaryPrefix();
        
        if (args.length > 0) {
          const query = args[0].toLowerCase();
          
          // 首先尝试查找插件（优先显示插件帮助）
          const plugin = pluginManager.getPlugin(query);
          
          if (plugin) {
            // 显示插件所有命令
            await showPluginHelp(msg, ctx, query, plugin, prefix);
            return;
          }
          
          // 如果不是插件，尝试查找命令
          const cmdInfo = pluginManager.getCommand(query);
          
          if (cmdInfo) {
            // 显示单个命令帮助
            await showCommandHelp(msg, ctx, query, cmdInfo, prefix);
            return;
          }
          
          // 都没找到
          await (msg as any).edit({
            text: `${EMOJI.UNKNOWN} <b>未找到</b>: <code>${query}</code>\n\n` +
            `该命令或插件不存在。\n\n` +
            `使用 ${copyCmd("help", prefix)} 查看所有命令\n` +
            `使用 ${copyCmd("plugin list", prefix)} 查看所有插件`,
            parseMode: "html",
          });
          return;
        }
        
        // 显示主帮助
        await showMainHelp(msg, ctx, prefix);
      },
    },
  },
};

// 显示单个命令帮助
async function showCommandHelp(msg: any, ctx: any, cmdName: string, cmdInfo: any, prefix: string) {
  const def = cmdInfo.def;
  const plugin = pluginManager.getPlugin(cmdInfo.plugin);
  
  let detailText = "";
  
  // 描述（使用中文说明，支持点击复制）
  const chineseDesc = getCommandDesc(cmdName, def.description);
  detailText += `${EMOJI.INFO} <b>功能说明:</b> ${formatDescriptionWithCopy(chineseDesc, prefix)}\n`;
  detailText += `${EMOJI.PLUGIN} <b>所属插件:</b> ${cmdInfo.plugin}\n`;
  
  // 别名
  if (def.aliases && def.aliases.length > 0) {
    detailText += `\n${EMOJI.ALIAS} <b>快捷别名:</b>\n`;
    detailText += def.aliases.map((a: string) => `  ${EMOJI.DOT} ${copyCmd(a, prefix)}`).join("\n");
    detailText += "\n";
  }
  
  // 使用示例
  if (def.examples && def.examples.length > 0) {
    detailText += `\n${EMOJI.EXAMPLE} <b>使用示例:</b>\n`;
    for (const ex of def.examples) {
      detailText += `  ${EMOJI.ARROW} ${copyCmd(ex, prefix)}\n`;
    }
  }
  
  // 插件描述
  if (plugin?.description) {
    detailText += `\n${EMOJI.INFO} <b>插件介绍:</b>\n`;
    detailText += formatDescriptionWithCopy(plugin.description, prefix) + "\n";
  }
  
  // 构建最终消息
  let text = fmt.bold(`${EMOJI.BOOK} 命令帮助: ${cmdName}`) + "\n\n";
  text += `<blockquote expandable>${detailText.trim()}</blockquote>`;
  text += `\n\n${EMOJI.COPY} <i>点击命令可复制到输入框</i>`;

  await msg.edit({ text, parseMode: "html" });
}

// 将描述中的命令转换为点击复制链接
const formatDescriptionWithCopy = (desc: string, prefix: string): string => {
  // 匹配 "用法: .cmd" 或 "示例: .cmd" 格式的命令（不包括 / 分隔的多个命令）
  let formatted = desc.replace(
    /(用法:|示例:)\s*(\.\w+(?:\s+[^\n\/]+)?)/g,
    (match, label, cmd) => {
      const cmdOnly = cmd.split(' ')[0]; // 只取命令部分
      const args = cmd.slice(cmdOnly.length); // 参数部分
      return `${label} ${copyCmd(cmdOnly.slice(1), prefix)}${escapeHTML(args)}`;
    }
  );
  
  // 匹配 "命令 / 命令" 或 "命令 | 命令" 格式的多个命令
  formatted = formatted.replace(
    /([\/|])\s*(\.\w+)/g,
    (match, sep, cmd) => {
      return `${sep} ${copyCmd(cmd.slice(1), prefix)}`;
    }
  );
  
  // 匹配行首或空格后的 ".cmd" 格式（如 privateguard 插件中的命令列表）
  // 匹配行首的 .cmd 或空格后的 .cmd（避免匹配 URL 中的点）
  formatted = formatted.replace(
    /(^|\s)(\.\w+)/gm,
    (match, leading, cmd) => {
      return `${leading}${copyCmd(cmd.slice(1), prefix)}`;
    }
  );
  
  return formatted;
};

// 显示插件所有命令
async function showPluginHelp(msg: any, ctx: any, pluginName: string, plugin: any, prefix: string) {
  let detailText = "";
  
  // 插件信息
  detailText += `${EMOJI.INFO} <b>插件名称:</b> ${pluginName}\n`;
  detailText += `${EMOJI.VERSION} <b>版本:</b> ${plugin.version || "1.0.0"}\n`;
  detailText += `${EMOJI.INFO} <b>介绍:</b> ${formatDescriptionWithCopy(plugin.description || "暂无描述", prefix)}\n`;
  detailText += `${EMOJI.SHIELD} <b>作者:</b> ${plugin.author || "Unknown"}\n\n`;
  
  // 获取插件的所有命令
  const commands: string[] = [];
  const cmdHandlers: string[] = [];
  
  if (plugin.commands) {
    commands.push(...Object.keys(plugin.commands));
  }
  if (plugin.cmdHandlers) {
    cmdHandlers.push(...Object.keys(plugin.cmdHandlers));
  }
  
  const allCmds = [...commands, ...cmdHandlers];
  
  if (allCmds.length === 0) {
    detailText += `${EMOJI.UNKNOWN} 该插件没有可手动调用的命令\n`;
    detailText += `（可能是自动运行插件）`;
  } else {
    detailText += fmt.bold(`${EMOJI.LIST} 可用命令列表:`) + "\n\n";
    
    for (const cmd of allCmds) {
      // 获取命令定义
      const cmdDef = plugin.commands?.[cmd] || null;
      const chineseDesc = getCommandDesc(cmd, cmdDef?.description || "执行该命令");
      
      detailText += `${copyCmd(cmd, prefix)}\n`;
      // 显示完整描述（支持多行和点击复制）
      detailText += `  ${EMOJI.ARROW} ${formatDescriptionWithCopy(chineseDesc, prefix)}\n`;
      
      // 显示用法示例
      if (cmdDef?.examples && cmdDef.examples.length > 0) {
        detailText += `  ${EMOJI.EXAMPLE} 示例:\n`;
        for (const ex of cmdDef.examples) {
          detailText += `    ${EMOJI.DOT} ${copyCmd(ex, prefix)}\n`;
        }
      }
      
      // 显示别名（带点击复制）
      if (cmdDef?.aliases && cmdDef.aliases.length > 0) {
        detailText += `  ${EMOJI.ALIAS} 别名: ${cmdDef.aliases.map((a: string) => copyCmd(a, prefix)).join(", ")}\n`;
      }
      
      detailText += "\n";
    }
    
    // 对于 cmdHandlers 格式的插件，显示子命令列表和详细帮助
    if (cmdHandlers.length > 0) {
      detailText += fmt.bold(`${EMOJI.LIST} 子命令列表:`) + "\n";
      detailText += `<blockquote expandable>\n`;
      
      // 定义子命令分组（用于 cmdHandlers 格式的插件）
      const subCommandGroups: Record<string, string[]> = {
        "ai": [
          "config status", "config add", "config update", "config remove", "config list", "config model",
          "model list", "model default", "model auto", "model chat", "model search", "model image", "model tts",
          "context on", "context off", "context show", "context del",
          "collapse on", "collapse off", "collapse limit", "collapse list",
          "telegraph on", "telegraph off", "telegraph limit", "telegraph list", "telegraph del",
          "prompt set", "prompt clear", "prompt show",
          "timeout", "maxtokens", "preview", "voice", "stats"
        ]
      };
      
      for (const handlerCmd of cmdHandlers) {
        const subCmds = subCommandGroups[handlerCmd];
        if (subCmds) {
          for (const sub of subCmds) {
            const fullCmd = `${handlerCmd} ${sub}`;
            const desc = COMMAND_DESCRIPTIONS[`${handlerCmd}${sub.replace(/\s+/g, '')}`] || "执行该子命令";
            detailText += `${EMOJI.DOT} ${copyCmd(fullCmd, prefix)} ${EMOJI.ARROW} ${desc}\n`;
          }
        }
      }
      
      detailText += `</blockquote>\n\n`;
      
      // 添加快速入门指南
      if (cmdHandlers.includes("ai")) {
        detailText += fmt.bold(`${EMOJI.BOOK} 快速入门指南:`) + "\n";
        detailText += `<blockquote expandable>\n`;
        detailText += `${fmt.bold("1. 添加 API 服务商")}\n`;
        detailText += `   ${EMOJI.DOT} 使用 ${copyCmd("ai config add", prefix)} 添加服务商\n`;
        detailText += `   ${EMOJI.DOT} 格式: 服务商名称 接口地址 API密钥\n`;
        detailText += `   ${EMOJI.EXAMPLE} 示例: ${copyCmd("ai config add openai https://api.openai.com/v1 sk-xxx", prefix)}\n\n`;
        detailText += `${fmt.bold("2. 查看和设置模型")}\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai model list", prefix)} - 查看当前模型配置\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai model auto", prefix)} - 自动分配最佳模型\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai model chat gpt-4o", prefix)} - 设置对话模型\n\n`;
        detailText += `${fmt.bold("3. 开始使用 AI")}\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai 你好", prefix)} - 普通对话\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai search 今天的新闻", prefix)} - 联网搜索\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai image 一只猫", prefix)} - 生成图片\n\n`;
        detailText += `${fmt.bold("4. 管理上下文")}\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai context on", prefix)} - 开启上下文记忆\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai context show", prefix)} - 查看当前上下文\n`;
        detailText += `   ${EMOJI.DOT} ${copyCmd("ai context del", prefix)} - 清空上下文\n`;
        detailText += `</blockquote>\n\n`;
        
        detailText += fmt.bold(`${EMOJI.EXAMPLE} 常用命令示例:`) + "\n";
        detailText += `<blockquote expandable>\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ai config status", prefix)} - 查看所有服务商状态\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ai config list", prefix)} - 列出已配置的服务商\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ai config remove openai", prefix)} - 删除指定服务商\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ai prompt set 你是专业助手", prefix)} - 设置系统提示词\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ai timeout 60", prefix)} - 设置超时时间为60秒\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ai stats", prefix)} - 查看使用统计\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("ais 量子计算最新进展", prefix)} - 快速联网搜索\n`;
        detailText += `${EMOJI.DOT} ${copyCmd("aii 未来城市", prefix)} - 快速生成图片\n`;
        detailText += `</blockquote>\n\n`;
      }
    }
  }
  
  // 构建最终消息
  let text = fmt.bold(`${EMOJI.PLUGIN} 插件详情: ${pluginName}`) + "\n\n";
  text += `<blockquote expandable>${detailText.trim()}</blockquote>`;
  text += `\n\n${EMOJI.COPY} <i>点击命令可复制，使用 ${copyCmd(`help <命令名>`, prefix)} 查看单个命令详情</i>`;

  await msg.edit({ text, parseMode: "html" });
}

// 显示主帮助
async function showMainHelp(msg: any, ctx: any, prefix: string) {
  const botName = process.env.BOT_NAME || "NexBot";
  
  let text = fmt.bold(`${EMOJI.BOT} ${botName}`) + ` ${EMOJI.VERSION} ${fmt.italic("v" + VERSION)}\n\n`;
  
  // 简约介绍
  text += `${EMOJI.SPEED} 极速 · ${EMOJI.PLUGIN} 插件化 · ${EMOJI.SHIELD} 安全\n`;
  text += `前缀 ${fmt.code(prefix)} · 查看详情 ${copyCmd("help <命令/插件>", prefix)}\n\n`;
  
  // 获取已安装插件
  const builtinNames = new Set(['help', 'plugin', 'debug', 'exec', 'sysinfo']);
  const installedPlugins = pluginManager.getAllPlugins().filter(p => !builtinNames.has(p.name));
  
  // 分类命令列表
  let commandsText = "";
  
  // 基础命令
  commandsText += fmt.bold(`${EMOJI.BASIC} 基础命令`) + "\n";
  commandsText += `${copyCmd("ping", prefix)} ${EMOJI.ARROW} 测试延迟\n`;
  commandsText += `${copyCmd("id", prefix)} ${EMOJI.ARROW} 查看聊天信息\n`;
  commandsText += `${copyCmd("echo", prefix)} ${EMOJI.ARROW} 回声测试\n\n`;
  
  // 系统命令（内置命令）
  commandsText += fmt.bold(`${EMOJI.SYSTEM} 系统命令`) + "\n";
  commandsText += `${copyCmd("sysinfo", prefix)} ${EMOJI.ARROW} 系统状态\n`;
  commandsText += `${copyCmd("update", prefix)} ${EMOJI.ARROW} 更新代码\n`;
  commandsText += `${copyCmd("upgrade", prefix)} ${EMOJI.ARROW} 升级依赖\n`;
  commandsText += `${copyCmd("restart", prefix)} ${EMOJI.ARROW} 重启 Bot\n`;
  commandsText += `${copyCmd("logs", prefix)} ${EMOJI.ARROW} 查看日志\n`;
  commandsText += `${copyCmd("exec", prefix)} ${EMOJI.ARROW} 执行命令\n`;
  commandsText += `${copyCmd("eval", prefix)} ${EMOJI.ARROW} 执行 JS 代码\n`;
  commandsText += `${copyCmd("plugin", prefix)} ${EMOJI.ARROW} 管理插件\n\n`;
  
  // 扩展插件
  commandsText += fmt.bold(`${EMOJI.EXTEND} 扩展插件`) + "\n";
  if (installedPlugins.length > 0) {
    for (const plugin of installedPlugins) {
      const shortDesc = escapeHTML(cleanPluginDescription(plugin.description));
      // 插件名做成可点击复制的代码块格式（点击复制插件名）
      commandsText += `<a href="tg://copy?text=${encodeURIComponent(plugin.name)}">${fmt.code(plugin.name)}</a> ${EMOJI.ARROW} ${shortDesc}\n`;
    }
  }
  
  text += `<blockquote expandable>${commandsText}</blockquote>`;
  text += `\n\n${EMOJI.COPY} <i>点击命令可复制，使用 ${copyCmd("help <命令名>", prefix)} 或 ${copyCmd("help <插件名>", prefix)} 查看详情</i>`;
  
  await msg.edit({ text, parseMode: "html" });
}

export default helpPlugin;
