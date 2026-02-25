/**
 * 路径辅助函数
 */
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * 在 assets 目录下创建子目录
 * @param dirName 目录名称
 * @returns 创建的目录路径
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

/**
 * 获取数据目录路径
 * @returns 数据目录路径
 */
export function getDataPath(): string {
  const dataDir = join(process.cwd(), "data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
