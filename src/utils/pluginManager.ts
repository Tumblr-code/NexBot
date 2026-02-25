/**
 * 插件管理器导出 - 为 TeleBox 兼容插件提供支持
 */
import { pluginManager } from "../core/pluginManager.js";

// 导出插件管理器实例
export { pluginManager };

// 导出 getPrefixes 函数供插件使用
export function getPrefixes(): string[] {
  const prefix = process.env.CMD_PREFIX || ".";
  const devPrefix = "!";
  return [prefix, devPrefix];
}

// 导出获取单个前缀的函数
export function getPrefix(): string {
  return process.env.CMD_PREFIX || ".";
}
