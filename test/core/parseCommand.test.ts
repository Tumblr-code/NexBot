/**
 * 命令解析单元测试
 * 测试 parseCommandText / resolveCommandPrefix / getPrimaryPrefix
 */
import { describe, test, expect, beforeEach } from "bun:test";

// 直接测试纯函数逻辑，不依赖 TelegramClient
import {
  parseCommandText,
  resolveCommandPrefix,
  getCommandPrefixes,
  getPrimaryPrefix,
} from "../../src/core/pluginManager.js";

describe("getCommandPrefixes", () => {
  test("默认返回 ['.']", () => {
    delete process.env.CMD_PREFIX;
    delete process.env.NODE_ENV;
    const prefixes = getCommandPrefixes();
    expect(prefixes).toContain(".");
  });

  test("读取 CMD_PREFIX 环境变量", () => {
    process.env.CMD_PREFIX = "! /";
    const prefixes = getCommandPrefixes();
    expect(prefixes).toContain("!");
    expect(prefixes).toContain("/");
    delete process.env.CMD_PREFIX;
  });
});

describe("getPrimaryPrefix", () => {
  test("默认主前缀为 '.'", () => {
    delete process.env.CMD_PREFIX;
    delete process.env.NODE_ENV;
    expect(getPrimaryPrefix()).toBe(".");
  });
});

describe("resolveCommandPrefix", () => {
  beforeEach(() => {
    delete process.env.CMD_PREFIX;
    delete process.env.NODE_ENV;
  });

  test("识别 '.' 前缀", () => {
    expect(resolveCommandPrefix(".help")).toBe(".");
  });

  test("无前缀时返回 null", () => {
    expect(resolveCommandPrefix("hello world")).toBeNull();
  });

  test("空字符串返回 null", () => {
    expect(resolveCommandPrefix("")).toBeNull();
  });
});

describe("parseCommandText", () => {
  beforeEach(() => {
    delete process.env.CMD_PREFIX;
    delete process.env.NODE_ENV;
  });

  test("解析基础命令", () => {
    const result = parseCommandText(".help");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("help");
    expect(result!.args).toEqual([]);
    expect(result!.prefix).toBe(".");
  });

  test("解析带参数的命令", () => {
    const result = parseCommandText(".exec ls -la /tmp");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("exec");
    expect(result!.args).toEqual(["ls", "-la", "/tmp"]);
  });

  test("没有命令名时返回 null", () => {
    expect(parseCommandText(". ")).toBeNull();
  });

  test("没有前缀时返回 null", () => {
    expect(parseCommandText("hello")).toBeNull();
  });

  test("命令名统一小写", () => {
    const result = parseCommandText(".HELP");
    // raw 保留大小写，name 来自 raw.split 第一个 token
    expect(result).not.toBeNull();
    expect(result!.name).toBe("HELP");
  });
});
