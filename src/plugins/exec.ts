import { Plugin } from "../types/index.js";
import { fmt } from "../utils/context.js";
import { logger } from "../utils/logger.js";
import { spawn } from "child_process";

// 应用Emoji表情
const EMOJI = {
  COMPUTER: "💻",
  CODE: "📟",
  DISABLED: "🚫",
  QUESTION: "❓",
  DANGER: "⚠️",
  BLOCK: "🚫",
  RUNNING: "🔄",
  SUCCESS: "✅",
  ERROR: "❌",
  OUTPUT: "📤",
  ERROR_OUTPUT: "⚠️",
  COMMAND: "⌨️",
  EXIT_CODE: "🔢",
  ARROW: "→",
};

/**
 * Shell 命令白名单：只允许这些命令前缀通过。
 * 如需扩展，请在 .env 中设置 SHELL_WHITELIST=cmd1,cmd2,...
 */
const DEFAULT_SHELL_WHITELIST = [
  "ls", "cat", "echo", "pwd", "whoami", "date", "uname",
  "df", "du", "free", "ps", "uptime", "env",
  "grep", "awk", "sed", "sort", "uniq", "wc", "head", "tail",
  "find", "which", "id", "hostname",
  "curl", "wget", "ping",
  "git", "bun", "node", "npm", "npx",
];

function getShellWhitelist(): string[] {
  const envList = process.env.SHELL_WHITELIST;
  if (envList) {
    return envList.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_SHELL_WHITELIST;
}

/** 检查命令首个 token 是否在白名单中（防止黑名单绕过） */
function isCommandAllowed(command: string): boolean {
  const firstToken = command.trim().split(/\s+/)[0];
  return getShellWhitelist().includes(firstToken);
}

const execPlugin: Plugin = {
  name: "exec",
  version: "1.1.0",
  description: "安全的 Shell 命令执行（白名单模式）",
  author: "NexBot",

  commands: {
    exec: {
      description: "执行 shell 命令（白名单限制）",
      aliases: ["shell", "sh", "cmd", "sys"],
      examples: ["exec ls -la", "exec pwd"],
      handler: async (msg, args, ctx) => {
        if (!process.env.ENABLE_SHELL_EXEC) {
          await ctx.editHTML(
            `${EMOJI.DISABLED} <b>Shell 执行已禁用</b>\n\n` +
            `如需启用，请在 .env 中设置 <code>ENABLE_SHELL_EXEC=true</code>`
          );
          return;
        }

        const command = args.join(" ").trim();
        if (!command) {
          await ctx.editHTML(`${EMOJI.QUESTION} <b>请提供要执行的命令</b>\n\n用法: <code>.exec &lt;命令&gt;</code>`);
          return;
        }

        // 白名单检查（替代原有黑名单，防止各种绕过方式）
        if (!isCommandAllowed(command)) {
          const firstToken = command.trim().split(/\s+/)[0];
          await ctx.editHTML(
            `${EMOJI.BLOCK} <b>命令不在白名单中</b>\n\n` +
            `<code>${firstToken}</code> 未被允许执行。\n\n` +
            `如需添加，请在 .env 中设置 <code>SHELL_WHITELIST=cmd1,cmd2,...</code>`
          );
          logger.warn(`拒绝非白名单命令: ${command}`);
          return;
        }

        const timeout = parseInt(process.env.SHELL_TIMEOUT || "30000");
        const maxOutput = parseInt(process.env.MAX_OUTPUT_LENGTH || "4000");

        try {
          const result = await executeCommand(command, timeout);
          
          let output = result.stdout || "(无输出)";
          if (result.stderr) {
            output += "\n\n" + fmt.bold(`${EMOJI.ERROR_OUTPUT} 错误输出:`) + "\n" + result.stderr;
          }

          // 截断长输出
          if (output.length > maxOutput) {
            output = output.slice(0, maxOutput) + "\n... (输出已截断)";
          }

          const text = fmt.bold(`${EMOJI.COMPUTER} 执行结果`) + "\n\n" +
            fmt.bold(`${EMOJI.COMMAND} 命令:`) + " " + fmt.code(command) + "\n" +
            fmt.bold(`${EMOJI.EXIT_CODE} 退出码:`) + " " + result.code + "\n\n" +
            fmt.pre(output);

          await ctx.editHTML(text);
        } catch (err) {
          await ctx.editHTML(`${EMOJI.ERROR} <b>执行失败</b>\n\n${err instanceof Error ? err.message : "未知错误"}`);
        }
      },
    },

    eval: {
      description: "执行 JavaScript 代码（⚠️ 高权限，谨慎使用）",
      aliases: ["js"],
      examples: ["eval 1 + 1", "eval ctx.client.getMe()"],
      handler: async (msg, args, ctx) => {
        const code = args.join(" ").trim();
        if (!code) {
          await ctx.editHTML(`${EMOJI.QUESTION} <b>请提供要执行的代码</b>\n\n用法: <code>.eval &lt;代码&gt;</code>`);
          return;
        }

        // ⚠️ 安全说明：
        // new Function() 与直接 eval() 风险相同，可访问完整 Node.js 环境
        // （process、文件系统、网络等），这不是沙箱。
        // 此命令仅限 Bot 所有者在受信任环境下使用，切勿在公共 Bot 中开放。
        logger.warn(`[eval] 执行高权限代码（前100字符）: ${code.slice(0, 100)}`);

        try {
          // 注意：以下代码具有完整 Node.js 权限，不受任何沙箱限制
          // eslint-disable-next-line no-new-func
          const fn = new Function(
            "client", "msg", "ctx",
            `"use strict"; return (async () => { ${code} })()`
          );
          const result = await fn(ctx.client, msg, ctx);
          
          let output = result !== undefined ? String(result) : "(无返回值)";
          if (output.length > 4000) {
            output = output.slice(0, 4000) + "\n... (已截断)";
          }

          await ctx.editHTML(fmt.bold(`${EMOJI.CODE} 执行结果`) + "\n\n" + fmt.pre(output));
        } catch (err) {
          await ctx.editHTML(`${EMOJI.ERROR} <b>执行错误</b>\n\n${err instanceof Error ? err.message : "未知错误"}`);
        }
      },
    },
  },
};

function executeCommand(command: string, timeout: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const shell =
      process.platform === "win32" ? "cmd" : process.env.SHELL || "sh";
    const shellFlag = process.platform === "win32" ? "/c" : "-c";
    
    const child = spawn(shell, [shellFlag, command], {
      env: { ...process.env, PATH: process.env.PATH },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = <T>(handler: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      handler(value);
    };

    const timeoutTimer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(reject, new Error("命令执行超时"));
    }, timeout);
    timeoutTimer.unref?.();

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      finish(resolve, { code: code || 0, stdout, stderr });
    });

    child.on("error", (err) => {
      finish(reject, err);
    });
  });
}

export default execPlugin;
