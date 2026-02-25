#!/usr/bin/env bun
/**
 * 环境模拟测试器
 * 用于模拟各种运行环境，检查潜在问题
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";

// 模拟环境配置
interface SimulatedEnv {
  name: string;
  env: Record<string, string>;
  expectedIssues: string[];
}

// 测试场景
const testScenarios: SimulatedEnv[] = [
  {
    name: "全新安装环境",
    env: {
      NODE_ENV: "production",
      TELEGRAM_API_ID: "",
      TELEGRAM_API_HASH: "",
      TELEGRAM_SESSION: "",
      SUDO_USERS: "",
      CMD_PREFIX: ".",
      DB_PATH: "./data/test.db",
      LOG_LEVEL: "info",
      LOG_PATH: "./logs",
      PLUGINS_DIR: "./plugins",
    },
    expectedIssues: [
      "缺少 TELEGRAM_API_ID",
      "缺少 TELEGRAM_API_HASH",
      "没有配置 sudo 用户",
    ],
  },
  {
    name: "开发环境",
    env: {
      NODE_ENV: "development",
      TELEGRAM_API_ID: "123456",
      TELEGRAM_API_HASH: "test_hash",
      TELEGRAM_SESSION: "",
      SUDO_USERS: "123456789",
      CMD_PREFIX: ".",
      DB_PATH: "./data/dev.db",
      LOG_LEVEL: "debug",
      LOG_PATH: "./logs",
      PLUGINS_DIR: "./plugins",
    },
    expectedIssues: [],
  },
  {
    name: "生产环境（已配置）",
    env: {
      NODE_ENV: "production",
      TELEGRAM_API_ID: "123456",
      TELEGRAM_API_HASH: "test_hash",
      TELEGRAM_SESSION: "test_session_string",
      SUDO_USERS: "123456789,987654321",
      CMD_PREFIX: ".",
      DB_PATH: "./data/nexbot.db",
      LOG_LEVEL: "info",
      LOG_PATH: "./logs",
      PLUGINS_DIR: "./plugins",
    },
    expectedIssues: [],
  },
];

// 环境检查器
class EnvironmentChecker {
  private issues: string[] = [];
  private warnings: string[] = [];

  checkRequiredVars(env: Record<string, string>): void {
    const required = ["TELEGRAM_API_ID", "TELEGRAM_API_HASH"];
    
    for (const key of required) {
      if (!env[key] || env[key] === "") {
        this.issues.push(`❌ 缺少必需的环境变量: ${key}`);
      }
    }
  }

  checkOptionalVars(env: Record<string, string>): void {
    if (!env.SUDO_USERS || env.SUDO_USERS === "") {
      this.warnings.push("⚠️ 没有配置 sudo 用户，将无法使用管理命令");
    }

    if (!env.TELEGRAM_SESSION || env.TELEGRAM_SESSION === "") {
      this.warnings.push("⚠️ 没有配置 TELEGRAM_SESSION，首次启动需要登录");
    }
  }

  checkPaths(env: Record<string, string>): void {
    const paths = [
      { key: "DB_PATH", desc: "数据库" },
      { key: "LOG_PATH", desc: "日志" },
      { key: "PLUGINS_DIR", desc: "插件" },
    ];

    for (const { key, desc } of paths) {
      const path = env[key];
      if (path) {
        const dir = path.startsWith("./") ? join(process.cwd(), path) : path;
        const parentDir = dir.replace(/\/[^/]+$/, "");
        
        if (!existsSync(parentDir)) {
          this.warnings.push(`⚠️ ${desc}目录的父目录不存在: ${parentDir}`);
        }
      }
    }
  }

  checkPrefix(env: Record<string, string>): void {
    const prefix = env.CMD_PREFIX || ".";
    if (prefix.length > 2) {
      this.warnings.push(`⚠️ 命令前缀过长: "${prefix}"，建议使用单个字符`);
    }
  }

  runAllChecks(env: Record<string, string>): { issues: string[]; warnings: string[] } {
    this.issues = [];
    this.warnings = [];
    
    this.checkRequiredVars(env);
    this.checkOptionalVars(env);
    this.checkPaths(env);
    this.checkPrefix(env);
    
    return { issues: this.issues, warnings: this.warnings };
  }
}

// 运行测试
console.log("🔍 NexBot 环境模拟测试\n");
console.log("=" .repeat(60));

const checker = new EnvironmentChecker();

for (const scenario of testScenarios) {
  console.log(`\n📋 场景: ${scenario.name}`);
  console.log("-".repeat(40));
  
  const { issues, warnings } = checker.runAllChecks(scenario.env);
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log("✅ 环境检查通过");
  } else {
    for (const issue of issues) {
      console.log(`  ${issue}`);
    }
    for (const warning of warnings) {
      console.log(`  ${warning}`);
    }
  }
  
  // 验证预期问题
  const allFound = [...issues, ...warnings];
  for (const expected of scenario.expectedIssues) {
    const found = allFound.some(i => i.includes(expected));
    if (found) {
      console.log(`  ✅ 正确检测到预期问题: ${expected}`);
    } else if (issues.length === 0 && warnings.length === 0) {
      console.log(`  ⚠️ 未检测到预期问题: ${expected}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log("\n✅ 环境模拟测试完成");
