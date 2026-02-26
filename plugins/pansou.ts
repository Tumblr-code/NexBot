/**
 * Pansou 网盘搜索插件 (Telegraph 排版版)
 * 对接 pansou 本地 API 服务
 * 用法: .pan [关键词]
 */
import { Plugin } from "../src/utils/pluginBase.js";
import { Api } from "telegram";
import axios from "axios";

// 创建禁用代理的 axios 实例
const noProxyAxios = axios.create({
  proxy: false,
});

// Pansou API 配置
const PANSOU_API_URL = process.env.PANSOU_API_URL || "http://127.0.0.1:8888";
const PANSOU_API_TIMEOUT = parseInt(process.env.PANSOU_API_TIMEOUT || "30000");

// Telegraph 配置
const TELEGRAPH_API_URL = "https://api.telegra.ph";
let telegraphToken: string | null = null;

// 网盘类型显示名称映射
const TYPE_NAMES: Record<string, string> = {
  xunlei: "迅雷云盘",
  mobile: "移动云盘",
  uc: "UC网盘",
  magnet: "磁力链接",
  "123": "123云盘",
  aliyun: "阿里云盘",
  baidu: "百度网盘",
  quark: "夸克网盘",
  tianyi: "天翼云盘",
  yidong: "移动云盘",
  lixian: "离线下载",
  pikpak: "PikPak",
  "115": "115网盘",
  others: "其他",
};

// 类型图标
const TYPE_ICONS: Record<string, string> = {
  xunlei: "⚡",
  mobile: "📱",
  uc: "🌐",
  magnet: "🧲",
  "123": "📦",
  aliyun: "☁️",
  baidu: "🔵",
  quark: "🦅",
  tianyi: "📡",
  pikpak: "📂",
  "115": "📎",
  others: "📋",
};

// HTML 转义
const escapeHtml = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// 获取或创建 Telegraph Token
const getTelegraphToken = async (): Promise<string | null> => {
  if (telegraphToken) return telegraphToken;
  
  try {
    const response = await noProxyAxios.post(`${TELEGRAPH_API_URL}/createAccount`, {
      short_name: "PansouSearch",
      author_name: "Pansou Bot",
    });
    
    if (response.data?.ok) {
      telegraphToken = response.data.result.access_token;
      return telegraphToken;
    }
  } catch (e: any) {
    console.error("[Pansou] Failed to create Telegraph account:", e?.message || e);
    console.error("[Pansou] Error details:", JSON.stringify(e));
  }
  return null;
};

// 创建 Telegraph 页面
const createTelegraphPage = async (title: string, content: string): Promise<string | null> => {
  const token = await getTelegraphToken();
  if (!token) return null;
  
  try {
    const response = await noProxyAxios.post(`${TELEGRAPH_API_URL}/createPage`, {
      access_token: token,
      title: title.substring(0, 256),
      author_name: "Pansou 网盘搜索",
      content: content,
      return_content: false,
    });
    
    if (response.data?.ok) {
      return response.data.result.url;
    }
  } catch (e: any) {
    console.error("[Pansou] Failed to create Telegraph page:", e?.message || e);
    console.error("[Pansou] Response data:", e?.response?.data);
    console.error("[Pansou] Content length:", content?.length);
  }
  return null;
};

// 将内容转换为 Telegraph 节点格式
const textToNode = (text: string): any => {
  return { tag: "p", children: [text] };
};

const linkToNode = (text: string, url: string): any => {
  return { 
    tag: "a", 
    attrs: { href: url, target: "_blank" },
    children: [text] 
  };
};

const boldToNode = (text: string): any => {
  return { tag: "b", children: [text] };
};

const italicToNode = (text: string): any => {
  return { tag: "i", children: [text] };
};

// 执行搜索
const searchPansou = async (keyword: string, options?: {
  channels?: string[];
  plugins?: string[];
  sourceType?: string;
}): Promise<any> => {
  const params: Record<string, any> = {
    kw: keyword,
    res: "merged_by_type",
    src: options?.sourceType || "all",
  };
  
  if (options?.channels && options.channels.length > 0) {
    params.channels = options.channels.join(",");
  }
  
  if (options?.plugins && options.plugins.length > 0) {
    params.plugins = options.plugins.join(",");
  }
  
  const response = await axios.get(`${PANSOU_API_URL}/api/search`, {
    params,
    timeout: PANSOU_API_TIMEOUT,
    proxy: false,
  });
  
  return response.data;
};

// 格式化结果为 Telegraph HTML 内容 - 美化版
const formatTelegraphContent = (data: any, keyword: string): string => {
  const resultsByType = data.merged_by_type || data.results_by_type || {};
  
  // 计算总数
  let totalCount = 0;
  for (const items of Object.values(resultsByType)) {
    if (Array.isArray(items)) {
      totalCount += items.length;
    }
  }
  
  if (totalCount === 0) {
    return JSON.stringify([textToNode(`未找到「${keyword}」的相关结果`)]);
  }
  
  const nodes: any[] = [];
  
  // 美化标题 - 使用大标题和装饰
  nodes.push({ tag: "h1", children: [`🔍 ${keyword}`] });
  nodes.push({ 
    tag: "blockquote", 
    children: [
      { tag: "b", children: ["📊 搜索结果统计"] },
      textToNode(`\n共找到 ${totalCount} 条资源`)
    ] 
  });
  nodes.push({ tag: "br" });
  
  let displayedCount = 0;
  const MAX_PER_TYPE = 15; // 每类最多显示15条
  const MAX_TOTAL = 80; // 总共最多显示80条
  
  // 按类型分组显示
  for (const [type, items] of Object.entries(resultsByType)) {
    if (!Array.isArray(items) || items.length === 0) continue;
    if (displayedCount >= MAX_TOTAL) break;
    
    const typeName = TYPE_NAMES[type] || type;
    const icon = TYPE_ICONS[type] || "📁";
    
    // 类型标题 - 使用粗体和装饰
    nodes.push({ 
      tag: "h3", 
      children: [`${icon} ${typeName}`] 
    });
    nodes.push({
      tag: "p",
      children: [{ tag: "i", children: [`📦 该类别共 ${items.length} 条资源`] }]
    });
    
    // 结果列表 - 使用表格样式
    const displayItems = (items as any[]).slice(0, MAX_PER_TYPE);
    
    displayItems.forEach((item, index) => {
      // 磁力链接用 note，其他用 title
      const title = item.title || item.note || "无标题";
      const url = item.url || "";
      const size = item.size || "";
      const source = item.source || "";
      const isMagnet = type === "magnet" || url.startsWith("magnet:");
      
      // 构建美化后的列表项
      const itemNumber = (index + 1).toString().padStart(2, '0');
      
      // 标题行 - 使用粗体链接
      nodes.push({
        tag: "p",
        children: [
          { tag: "b", children: [`${itemNumber}. `] },
          linkToNode(title.substring(0, 80) + (title.length > 80 ? "..." : ""), url)
        ]
      });
      
      // 磁力链接显示完整链接（可复制）
      if (isMagnet && url) {
        nodes.push({
          tag: "pre",
          children: [url]
        });
        nodes.push({
          tag: "p",
          children: [{ 
            tag: "i", 
            children: ["👆 点击链接即可复制磁力链接"] 
          }]
        });
      }
      
      // 元信息行
      if (size || source) {
        const metaParts: string[] = [];
        if (size) metaParts.push(`💾 ${size}`);
        if (source) metaParts.push(`📡 ${source}`);
        
        nodes.push({
          tag: "blockquote",
          children: [{ tag: "i", children: [metaParts.join(" | ")] }]
        });
      }
    });
    
    // 显示更多提示
    if ((items as any[]).length > MAX_PER_TYPE) {
      nodes.push({
        tag: "p",
        children: [{ 
          tag: "i", 
          children: [`➕ 还有 ${(items as any[]).length - MAX_PER_TYPE} 条结果未显示...`] 
        }]
      });
    }
    
    nodes.push({ tag: "hr" });
    displayedCount += displayItems.length;
  }
  
  // 底部提示 - 美化
  nodes.push({ tag: "br" });
  nodes.push({
    tag: "blockquote",
    children: [
      { tag: "b", children: ["💡 使用提示"] },
      textToNode("\n• 点击标题即可访问资源\n• 资源来自各大网盘分享\n• 请遵守相关法律法规")
    ]
  });
  nodes.push({ tag: "br" });
  nodes.push({
    tag: "p",
    children: [{ 
      tag: "i", 
      children: ["🤖 Powered by Pansou Search Bot"] 
    }]
  });
  
  return JSON.stringify(nodes);
};

// 格式化 Telegram 消息（美化版）
const formatTelegramMessage = (data: any, keyword: string, telegraphUrl: string): string => {
  const resultsByType = data.merged_by_type || data.results_by_type || {};
  
  let totalCount = 0;
  const typeStats: string[] = [];
  
  // 按数量排序
  const sortedTypes = Object.entries(resultsByType)
    .filter(([_, items]) => Array.isArray(items) && items.length > 0)
    .sort((a: any, b: any) => b[1].length - a[1].length);
  
  for (const [type, items] of sortedTypes) {
    totalCount += (items as any[]).length;
    const typeName = TYPE_NAMES[type] || type;
    const icon = TYPE_ICONS[type] || "📁";
    typeStats.push(`${icon} <b>${typeName}</b>: ${(items as any[]).length}条`);
  }
  
  // 每行显示2个统计
  const statsRows: string[] = [];
  for (let i = 0; i < typeStats.length; i += 2) {
    const row = typeStats.slice(i, i + 2).join("  |  ");
    statsRows.push(row);
  }
  
  return [
    `╔════════════════════════════╗`,
    `║  🔍 「${escapeHtml(keyword)}」搜索结果  ║`,
    `╚════════════════════════════╝`,
    "",
    `📊 <b>总计找到 ${totalCount} 条资源</b>`,
    "",
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...statsRows,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    "",
    `📖 <b><a href="${escapeHtml(telegraphUrl)}">👉 点击查看完整结果 👈</a></b>`
  ].join("\n");
};

// 主搜索命令
const pansouCommand = async (msg: Api.Message): Promise<void> => {
  const text = (msg as any).text || (msg as any).message || "";
  const parts = text.trim().split(/\s+/);
  const keyword = parts.slice(1).join(" ").trim();
  
  if (!keyword) {
    await msg.edit({
      text: "❌ 请输入搜索关键词\n\n用法：<code>.pan 关键词</code>",
      parseMode: "html",
    });
    return;
  }
  
  await msg.edit({
    text: `🔍 正在搜索「${escapeHtml(keyword)}」...`,
    parseMode: "html",
  });
  
  try {
    const result = await searchPansou(keyword);
    
    if (result.code !== 200 && result.code !== 0) {
      await msg.edit({
        text: `❌ 搜索失败：${escapeHtml(result.message || "未知错误")}`,
        parseMode: "html",
      });
      return;
    }
    
    const resultsByType = result.data?.merged_by_type || result.data?.results_by_type || {};
    const hasResults = Object.values(resultsByType).some((items: any) => Array.isArray(items) && items.length > 0);
    
    if (!hasResults) {
      await msg.edit({
        text: `❌ 未找到「${escapeHtml(keyword)}」的相关结果`,
        parseMode: "html",
      });
      return;
    }
    
    // 创建 Telegraph 页面
    await msg.edit({
      text: `🔍 正在生成搜索结果页面...`,
      parseMode: "html",
    });
    
    const telegraphContent = formatTelegraphContent(result.data, keyword);
    console.log("[Pansou] Content length:", telegraphContent.length);
    console.log("[Pansou] Content preview:", telegraphContent.substring(0, 200));
    
    const telegraphUrl = await createTelegraphPage(
      `${keyword} - 网盘搜索结果`,
      telegraphContent
    );
    console.log("[Pansou] Telegraph URL:", telegraphUrl);
    
    if (telegraphUrl) {
      const messageText = formatTelegramMessage(result.data, keyword, telegraphUrl);
      await msg.edit({
        text: messageText,
        parseMode: "html",
        linkPreview: false,
      });
    } else {
      // Telegraph 创建失败，使用备用方案（直接在 Telegram 显示部分结果）
      await msg.edit({
        text: `❌ Telegraph 页面生成失败，请稍后重试`,
        parseMode: "html",
      });
    }
    
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    
    if (errorMsg.includes("ECONNREFUSED")) {
      await msg.edit({
        text: `❌ 无法连接到 Pansou 服务\n\n请检查服务是否已启动\n当前配置：${PANSOU_API_URL}`,
        parseMode: "html",
      });
    } else if (errorMsg.includes("timeout")) {
      await msg.edit({
        text: `⏱️ 搜索超时，请稍后重试`,
        parseMode: "html",
      });
    } else {
      await msg.edit({
        text: `❌ 搜索出错：${escapeHtml(errorMsg)}`,
        parseMode: "html",
      });
    }
  }
};

class PansouPlugin extends Plugin {
  name = "pansou";
  description = `🔍 网盘搜索插件 (Telegraph版)

对接 Pansou 网盘搜索服务
搜索结果以 Telegraph 页面形式展示，排版更美观

用法: .pan 关键词
示例: .pan 复仇者联盟 / .pan 2024

功能:
• 搜索结果以 Telegraph 页面展示
• 分类清晰，排版美观
• 点击直接访问网盘资源
• 显示文件大小和来源信息`;

  cmdHandlers = {
    pan: pansouCommand,
    pansou: pansouCommand,
  };
}

export default new PansouPlugin();
