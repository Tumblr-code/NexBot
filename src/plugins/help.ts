import { Plugin } from "../types/index.js";
import { pluginManager } from "../core/pluginManager.js";
import { fmt } from "../utils/context.js";

const helpPlugin: Plugin = {
  name: "help",
  version: "1.0.0",
  description: "帮助系统和命令列表",
  author: "NexBot",

  commands: {
    help: {
      description: "显示帮助信息",
      aliases: ["h", "start"],
      examples: ["help", "help ping", "help plugin"],
      handler: async (msg, args, ctx) => {
        const prefix = process.env.CMD_PREFIX || ".";
        
        if (args.length > 0) {
          // 显示特定命令帮助
          const cmdName = args[0].toLowerCase();
          const cmdInfo = pluginManager.getCommand(cmdName);
          
          if (!cmdInfo) {
            await ctx.reply("❓ 未知命令: " + cmdName);
            return;
          }

          const def = cmdInfo.def;
          const plugin = pluginManager.getPlugin(cmdInfo.plugin);
          const isFromCmdHandlers = pluginManager.isCmdHandlerCommand(cmdName);
          
          // 构建详细信息（放入折叠块）
          let detailText = "";
          
          detailText += "描述: " + def.description + "\n";
          detailText += "来源插件: " + cmdInfo.plugin + "\n";
          
          // 如果命令来自 cmdHandlers，显示更详细的信息
          if (isFromCmdHandlers && plugin) {
            detailText += "\n📋 该插件支持以下命令:\n";
            const pluginCmds = pluginManager.getPluginCommands(cmdInfo.plugin);
            
            if (pluginCmds.cmdHandlers.length > 0) {
              detailText += "管理命令: " + pluginCmds.cmdHandlers.join(", ") + "\n";
            }
            if (pluginCmds.commands.length > 0) {
              detailText += "普通命令: " + pluginCmds.commands.join(", ") + "\n";
            }
            
            // 显示插件描述
            if (plugin.description) {
              detailText += "\n插件说明:\n";
              detailText += plugin.description + "\n";
            }
          }
          
          if (def.aliases && def.aliases.length > 0) {
            detailText += "\n别名: " + def.aliases.join(", ") + "\n";
          }
          
          if (def.sudo) {
            detailText += "\n⚠️ 需要 sudo 权限\n";
          }
          
          if (def.examples && def.examples.length > 0) {
            detailText += "\n示例:\n";
            for (const ex of def.examples) {
              detailText += "  " + prefix + ex + "\n";
            }
          }
          
          // 构建最终消息
          let text = fmt.bold("📖 命令帮助: " + cmdName) + "\n\n";
          text += `<blockquote expandable>${detailText.trim()}</blockquote>`;

          await ctx.replyHTML(text);
        } else {
          // 显示主帮助 - 常用命令列表放入折叠块
          let commandsText = "";
          commandsText += "help - 显示帮助\n";
          commandsText += "ping - 测试延迟\n";
          commandsText += "id - 获取用户信息\n";
          commandsText += "sysinfo - 系统信息\n";
          commandsText += "speedtest - 网速测试\n";
          commandsText += "plugin list - 查看插件命令\n";
          
          // sudo 命令（如果用户是 sudo）
          if (ctx.isSudo) {
            commandsText += "\n👑 管理命令:\n";
            commandsText += "sudo - 权限管理\n";
            commandsText += "plugin - 插件管理\n";
            commandsText += "exec - 执行命令\n";
          }
          
          let text = fmt.bold("🤖 NexBot 帮助") + "\n\n";
          text += "前缀: " + fmt.code(prefix) + "\n";
          text += "使用 " + fmt.code(prefix + "help <命令>") + " 查看详细信息\n\n";
          text += fmt.bold("📌 常用命令") + "\n";
          text += `<blockquote expandable>${commandsText.trim()}</blockquote>\n\n`;
          text += fmt.italic("更多命令请使用 ") + fmt.code(prefix + "plugin list");
          
          await ctx.replyHTML(text);
        }
      },
    },
  },
};

export default helpPlugin;
