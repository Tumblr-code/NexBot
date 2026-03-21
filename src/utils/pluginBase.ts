/**
 * 插件基础工具 - 为 TeleBox 兼容插件提供辅助函数
 *
 * Plugin 类型定义统一使用 src/types/index.ts 中的 interface Plugin，
 * 本文件不再重复定义 abstract class Plugin，避免类型冲突。
 */
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// 重新导出标准 Plugin 接口，方便插件直接从此路径引入
export type { Plugin, CommandDefinition, CmdHandler } from "../types/index.js";

/**
 * 在 data/assets 下创建子目录，并返回其绝对路径。
 * 常用于插件存储静态资源。
 */
export function createDirectoryInAssets(dirName: string): string {
  const assetsDir = join(process.cwd(), "data", "assets");
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true });
  }

  const targetDir = join(assetsDir, dirName);
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  return targetDir;
}
