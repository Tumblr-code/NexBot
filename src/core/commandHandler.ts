import { TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { pluginManager, parseCommandText } from "./pluginManager.js";
import { createContext } from "../utils/context.js";
import { logger } from "../utils/logger.js";
import { healthChecker } from "../utils/healthCheck.js";
import { defaultRateLimiter } from "../utils/rateLimiter.js";

// 自动删除配置
const AUTO_DELETE_ENABLED = process.env.AUTO_DELETE !== "false"; // 默认开启
const AUTO_DELETE_DELAY = Number.parseInt(
  process.env.AUTO_DELETE_DELAY || "60000",
  10
);

export class CommandHandler {
  private client: TelegramClient;
  private ownerId: string | null = null;
  private ownerIdPromise: Promise<string> | null = null;

  constructor(client: TelegramClient) {
    this.client = client;
  }

  // 延迟删除消息的辅助方法
  private scheduleDelete(chatId: any, messageIds: number[], delay: number = AUTO_DELETE_DELAY): void {
    if (!AUTO_DELETE_ENABLED || !Number.isFinite(delay) || delay <= 0) return;
    
    const timer = setTimeout(async () => {
      try {
        await this.client.deleteMessages(chatId, messageIds, { revoke: true });
      } catch (err) {
        // 忽略删除错误（消息可能已被删除或过期）
      }
    }, delay);
    (timer as NodeJS.Timeout).unref?.();
  }

  private async getOwnerId(): Promise<string> {
    if (this.ownerId) {
      return this.ownerId;
    }

    if (!this.ownerIdPromise) {
      this.ownerIdPromise = this.client
        .getMe()
        .then((me) => {
          const resolved =
            me?.id?.toString() || process.env.OWNER_ID || "";
          if (!resolved) {
            throw new Error("无法解析当前登录用户 ID");
          }
          this.ownerId = resolved;
          return resolved;
        })
        .catch((err) => {
          this.ownerIdPromise = null;
          throw err;
        });
    }

    return this.ownerIdPromise;
  }

  private getChatTarget(msg: any): any {
    return msg.chatId || msg.peerId?.userId || msg.chat?.id || msg.peerId;
  }

  private isOwnerCommand(msg: any, ownerId: string): boolean {
    if (msg.out || msg.savedPeerId) {
      return true;
    }

    const senderId = msg.senderId?.toString?.() || msg.fromId?.toString?.();
    return senderId === ownerId;
  }

  start(): void {
    this.client.addEventHandler(this.handleMessage.bind(this), new NewMessage({}));
    logger.info("命令处理器已启动");
  }

  private async handleMessage(event: NewMessageEvent): Promise<void> {
    try {
      const msg = event.message as any;
      if (!msg) return;
      
      const text = msg.message || msg.text;
      if (!text || typeof text !== "string") return;

      const parsedCommand = parseCommandText(text);
      if (!parsedCommand) {
        // 传递给插件的消息监听器
        try {
          await pluginManager.handleMessage(msg);
          healthChecker.recordMessage(true);
        } catch (err) {
          logger.error("插件消息处理错误:", err);
          healthChecker.recordMessage(false);
        }
        return;
      }

      const cmdName = parsedCommand.name;
      const args = parsedCommand.args;

      if (!cmdName) return;

      let ownerId = process.env.OWNER_ID || "";
      try {
        ownerId = await this.getOwnerId();
      } catch (err) {
        logger.error("获取 OWNER_ID 失败:", err);
        healthChecker.recordCommand(false);
        return;
      }

      if (!this.isOwnerCommand(msg, ownerId)) {
        return;
      }

      // 查找命令
      const cmdInfo = pluginManager.getCommand(cmdName);
      if (!cmdInfo) {
        // 未知命令，忽略或可以发送帮助
        return;
      }
      
      const isSudo = true; // 登录用户就是 sudo

      // 限流检查
      const rateLimitKey = `${ownerId}:${cmdName.toLowerCase()}`;
      const rateCheck = defaultRateLimiter.record(rateLimitKey);
      
      if (!rateCheck.allowed) {
        try {
          const resetSec = Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
          const chatTarget = this.getChatTarget(msg);
          if (chatTarget) {
            const rateMsg = await this.client.sendMessage(chatTarget, {
              message: `⏱️ 请求过于频繁，请 ${resetSec} 秒后再试`,
              replyTo: Number(msg.id),
            });
            // 限流提示消息也自动删除
            this.scheduleDelete(chatTarget, [rateMsg.id]);
          }
        } catch (err) {
          logger.error("发送限流消息失败:", err);
        }
        healthChecker.recordCommand(false);
        // 限流时删除用户的命令消息
        const chatTarget = this.getChatTarget(msg);
        if (chatTarget) {
          this.scheduleDelete(chatTarget, [Number(msg.id)]);
        }
        return;
      }

      // 执行命令
      try {
        const ctx = createContext(this.client, msg as any, isSudo);
        Object.defineProperty(msg, "__nexbotCommand", {
          value: {
            name: cmdName,
            args,
            prefix: parsedCommand.prefix,
            raw: parsedCommand.raw,
          },
          configurable: true,
          enumerable: false,
          writable: true,
        });
        await cmdInfo.def.handler(msg as any, args, ctx);
        
        logger.debug(`命令执行: ${cmdName} [${ownerId}]`);
        healthChecker.recordCommand(true);
        
        // 命令执行成功后，自动删除用户发送的命令消息
        const chatId = this.getChatTarget(msg);
        if (chatId) {
          this.scheduleDelete(chatId, [Number(msg.id)]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "未知错误";
        const errorStack = err instanceof Error ? err.stack : "";
        logger.error(`命令执行错误 ${cmdName}: ${errorMsg}`);
        if (errorStack) logger.error(`堆栈: ${errorStack}`);
        healthChecker.recordCommand(false);
        
        try {
          const chatId = this.getChatTarget(msg);
          if (chatId) {
            const errorReply = await this.client.sendMessage(chatId, {
              message: `❌ 命令执行出错: ${errorMsg}`,
            });
            // 错误消息也自动删除
            this.scheduleDelete(chatId, [errorReply.id]);
          }
        } catch (sendErr) {
          logger.error("发送错误消息失败:", sendErr);
        }
        
        // 出错时也删除用户的命令消息
        const chatId = this.getChatTarget(msg);
        if (chatId) {
          this.scheduleDelete(chatId, [Number(msg.id)]);
        }
      }
    } catch (err) {
      logger.error("消息处理错误:", err);
    }
  }
}
