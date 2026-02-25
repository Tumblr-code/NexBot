/**
 * 版本管理工具
 * 自动从 package.json 读取版本号
 */

import { readFileSync } from "fs";
import { join } from "path";

// 读取 package.json 中的版本号
function getVersionFromPackage(): string {
  try {
    const packagePath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return packageJson.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

// 版本号
export const VERSION = getVersionFromPackage();

// 显示版本
export function getVersion(): string {
  return VERSION;
}
