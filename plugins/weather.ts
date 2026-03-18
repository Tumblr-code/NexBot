/**
 * 天气插件 - 中文版
 */

import { Plugin } from "../src/types/index.js";
import axios from "axios";
import sharp from "sharp";

const SVG_FONT_FAMILY = [
  "Noto Sans CJK SC",
  "Noto Sans SC",
  "WenQuanYi Micro Hei",
  "Microsoft YaHei",
  "PingFang SC",
  "Heiti SC",
  "Source Han Sans SC",
  "Arial",
  "sans-serif",
].join(", ");

const EMOJI = {
  SUN: "☀️", CLOUD: "☁️", CLOUD_SUN: "⛅", CLOUD_RAIN: "🌧️",
  THERMOMETER: "🌡️", DROPLET: "💧", WIND: "🌬️", EYE: "👁️",
  SUNRISE: "🌅", SUNSET: "🌇", ERROR: "❌", SEARCH: "🔍",
  LOADING: "🔄", SUCCESS: "✅",
};

const CITY_DATABASE: Record<string, { lat: number; lon: number; name: string; enName: string; country: string }> = {
  "北京": { lat: 39.9042, lon: 116.4074, name: "北京", enName: "Beijing", country: "China" },
  "上海": { lat: 31.2304, lon: 121.4737, name: "上海", enName: "Shanghai", country: "China" },
  "广州": { lat: 23.1291, lon: 113.2644, name: "广州", enName: "Guangzhou", country: "China" },
  "深圳": { lat: 22.5431, lon: 114.0579, name: "深圳", enName: "Shenzhen", country: "China" },
  "成都": { lat: 30.5728, lon: 104.0668, name: "成都", enName: "Chengdu", country: "China" },
  "杭州": { lat: 30.2741, lon: 120.1551, name: "杭州", enName: "Hangzhou", country: "China" },
  "武汉": { lat: 30.5928, lon: 114.3055, name: "武汉", enName: "Wuhan", country: "China" },
  "西安": { lat: 34.3416, lon: 108.9398, name: "西安", enName: "Xi'an", country: "China" },
  "重庆": { lat: 29.5630, lon: 106.5516, name: "重庆", enName: "Chongqing", country: "China" },
  "南京": { lat: 32.0603, lon: 118.7969, name: "南京", enName: "Nanjing", country: "China" },
  "东京": { lat: 35.6895, lon: 139.6917, name: "东京", enName: "Tokyo", country: "Japan" },
  "纽约": { lat: 40.7128, lon: -74.0060, name: "纽约", enName: "New York", country: "USA" },
  "伦敦": { lat: 51.5074, lon: -0.1278, name: "伦敦", enName: "London", country: "UK" },
  "巴黎": { lat: 48.8566, lon: 2.3522, name: "巴黎", enName: "Paris", country: "France" },
  "悉尼": { lat: -33.8688, lon: 151.2093, name: "悉尼", enName: "Sydney", country: "Australia" },
};

// 天气代码对应信息 - 中文 (icon 用 SVG 图形代替 emoji)
const WEATHER_INFO: Record<number, { bg: string; accent: string; desc: string }> = {
  0: { bg: "#FFD700", accent: "#FFA500", desc: "晴朗" },
  1: { bg: "#87CEEB", accent: "#4682B4", desc: "大部晴朗" },
  2: { bg: "#B0C4DE", accent: "#778899", desc: "多云" },
  3: { bg: "#708090", accent: "#4a5568", desc: "阴天" },
  45: { bg: "#D3D3D3", accent: "#A9A9A9", desc: "雾" },
  51: { bg: "#87CEFA", accent: "#5F9EA0", desc: "毛毛雨" },
  61: { bg: "#4682B4", accent: "#2F4F4F", desc: "小雨" },
  63: { bg: "#4169E1", accent: "#0000CD", desc: "中雨" },
  65: { bg: "#000080", accent: "#191970", desc: "大雨" },
  71: { bg: "#E0FFFF", accent: "#AFEEEE", desc: "小雪" },
  73: { bg: "#B0E0E6", accent: "#87CEEB", desc: "中雪" },
  75: { bg: "#ADD8E6", accent: "#4682B4", desc: "大雪" },
  95: { bg: "#483D8B", accent: "#2F2F4F", desc: "雷雨" },
};

// 生成天气图标 SVG - 统一尺寸和位置
function getWeatherIconSvg(code: number, isDay: number): string {
  const y = 230; // 统一 Y 坐标
  const cloudColor = isDay === 0 ? "#707090" : "#FFFFFF";
  const sunFill = isDay === 0 ? "#F8F3D6" : "#FFD55A";
  const sunStroke = isDay === 0 ? "#D9D1A8" : "#FFB347";
  const moonFill = "#F4F1D5";
  const moonShadow = "#D6D2B4";

  const sun = (cx: number, cy: number, r: number) => `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="rgba(255,255,255,0.10)"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${sunFill}" stroke="${sunStroke}" stroke-width="4"/>
      <g stroke="${sunStroke}" stroke-width="4" stroke-linecap="round">
        <line x1="${cx}" y1="${cy - (r + 22)}" x2="${cx}" y2="${cy - (r + 10)}"/>
        <line x1="${cx}" y1="${cy + (r + 22)}" x2="${cx}" y2="${cy + (r + 10)}"/>
        <line x1="${cx - (r + 22)}" y1="${cy}" x2="${cx - (r + 10)}" y2="${cy}"/>
        <line x1="${cx + (r + 22)}" y1="${cy}" x2="${cx + (r + 10)}" y2="${cy}"/>
        <line x1="${cx - (r + 16)}" y1="${cy - (r + 16)}" x2="${cx - (r + 8)}" y2="${cy - (r + 8)}"/>
        <line x1="${cx + (r + 16)}" y1="${cy + (r + 16)}" x2="${cx + (r + 8)}" y2="${cy + (r + 8)}"/>
        <line x1="${cx - (r + 16)}" y1="${cy + (r + 16)}" x2="${cx - (r + 8)}" y2="${cy + (r + 8)}"/>
        <line x1="${cx + (r + 16)}" y1="${cy - (r + 16)}" x2="${cx + (r + 8)}" y2="${cy - (r + 8)}"/>
      </g>
    </g>`;

  const moon = (cx: number, cy: number, r: number) => `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${moonFill}"/>
      <circle cx="${cx + 14}" cy="${cy - 6}" r="${r - 4}" fill="${moonShadow}" opacity="0.35"/>
      <circle cx="${cx + 12}" cy="${cy - 2}" r="${r - 8}" fill="${isDay === 0 ? "#1a1a2e" : "#87CEEB"}"/>
    </g>`;

  // 统一云形状，保证视觉中心与画布中心对齐
  const cloud = (fill: string) => `
    <g fill="${fill}" stroke="none">
      <ellipse cx="0" cy="22" rx="104" ry="18" fill="rgba(255,255,255,0.12)"/>
      <circle cx="-62" cy="-18" r="34"/>
      <circle cx="-8" cy="-42" r="44"/>
      <circle cx="54" cy="-16" r="36"/>
      <rect x="-108" y="-26" width="216" height="58" rx="29"/>
      <ellipse cx="0" cy="-2" rx="104" ry="32" fill="${fill}"/>
      <ellipse cx="-16" cy="-26" rx="72" ry="22" fill="rgba(255,255,255,0.14)"/>
    </g>`;

  const rain = (positions: number[], color: string, width: number, y1: number, y2: number) => `
    <g stroke="${color}" stroke-width="${width}" stroke-linecap="round">
      ${positions.map((x) => `<line x1="${x}" y1="${y1}" x2="${x - width * 2}" y2="${y2}"/>`).join("")}
    </g>`;

  const snow = (flakes: Array<[number, number, number]>) => `
    <g fill="#FFFFFF">
      ${flakes.map(([x, yPos, size]) => `<circle cx="${x}" cy="${yPos}" r="${size}"/>`).join("")}
    </g>`;
  
  // 晴朗 - 太阳
  if (code === 0) {
    return `<g transform="translate(300,${y})">
      ${isDay === 0 ? moon(0, 0, 46) : sun(0, 0, 42)}
    </g>`;
  }
  // 大部晴朗
  if (code === 1) {
    return `<g transform="translate(300,${y})">
      ${isDay === 0 ? moon(-26, -40, 30) : sun(-28, -40, 28)}
      ${cloud("#F0F8FF")}
    </g>`;
  }
  // 多云
  if (code === 2) {
    return `<g transform="translate(300,${y})">
      ${isDay === 0 ? moon(-42, -42, 22) : sun(-42, -42, 20)}
      ${cloud(cloudColor)}
    </g>`;
  }
  // 阴天
  if (code === 3) {
    return `<g transform="translate(300,${y})">
      ${cloud("#D0D0D0")}
    </g>`;
  }
  // 雾
  if (code === 45) {
    return `<g transform="translate(300,${y})">
      <rect x="-100" y="-30" width="200" height="20" rx="10" fill="#E0E0E0"/>
      <rect x="-80" y="0" width="160" height="20" rx="10" fill="#D0D0D0"/>
      <rect x="-60" y="30" width="120" height="20" rx="10" fill="#E0E0E0"/>
    </g>`;
  }
  // 毛毛雨/小雨
  if (code === 51 || code === 61) {
    return `<g transform="translate(300,${y})">
      ${cloud("#C0E0F8")}
      ${rain([-52, 0, 52], "#60A0D0", 3, 15, 36)}
    </g>`;
  }
  // 中雨
  if (code === 63) {
    return `<g transform="translate(300,${y})">
      ${cloud("#A0D0F8")}
      ${rain([-72, -24, 24, 72], "#4090D0", 4, 10, 46)}
    </g>`;
  }
  // 大雨
  if (code === 65) {
    return `<g transform="translate(300,${y})">
      ${cloud("#80C0F8")}
      ${rain([-82, -41, 0, 41, 82], "#2070C0", 5, 10, 56)}
    </g>`;
  }
  // 小雪
  if (code === 71) {
    return `<g transform="translate(300,${y})">
      ${cloud("#E8F8FF")}
      ${snow([[-54, 25, 5], [0, 40, 5], [54, 25, 5]])}
    </g>`;
  }
  // 中雪
  if (code === 73) {
    return `<g transform="translate(300,${y})">
      ${cloud("#D8F0FF")}
      ${snow([[-70, 24, 5], [-25, 39, 5], [20, 24, 5], [-47, 54, 5], [3, 54, 5]])}
    </g>`;
  }
  // 大雪
  if (code === 75) {
    return `<g transform="translate(300,${y})">
      ${cloud("#C8E8FF")}
      ${snow([[-84, 24, 6], [-36, 39, 6], [12, 24, 6], [60, 39, 6], [-60, 58, 6], [-6, 58, 6], [48, 58, 6]])}
    </g>`;
  }
  // 雷雨
  if (code === 95) {
    return `<g transform="translate(300,${y})">
      ${cloud("#606080")}
      <polygon points="-10,12 -28,48 -8,48 -22,82 18,30 -2,30" fill="#FFD700"/>
      ${rain([-58, 54], "#87CEFA", 4, 48, 80)}
    </g>`;
  }
  // 默认
  return `<g transform="translate(300,${y})">
    <circle cx="0" cy="0" r="45" fill="#87CEEB"/>
    <text x="0" y="15" font-size="40" text-anchor="middle" fill="#FFFFFF" font-family="Arial">?</text>
  </g>`;
}

function getWeatherInfo(code: number) {
  return WEATHER_INFO[code] || { bg: "#87CEEB", accent: "#4682B4", desc: "未知" };
}

function escapeSvgText(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getWindDir(degrees: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return dirs[Math.round(degrees / 45) % 8];
}

// 生成天气海报 SVG - 中文
function generateWeatherPoster(
  cityName: string,
  country: string,
  temp: number,
  feelsLike: number,
  humidity: number,
  windSpeed: number,
  windDir: string,
  pressure: number,
  visibility: number,
  high: number,
  low: number,
  sunrise: string,
  sunset: string,
  weatherCode: number,
  isDay: number
): string {
  const info = getWeatherInfo(weatherCode);
  const textColor = "#FFFFFF";
  const subTextColor = "rgba(255,255,255,0.85)";
  const safeCityName = escapeSvgText(cityName);
  const safeCountry = escapeSvgText(country);
  const safeDesc = escapeSvgText(info.desc);
  const safeWindDir = escapeSvgText(windDir);
  
  const bgColor = isDay === 0 ? "#1a1a2e" : info.bg;
  const accentColor = isDay === 0 ? "#4a4a6a" : info.accent;
  
  return `
<svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${accentColor}"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <rect width="600" height="800" fill="url(#bg)"/>
  <circle cx="500" cy="150" r="80" fill="rgba(255,255,255,0.1)"/>
  <circle cx="100" cy="700" r="120" fill="rgba(255,255,255,0.05)"/>
  ${getWeatherIconSvg(weatherCode, isDay)}
  
  <text x="300" y="90" font-family="${SVG_FONT_FAMILY}" font-size="52" font-weight="bold" 
        fill="${textColor}" text-anchor="middle" filter="url(#shadow)">${safeCityName}</text>
  <text x="300" y="130" font-family="${SVG_FONT_FAMILY}" font-size="24" 
        fill="${subTextColor}" text-anchor="middle">${safeCountry}</text>
  
  <text x="300" y="280" font-family="${SVG_FONT_FAMILY}" font-size="48" font-weight="bold"
        fill="${textColor}" text-anchor="middle">${safeDesc}</text>
  
  <text x="300" y="430" font-family="${SVG_FONT_FAMILY}" font-size="100" font-weight="bold" 
        fill="${textColor}" text-anchor="middle" filter="url(#shadow)">${Math.round(temp)}°C</text>
  <text x="300" y="475" font-family="${SVG_FONT_FAMILY}" font-size="24" 
        fill="${subTextColor}" text-anchor="middle">体感 ${Math.round(feelsLike)}°C</text>
  
  <line x1="50" y1="520" x2="550" y2="520" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  
  <g font-family="${SVG_FONT_FAMILY}" fill="${subTextColor}" font-size="18">
    <text x="100" y="570" text-anchor="middle">湿度</text>
    <text x="300" y="570" text-anchor="middle">风向</text>
    <text x="500" y="570" text-anchor="middle">气压</text>
    
    <text x="100" y="600" text-anchor="middle" font-size="26" fill="${textColor}" font-weight="bold">${humidity}%</text>
    <text x="300" y="600" text-anchor="middle" font-size="26" fill="${textColor}" font-weight="bold">${safeWindDir} ${windSpeed}km/h</text>
    <text x="500" y="600" text-anchor="middle" font-size="26" fill="${textColor}" font-weight="bold">${Math.round(pressure)}hPa</text>
    
    <text x="150" y="660" text-anchor="middle">能见度</text>
    <text x="300" y="660" text-anchor="middle">最高</text>
    <text x="450" y="660" text-anchor="middle">最低</text>
    
    <text x="150" y="690" text-anchor="middle" font-size="26" fill="${textColor}" font-weight="bold">${(visibility/1000).toFixed(1)}km</text>
    <text x="300" y="690" text-anchor="middle" font-size="26" fill="${textColor}" font-weight="bold">${Math.round(high)}°</text>
    <text x="450" y="690" text-anchor="middle" font-size="26" fill="${textColor}" font-weight="bold">${Math.round(low)}°</text>
  </g>
  
  <g font-family="${SVG_FONT_FAMILY}" fill="${subTextColor}" font-size="20">
    <text x="200" y="750" text-anchor="middle">日出 ${sunrise}</text>
    <text x="400" y="750" text-anchor="middle">日落 ${sunset}</text>
  </g>
  
  <text x="300" y="790" font-family="${SVG_FONT_FAMILY}" font-size="14" 
        fill="${subTextColor}" text-anchor="middle">NexBot 天气</text>
</svg>`;
}

const weatherPlugin: Plugin = {
  name: "weather",
  version: "2.0.0",
  description: "天气查询 - 获取城市天气信息并生成精美海报图片",
  author: "NexBot",

  commands: {
    weather: {
      description: "获取城市天气信息，生成精美海报图片",
      aliases: ["wt", "tq", "天气"],
      examples: ["weather 北京", "weather Shanghai", "tq 广州", "wt Tokyo"],

      handler: async (msg: any, args, ctx) => {
        try {
          let cityInput = args.join(" ").trim() || "北京";
          
          await msg.edit({
            text: `${EMOJI.LOADING} <b>正在生成天气海报...</b>`,
            parseMode: "html",
          });
          
          let cityData = CITY_DATABASE[cityInput];
          if (!cityData) {
            for (const [key, value] of Object.entries(CITY_DATABASE)) {
              if (key.includes(cityInput) || cityInput.includes(key) || 
                  value.enName.toLowerCase().includes(cityInput.toLowerCase())) {
                cityData = value;
                break;
              }
            }
          }
          
          if (!cityData) {
            try {
              const geoResponse = await axios.get(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=1&format=json`,
                { timeout: 10000 }
              );
              
              if (!geoResponse.data.results?.length) {
                return msg.edit({
                  text: `${EMOJI.ERROR} 未找到城市: "${cityInput}"`,
                  parseMode: "html",
                });
              }
              
              const geo = geoResponse.data.results[0];
              cityData = {
                lat: geo.latitude,
                lon: geo.longitude,
                name: geo.name,
                enName: geo.name,
                country: geo.country || ""
              };
            } catch {
              return msg.edit({
                text: `${EMOJI.ERROR} 获取位置失败`,
                parseMode: "html",
              });
            }
          }

          await msg.edit({
            text: `${EMOJI.LOADING} <b>正在获取天气数据...</b>`,
            parseMode: "html",
          });

          const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,visibility&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`,
            { timeout: 10000 }
          );

          const current = response.data.current;
          const daily = response.data.daily;
          
          const sunrise = daily.sunrise?.[0]?.split("T")[1]?.slice(0,5) || "--:--";
          const sunset = daily.sunset?.[0]?.split("T")[1]?.slice(0,5) || "--:--";

          const svg = generateWeatherPoster(
            cityData.name,
            cityData.country,
            current.temperature_2m,
            current.apparent_temperature,
            current.relative_humidity_2m,
            current.wind_speed_10m,
            getWindDir(current.wind_direction_10m),
            current.pressure_msl,
            current.visibility,
            daily.temperature_2m_max?.[0] || 0,
            daily.temperature_2m_min?.[0] || 0,
            sunrise,
            sunset,
            current.weather_code,
            current.is_day
          );

          const tmpFile = `/tmp/weather_${Date.now()}.png`;
          await sharp(Buffer.from(svg)).png().toFile(tmpFile);
          
          try {
            const sentMsg = await ctx.client.sendFile(msg.chatId || msg.peerId, {
              file: tmpFile,
              caption: `${EMOJI.SUCCESS} <b>${cityData.name}</b> 天气预报`,
              parseMode: "html",
              forceDocument: false,
            });
            
            // 60秒后自动删除天气图片
            setTimeout(async () => {
              try {
                await ctx.client.deleteMessages(msg.chatId || msg.peerId, [sentMsg.id], { revoke: true });
              } catch {}
            }, 60000);
          } finally {
            try { require('fs').unlinkSync(tmpFile); } catch {}
          }

          await msg.delete({ revoke: true });

        } catch (err) {
          console.error("[weather] error:", err);
          await msg.edit({
            text: `${EMOJI.ERROR} <b>获取天气失败</b>\n\n${err instanceof Error ? err.message : "未知错误"}`,
            parseMode: "html",
          });
        }
      },
    },
  },
};

export default weatherPlugin;
