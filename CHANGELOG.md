# 更新日志

所有项目的显著变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.6.0] - 2026-03-21

### 🔒 安全修复 (Security)

- **src/plugins/exec.ts**: Shell 命令从黑名单改为白名单模式
  - 原有黑名单（如 `rm -rf /`）可通过双空格、转义等方式绕过，已废弃
  - 改为白名单：只允许 `ls`、`cat`、`git`、`bun` 等内置安全命令执行
  - 支持通过 `SHELL_WHITELIST` 环境变量自定义扩展白名单
- **src/plugins/exec.ts**: `eval` 命令补充准确的安全说明
  - 移除错误的"沙箱"注释（`new Function()` 不是沙箱）
  - 添加警告日志记录每次 eval 调用，便于审计
- **.env.example**: `ENABLE_SHELL_EXEC` 默认值从 `true` 改为 `false`
  - 用户必须主动设置为 `true` 才能启用 Shell 执行，降低默认风险

### 🐛 Bug 修复 (Fixed)

- **src/utils/logger.ts**: 修复日志文件中丢失 `...args` 错误堆栈的 Bug
  - 原 `writeToFile(formatted)` 不包含 `args` 参数，Error 对象的 stack 不会写入文件
  - 新增 `serializeArg()` 函数，Error 输出完整 stack，对象序列化为 JSON
- **src/index.ts**: 修复 `uncaughtException` 后继续运行导致状态污染的问题
  - 原来捕获后"不退出进程，继续运行"，可能导致内存泄漏或数据损坏
  - 现在记录错误后执行优雅关闭（断开 Telegram 连接、关闭数据库），然后以退出码 1 退出
  - 同等处理 `unhandledRejection`
- **src/utils/rateLimiter.ts**: 修复双重判断逻辑 Bug
  - 原代码先 `count >= max` 封禁，再 `count++` 后又 `count > max` 二次封禁，逻辑冗余
  - 改为先 `count++` 再 `count > max` 单次判断，逻辑清晰
- **test/bug-checker.ts**: 修复硬编码本地路径问题
  - 原代码写死 `/mnt/okcomputer/output/nexbot`，在其他环境均报错
  - 改为优先使用命令行参数，其次 `process.cwd()`

### ⚡ 性能优化 (Performance)

- **src/utils/logger.ts**: 日志写入从同步改为异步流写入
  - 原 `appendFileSync` 同步 I/O 会阻塞事件循环
  - 改用 `createWriteStream` 异步流写入，高频日志不再影响响应速度
- **src/core/pluginManager.ts**: 插件初次加载改用普通 `import()`，不再强制 cache-busting
  - 原来所有加载（含启动时首次加载）都加 `?t=timestamp` 绕过缓存，导致内存浪费
  - Cache-busting 现在只在热重载 `reloadPlugin()` 时使用
- **src/core/pluginManager.ts**: `onMessage` 改为并行执行
  - 原来串行 `await instance.onMessage()`，多插件时延迟叠加
  - 改为 `Promise.allSettled()` 并行执行，单个插件失败不影响其他插件
- **src/utils/version.ts**: 版本号改为直接 `import` package.json
  - 原来每次启动读取磁盘文件 + JSON.parse，改为编译时静态 import，零 I/O

### 🏗️ 代码结构 (Refactor)

- **src/utils/pluginManager.ts**: 消除与 core/pluginManager.ts 的重复
  - `getPrefixes()` 和 `getPrefix()` 改为代理调用 core 中的 `getCommandPrefixes()` / `getPrimaryPrefix()`
  - 确保前缀逻辑只在一处维护
- **src/utils/pluginBase.ts**: 移除与 `types/index.ts` 冲突的 `abstract class Plugin`
  - 改为 `export type { Plugin, ... } from "../types/index.js"` 统一类型来源
  - 保留 `createDirectoryInAssets` 工具函数
- **src/utils/index.ts**: 新增 utils 统一导出入口
  - 插件和其他模块可通过 `import { logger, ... } from "../utils/index.js"` 一行引入所需工具
- **src/core/pluginManager.ts**: 补充 `Api` 导入，消除 `msg: any` 类型

### 📦 依赖管理 (Dependencies)

- 移除 `axios`：Bun 内置 `fetch` 可完全替代，节省约 400KB 包体积
- 移除 `lowdb`：项目实际使用 `bun:sqlite`，`lowdb` 从未被引用
- 新增 `@types/bun` 开发依赖：消除代码中 `@ts-ignore` 对 Bun 特有 API 的注释
- 新增 `"test": "bun test"` 脚本和 `"bun"` 关键字
- `"main"` 字段从 `src/index.ts` 改为 `dist/index.js`（符合 npm 规范）

### 🧪 测试 (Tests)

- 新增 `test/core/parseCommand.test.ts`：命令解析单元测试
  - 覆盖 `parseCommandText`、`resolveCommandPrefix`、`getCommandPrefixes` 等函数
- 新增 `test/utils/rateLimiter.test.ts`：限流器完整单元测试
  - 覆盖正常请求、超限封禁、手动封禁/解封、并发安全、统计信息等场景
- 新增 `test/utils/cache.test.ts`：缓存单元测试
  - 覆盖 TTL 过期、LRU 淘汰、getOrSet 防穿透、命中率统计等场景

### 🔧 CI/CD

- **`.github/workflows/ci.yml`**: 固定 Bun 版本为 `1.2.0`（原 `latest` 构建不可重现）
- **`.github/workflows/ci.yml`**: 测试步骤添加 `--coverage` 并上传覆盖率报告
- **`.github/dependabot.yml`**: 新增 Dependabot 配置，每周一自动检查依赖更新
- **`tsconfig.json`**: 添加 `bun-types` 类型引用；测试目录加入 `include`

## [1.5.1] - 2026-02-28

### Fixed

- **src/plugins/plugin.ts**: 修复插件列表显示名称错误的问题
  - 修复 `extractPluginInfo` 函数，添加插件定义位置检测（支持 `const xxx: Plugin = {}` 和 `class Xxx extends Plugin` 两种格式）
  - 使用单词边界 `\b` 避免匹配 `short_name` 等非插件名称字段
  - 修复 weather 插件显示为"北京"、speedtest 插件显示为"Cloudflare"、pansou 插件显示为"PansouSearch" 的问题

### Changed

- **src/utils/client.ts**: 添加 SOCKS5 代理支持
  - 默认使用 `socks5://127.0.0.1:7891` 代理连接 Telegram
  - 支持通过 `ALL_PROXY` 环境变量自定义代理地址

## [1.5.2] - 2026-03-18

### Fixed

- **plugins/weather.ts**: 修复生产环境天气海报中文字体乱码和文字错位问题
  - 天气海报 SVG 改为优先使用中文字体链，不再只依赖 `Arial`
  - 对城市名、国家名、天气描述、风向等动态文本做 SVG 转义，避免特殊字符破坏渲染
  - 恢复天气图标绘制到海报中，生成结果与设计更一致

### Changed

- **README.md / INSTALL.md / QUICKSTART.md**: 补充 Linux 服务器字体依赖说明
  - 明确要求安装 `fontconfig` 和 `fonts-noto-cjk`
  - 新增 weather 海报乱码问题的排查说明

## [1.5.0] - 2026-02-26

### 🎉 第一个稳定版发布

### Added

- **完整插件生态**: 内置插件 + 7个扩展插件
  - `sysinfo` - 系统信息监控（内置）
  - `help` - 帮助系统（内置）
  - `exec` - 安全命令执行（内置）
  - `debug` - 调试工具（内置）
  - `plugin` - 插件管理器（内置）
  - `speedtest` - 网速测试
  - `pansou` - 网盘搜索
  - `lottery` - 自动抽奖 v2.1
  - `weather` - 天气查询
  - `hitokoto` - 随机一言
  - `privateguard` - 私聊保护
- **自动删除功能**: 所有命令消息 60秒后自动清理
- **消息编辑模式**: 命令直接编辑原消息，不发送新消息
- **点击复制**: 帮助系统中所有命令和插件名支持点击复制

### Changed

- 将 system 插件功能移植到内置 sysinfo 插件
- 统一所有命令使用 ctx.edit/editHTML
- 优化 help 显示结构

### Fixed

- 修复 lottery 插件多群组支持
- 修复数据库字段名 bug
- 修复重复键定义问题

## [1.4.1] - 2026-02-26

### Fixed

- **plugins/lottery.ts**: 修复数据库表结构，添加缺失的 `chat_id` 字段
- **plugins/lottery.ts**: 修复超级群组 ID 格式问题，自动添加 `-100` 前缀

## [1.4.0] - 2026-02-26

### Added

- **plugins/lottery.ts**: 🎰 自动抽奖插件 v2.1，支持多群组监控
  - 新增 `lottadd` 命令添加监控群组
  - 新增 `lottdel` 命令删除监控群组
  - 新增 `lotton` / `lottoff` 开启/关闭自动参与
  - 数据库缓存机制，防止消息被快速编辑丢失内容
  - 异步处理消息，自动提取关键词并发送

### Changed

- 版本号更新至 1.4.0

## [1.0.22] - 2026-02-26

### Fixed

- **plugins/system.ts**: 修复 `sys` 命令参数类型错误，将 `string[]` 正确转换为 `string`
- **src/plugins/debug.ts**: 修复 `chatType` 类型赋值，使用正确的枚举值（"User" / "Chat"）

### Changed

- 版本号更新至 1.0.22

## [1.0.21] - 2026-02-25

### Changed

- 项目重命名为 NexBot
- 更新所有相关链接和路径

## [1.0.1] - 2026-02-25

### Fixed

- **context.ts**: 修复 `replyHTML` 方法 `this` 指向错误，改为直接使用 `client.sendMessage`
- **cli/pm.ts**: 修复 ESM 模块中使用 `require()` 的问题，改用 ES 模块导入
- **rateLimiter.ts**: 修复限流计数逻辑边界问题，增加计数后再次检查是否超限
- **pluginManager.ts**: 为内置插件导入添加时间戳避免缓存问题
- **pluginBase.ts**: 修复 ESM 模块中使用 `require()` 的问题
- **help.ts, sudo.ts, plugin.ts**: 修复 HTML `blockquote` 标签格式（移除不正确的 `expandable` 属性）
- **client.ts**: 为 `askQuestion` 方法添加错误处理和清理逻辑
- **plugins/ai.ts, privateguard.ts**: 同样修复 `blockquote` 标签格式

### Security

- 增强错误处理，防止 stdin 事件监听器泄漏
- 改进限流器，防止边界条件下的滥用

## [1.0.0] - 2024-02-23

### 🎉 初始发布

NexBot 第一个正式版本发布！

### ✨ 核心功能

- **极速启动** - 基于 Bun 运行时，启动速度提升 10 倍
- **极简架构** - 核心代码仅 1000 行
- **插件系统** - 热重载、自动加载、别名支持
- **权限管理** - sudo 分级权限控制
- **内置数据库** - Bun SQLite，零配置
- **完整类型** - TypeScript 100% 覆盖

### 🔌 内置插件

- `help` - 帮助系统和命令列表
- `plugin` - 插件管理器
- `debug` - 调试工具（id, echo, ping, msg）
- `sudo` - 权限管理
- `exec` - 安全的 Shell 执行
- `sysinfo` - 系统信息监控

### 🔧 扩展插件

- `weather` - 天气查询
- `ip` - IP 地址查询
- `qr` - 二维码生成
- `hitokoto` - 一言
- `moyu` - 摸鱼日报
- `calc` - 科学计算器
- `httpcat` - HTTP 状态猫
- `sticker2pic` - 表情转图片
- `whois` - 域名 WHOIS 查询
- `speedtest` - 网速测试
- `tts` - 文字转语音

### 🛠️ 开发工具

- `bun pm create` - 创建插件模板
- `bun pm list` - 列出已安装插件
- `bun pm remove` - 移除插件

### 📚 文档

- 完整的 README
- 详细的安装指南
- 架构设计文档
- 贡献指南
- API 文档

### 🔒 安全特性

- 危险命令自动拦截
- sudo 权限分级
- Shell 执行可禁用
- 命令超时保护

### ⚡ 性能优化

- SQLite WAL 模式
- 命令映射缓存
- 懒加载插件
- 异步 I/O

---

## 版本说明

### 版本号格式

`主版本号.次版本号.修订号`

- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能新增
- **修订号**: 向下兼容的问题修正

### 标签说明

- `Added` - 新功能
- `Changed` - 变更
- `Deprecated` - 废弃
- `Removed` - 移除
- `Fixed` - 修复
- `Security` - 安全

---

Made with ❤️ by NexBot Team
