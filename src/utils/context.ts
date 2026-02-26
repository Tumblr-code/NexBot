import { TelegramClient, Api } from "telegram";
import { CommandContext, ReplyOptions, Message } from "../types/index.js";

// 自动删除配置
const AUTO_DELETE_ENABLED = process.env.AUTO_DELETE !== "false"; // 默认开启
const AUTO_DELETE_DELAY = parseInt(process.env.AUTO_DELETE_DELAY || "60000"); // 默认60秒

// 延迟删除消息的辅助函数
async function scheduleDelete(
  client: TelegramClient,
  chatId: any,
  messageIds: number[],
  delay: number = AUTO_DELETE_DELAY
): Promise<void> {
  if (!AUTO_DELETE_ENABLED || delay <= 0) return;
  
  setTimeout(async () => {
    try {
      await client.deleteMessages(chatId, messageIds, { revoke: true });
    } catch (err) {
      // 忽略删除错误（消息可能已被删除或过期）
    }
  }, delay);
}

export function createContext(
  client: TelegramClient,
  msg: Message,
  isSudo: boolean
): CommandContext {
  const messageId = msg.id;
  
  // 获取 chatId - 优先使用 msg.chatId，私聊时直接使用 chat.id
  let chatId: any = msg.chatId;
  if (!chatId && msg.chat?.id) {
    chatId = msg.chat.id;
  }
  
  // 获取消息来自的聊天对象用于 sendMessage
  const chat = msg.chat;

  if (!chatId && !chat) {
    throw new Error("无法获取聊天 ID");
  }

  return {
    client,
    isSudo,
    isPrivate: msg.chat?.className === "User",
    isGroup: msg.chat?.className === "Chat" || (msg.chat?.className === "Channel" && (msg.chat as any).megagroup),
    isChannel: msg.chat?.className === "Channel" && !(msg.chat as any).megagroup,

    async reply(text: string, options: ReplyOptions = {}): Promise<Api.Message> {
      // 使用 chat 对象或 chatId
      const target = chat || chatId;
      const sendOptions: any = {
        message: text,
        parseMode: options.parseMode,
        silent: options.silent,
        linkPreview: options.disableWebPagePreview === false,
      };
      // 处理 replyTo：显式设置 null 表示不引用，其他情况默认引用原消息
      if (options.replyToMessageId === null) {
        // 不设置 replyTo，作为独立消息
      } else if (typeof options.replyToMessageId === 'number') {
        sendOptions.replyTo = Number(options.replyToMessageId);
      } else {
        // 默认引用原消息
        sendOptions.replyTo = Number(messageId);
      }
      const sentMsg = await client.sendMessage(target, sendOptions);
      
      // 自动删除回复消息
      scheduleDelete(client, target, [sentMsg.id]);
      
      return sentMsg;
    },

    async replyHTML(html: string, options: ReplyOptions = {}): Promise<Api.Message> {
      const target = chat || chatId;
      const sendOptions: any = {
        message: html,
        parseMode: "html",
        silent: options.silent,
        linkPreview: options.disableWebPagePreview === false,
      };
      // 处理 replyTo：显式设置 null 表示不引用，其他情况默认引用原消息
      if (options.replyToMessageId === null) {
        // 不设置 replyTo
      } else if (typeof options.replyToMessageId === 'number') {
        sendOptions.replyTo = Number(options.replyToMessageId);
      } else {
        // 默认引用原消息
        sendOptions.replyTo = Number(messageId);
      }
      // replyToMessageId === null 时不设置 replyTo，不引用
      if (options.replyMarkup) {
        sendOptions.buttons = options.replyMarkup.inlineKeyboard || options.replyMarkup;
      }
      const sentMsg = await client.sendMessage(target, sendOptions);
      
      // 自动删除回复消息
      scheduleDelete(client, target, [sentMsg.id]);
      
      return sentMsg;
    },

    async edit(text: string, options: ReplyOptions = {}): Promise<Api.Message> {
      const target = chat || chatId;
      return await client.editMessage(target, {
        message: messageId,
        text: text,
        parseMode: options.parseMode,
        linkPreview: options.disableWebPagePreview === false,
      });
    },

    async editHTML(html: string, options: ReplyOptions = {}): Promise<Api.Message> {
      const target = chat || chatId;
      const editOptions: any = {
        message: messageId,
        text: html,
        parseMode: "html",
        linkPreview: options.disableWebPagePreview === false,
      };
      if (options.replyMarkup) {
        editOptions.buttons = options.replyMarkup.inlineKeyboard || options.replyMarkup;
      }
      return await client.editMessage(target, editOptions);
    },

    async deleteMessage(): Promise<void> {
      try {
        const target = chat || chatId;
        await client.deleteMessages(target, [messageId], { revoke: true });
      } catch (err) {
        // 忽略删除错误
      }
    },
  };
}

// HTML 转义工具
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 格式化工具
export const fmt = {
  bold: (text: string) => `<b>${escapeHTML(text)}</b>`,
  italic: (text: string) => `<i>${escapeHTML(text)}</i>`,
  code: (text: string) => `<code>${escapeHTML(text)}</code>`,
  pre: (text: string, lang?: string) => 
    lang ? `<pre><code class="language-${lang}">${escapeHTML(text)}</code></pre>` : `<pre>${escapeHTML(text)}</pre>`,
  link: (text: string, url: string) => `<a href="${url}">${escapeHTML(text)}</a>`,
  mention: (userId: number, name: string) => `<a href="tg://user?id=${userId}">${escapeHTML(name)}</a>`,
  // 引用块（折叠显示长文本）
  blockquote: (text: string) => `<blockquote>${escapeHTML(text)}</blockquote>`,
  // 可折叠引用块
  spoiler: (text: string) => `<span class="tg-spoiler">${escapeHTML(text)}</span>`,
};
