/**
 * 插件工具导出
 * 统一导出插件管理器实例及前缀相关工具函数，
 * 原 utils/pluginManager.ts 中的 getPrefixes/getPrefix 合并到此处，
 * 消除与 core/pluginManager.ts 中 getCommandPrefixes/getPrimaryPrefix 的重复。
 */
import {
  pluginManager,
  getCommandPrefixes,
  getPrimaryPrefix,
} from "../core/pluginManager.js";

export { pluginManager };

/**
 * 获取所有命令前缀（优先读取 CMD_PREFIX 环境变量）
 * @alias getCommandPrefixes
 */
export function getPrefixes(): string[] {
  return getCommandPrefixes();
}

/**
 * 获取主命令前缀
 * @alias getPrimaryPrefix
 */
export function getPrefix(): string {
  return getPrimaryPrefix();
}
