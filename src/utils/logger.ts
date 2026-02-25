import { existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m",  // Green
  warn: "\x1b[33m",  // Yellow
  error: "\x1b[31m", // Red
  reset: "\x1b[0m",
};

class Logger {
  private level: LogLevel;
  private logPath: string;
  private logFile: string;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || "info";
    this.logPath = process.env.LOG_PATH || "./logs";
    
    if (!existsSync(this.logPath)) {
      mkdirSync(this.logPath, { recursive: true });
    }
    
    this.logFile = join(this.logPath, `nexbot-${new Date().toISOString().split("T")[0]}.log`);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private writeToFile(message: string): void {
    try {
      appendFileSync(this.logFile, message + "\n");
    } catch {
      // 忽略文件写入错误
    }
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(level, message);
    const colored = `${LOG_COLORS[level]}${formatted}${LOG_COLORS.reset}`;
    
    console.log(colored, ...args);
    this.writeToFile(formatted);
  }

  debug(message: string, ...args: any[]): void {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log("error", message, ...args);
  }
}

export const logger = new Logger();
