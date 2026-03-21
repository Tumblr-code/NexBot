#!/usr/bin/env bun
/**
 * Bug 检查器
 * 深度检查代码中的潜在问题
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

interface BugReport {
  file: string;
  line: number;
  type: "error" | "warning" | "info";
  message: string;
  code: string;
}

class BugChecker {
  private reports: BugReport[] = [];
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  private addReport(file: string, line: number, type: BugReport["type"], message: string, code: string) {
    this.reports.push({ file, line, type, message, code: code.trim().slice(0, 80) });
  }

  checkFile(filepath: string, content: string): void {
    const lines = content.split("\n");
    const relPath = filepath.replace(this.projectDir + "/", "");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // 1. 检查未处理的 Promise
      if (/\.(then|catch)\s*\(/.test(line) && !/await/.test(line) && !/return/.test(line)) {
        if (!line.includes("void ") && !line.trim().startsWith("//")) {
          this.addReport(relPath, lineNum, "warning", "未处理的 Promise 链", line);
        }
      }

      // 2. 检查可能的空值访问
      if (/\w+\.[a-zA-Z]+\s*\./.test(line) && !/\?\./.test(line)) {
        const risky = ["msg.", "client.", "event.", "res.", "data."].some(p => line.includes(p));
        if (risky && !line.includes("if (") && !line.includes("?")) {
          // 降低优先级，太多误报
        }
      }

      // 3. 检查硬编码的敏感信息
      if (/api[_-]?key|apikey|password|secret|token/i.test(line)) {
        if (/=\s*["'][^"']{10,}["']/.test(line) && !line.includes("process.env")) {
          this.addReport(relPath, lineNum, "error", "可能的硬编码敏感信息", line);
        }
      }

      // 4. 检查不安全的 eval
      if (/eval\s*\(/.test(line) && !line.includes("//")) {
        this.addReport(relPath, lineNum, "warning", "使用 eval() 可能存在安全风险", line);
      }

      // 5. 检查未使用的变量（简单检查）
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)/);
      if (varMatch) {
        const varName = varMatch[1];
        // 检查后续是否使用
        let used = false;
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          if (lines[j].includes(varName) && !lines[j].includes(`const ${varName}`) && 
              !lines[j].includes(`let ${varName}`) && !lines[j].includes(`var ${varName}`)) {
            used = true;
            break;
          }
        }
        if (!used && i < lines.length - 5) {
          // 可能是未使用的变量
        }
      }

      // 6. 检查 SQL 注入风险
      if (/query\s*\(/.test(line) && /\$\{/.test(line)) {
        this.addReport(relPath, lineNum, "error", "可能的 SQL 注入风险：使用模板字符串拼接 SQL", line);
      }

      // 7. 检查无限循环风险
      if (/while\s*\(\s*true\s*\)/.test(line)) {
        this.addReport(relPath, lineNum, "warning", "无限循环 while(true)，确保有退出条件", line);
      }

      // 8. 检查缺少错误处理
      if (/JSON\.parse\s*\(/.test(line) && !lines.slice(Math.max(0, i-3), i).some(l => l.includes("try"))) {
        const funcLines = lines.slice(Math.max(0, i-10), i);
        const hasTry = funcLines.some(l => l.includes("try"));
        if (!hasTry) {
          this.addReport(relPath, lineNum, "info", "JSON.parse 没有 try-catch 保护", line);
        }
      }

      // 9. 检查 setInterval 没有清理
      if (/setInterval\s*\(/.test(line)) {
        const hasClear = content.includes("clearInterval");
        if (!hasClear) {
          this.addReport(relPath, lineNum, "warning", "setInterval 可能没有清理，可能导致内存泄漏", line);
        }
      }

      // 10. 检查资源泄露
      if (/createReadStream|createWriteStream/.test(line)) {
        const hasClose = content.includes(".close()") || content.includes(".end()");
        if (!hasClose) {
          this.addReport(relPath, lineNum, "info", "文件流可能没有正确关闭", line);
        }
      }
    }
  }

  scanDirectory(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "dist") {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile() && extname(entry.name) === ".ts") {
        try {
          const content = readFileSync(fullPath, "utf-8");
          this.checkFile(fullPath, content);
        } catch (err) {
          console.error(`无法读取文件: ${fullPath}`);
        }
      }
    }
  }

  generateReport(): void {
    console.log("🔍 Bug 检查报告\n");
    console.log("=".repeat(80));

    const errors = this.reports.filter(r => r.type === "error");
    const warnings = this.reports.filter(r => r.type === "warning");
    const infos = this.reports.filter(r => r.type === "info");

    if (errors.length > 0) {
      console.log("\n❌ 错误 (需要修复):");
      console.log("-".repeat(80));
      for (const report of errors) {
        console.log(`\n  📄 ${report.file}:${report.line}`);
        console.log(`     ${report.message}`);
        console.log(`     ${report.code}`);
      }
    }

    if (warnings.length > 0) {
      console.log("\n⚠️ 警告 (建议修复):");
      console.log("-".repeat(80));
      for (const report of warnings.slice(0, 20)) {
        console.log(`\n  📄 ${report.file}:${report.line}`);
        console.log(`     ${report.message}`);
        console.log(`     ${report.code}`);
      }
      if (warnings.length > 20) {
        console.log(`\n  ... 还有 ${warnings.length - 20} 个警告`);
      }
    }

    if (infos.length > 0) {
      console.log("\nℹ️ 信息 (仅供参考):");
      console.log("-".repeat(80));
      for (const report of infos.slice(0, 10)) {
        console.log(`\n  📄 ${report.file}:${report.line}`);
        console.log(`     ${report.message}`);
      }
      if (infos.length > 10) {
        console.log(`\n  ... 还有 ${infos.length - 10} 个信息`);
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n总计: ${errors.length} 个错误, ${warnings.length} 个警告, ${infos.length} 个信息`);

    if (errors.length === 0 && warnings.length === 0) {
      console.log("\n✅ 代码检查通过，未发现严重问题");
    }
  }
}

// 运行检查：优先使用命令行参数，其次使用项目根目录
const targetDir = process.argv[2] || process.cwd();
const checker = new BugChecker(targetDir);
checker.scanDirectory(targetDir);
checker.generateReport();
