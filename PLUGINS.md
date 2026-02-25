# 🔌 插件列表

NexBot 支持丰富的插件扩展，以下是所有可用插件的详细说明。

## 📦 内置插件

内置插件位于 `src/plugins/` 目录，随核心一起加载。

### help
- **命令**: `.help`, `.h`
- **描述**: 帮助系统和命令列表
- **权限**: 所有人
- **示例**:
  - `.help` - 显示所有命令
  - `.help weather` - 查看 weather 命令帮助

### plugin
- **命令**: `.plugin`, `.pm`, `.plugins`
- **描述**: 插件管理器
- **权限**: sudo
- **示例**:
  - `.plugin list` - 列出所有插件
  - `.plugin reload weather` - 重载 weather 插件
  - `.plugin alias add w weather` - 添加别名

### debug
- **命令**: `.id`, `.echo`, `.ping`, `.msg`
- **描述**: 调试工具
- **权限**: 所有人 / sudo (msg)
- **示例**:
  - `.id` - 获取当前聊天信息
  - `.echo Hello` - 回声测试
  - `.ping` - 测试响应速度
  - `.msg` - 获取消息原始数据 (sudo)

### sudo
- **命令**: `.sudo`, `.admin`
- **描述**: 权限管理
- **权限**: sudo
- **示例**:
  - `.sudo add @user` - 添加 sudo 用户
  - `.sudo remove 123456` - 移除 sudo 用户
  - `.sudo list` - 列出所有 sudo 用户

### exec
- **命令**: `.exec`, `.shell`, `.sh`, `.eval`, `.js`
- **描述**: 代码执行
- **权限**: sudo
- **示例**:
  - `.exec ls -la` - 执行 shell 命令
  - `.eval 1 + 1` - 执行 JavaScript

### sysinfo
- **命令**: `.sysinfo`, `.status`, `.uptime`, `.db`, `.health`, `.cache`, `.ratelimit`
- **描述**: 系统信息监控
- **权限**: 所有人 / sudo (db, cache, ratelimit)
- **示例**:
  - `.sysinfo` - 显示系统信息
  - `.uptime` - 显示运行时间
  - `.db` - 显示数据库信息 (sudo)
  - `.health` - 健康状态检查
  - `.cache` - 缓存统计 (sudo)
  - `.ratelimit` - 限流统计 (sudo)

---

## 🔧 扩展插件

扩展插件位于 `plugins/` 目录。

### 实用工具类

#### weather
- **命令**: `.weather`, `.w`, `.tq`
- **描述**: 天气查询
- **权限**: 所有人
- **示例**: `.weather 北京`, `.weather Shanghai`

#### ip
- **命令**: `.ip`, `.ipinfo`
- **描述**: IP 地址查询
- **权限**: 所有人
- **示例**: `.ip`, `.ip 8.8.8.8`

#### qr
- **命令**: `.qr`, `.qrcode`
- **描述**: 二维码生成
- **权限**: 所有人
- **示例**: `.qr Hello World`, `.qr https://example.com`

#### calc
- **命令**: `.calc`, `.c`, `.calculate`
- **描述**: 科学计算器
- **权限**: 所有人
- **示例**: `.calc 1+1`, `.calc sqrt(16)`, `.calc 2^10`

#### time
- **命令**: `.time`, `.t`, `.date`
- **描述**: 世界时间查询、日期显示
- **权限**: 所有人
- **示例**: `.time`, `.time 东京`, `.date`

#### url
- **命令**: `.shorten`, `.unshorten`
- **描述**: 链接缩短/还原
- **权限**: 所有人
- **示例**: `.shorten https://example.com`, `.unshorten https://bit.ly/xxx`

#### encode
- **命令**: `.base64`, `.urlencode`, `.hash`, `.hex`, `.json`
- **描述**: 编码/解码工具
- **权限**: 所有人
- **示例**: `.base64 encode hello`, `.hash md5 hello`, `.json {"a":1}`

#### rand
- **命令**: `.rand`, `.dice`, `.choose`, `.coin`, `.password`, `.uuid`
- **描述**: 随机工具
- **权限**: 所有人
- **示例**: `.rand`, `.dice 2d6`, `.choose A B C`, `.password 16`

#### sed
- **命令**: `.sed`, `.upper`, `.lower`, `.reverse`
- **描述**: 文本替换和转换
- **权限**: 所有人
- **示例**: `.sed s/old/new/ (回复消息)`, `.upper (回复消息)`

---

### 信息查询类

#### hitokoto
- **命令**: `.hitokoto`, `.yiyan`, `.yy`
- **描述**: 一言 - 随机语录
- **权限**: 所有人
- **示例**: `.hitokoto`

#### moyu
- **命令**: `.moyu`, `.my`, `.fish`
- **描述**: 摸鱼日报
- **权限**: 所有人
- **示例**: `.moyu`

#### httpcat
- **命令**: `.httpcat`, `.cat`, `.http`
- **描述**: HTTP 状态猫
- **权限**: 所有人
- **示例**: `.httpcat 404`, `.httpcat 200`

#### bilibili
- **命令**: `.bili`, `.bilibili`, `.bv`
- **描述**: B站视频信息查询
- **权限**: 所有人
- **示例**: `.bili BV1xx411c7mD`

#### github
- **命令**: `.github`, `.gh`
- **描述**: GitHub 仓库/用户信息查询
- **权限**: 所有人
- **示例**: `.github facebook/react`, `.github torvalds`

#### dict
- **命令**: `.dict`, `.d`, `.翻译`
- **描述**: 词典查询 - 中英互译
- **权限**: 所有人
- **示例**: `.dict hello`, `.dict 你好`

#### translate
- **命令**: `.tr`, `.translate`, `.翻译`
- **描述**: 翻译功能
- **权限**: 所有人
- **示例**: `.tr hello`, `.tr zh hello`

#### whois
- **命令**: `.whois`, `.domain`
- **描述**: 域名 WHOIS 查询
- **权限**: 所有人
- **示例**: `.whois example.com`

#### anime
- **命令**: `.anime`, `.bangumi`, `.bgm`
- **描述**: 动漫信息查询
- **权限**: 所有人
- **示例**: `.anime 进击的巨人`

#### movie
- **命令**: `.movie`, `.film`, `.电影`
- **描述**: 电影信息查询
- **权限**: 所有人
- **示例**: `.movie 肖申克的救赎`

#### news
- **命令**: `.news`, `.zhihu`
- **描述**: 热点新闻、知乎热榜
- **权限**: 所有人
- **示例**: `.news`, `.news 10`, `.zhihu`

#### finance
- **命令**: `.stock`, `.crypto`, `.exchange`
- **描述**: 股票、加密货币、汇率查询
- **权限**: 所有人
- **示例**: `.stock AAPL`, `.crypto BTC`, `.exchange 100 USD CNY`

---

### 娱乐类

#### joke
- **命令**: `.joke`, `.programerjoke`
- **描述**: 随机笑话、程序员笑话
- **权限**: 所有人
- **示例**: `.joke`, `.programerjoke`

#### pic
- **命令**: `.pic`, `.wallpaper`, `.dog`, `.cat`, `.animepic`
- **描述**: 随机图片获取
- **权限**: 所有人
- **示例**: `.pic`, `.pic cat`, `.dog`, `.cat`, `.animepic`

---

### 个人助手类

#### remind
- **命令**: `.remind`, `.reminders`, `.cancelremind`
- **描述**: 提醒功能
- **权限**: 所有人
- **示例**: `.remind 10m 喝水`, `.remind 1h 开会`, `.reminders`

#### note
- **命令**: `.note`, `.notes`, `.delnote`, `.clearnotes`
- **描述**: 个人笔记功能
- **权限**: 所有人
- **示例**: `.note 记得买牛奶`, `.notes`, `.delnote 1`

#### sticker2pic
- **命令**: `.sticker2pic`, `.s2p`
- **描述**: 将贴纸转换为图片
- **权限**: 所有人
- **示例**: 回复贴纸消息 + `.sticker2pic`

#### speedtest
- **命令**: `.speedtest`, `.st`, `.speed`
- **描述**: 网速测试
- **权限**: sudo
- **示例**: `.speedtest`
- **依赖**: 需要安装 `speedtest-cli`

#### tts
- **命令**: `.tts`, `.say`, `.speak`
- **描述**: 文字转语音
- **权限**: 所有人
- **示例**: `.tts Hello World`, `.tts 你好世界`

#### ai
- **命令**: `.ai`, `.chat`, `.s`, `.img`, `.v`, `.a`, `.sa`
- **描述**: AI 智能助手 - 支持对话、搜索、生图、TTS、语音回答
- **权限**: 所有人
- **功能**:
  - 对话: `.ai 你好` 或 `.ai chat 问题`
  - 搜索: `.ai search 查询` 或 `.ai s 查询`
  - 生图: `.ai image 描述` 或 `.ai img 描述`
  - TTS: `.ai tts 文本` 或 `.ai v 文本`
  - 语音回答: `.ai audio 问题` 或 `.ai a 问题`
  - 搜索+语音: `.ai searchaudio 查询` 或 `.ai sa 查询`
- **配置管理**:
  - `.ai config add [服务商] [API密钥] [BaseURL]` - 添加服务商
  - `.ai config list` - 查看已配置服务商
  - `.ai model chat|search|image|tts [服务商] [模型]` - 设置模型
  - `.ai model auto` - 智能分配模型
- **其他功能**:
  - `.ai context on|off` - 上下文记忆开关
  - `.ai prompt set [内容]` - 设置全局Prompt预设
  - `.ai voice list` - 查看可用音色
  - `.ai telegraph on|off` - Telegraph长文开关
- **支持服务商**: OpenAI, Gemini, Claude, DeepSeek, Grok 等

#### pansou
- **命令**: `.pan`, `.pansou`
- **描述**: 网盘搜索 - 对接 Pansou 本地 API 服务
- **权限**: 所有人
- **示例**: `.pan 复仇者联盟`, `.pan 2024`
- **功能**:
  - 搜索结果以 Telegraph 页面展示
  - 分类清晰，排版美观
  - 支持多种网盘: 阿里云盘、百度网盘、夸克网盘、迅雷云盘等
  - 显示文件大小和来源信息
- **环境变量**:
  - `PANSOU_API_URL` - Pansou API 地址 (默认: http://127.0.0.1:8888)
  - `PANSOU_API_TIMEOUT` - 请求超时 (默认: 30000ms)

#### privateguard
- **命令**: (自动触发), `.pglist`, `.pgallow`, `.pgremove`, `.pgreset`, `.pgtype`
- **描述**: 私聊保护插件 - 人机验证防骚扰
- **权限**: 所有人 (验证), sudo (管理)
- **功能**:
  - 陌生人私聊时自动要求完成验证
  - 未通过验证则自动删除消息
  - 支持数学验证、点击验证、随机混合模式
  - **自动跳过机器人**: 检测到的机器人会自动加入白名单，不会触发验证
- **管理命令**:
  - `.pglist` - 查看已验证用户
  - `.pgallow [用户ID]` - 添加白名单
  - `.pgremove [用户ID]` - 移除白名单
  - `.pgreset` - 重置所有数据
  - `.pgtype math|click|random` - 切换验证类型

---

## 🛠️ 插件开发

### 创建插件

```bash
bun pm create myplugin
```

### 插件模板

```typescript
import { Plugin } from "../src/types/index.js";
import { fmt } from "../src/utils/context.js";

const myPlugin: Plugin = {
  name: "myplugin",
  version: "1.0.0",
  description: "插件描述",
  author: "Your Name",

  commands: {
    mycommand: {
      description: "命令描述",
      aliases: ["alias1"],
      examples: ["mycommand arg"],
      sudo: false,  // 是否需要 sudo
      handler: async (msg, args, ctx) => {
        // 命令逻辑
        await ctx.reply("Hello!");
      },
    },
  },

  async onInit(client) {
    console.log("插件已加载");
  },

  async onUnload() {
    console.log("插件已卸载");
  },
};

export default myPlugin;
```

### API 参考

#### ctx (命令上下文)

```typescript
ctx.reply(text)           // 发送文本消息
ctx.replyHTML(html)       // 发送 HTML 消息
ctx.deleteMessage()       // 删除消息
ctx.isSudo                // 是否为 sudo 用户
ctx.isPrivate             // 是否为私聊
ctx.isGroup               // 是否为群组
ctx.isChannel             // 是否为频道
ctx.client                // TelegramClient 实例
```

#### fmt (格式化工具)

```typescript
fmt.bold(text)            // <b>text</b>
fmt.italic(text)          // <i>text</i>
fmt.code(text)            // <code>text</code>
fmt.pre(text, lang)       // <pre><code>text</code></pre>
fmt.link(text, url)       // <a href="url">text</a>
```

#### db (数据库)

```typescript
db.set(key, value)        // 存储
db.get(key, defaultValue) // 读取
db.delete(key)            // 删除
db.isSudo(userId)         // 检查权限
db.addSudo(userId)        // 添加权限
```

---

## 📥 插件安装

### 手动安装

将 `.ts` 文件放入 `plugins/` 目录，然后重载插件：

```
.plugin reload <插件名>
```

---

**更多插件正在开发中...**
