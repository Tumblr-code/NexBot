import { Plugin } from "../src/types/index.js";
import axios from "axios";
import { fmt } from "../src/utils/context.js";
import { db } from "../src/utils/database.js";

const BILIBILI_API = "https://api.live.bilibili.com";
const BILIBILI_WEB_API = "https://api.bilibili.com";

function getCookie(): string {
  return db.get("bilibili_cookie") as string || "";
}

async function getLiveStreamUrl(roomId: number): Promise<{ flvUrl: string; m3u8Url: string; quality: string } | null> {
  const cookie = getCookie();
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = `SESSDATA=${cookie}`;

  try {
    const res = await axios.get(
      `${BILIBILI_API}/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}&protocol=0,1&format=0,1,2&codec=0,1&qn=80&platform=web&h5=1`,
      { headers, timeout: 15000 }
    );

    if (res.data.code !== 0) return null;

    const data = res.data.data;
    if (!data.playurl_info) return null;

    const playUrl = data.playurl_info.playurl;
    const stream = playUrl.stream;
    if (!stream || stream.length === 0) return null;

    let flvUrl = "";
    let m3u8Url = "";
    let quality = "原画";

    for (const s of stream) {
      const formatList = s.format || [];
      for (const f of formatList) {
        const codecList = f.codec || [];
        for (const c of codecList) {
          const baseUrl = c.base_url;
          const urlInfo = c.url_info?.[0];
          if (!baseUrl || !urlInfo) continue;

          const host = urlInfo.host;
          const extra = urlInfo.extra || "";

          if (s.protocol_name === "http_stream" || s.protocol_name === "http_flv") {
            if (!flvUrl) flvUrl = host + baseUrl + extra;
          } else if (s.protocol_name === "http_hls") {
            if (!m3u8Url) m3u8Url = host + baseUrl + extra;
          }

          const qnDesc = playUrl.g_qn_desc || [];
          const qnItem = qnDesc.find((q: any) => q.qn === c.current_qn);
          if (qnItem) quality = qnItem.desc;
        }
      }
    }

    if (!flvUrl && !m3u8Url) return null;

    return { flvUrl, m3u8Url, quality };
  } catch {
    return null;
  }
}

async function getRoomInfo(roomId: number): Promise<any> {
  try {
    const res = await axios.get(`${BILIBILI_API}/room/v1/room/get_info?room_id=${roomId}`, { timeout: 10000 });
    return res.data.data;
  } catch {
    return null;
  }
}

async function getAnchorInfo(roomId: number): Promise<string> {
  try {
    const res = await axios.get(`${BILIBILI_API}/live_user/v1/UserInfo/get_anchor_in_room?roomid=${roomId}`, { timeout: 10000 });
    return res.data.data?.info?.uname || "";
  } catch {
    return "";
  }
}

const bilibiliPlugin: Plugin = {
  name: "bilibili",
  version: "1.4.0",
  description: "B站直播工具",
  author: "NexBot",

  commands: {
    bilibili: {
      description: "B站直播工具",
      aliases: ["bili", "blive"],
      examples: ["bili 9361321", "bili play 9361321"],
      handler: async (msg, args, ctx) => {
        const subCmd = args[0]?.toLowerCase();
        const param = args[1];

        if (!subCmd || subCmd === "help") {
          const helpText = fmt.bold("📺 B站直播工具 v1.4") + "\n\n" +
            "用法: .bili <命令>\n\n" +
            "📡 直播命令:\n" +
            "  .bili <房间号> - 查看直播信息\n" +
            "  .bili m3u8 <房间号> - 获取m3u8\n" +
            "  .bili flv <房间号> - 获取flv\n\n" +
            "🔐 登录: .bili login";
          await ctx.editHTML(helpText, { replyToMessageId: null });
          return;
        }

        if (subCmd === "login" || subCmd === "check") {
          const cookie = getCookie();
          if (!cookie) {
            await ctx.editHTML("❌ 未设置Cookie", { replyToMessageId: null });
            return;
          }
          try {
            const res = await axios.get(`${BILIBILI_WEB_API}/x/web-interface/nav`, {
              headers: { Cookie: `SESSDATA=${cookie}` },
              timeout: 10000
            });
            if (res.data.code === 0 && res.data.data?.isLogin) {
              const user = res.data.data;
              const vipText = user.vipStatus ? (user.vipType === 2 ? "年度大会员" : "月度大会员") : "普通用户";
              await ctx.editHTML(fmt.bold("✅ 已登录") + `\n\n👤 ${user.uname}\n💎 ${vipText}`, { replyToMessageId: null });
            } else {
              await ctx.editHTML("❌ Cookie已过期", { replyToMessageId: null });
            }
          } catch (err) {
            await ctx.editHTML("❌ 检查失败", { replyToMessageId: null });
          }
          return;
        }

        if (subCmd === "setcookie" || subCmd === "cookie") {
          const cookie = args.slice(1).join(" ").trim();
          if (!cookie) {
            await ctx.editHTML("❌ 请提供Cookie", { replyToMessageId: null });
            return;
          }
          db.set("bilibili_cookie", cookie);
          await ctx.editHTML("✅ Cookie已保存", { replyToMessageId: null });
          return;
        }

        let roomId: number;

        if (subCmd === "play" || subCmd === "flv" || subCmd === "m3u8") {
          if (!param) {
            await ctx.editHTML("❌ 请提供房间号", { replyToMessageId: null });
            return;
          }
          roomId = parseInt(param.replace(/[^0-9]/g, ""));
        } else if (/^\d+$/.test(subCmd)) {
          roomId = parseInt(subCmd);
        } else {
          const match = subCmd.match(/live\.bilibili\.com\/(\d+)/);
          roomId = match ? parseInt(match[1]) : 0;
        }

        if (!roomId || isNaN(roomId)) {
          await ctx.editHTML("❌ 房间号格式错误", { replyToMessageId: null });
          return;
        }

        try {
          const roomInfo = await getRoomInfo(roomId);
          if (!roomInfo || roomInfo.live_status !== 1) {
            await ctx.editHTML("❌ 直播间未开播", { replyToMessageId: null });
            return;
          }

          const streamData = await getLiveStreamUrl(roomId);
          if (!streamData) {
            await ctx.editHTML("❌ 获取直播流失败", { replyToMessageId: null });
            return;
          }

          const cookie = getCookie();

          if (subCmd === "m3u8" && streamData.m3u8Url) {
            await ctx.editHTML(
              fmt.bold("📺 m3u8 播放地址") + "\n\n" +
              `� ${roomInfo.title}\n` +
              `📊 画质: ${streamData.quality}\n\n` +
              `<code>${streamData.m3u8Url}</code>\n\n` +
              `💡 使用VLC播放器打开`,
              { replyToMessageId: null }
            );
            return;
          }

          if (subCmd === "flv" && streamData.flvUrl) {
            await ctx.editHTML(
              fmt.bold("📺 FLV 播放地址") + "\n\n" +
              `� ${roomInfo.title}\n` +
              `📊 画质: ${streamData.quality}\n\n` +
              `<code>${streamData.flvUrl}</code>\n\n` +
              `💡 使用VLC播放器打开`,
              { replyToMessageId: null }
            );
            return;
          }

          const playUrl = streamData.m3u8Url || streamData.flvUrl;
          const anchorName = await getAnchorInfo(roomId);
          
          await ctx.editHTML(
            fmt.bold("📺 直播已开播！") + "\n\n" +
            `👤 主播: ${anchorName || "未知"}\n` +
            `📺 标题: ${roomInfo.title}\n` +
            `👀 在线: ${roomInfo.online}\n` +
            `📊 画质: ${streamData.quality}\n` +
            `🔐 ${cookie ? "✅ 已登录" : "❌ 未登录"}\n\n` +
            `<a href="${playUrl}">🟢 点击播放</a>`,
            { replyToMessageId: null }
          );
        } catch (err) {
          await ctx.editHTML("❌ 获取失败: " + (err instanceof Error ? err.message : "未知错误"), { replyToMessageId: null });
        }
      },
    },
  },
};

export default bilibiliPlugin;
