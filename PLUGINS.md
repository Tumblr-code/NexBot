# 🔌 NexBot 插件文档

本文档包含所有内置插件和扩展插件的详细说明。

---

## 📦 内置插件

内置插件位于 `src/plugins/` 目录，无需安装即可使用。

### 1. help - 帮助系统

**命令**: `help`, `h`, `start`

| 用法 | 描述 |
|------|------|
| `help` | 显示主帮助信息，列出所有可用命令 |
| `help <命令>` | 查看指定命令的详细帮助 |

**功能**: 提供 Bot 使用指南，显示分类命令列表，支持点击复制命令。

---

### 2. exec - 命令执行

**命令**: `exec`, `shell`, `sh`, `cmd`, `eval`, `js`

| 命令 | 描述 | 权限 |
|------|------|------|
| `exec <命令>` | 执行 Shell 命令 | sudo |
| `eval <代码>` | 执行 JavaScript 代码 | sudo |

**示例**:
```
.exec ls -la
.eval 1 + 1
.eval console.log("Hello")
```

**安全特性**:
- 自动拦截危险命令（rm -rf /, mkfs 等）
- 支持超时设置（默认 30 秒）
- 输出长度限制（默认 4000 字符）

---

### 3. debug - 调试工具

**命令**: `id`, `chatid`, `chat`, `echo`, `say`, `ping`, `pong`, `msg`

| 命令 | 描述 | 权限 |
|------|------|------|
| `id` | 获取当前聊天信息 | 所有人 |
| `echo <文本>` | 回声测试 | 所有人 |
| `ping` | 测试响应速度 | 所有人 |
| `msg` | 获取消息原始 JSON 数据 | sudo |

**示例**:
```
.id          # 显示聊天 ID、类型、用户信息
.echo Hello  # 回复 "Hello"
.ping        # 测试延迟
```

---

### 4. sysinfo - 系统信息

**命令**: `sysinfo`, `status`, `stats`, `info`, `uptime`, `up`, `db`, `database`, `health`, `hc`, `cache`, `ratelimit`, `rl`

| 命令 | 描述 | 权限 |
|------|------|------|
| `sysinfo` | 系统信息（内存、CPU、运行时间） | 所有人 |
| `uptime` | 显示运行时间 | 所有人 |
| `health` | 健康状态检查 | 所有人 |
| `db` | 数据库统计 | sudo |
| `cache` | 缓存统计 | sudo |
| `ratelimit` | 限流统计 | sudo |

**示例输出**:
```
📊 NexBot v1.0.2

linux · x64 · v20.0.0
⏱️ 2天 5小时 32分钟

💾 ████████░░ 80%
1024MB / 2048MB

💻 ██░░░░░░░░ 15%
4核 · 8插件
```

---

### 5. plugin - 插件管理

**命令**: `plugin`, `pm`, `plugins`

| 用法 | 描述 | 权限 |
|------|------|------|
| `plugin list` | 查看插件列表 | sudo |
| `plugin install <名称>` | 安装插件 | sudo |
| `plugin remove <名称>` | 卸载插件 | sudo |
| `plugin reload <名称>` | 重载插件 | sudo |
| `plugin reloadall` | 重载所有插件 | sudo |
| `plugin alias` | 查看命令别名 | sudo |
| `plugin alias add <别名> <命令>` | 添加别名 | sudo |
| `plugin alias remove <别名>` | 删除别名 | sudo |

**示例**:
```
.plugin list                    # 查看所有插件
.plugin install speedtest       # 安装网速测试插件
.plugin remove speedtest        # 卸载插件
.plugin reload ai               # 重载 AI 插件
.plugin alias add s speedtest   # 添加别名 .s 代表 speedtest
```

---

## 📦 扩展插件

扩展插件位于 `plugins/` 目录，需要先安装才能使用。

### 1. ai - AI 智能助手

**文件**: `plugins/ai.ts`

**命令**: `ai`

**功能**: 支持多提供商的 AI 对话助手，兼容 OpenAI / Gemini / Claude / 火山引擎等标准接口。

**子命令**:

| 子命令 | 描述 |
|--------|------|
| `ai <问题>` | 普通对话（默认模式） |
| `ai chat <问题>` | 连续对话（带上下文记忆） |
| `ai search <关键词>` | 联网搜索 |
| `ai image <描述>` | 生成图片 |
| `ai tts <文本>` | 文字转语音 |
| `ai audio <语音>` | 语音回答（语音输入+输出） |
| `ai searchaudio <关键词>` | 搜索+语音回答 |
| `ai prompt <预设>` | 设置全局 Prompt 预设 |
| `ai config` | 查看/修改配置 |
| `ai model` | 查看/切换模型 |
| `ai clear` | 清除当前对话历史 |
| `ai clearall` | 清除所有对话历史 |
| `ai stats` | 查看使用统计 |
| `ai export` | 导出对话历史 |

**配置说明**:
- 配置文件保存在 `data/ai/config.json`
- 支持多提供商配置
- 可设置 Telegraph 自动长文发布
- 支持自定义音色（Gemini/OpenAI）

**示例**:
```
.ai 你好
.ai chat 讲个故事
.ai search 今天的新闻
.ai image 一只可爱的猫咪
.ai tts 你好世界
```

---

### 2. pansou - 网盘搜索

**文件**: `plugins/pansou.ts`

**命令**: `pan`, `pansou`

**功能**: 对接 Pansou 网盘搜索服务，搜索结果以 Telegraph 页面形式展示，排版美观。

**用法**:
```
.pan <关键词>
```

**示例**:
```
.pan 复仇者联盟
.pan Python教程
```

**支持的网盘类型**:
- ⚡ 迅雷云盘
- ☁️ 阿里云盘
- 🔵 百度网盘
- 🦅 夸克网盘
- 📦 123云盘
- 🧲 磁力链接
- 📱 移动云盘
- 📡 天翼云盘
- 📂 PikPak
- 📎 115网盘

**环境变量**:
| 变量 | 描述 | 默认值 |
|------|------|--------|
| `PANSOU_API_URL` | Pansou API 地址 | `http://127.0.0.1:8888` |
| `PANSOU_API_TIMEOUT` | 请求超时时间 | `30000` |

---

### 3. privateguard - 私聊保护

**文件**: `plugins/privateguard.ts`

**命令**: `pglist`, `pgallow`, `pgremove`, `pgreset`, `pgtype`, `pgblocklist`, `pgblock`, `pgunblock`

**功能**: 陌生人私聊你时，自动要求其完成人机验证，否则自动删除消息并拉黑。

**管理命令**:

| 命令 | 描述 | 权限 |
|------|------|------|
| `pglist` | 查看已验证用户列表 | sudo |
| `pgallow <用户ID>` | 手动添加白名单 | sudo |
| `pgremove <用户ID>` | 移除白名单 | sudo |
| `pgreset` | 重置所有数据 | sudo |
| `pgtype <类型>` | 切换验证类型 | sudo |
| `pgblocklist` | 查看黑名单 | sudo |
| `pgblock <用户ID>` | 拉黑用户 | sudo |
| `pgunblock <用户ID>` | 解除拉黑 | sudo |

**验证类型**:
- `math` - 数学计算（如：15 + 23 = ?）
- `click` - 顺序点击数字按钮
- `random` - 随机混合

**配置**:
```typescript
const CONFIG = {
  MAX_ATTEMPTS: 3,        // 最大尝试次数
  EXPIRE_MINUTES: 3,      // 验证超时时间（分钟）
  VERIFY_TYPE: "math",    // 默认验证类型
};
```

**数据文件**:
- `data/privateguard_allowed.json` - 已验证用户
- `data/privateguard_pending.json` - 验证中用户
- `data/privateguard_blocked.json` - 黑名单

---

### 4. speedtest - 网速测试

**文件**: `plugins/speedtest.ts`

**命令**: `speedtest`, `st`, `speed`

**功能**: 测试服务器网络速度（延迟和下载速度）。

**用法**:
```
.speedtest
```

**示例输出**:
```
🚀 网速测试结果

📶 延迟: 45 ms
⬇️ 下载: 125.50 Mbps
⏱️ 耗时: 2.5s

测试时间: 2024/1/15 10:30:00
```

**测试服务器**:
- Cloudflare Speed Test
- Hetzner Speed Test

---

## 🛠️ 开发插件

### 基础插件结构

```typescript
import { Plugin } from "../src/types/index.js";

const myPlugin: Plugin = {
  name: "myplugin",           // 插件名称（唯一）
  version: "1.0.0",           // 版本号
  description: "插件描述",     // 描述
  author: "Your Name",        // 作者

  commands: {
    // 命令定义
    hello: {
      description: "打招呼",   // 命令描述
      sudo: false,             // 是否需要 sudo 权限
      aliases: ["hi"],         // 别名
      examples: ["hello", "hello world"],  // 使用示例
      handler: async (msg, args, ctx) => {
        // msg - 消息对象
        // args - 命令参数数组
        // ctx - 命令上下文
        await ctx.reply("👋 Hello!");
      },
    },
  },

  // 消息监听（可选）
  onMessage: async (msg, client) => {
    // 处理所有消息
  },

  // 初始化钩子（可选）
  onInit: async (client) => {
    // 插件加载时执行
  },

  // 卸载钩子（可选）
  onUnload: async () => {
    // 插件卸载时执行
  },
};

export default myPlugin;
```

### 使用 TeleBox 兼容模式

```typescript
import { Plugin } from "../src/utils/pluginBase.js";

class MyPlugin extends Plugin {
  name = "myplugin";
  version = "1.0.0";
  description = "我的插件";
  author = "Your Name";

  cmdHandlers = {
    hello: async (msg) => {
      await msg.reply({ message: "Hello!" });
    },
  };
}

export default new MyPlugin();
```

### 上下文 API

```typescript
// 发送消息
await ctx.reply("普通文本");
await ctx.replyHTML("<b>HTML</b> 格式");

// 删除消息
await ctx.deleteMessage();

// 判断聊天类型
if (ctx.isPrivate) { /* 私聊 */ }
if (ctx.isGroup) { /* 群组 */ }
if (ctx.isChannel) { /* 频道 */ }
if (ctx.isSudo) { /* sudo 用户 */ }
```

### 格式化工具

```typescript
import { fmt } from "../src/utils/context.js";

fmt.bold("粗体");           // <b>粗体</b>
fmt.italic("斜体");         // <i>斜体</i>
fmt.code("代码");           // <code>代码</code>
fmt.pre("代码块", "js");    // <pre><code class="language-js">代码块</code></pre>
fmt.link("文本", "url");    // <a href="url">文本</a>
fmt.mention(userId, "名");  // <a href="tg://user?id=123">名</a>
```

---

## 📝 插件安装流程

1. 将插件文件放入 `plugins/` 目录
2. 使用 `.plugin list` 查看可用插件
3. 使用 `.plugin install <名称>` 安装
4. 使用 `.plugin remove <名称>` 卸载

---

Made with ❤️ by NexBot Team
