/**
 * 天气插件
 */

import { Plugin } from "../src/types/index.js";
import axios from "axios";

const EMOJI = {
  SUN: "☀️", CLOUD: "☁️", CLOUD_SUN: "⛅", CLOUD_RAIN: "🌧️",
  THERMOMETER: "🌡️", DROPLET: "💧", WIND: "🌬️", EYE: "👁️",
  SUNRISE: "🌅", SUNSET: "🌇", ERROR: "❌", SEARCH: "🔍",
  LOADING: "🔄", SUCCESS: "✅",
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const CITY_DATABASE: Record<string, { lat: number; lon: number; name: string; country: string; admin1?: string }> = {
  "北京": { lat: 39.9042, lon: 116.4074, name: "北京", country: "中国", admin1: "北京市" },
  "上海": { lat: 31.2304, lon: 121.4737, name: "上海", country: "中国", admin1: "上海市" },
  "广州": { lat: 23.1291, lon: 113.2644, name: "广州", country: "中国", admin1: "广东省" },
  "深圳": { lat: 22.5431, lon: 114.0579, name: "深圳", country: "中国", admin1: "广东省" },
  "成都": { lat: 30.5728, lon: 104.0668, name: "成都", country: "中国", admin1: "四川省" },
  "杭州": { lat: 30.2741, lon: 120.1551, name: "杭州", country: "中国", admin1: "浙江省" },
  "武汉": { lat: 30.5928, lon: 114.3055, name: "武汉", country: "中国", admin1: "湖北省" },
  "西安": { lat: 34.3416, lon: 108.9398, name: "西安", country: "中国", admin1: "陕西省" },
  "重庆": { lat: 29.5630, lon: 106.5516, name: "重庆", country: "中国", admin1: "重庆市" },
  "南京": { lat: 32.0603, lon: 118.7969, name: "南京", country: "中国", admin1: "江苏省" },
  "东京": { lat: 35.6895, lon: 139.6917, name: "东京", country: "日本" },
  "纽约": { lat: 40.7128, lon: -74.0060, name: "纽约", country: "美国" },
  "伦敦": { lat: 51.5074, lon: -0.1278, name: "伦敦", country: "英国" },
};

function getWeatherEmoji(code: number, isDay: number = 1): string {
  const night = isDay === 0;
  if (code === 0) return night ? "🌙" : EMOJI.SUN;
  if (code === 1) return night ? "🌙" : EMOJI.CLOUD_SUN;
  if (code === 2) return EMOJI.CLOUD_SUN;
  if (code === 3) return EMOJI.CLOUD;
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return EMOJI.CLOUD_RAIN;
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return EMOJI.CLOUD;
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "晴朗", 1: "大部晴朗", 2: "多云", 3: "阴天",
    45: "雾", 51: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨",
    71: "小雪", 73: "中雪", 75: "大雪", 95: "雷雨",
  };
  return descriptions[code] || "未知";
}

const weatherPlugin: Plugin = {
  name: "weather",
  version: "1.0.0",
  description: "查询全球城市天气",
  author: "NexBot",

  commands: {
    weather: {
      description: "查询天气",
      aliases: ["wt", "tq"],
      examples: ["weather 北京"],

      handler: async (msg, args, ctx) => {
        try {
          let cityName = args.trim() || "北京";
          
          // 显示查询中（至少显示1秒）
          await (msg as any).edit({
            text: `${EMOJI.LOADING} <b>正在查询天气...</b>\n\n${EMOJI.SEARCH} 正在定位: <b>${cityName}</b>\n<i>请稍候...</i>`,
            parseMode: "html",
          });
          
          await sleep(1000); // 确保能看到
          
          // 查找城市
          let cityData = CITY_DATABASE[cityName];
          if (!cityData) {
            for (const [key, value] of Object.entries(CITY_DATABASE)) {
              if (key.includes(cityName) || cityName.includes(key)) {
                cityData = value;
                break;
              }
            }
          }
          
          // 如果没找到，尝试API
          if (!cityData) {
            await (msg as any).edit({
              text: `${EMOJI.LOADING} <b>正在查询天气...</b>\n\n${EMOJI.SEARCH} 正在通过 API 查询 "${cityName}"...`,
              parseMode: "html",
            });
            
            try {
              const geoResponse = await axios.get(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh&format=json`,
                { timeout: 10000 }
              );
              
              if (!geoResponse.data.results?.length) {
                return (msg as any).edit({
                  text: `${EMOJI.ERROR} <b>城市未找到</b>\n\n未找到 "${cityName}" 的位置信息。`,
                  parseMode: "html",
                });
              }
              
              const geo = geoResponse.data.results[0];
              cityData = {
                lat: geo.latitude,
                lon: geo.longitude,
                name: geo.name,
                country: geo.country || "",
                admin1: geo.admin1 || ""
              };
            } catch {
              return (msg as any).edit({
                text: `${EMOJI.ERROR} <b>查询失败</b>\n\n获取位置信息失败。`,
                parseMode: "html",
              });
            }
          }

          // 获取天气数据
          await (msg as any).edit({
            text: `${EMOJI.LOADING} <b>正在查询天气...</b>\n\n${EMOJI.SUCCESS} 已定位: ${cityData.name}\n${EMOJI.LOADING} 正在获取气象数据...`,
            parseMode: "html",
          });
          
          const startTime = Date.now();
          const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,visibility&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`,
            { timeout: 10000 }
          );
          
          // 确保 loading 至少显示1秒
          const elapsed = Date.now() - startTime;
          if (elapsed < 1000) await sleep(1000 - elapsed);

          const current = response.data.current;
          const daily = response.data.daily;
          const weatherEmoji = getWeatherEmoji(current.weather_code, current.is_day);
          const windDirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
          const windDir = windDirs[Math.round(current.wind_direction_10m / 45) % 8];

          let text = `${weatherEmoji} <b>${cityData.name} 当前天气</b>\n`;
          text += `├ ${EMOJI.THERMOMETER} 温度: <b>${Math.round(current.temperature_2m)}°C</b> (体感 ${Math.round(current.apparent_temperature)}°C)\n`;
          text += `├ ${weatherEmoji} 天气: <b>${getWeatherDescription(current.weather_code)}</b>\n`;
          text += `├ ${EMOJI.DROPLET} 湿度: ${current.relative_humidity_2m}%\n`;
          text += `├ ${EMOJI.WIND} 风速: ${current.wind_speed_10m}km/h (${windDir}风)\n`;
          text += `├ 🌡️ 气压: ${current.pressure_msl}hPa\n`;
          text += `└ ${EMOJI.EYE} 能见度: ${(current.visibility / 1000).toFixed(1)}km\n\n`;

          if (daily?.temperature_2m_max?.length > 0) {
            const sunrise = daily.sunrise?.[0]?.split("T")[1] || "--:--";
            const sunset = daily.sunset?.[0]?.split("T")[1] || "--:--";
            text += `📅 <b>今日预报</b>\n`;
            text += `├ 🌡️ 最高/最低: ${Math.round(daily.temperature_2m_max[0])}°C / ${Math.round(daily.temperature_2m_min[0])}°C\n`;
            text += `├ ${EMOJI.SUNRISE} 日出: ${sunrise}\n`;
            text += `└ ${EMOJI.SUNSET} 日落: ${sunset}\n\n`;
          }

          text += `📍 <i>${cityData.name}, ${cityData.admin1 || ""} ${cityData.country}</i>`;

          await (msg as any).edit({
            text: text,
            parseMode: "html",
          });
        } catch (err) {
          console.error("[weather] 错误:", err);
          await (msg as any).edit({
            text: `${EMOJI.ERROR} <b>天气查询失败</b>\n\n${err instanceof Error ? err.message : "未知错误"}`,
            parseMode: "html",
          });
        }
      },
    },
  },
};

export default weatherPlugin;
