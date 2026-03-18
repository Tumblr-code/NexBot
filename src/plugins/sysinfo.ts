import { Plugin } from "../types/index.js";
import { getSystemInfo, formatUptime } from "../utils/system.js";
import { fmt } from "../utils/context.js";
import { db } from "../utils/database.js";
import { healthChecker } from "../utils/healthCheck.js";
import { defaultCache } from "../utils/cache.js";
import { defaultRateLimiter } from "../utils/rateLimiter.js";
import { VERSION } from "../utils/version.js";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const PRIMARY_PREFIX =
  process.env.CMD_PREFIX?.split(/\s+/).find(Boolean) ||
  (process.env.NODE_ENV === "development" ? "!" : ".");

type CommandResult = {
  ok: boolean;
  output: string;
};

async function runCommand(
  command: string,
  args: string[],
  timeout: number = 60000
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd: process.cwd(),
      timeout,
      maxBuffer: 5 * 1024 * 1024,
    });

    return {
      ok: true,
      output: [stdout, stderr].filter(Boolean).join("\n").trim(),
    };
  } catch (err: any) {
    return {
      ok: false,
      output: [err?.stdout, err?.stderr, err?.message]
        .filter(Boolean)
        .join("\n")
        .trim(),
    };
  }
}

function truncateOutput(output: string, maxLength: number): string {
  if (!output) {
    return "(无输出)";
  }

  return output.length > maxLength
    ? `${output.slice(0, maxLength)}\n...`
    : output;
}

async function getGitInfo(): Promise<{ branch: string; commit: string }> {
  const [branchResult, commitResult] = await Promise.all([
    runCommand("git", ["branch", "--show-current"], 15000),
    runCommand("git", ["rev-parse", "--short", "HEAD"], 15000),
  ]);

  return {
    branch: branchResult.output || "unknown",
    commit: commitResult.output || "unknown",
  };
}

function getInstallCommand(): { command: string; args: string[]; display: string } {
  const cwd = process.cwd();
  const runtimeBin = process.execPath || "bun";
  const runtimeName = path.basename(runtimeBin).toLowerCase();

  if (runtimeName.includes("bun") || existsSync(path.join(cwd, "bun.lock"))) {
    return {
      command: runtimeName.includes("bun") ? runtimeBin : "bun",
      args: ["install"],
      display: "bun install",
    };
  }

  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return { command: "pnpm", args: ["install"], display: "pnpm install" };
  }

  if (existsSync(path.join(cwd, "yarn.lock"))) {
    return { command: "yarn", args: ["install"], display: "yarn install" };
  }

  return { command: "npm", args: ["install"], display: "npm install" };
}

function getLogCandidates(processName: string): string[] {
  const pm2Home = process.env.PM2_HOME || path.join(os.homedir(), ".pm2");
  const logDir = path.join(pm2Home, "logs");

  return [
    path.join(logDir, `${processName}-out.log`),
    path.join(logDir, `${processName}-error.log`),
  ];
}

async function readRecentLogs(lines: number, processName: string): Promise<string> {
  const pm2Result = await runCommand(
    "pm2",
    ["logs", processName, "--lines", String(lines), "--nostream"],
    30000
  );

  if (pm2Result.ok && pm2Result.output) {
    return pm2Result.output;
  }

  for (const logFile of getLogCandidates(processName)) {
    if (!existsSync(logFile)) {
      continue;
    }

    const tailResult = await runCommand("tail", ["-n", String(lines), logFile], 10000);
    if (tailResult.ok && tailResult.output) {
      return tailResult.output;
    }
  }

  return pm2Result.output || "未找到可用日志";
}

// 应用Emoji表情
const EMOJI = {
  CHART: "📊",
  VERSION: "🏷️",
  TIME: "⏱️",
  MEMORY: "💾",
  CPU: "💻",
  DATABASE: "🗄️",
  CACHE: "🧠",
  RATELIMIT: "🚦",
  UPTIME: "⏳",
  GREEN: "🟢",
  YELLOW: "🟡",
  RED: "🔴",
  WARNING: "⚠️",
  TAG: "🏷️",
  PACKAGE: "📦",
  TARGET: "🎯",
  USER: "👤",
  BAN: "🚫",
  UPDATE: "🔄",
  RESTART: "🔄",
  LOGS: "📋",
  ERROR: "❌",
  SUCCESS: "✅",
  GEAR: "⚙️",
  CHECK: "✓",
  LOADING: "⏳",
  BRANCH: "🌿",
  COMMIT: "🔖",
};

const sysinfoPlugin: Plugin = {
  name: "sysinfo",
  version: "1.1.0",
  description: "系统信息监控",
  author: "NexBot",

  commands: {
    sysinfo: {
      description: "显示系统信息",
      aliases: ["status", "stats", "info"],
      handler: async (msg, args, ctx) => {
        const info = getSystemInfo();
        const botName = process.env.BOT_NAME || "NexBot";
        const botVersion = VERSION;

        let text =
          fmt.bold(`${EMOJI.CHART} ${botName}`) +
          ` ${EMOJI.VERSION} ${fmt.italic(`v${botVersion}`)}\n\n`;

        text += `${info.platform} · ${info.arch} · ${info.nodeVersion}\n`;
        text += `${EMOJI.TIME} ${formatUptime(info.uptime)}\n\n`;

        const memPercent = info.memory.percent;
        const memBar =
          "█".repeat(Math.floor(memPercent / 10)) +
          "░".repeat(10 - Math.floor(memPercent / 10));
        text += `${EMOJI.MEMORY} ${memBar} ${memPercent}%\n`;
        text += `${info.memory.used}MB / ${info.memory.total}MB\n\n`;

        const cpuBar =
          "█".repeat(Math.floor(info.cpu.usage / 10)) +
          "░".repeat(10 - Math.floor(info.cpu.usage / 10));
        const cpuModel = info.cpu.model
          .replace(/\(R\)/g, "")
          .replace(/\(TM\)/g, "")
          .replace(/Intel\s*/i, "")
          .replace(/AMD\s*/i, "")
          .replace(/CPU\s*/gi, "")
          .replace(/\s+Processor/gi, "")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 25);

        text += `${EMOJI.CPU} ${cpuBar} ${info.cpu.usage}%\n`;
        text += `${info.cpu.cores}核 · ${cpuModel}`;

        await ctx.editHTML(text);
      },
    },

    uptime: {
      description: "显示运行时间",
      aliases: ["up"],
      handler: async (msg, args, ctx) => {
        const info = getSystemInfo();
        await ctx.editHTML(
          fmt.bold(`${EMOJI.UPTIME} 运行时间`) +
            "\n\n" +
            `${EMOJI.TIME} 系统: ${formatUptime(info.uptime)}\n` +
            `${EMOJI.TIME} 进程: ${formatUptime(process.uptime())}`
        );
      },
    },

    db: {
      description: "数据库信息",
      aliases: ["database"],
      handler: async (msg, args, ctx) => {
        const aliases = Object.keys(db.getAllAliases()).length;

        let text = fmt.bold(`${EMOJI.DATABASE} 数据库`) + "\n\n";
        text += `${EMOJI.TAG} ${aliases} 别名`;

        await ctx.editHTML(text);
      },
    },

    health: {
      description: "健康状态检查",
      aliases: ["hc"],
      handler: async (msg, args, ctx) => {
        const status = healthChecker.getStatus();
        const m = status.metrics;

        const statusIcon =
          status.status === "healthy"
            ? EMOJI.GREEN
            : status.status === "degraded"
              ? EMOJI.YELLOW
              : EMOJI.RED;

        let text = fmt.bold(`${statusIcon} 健康状态`) + "\n\n";
        text += `${EMOJI.TIME} ${formatUptime(m.uptime)}\n`;
        text += `${EMOJI.MEMORY} ${m.memory.percent}% · 📩 ${m.messages.total} · ⚡ ${m.commands.total}\n`;

        const failedChecks = status.checks.filter((check) => check.status !== "pass");
        if (failedChecks.length > 0) {
          text += "\n" + failedChecks.map((check) => `${EMOJI.WARNING} ${check.name}`).join("\n");
        }

        await ctx.editHTML(text);
      },
    },

    cache: {
      description: "缓存统计",
      handler: async (msg, args, ctx) => {
        const stats = defaultCache.getStats();

        let text = fmt.bold(`${EMOJI.CACHE} 缓存`) + "\n\n";
        text += `${EMOJI.PACKAGE} ${stats.size} 条目\n`;
        text += `${EMOJI.TARGET} ${stats.hitRate}% 命中率`;

        await ctx.editHTML(text);
      },
    },

    ratelimit: {
      description: "限流统计",
      aliases: ["rl"],
      handler: async (msg, args, ctx) => {
        const stats = defaultRateLimiter.getStats();

        let text = fmt.bold(`${EMOJI.RATELIMIT} 限流`) + "\n\n";
        text += `${EMOJI.USER} ${stats.tracked} 用户\n`;
        text += `${EMOJI.BAN} ${stats.blocked} 封禁`;

        await ctx.editHTML(text);
      },
    },

    update: {
      description: "从 GitHub 更新代码",
      aliases: ["pull", "sync"],
      examples: ["update"],
      handler: async (msg, args, ctx) => {
        await ctx.editHTML(
          `${EMOJI.UPDATE} <b>正在更新...</b>\n\n${EMOJI.LOADING} 正在检查 Git 状态...`
        );
        await sleep(600);

        const gitInfo = await getGitInfo();
        if (gitInfo.branch === "unknown" || gitInfo.commit === "unknown") {
          await ctx.editHTML(`${EMOJI.ERROR} <b>更新失败</b>\n\n当前目录不是有效的 Git 仓库`);
          return;
        }

        await ctx.editHTML(
          `${EMOJI.UPDATE} <b>正在更新...</b>\n\n${EMOJI.BRANCH} 分支: ${gitInfo.branch}\n${EMOJI.COMMIT} 版本: ${gitInfo.commit}\n${EMOJI.LOADING} 正在拉取代码...`
        );

        const result = await runCommand(
          "git",
          ["pull", "--ff-only", "origin", gitInfo.branch],
          120000
        );
        const output = truncateOutput(result.output, 1200);

        if (!result.ok) {
          await ctx.editHTML(`${EMOJI.ERROR} <b>更新失败</b>\n\n<pre>${output}</pre>`);
          return;
        }

        if (/Already up[ -]to[ -]date|已经是最新/i.test(result.output)) {
          await ctx.editHTML(
            `${EMOJI.SUCCESS} <b>无需更新</b>\n\n${EMOJI.CHECK} 当前已是最新\n${EMOJI.BRANCH} ${gitInfo.branch} / ${gitInfo.commit}`
          );
          return;
        }

        await ctx.editHTML(
          `${EMOJI.SUCCESS} <b>更新成功</b>\n\n${EMOJI.CHECK} 代码已更新，请使用 ${fmt.code(`${PRIMARY_PREFIX}restart`)} 重启\n\n<pre>${output}</pre>`
        );
      },
    },

    upgrade: {
      description: "升级依赖",
      aliases: ["upg"],
      examples: ["upgrade"],
      handler: async (msg, args, ctx) => {
        const installCommand = getInstallCommand();

        await ctx.editHTML(
          `${EMOJI.GEAR} <b>正在升级依赖...</b>\n\n${EMOJI.LOADING} 正在执行 ${installCommand.display}...`
        );
        await sleep(600);

        const result = await runCommand(
          installCommand.command,
          installCommand.args,
          300000
        );
        const output = truncateOutput(result.output, 1200);

        if (!result.ok) {
          await ctx.editHTML(`${EMOJI.ERROR} <b>升级失败</b>\n\n<pre>${output}</pre>`);
          return;
        }

        await ctx.editHTML(
          `${EMOJI.SUCCESS} <b>依赖升级完成</b>\n\n${EMOJI.CHECK} 请使用 ${fmt.code(`${PRIMARY_PREFIX}restart`)} 重启生效\n\n<pre>${output}</pre>`
        );
      },
    },

    restart: {
      description: "重启机器人",
      aliases: ["reboot"],
      examples: ["restart"],
      handler: async (msg, args, ctx) => {
        await ctx.editHTML(
          `${EMOJI.RESTART} <b>正在重启...</b>\n\n${EMOJI.LOADING} 正在准备重启\n⏱️ 预计需要 5-10 秒`
        );

        const runtimeBin = process.execPath || "bun";
        const restartArgs =
          process.argv.slice(1).length > 0 ? process.argv.slice(1) : ["run", "start"];

        setTimeout(() => {
          const child = spawn(runtimeBin, restartArgs, {
            cwd: process.cwd(),
            detached: true,
            stdio: "ignore",
          });
          child.unref();
          process.exit(0);
        }, 1500);
      },
    },

    logs: {
      description: "查看最近日志",
      aliases: ["log"],
      examples: ["logs 50"],
      handler: async (msg, args, ctx) => {
        const lines = Number.parseInt(args.join(" ").trim(), 10) || 30;
        const validLines = Math.min(Math.max(lines, 10), 100);
        const processName = process.env.PM2_PROCESS_NAME || "nexbot";

        await ctx.editHTML(
          `${EMOJI.LOGS} <b>正在获取日志...</b>\n\n${EMOJI.LOADING} 正在读取...`
        );
        await sleep(400);

        const logContent = await readRecentLogs(validLines, processName);
        const truncated = truncateOutput(logContent, 3500);

        await ctx.editHTML(
          `${EMOJI.LOGS} <b>最近 ${validLines} 行日志</b>\n\n<pre>${truncated}</pre>`
        );
      },
    },
  },
};

export default sysinfoPlugin;
