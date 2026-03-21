/**
 * 版本管理工具
 * 通过 import 直接读取 package.json（比 readFileSync 更快，无磁盘 IO）
 */

// Bun/TypeScript 原生支持 JSON import（tsconfig 中已启用 resolveJsonModule）
import pkg from "../../package.json" with { type: "json" };

/** 当前版本号，直接从 package.json 读取 */
export const VERSION: string = pkg.version || "1.0.0";

/** 获取版本号 */
export function getVersion(): string {
  return VERSION;
}
