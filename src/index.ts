#!/usr/bin/env bun
import "dotenv/config";
import { clientManager } from "./utils/client.js";
import { pluginManager } from "./core/pluginManager.js";
import { CommandHandler } from "./core/commandHandler.js";
import { logger } from "./utils/logger.js";
import { db } from "./utils/database.js";
import { healthChecker } from "./utils/healthCheck.js";
import { VERSION } from "./utils/version.js";

async function main() {
  try {
    logger.info(`🚀 NexBot v${VERSION} 启动中...`);
    logger.info(`环境: ${process.env.NODE_ENV || "production"}`);

    // 检查必要的环境变量
    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;
    
    if (!apiId || !apiHash) {
      logger.error("❌ 缺少必要的环境变量:");
      logger.error("   TELEGRAM_API_ID 和 TELEGRAM_API_HASH 必须在 .env 文件中配置");
      logger.error("   请从 https://my.telegram.org/apps 获取");
      process.exit(1);
    }

    // 初始化 Telegram 客户端
    const client = await clientManager.createClient();
    
    // 设置插件管理器的客户端
    pluginManager.setClient(client);

    // 加载内置插件
    await pluginManager.loadBuiltinPlugins();

    // 加载外部插件
    await pluginManager.loadExternalPlugins();

    // 启动命令处理器
    const handler = new CommandHandler(client);
    handler.start();

    // 启动健康检查
    healthChecker.startMonitoring(60000); // 每分钟检查一次

    logger.info("✅ NexBot 已启动");
    logger.info(`命令前缀: ${process.env.NODE_ENV === "development" ? "!" : process.env.CMD_PREFIX || "."}`);

    // 优雅退出辅助函数
    async function gracefulShutdown(exitCode = 0): Promise<void> {
      logger.info("正在关闭...");
      healthChecker.stopMonitoring();
      try {
        await clientManager.disconnect();
      } catch {
        // 忽略断开连接的错误
      }
      db.close();
      process.exit(exitCode);
    }

    // 优雅退出
    process.on("SIGINT", () => gracefulShutdown(0));
    process.on("SIGTERM", () => gracefulShutdown(0));

    // 未捕获的异常：记录后退出，由外部进程管理器（systemd/pm2/docker）重启
    // 注意：uncaughtException 后程序状态不可预知，继续运行有数据损坏风险
    process.on("uncaughtException", async (err) => {
      logger.error("未捕获的异常，准备关闭:", err);
      await gracefulShutdown(1);
    });

    process.on("unhandledRejection", async (reason) => {
      logger.error("未处理的 Promise 拒绝，准备关闭:", reason);
      await gracefulShutdown(1);
    });

  } catch (err) {
    logger.error("启动失败:", err);
    process.exit(1);
  }
}

main();
