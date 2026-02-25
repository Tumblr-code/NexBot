# 🤖 NexBot

[![CI](https://github.com/Tumblr-code/my-telegram-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/Tumblr-code/my-telegram-bot/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

下一代 Telegram Bot 框架 - 更快、更简单、更稳定

## ✨ 特性

- ⚡ **极速启动** - 基于 Bun 运行时，启动速度提升 10 倍
- 🎯 **极简架构** - 核心代码 < 1000 行，易于理解和扩展
- 🔌 **插件系统** - 热重载、自动加载、别名支持
- 🛡️ **安全可靠** - 内置权限管理、危险命令拦截、限流保护
- 💾 **内置数据库** - Bun SQLite，零配置、高性能
- 📊 **健康监控** - 实时监控运行状态和性能指标
- 💨 **智能缓存** - LRU 缓存策略，自动过期清理
- 📝 **TypeScript** - 完整的类型支持
- 🚀 **现代语法** - ESM、Top-level await

## 📦 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 运行时 | Bun | >= 1.2.0 |
| 语言 | TypeScript | 5.7+ |
| Telegram | GramJS | 2.26+ |
| 数据库 | Bun SQLite | 内置 |

## 🚀 快速开始

### 1. 安装 Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. 克隆项目

```bash
git clone https://github.com/Tumblr-code/my-telegram-bot.git
cd my-telegram-bot
```

### 3. 安装依赖

```bash
bun install
```

### 4. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 Telegram API 信息
```

从 [my.telegram.org/apps](https://my.telegram.org/apps) 获取 API ID 和 API Hash。

### 5. 启动

```bash
# 生产模式
bun start

# 开发模式（热重载）
bun run dev
```

首次启动需要登录 Telegram，按照提示输入手机号和验证码。

## 📖 使用指南

### 命令前缀

- **生产模式**: `.` (可配置)
- **开发模式**: `!`

### 内置命令

| 命令 | 描述 | 权限 |
|------|------|------|
| `help` | 显示帮助信息 | 所有人 |
| `id` | 获取聊天信息 | 所有人 |
| `ping` | 测试响应速度 | 所有人 |
| `echo` | 回声测试 | 所有人 |
| `sysinfo` | 系统信息 | 所有人 |
| `uptime` | 运行时间 | 所有人 |
| `health` | 健康状态 | 所有人 |
| `sudo` | 权限管理 | sudo |
| `plugin` | 插件管理 | sudo |
| `exec` | Shell 执行 | sudo |
| `eval` | JavaScript 执行 | sudo |
| `cache` | 缓存统计 | sudo |
| `ratelimit` | 限流统计 | sudo |

### 扩展插件

#### 实用工具
| 命令 | 描述 |
|------|------|
| `weather` | 天气查询 |
| `ip` | IP 地址查询 |
| `qr` | 二维码生成 |
| `calc` | 科学计算器 |
| `time` | 世界时间查询 |
| `url` | 链接缩短/还原 |
| `encode` | 编码/解码工具 |
| `rand` | 随机工具 |
| `sed` | 文本替换 |

#### 信息查询
| 命令 | 描述 |
|------|------|
| `hitokoto` | 一言 |
| `moyu` | 摸鱼日报 |
| `httpcat` | HTTP 状态猫 |
| `bilibili` | B站视频查询 |
| `github` | GitHub 查询 |
| `dict` | 词典查询 |
| `translate` | 翻译功能 |
| `whois` | 域名查询 |
| `anime` | 动漫查询 |
| `movie` | 电影查询 |
| `news` | 热点新闻 |
| `finance` | 股票/加密货币/汇率 |

#### 娱乐
| 命令 | 描述 |
|------|------|
| `joke` | 随机笑话 |
| `pic` | 随机图片 |

#### 个人助手
| 命令 | 描述 |
|------|------|
| `remind` | 提醒功能 |
| `note` | 个人笔记 |
| `sticker2pic` | 表情转图片 |
| `speedtest` | 网速测试 |
| `tts` | 文字转语音 |
| `ai` | AI 对话 |

查看更多插件: [PLUGINS.md](./PLUGINS.md)

### 插件管理

```bash
# 创建新插件
bun pm create myplugin

# 列出已安装
bun pm list

# 移除插件
bun pm remove myplugin
```

## 🔌 开发插件

创建一个简单的插件：

```typescript
import { Plugin } from "../src/types/index.js";

const myPlugin: Plugin = {
  name: "myplugin",
  version: "1.0.0",
  description: "我的插件",
  author: "Your Name",

  commands: {
    hello: {
      description: "打招呼",
      handler: async (msg, args, ctx) => {
        await ctx.reply("👋 Hello!");
      },
    },
  },
};

export default myPlugin;
```

### 插件 API

#### 命令上下文 (ctx)

```typescript
ctx.reply(text, options)      // 发送消息
ctx.replyHTML(html)           // 发送 HTML 格式消息
ctx.deleteMessage()           // 删除消息
ctx.isSudo                    // 是否为 sudo 用户
ctx.isPrivate                 // 是否为私聊
ctx.isGroup                   // 是否为群组
ctx.isChannel                 // 是否为频道
```

#### 格式化工具 (fmt)

```typescript
import { fmt } from "../utils/context.js";

fmt.bold(text)      // 粗体
fmt.italic(text)    // 斜体
fmt.code(text)      // 行内代码
fmt.pre(text, lang) // 代码块
fmt.link(text, url) // 链接
fmt.mention(userId, name) // 提及用户
```

#### 数据库

```typescript
import { db } from "../utils/database.js";

db.set(key, value)           // 存储数据
db.get(key, defaultValue)    // 获取数据
db.delete(key)               // 删除数据
db.isSudo(userId)            // 检查 sudo 权限
db.addSudo(userId)           // 添加 sudo 权限
```

## ⚙️ 配置

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `TELEGRAM_API_ID` | Telegram API ID | 必填 |
| `TELEGRAM_API_HASH` | Telegram API Hash | 必填 |
| `SUDO_USERS` | 初始 sudo 用户 ID | - |
| `CMD_PREFIX` | 命令前缀 | `.` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `ENABLE_SHELL_EXEC` | 启用 shell 执行 | `true` |
| `SHELL_TIMEOUT` | shell 超时时间 | `30000` |

## 📁 项目结构

```
nexbot/
├── src/
│   ├── core/
│   │   ├── pluginManager.ts    # 插件管理器
│   │   └── commandHandler.ts   # 命令处理器
│   ├── plugins/                # 内置插件
│   ├── utils/                  # 工具函数
│   ├── types/                  # 类型定义
│   ├── cli/                    # 命令行工具
│   └── index.ts                # 入口文件
├── plugins/                    # 扩展插件目录
├── data/                       # 数据库目录
├── logs/                       # 日志目录
└── docs/                       # 文档目录
```

## 🔒 安全

- 危险命令自动拦截（rm -rf / 等）
- sudo 权限分级管理
- Shell 执行可禁用
- 命令超时保护

## 📄 许可证

MIT License

---

Made with ❤️ by NexBot Team
