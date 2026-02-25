import { Plugin } from "../types/index.js";
import { getSystemInfo, formatUptime, formatBytes } from "../utils/system.js";
import { fmt } from "../utils/context.js";
import { db } from "../utils/database.js";
import { pluginManager } from "../core/pluginManager.js";
import { healthChecker } from "../utils/healthCheck.js";
import { defaultCache } from "../utils/cache.js";
import { defaultRateLimiter } from "../utils/rateLimiter.js";

const sysinfoPlugin: Plugin = {
  name: "sysinfo",
  version: "1.0.0",
  description: "系统信息监控",
  author: "NexBot",

  commands: {
    sysinfo: {
      description: "显示系统信息",
      aliases: ["status", "stats", "info"],
      handler: async (msg, args, ctx) => {
        const info = getSystemInfo();
        const botName = process.env.BOT_NAME || "NexBot";
        const botVersion = process.env.BOT_VERSION || "1.0.0";

        let text = fmt.bold(`🤖 ${botName} v${botVersion}`) + "\n\n";
        
        text += fmt.bold("📊 系统信息") + "\n";
        text += `平台: ${info.platform} (${info.arch})\n`;
        text += `Node.js: ${info.nodeVersion}\n`;
        text += `运行时间: ${formatUptime(info.uptime)}\n\n`;

        text += fmt.bold("💾 内存使用") + "\n";
        text += `已用: ${info.memory.used} MB / ${info.memory.total} MB\n`;
        text += `使用率: ${info.memory.percent}%\n\n`;

        text += fmt.bold("💻 CPU") + "\n";
        text += `型号: ${info.cpu.model.split(" @ ")[0]}\n`;
        text += `核心数: ${info.cpu.cores}\n`;
        text += `使用率: ${info.cpu.usage}%\n\n`;

        text += fmt.bold("🔌 插件") + "\n";
        text += `已加载: ${pluginManager.getAllPlugins().length} 个\n`;

        await ctx.replyHTML(text);
      },
    },

    uptime: {
      description: "显示运行时间",
      aliases: ["up"],
      handler: async (msg, args, ctx) => {
        const info = getSystemInfo();
        await ctx.replyHTML(
          fmt.bold("⏱️ 运行时间") + "\n\n" +
          `系统: ${formatUptime(info.uptime)}\n` +
          `进程: ${formatUptime(process.uptime())}`
        );
      },
    },

    db: {
      description: "数据库信息",
      sudo: true,
      aliases: ["database"],
      handler: async (msg, args, ctx) => {
        const sudoCount = db.getSudoList().length;
        const aliases = Object.keys(db.getAllAliases()).length;

        let text = fmt.bold("💾 数据库信息") + "\n\n";
        text += `Sudo 用户: ${sudoCount}\n`;
        text += `命令别名: ${aliases}\n`;

        await ctx.replyHTML(text);
      },
    },

    health: {
      description: "健康状态检查",
      aliases: ["hc"],
      handler: async (msg, args, ctx) => {
        const status = healthChecker.getStatus();
        const m = status.metrics;
        
        let text = fmt.bold("🏥 健康状态") + "\n\n";
        text += `状态: ${status.status === "healthy" ? "✅ 健康" : status.status === "degraded" ? "⚠️ 降级" : "❌ 异常"}\n\n`;
        
        text += fmt.bold("📊 指标") + "\n";
        text += `运行时间: ${formatUptime(m.uptime)}\n`;
        text += `内存使用: ${m.memory.used}MB / ${m.memory.total}MB (${m.memory.percent}%)\n`;
        text += `消息处理: ${m.messages.total} 条 (${m.messages.errors} 错误)\n`;
        text += `命令执行: ${m.commands.total} 条 (${m.commands.errors} 错误)\n\n`;
        
        if (status.checks.length > 0) {
          text += fmt.bold("🔍 检查项") + "\n";
          for (const check of status.checks) {
            const icon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌";
            text += `${icon} ${check.name}`;
            if (check.message) {
              text += `: ${check.message}`;
            }
            text += "\n";
          }
        }

        await ctx.replyHTML(text);
      },
    },

    cache: {
      description: "缓存统计",
      sudo: true,
      handler: async (msg, args, ctx) => {
        const stats = defaultCache.getStats();
        
        let text = fmt.bold("💾 缓存统计") + "\n\n";
        text += `缓存条目: ${stats.size}\n`;
        text += `命中次数: ${stats.hits}\n`;
        text += `未命中次数: ${stats.misses}\n`;
        text += `命中率: ${stats.hitRate}%\n`;

        await ctx.replyHTML(text);
      },
    },

    ratelimit: {
      description: "限流统计",
      sudo: true,
      aliases: ["rl"],
      handler: async (msg, args, ctx) => {
        const stats = defaultRateLimiter.getStats();
        
        let text = fmt.bold("🚦 限流统计") + "\n\n";
        text += `跟踪用户: ${stats.tracked}\n`;
        text += `被封禁: ${stats.blocked}\n`;

        await ctx.replyHTML(text);
      },
    },
  },
};

export default sysinfoPlugin;
