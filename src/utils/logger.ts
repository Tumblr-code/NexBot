import { existsSync, mkdirSync, createWriteStream, WriteStream } from "fs";
import { join } from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m",
};

/** 将任意值序列化为字符串（Error 输出完整 stack） */
function serializeArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack || arg.message;
  }
  if (typeof arg === "object" && arg !== null) {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

class Logger {
  private level: LogLevel;
  private logPath: string;
  private logFile: string;
  /** 异步流写入，避免阻塞事件循环 */
  private logStream: WriteStream | null = null;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || "info";
    this.logPath = process.env.LOG_PATH || "./logs";

    if (!existsSync(this.logPath)) {
      mkdirSync(this.logPath, { recursive: true });
    }

    this.logFile = join(this.logPath, `nexbot-${new Date().toISOString().split("T")[0]}.log`);
    this.logStream = createWriteStream(this.logFile, { flags: "a", encoding: "utf8" });

    // 流错误静默处理，不影响主进程
    this.logStream.on("error", () => {
      this.logStream = null;
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0
      ? " " + args.map(serializeArg).join(" ")
      : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}`;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message, args);
    const colored = `${LOG_COLORS[level]}${formatted}${LOG_COLORS.reset}`;

    console.log(colored);

    // 异步写入文件（不阻塞事件循环）
    if (this.logStream) {
      this.logStream.write(formatted + "\n");
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log("error", message, ...args);
  }

  /** 优雅关闭日志流（进程退出前调用） */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.logStream) {
        resolve();
        return;
      }
      this.logStream.end(resolve);
    });
  }
}

export const logger = new Logger();
