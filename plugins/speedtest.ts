/**
 * 网速测试插件 - 参考 TeleBox 风格美化
 * 功能：测试网络延迟和下载速度
 */

import { Plugin } from "../src/types/index.js";
import axios from "axios";

// 应用Emoji
const EMOJI = {
  ROCKET: "🚀",
  PING: "📶",
  DOWNLOAD: "⬇️",
  TIME: "⏱️",
  LOADING: "🔄",
  ERROR: "❌",
  SUCCESS: "✅",
  FIRE: "🔥",
  SNAIL: "🐌",
  TURTLE: "🐢",
  RABBIT: "🐰",
  CHEETAH: "🐆",
};

// 延迟函数
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// 测速服务器列表
const SPEED_TEST_URLS = [
  { url: "https://speed.cloudflare.com/__down?bytes=25000000", size: 25, name: "Cloudflare" },
  { url: "https://speed.hetzner.de/10MB.bin", size: 10, name: "Hetzner" },
  { url: "https://filesamples.com/samples/document/txt/sample1.txt", size: 0.001, name: "Backup" },
];

// 测试下载速度
async function testDownloadSpeed(): Promise<{ speed: number; time: number; server: string } | null> {
  for (const server of SPEED_TEST_URLS) {
    try {
      const startTime = Date.now();
      const response = await axios.get(server.url, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxRedirects: 5,
      });
      const endTime = Date.now();

      const bytes = response.data.byteLength;
      const duration = (endTime - startTime) / 1000;
      const speedMbps = (bytes * 8) / (duration * 1024 * 1024);

      return { 
        speed: Math.round(speedMbps * 100) / 100, 
        time: duration,
        server: server.name
      };
    } catch (e) {
      continue;
    }
  }
  return null;
}

// 测试延迟
async function testPing(): Promise<{ avg: number; results: number[] } | null> {
  const pingUrls = [
    "https://www.google.com",
    "https://www.cloudflare.com",
    "https://www.baidu.com",
  ];

  const results: number[] = [];

  for (const url of pingUrls) {
    try {
      const start = Date.now();
      await axios.head(url, { timeout: 5000 });
      const ping = Date.now() - start;
      results.push(ping);
    } catch {}
  }

  if (results.length === 0) return null;
  
  const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
  return { avg, results };
}

// 获取速度评级
function getSpeedRating(speed: number): { icon: string; text: string } {
  if (speed >= 100) return { icon: EMOJI.CHEETAH, text: "极速" };
  if (speed >= 50) return { icon: EMOJI.RABBIT, text: "很快" };
  if (speed >= 20) return { icon: EMOJI.FIRE, text: "良好" };
  if (speed >= 10) return { icon: EMOJI.TURTLE, text: "一般" };
  return { icon: EMOJI.SNAIL, text: "较慢" };
}

// 获取延迟评级
function getPingRating(ping: number): { text: string } {
  if (ping <= 50) return { text: "极佳" };
  if (ping <= 100) return { text: "良好" };
  if (ping <= 200) return { text: "一般" };
  return { text: "较差" };
}

// 生成进度条
function generateBar(value: number, max: number, length: number = 10): string {
  const filled = Math.min(Math.round((value / max) * length), length);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

const speedtestPlugin: Plugin = {
  name: "speedtest",
  version: "1.0.0",
  description: "网速测试",
  author: "NexBot",

  commands: {
    speedtest: {
      description: "测试网络速度",
      aliases: ["st", "speed"],
      examples: ["speedtest"],

      handler: async (msg, args, ctx) => {
        try {
          // 第1步：显示正在测试延迟（确保显示至少1秒）
          await (msg as any).edit({
            text: `${EMOJI.ROCKET} <b>网速测试</b>\n\n${EMOJI.LOADING} <b>正在测试网络延迟...</b>\n${EMOJI.PING} 正在 ping Google / Cloudflare / Baidu`,
            parseMode: "html",
          });
          
          // 确保用户能看到 loading（至少1.5秒）
          const pingStart = Date.now();
          const pingResult = await testPing();
          const pingElapsed = Date.now() - pingStart;
          if (pingElapsed < 1500) await sleep(1500 - pingElapsed);

          // 第2步：显示正在测试下载速度
          await (msg as any).edit({
            text: `${EMOJI.ROCKET} <b>网速测试</b>\n\n${EMOJI.SUCCESS} 延迟测试完成 ✓\n${EMOJI.LOADING} <b>正在测试下载速度...</b>\n${EMOJI.DOWNLOAD} 正在下载测试文件`,
            parseMode: "html",
          });
          
          // 确保用户能看到 loading（至少1.5秒）
          const dlStart = Date.now();
          const downloadResult = await testDownloadSpeed();
          const dlElapsed = Date.now() - dlStart;
          if (dlElapsed < 1500) await sleep(1500 - dlElapsed);

          // 第3步：显示最终结果
          let text = `${EMOJI.ROCKET} <b>网速测试结果</b>\n\n`;
          
          if (pingResult !== null) {
            const pingRating = getPingRating(pingResult.avg);
            const pingBar = generateBar(Math.max(300 - pingResult.avg, 0), 300, 8);
            text += `${EMOJI.PING} <b>网络延迟</b>\n`;
            text += `${pingBar} ${pingResult.avg}ms\n`;
            text += `📊 ${pingRating.text} · 平均: ${pingResult.avg}ms\n\n`;
          } else {
            text += `${EMOJI.PING} <b>网络延迟</b>\n测试失败\n\n`;
          }

          if (downloadResult !== null) {
            const speedRating = getSpeedRating(downloadResult.speed);
            const speedBar = generateBar(downloadResult.speed, 200, 10);
            
            text += `${EMOJI.DOWNLOAD} <b>下载速度</b>\n`;
            text += `${speedBar}\n`;
            text += `${speedRating.icon} ${downloadResult.speed} Mbps · ${speedRating.text}\n`;
            text += `⏱️ 测试耗时: ${(Math.round(downloadResult.time * 100) / 100)}s\n`;
            text += `📡 测速节点: ${downloadResult.server}\n\n`;
            
            text += `<b>💡 使用建议:</b>\n`;
            if (downloadResult.speed >= 100) {
              text += `✓ 可流畅观看 4K 视频\n✓ 可进行大型游戏下载\n✓ 支持多设备同时高速上网`;
            } else if (downloadResult.speed >= 50) {
              text += `✓ 可流畅观看 4K 视频\n✓ 可进行高清视频通话\n✓ 下载速度良好`;
            } else if (downloadResult.speed >= 20) {
              text += `✓ 可流畅观看 1080P 视频\n✓ 可进行视频通话\n✓ 日常使用无压力`;
            } else if (downloadResult.speed >= 10) {
              text += `✓ 可观看 720P 视频\n△ 高清视频可能需要缓冲`;
            } else {
              text += `△ 仅适合文字聊天和网页浏览\n💡 建议检查网络连接`;
            }
          } else {
            text += `${EMOJI.DOWNLOAD} <b>下载速度</b>\n测试失败\n请检查网络连接后重试`;
          }

          text += `\n\n<i>⏰ ${new Date().toLocaleString("zh-CN")}</i>`;

          await (msg as any).edit({
            text: text,
            parseMode: "html",
          });
        } catch (err) {
          console.error("[speedtest] 错误:", err);
          await (msg as any).edit({
            text: `${EMOJI.ERROR} <b>测试失败</b>\n\n${err instanceof Error ? err.message : "未知错误"}`,
            parseMode: "html",
          });
        }
      },
    },
  },
};

export default speedtestPlugin;
