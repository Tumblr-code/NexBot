import { Plugin } from "../types/index.js";
import { db } from "../utils/database.js";
import { fmt } from "../utils/context.js";

const sudoPlugin: Plugin = {
  name: "sudo",
  version: "1.0.0",
  description: "权限管理",
  author: "NexBot",

  commands: {
    sudo: {
      description: "sudo 权限管理",
      sudo: true,
      aliases: ["admin"],
      examples: ["sudo add @user", "sudo remove @user", "sudo list"],
      handler: async (msg, args, ctx) => {
        const action = args[0]?.toLowerCase();
        const target = args[1];

        switch (action) {
          case "add":
          case "a": {
            if (!target) {
              await ctx.reply("❓ 请指定用户");
              return;
            }

            // 从提及或用户名获取用户 ID
            let userId: number | null = null;
            
            if (msg.entities) {
              for (const entity of msg.entities) {
                if (entity.className === "MessageEntityMentionName") {
                  userId = (entity as any).userId;
                  break;
                }
              }
            }

            // 尝试从回复获取
            if (!userId && msg.replyTo) {
              const replyMsg = await ctx.client.getMessages(msg.chatId, {
                ids: msg.replyTo.replyToMsgId,
              });
              if (replyMsg.length > 0) {
                userId = parseInt(replyMsg[0].senderId?.toString() || "0");
              }
            }

            // 尝试直接解析数字
            if (!userId && /^\d+$/.test(target)) {
              userId = parseInt(target);
            }

            if (!userId) {
              await ctx.reply("❓ 无法识别用户，请回复用户消息或使用用户 ID");
              return;
            }

            db.addSudo(userId);
            await ctx.reply(`✅ 已添加 sudo 权限: ${userId}`);
            break;
          }

          case "remove":
          case "rm":
          case "r": {
            if (!target) {
              await ctx.reply("❓ 请指定用户 ID");
              return;
            }

            const userId = parseInt(target);
            if (isNaN(userId)) {
              await ctx.reply("❌ 无效的用户 ID");
              return;
            }

            db.removeSudo(userId);
            await ctx.reply(`✅ 已移除 sudo 权限: ${userId}`);
            break;
          }

          case "list":
          case "ls":
          case "l": {
            const sudoList = db.getSudoList();
            if (sudoList.length === 0) {
              await ctx.reply("👑 sudo 列表为空");
              return;
            }

            let text = fmt.bold("👑 Sudo 用户列表") + "\n\n";
            for (const userId of sudoList) {
              text += `${userId}\n`;
            }
            text += `\n总计: ${sudoList.length} 人`;
            await ctx.replyHTML(text);
            break;
          }

          default: {
            const prefix = process.env.CMD_PREFIX || ".";
            let text = fmt.bold("👑 Sudo 权限管理") + "\n\n";
            text += `${fmt.code(`${prefix}sudo add <用户>`)} - 添加 sudo 权限\n`;
            text += `${fmt.code(`${prefix}sudo remove <用户ID>`)} - 移除 sudo 权限\n`;
            text += `${fmt.code(`${prefix}sudo list`)} - 列出所有 sudo 用户\n`;
            await ctx.replyHTML(text);
          }
        }
      },
    },
  },
};

export default sudoPlugin;
