import { Plugin } from "../types/index.js";
import { fmt } from "../utils/context.js";
import { logger } from "../utils/logger.js";
import { spawn } from "child_process";

const execPlugin: Plugin = {
  name: "exec",
  version: "1.0.0",
  description: "安全的 Shell 命令执行",
  author: "NexBot",

  commands: {
    exec: {
      description: "执行 shell 命令",

      aliases: ["shell", "sh", "cmd"],
      examples: ["exec ls -la", "exec pwd"],
      handler: async (msg, args, ctx) => {
        if (!process.env.ENABLE_SHELL_EXEC) {
          await ctx.reply("❌ Shell 执行已禁用");
          return;
        }

        const command = args.join(" ").trim();
        if (!command) {
          await ctx.reply("❓ 请提供要执行的命令");
          return;
        }

        // 危险命令检查
        const dangerousCommands = [
          "rm -rf /",
          "rm -rf /*",
          "> /dev/sda",
          "mkfs",
          "dd if=/dev/zero",
          ":(){ :|:& };:",
        ];
        
        for (const dangerous of dangerousCommands) {
          if (command.includes(dangerous)) {
            await ctx.reply("🚫 检测到危险命令，已阻止执行");
            logger.warn(`阻止危险命令: ${command}`);
            return;
          }
        }

        const timeout = parseInt(process.env.SHELL_TIMEOUT || "30000");
        const maxOutput = parseInt(process.env.MAX_OUTPUT_LENGTH || "4000");

        await ctx.reply(`🔄 执行中: ${fmt.code(command)}`);

        try {
          const result = await executeCommand(command, timeout);
          
          let output = result.stdout || "(无输出)";
          if (result.stderr) {
            output += "\n\n" + fmt.bold("错误输出:") + "\n" + result.stderr;
          }

          // 截断长输出
          if (output.length > maxOutput) {
            output = output.slice(0, maxOutput) + "\n... (输出已截断)";
          }

          const text = fmt.bold("💻 执行结果") + "\n\n" +
            fmt.bold("命令:") + " " + fmt.code(command) + "\n" +
            fmt.bold("退出码:") + " " + result.code + "\n\n" +
            fmt.pre(output);

          await ctx.replyHTML(text);
        } catch (err) {
          await ctx.reply(`❌ 执行失败: ${err instanceof Error ? err.message : "未知错误"}`);
        }
      },
    },

    eval: {
      description: "执行 JavaScript 代码",

      aliases: ["js"],
      examples: ["eval 1 + 1", "eval console.log('Hello')"],
      handler: async (msg, args, ctx) => {
        const code = args.join(" ").trim();
        if (!code) {
          await ctx.reply("❓ 请提供要执行的代码");
          return;
        }

        try {
          // 使用 Function 构造器在沙箱中执行
          const fn = new Function("client", "msg", "ctx", `"use strict"; return (async () => { ${code} })()`);
          const result = await fn(ctx.client, msg, ctx);
          
          let output = result !== undefined ? String(result) : "(无返回值)";
          if (output.length > 4000) {
            output = output.slice(0, 4000) + "\n... (已截断)";
          }

          await ctx.replyHTML(fmt.bold("📟 执行结果") + "\n\n" + fmt.pre(output));
        } catch (err) {
          await ctx.reply(`❌ 执行错误: ${err instanceof Error ? err.message : "未知错误"}`);
        }
      },
    },
  },
};

function executeCommand(command: string, timeout: number): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const shell = process.platform === "win32" ? "cmd" : "bash";
    const shellFlag = process.platform === "win32" ? "/c" : "-c";
    
    const child = spawn(shell, [shellFlag, command], {
      timeout,
      env: { ...process.env, PATH: process.env.PATH },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({ code: code || 0, stdout, stderr });
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("timeout", () => {
      child.kill();
      reject(new Error("命令执行超时"));
    });
  });
}

export default execPlugin;
