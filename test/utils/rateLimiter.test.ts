/**
 * RateLimiter 单元测试
 * 测试限流、封禁、解封、清理逻辑
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { RateLimiter } from "../../src/utils/rateLimiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 5000, blockDuration: 10000 });
  });

  afterEach(() => {
    limiter.destroy();
  });

  test("初始状态允许请求", () => {
    const result = limiter.isAllowed("user1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 3 - 1 = 2
  });

  test("在限制内多次请求均允许", () => {
    limiter.isAllowed("user1"); // 1
    limiter.isAllowed("user1"); // 2
    const third = limiter.isAllowed("user1"); // 3
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  test("超过限制后被封禁", () => {
    limiter.isAllowed("user2"); // 1
    limiter.isAllowed("user2"); // 2
    limiter.isAllowed("user2"); // 3
    const blocked = limiter.isAllowed("user2"); // 4 → 超限封禁
    expect(blocked.allowed).toBe(false);
  });

  test("不同 key 互不影响", () => {
    limiter.isAllowed("userA");
    limiter.isAllowed("userA");
    limiter.isAllowed("userA");
    limiter.isAllowed("userA"); // userA 封禁

    const result = limiter.isAllowed("userB"); // userB 不受影响
    expect(result.allowed).toBe(true);
  });

  test("手动封禁后请求被拒", () => {
    limiter.block("user3", 60000);
    const result = limiter.isAllowed("user3");
    expect(result.allowed).toBe(false);
  });

  test("解除封禁后请求被允许", () => {
    limiter.block("user4", 60000);
    limiter.unblock("user4");
    const result = limiter.isAllowed("user4");
    expect(result.allowed).toBe(true);
  });

  test("isBlocked 正确识别封禁状态", () => {
    limiter.block("user5", 60000);
    expect(limiter.isBlocked("user5")).toBe(true);
    limiter.unblock("user5");
    expect(limiter.isBlocked("user5")).toBe(false);
  });

  test("getRemaining 返回正确剩余次数", () => {
    expect(limiter.getRemaining("user6")).toBe(3);
    limiter.isAllowed("user6");
    expect(limiter.getRemaining("user6")).toBe(2);
    limiter.isAllowed("user6");
    expect(limiter.getRemaining("user6")).toBe(1);
  });

  test("clear 后重置所有记录", () => {
    limiter.isAllowed("user7");
    limiter.isAllowed("user7");
    limiter.isAllowed("user7");
    limiter.isAllowed("user7"); // 封禁
    limiter.clear();
    const result = limiter.isAllowed("user7");
    expect(result.allowed).toBe(true);
  });

  test("getStats 返回正确统计", () => {
    limiter.isAllowed("user8");
    limiter.block("user9", 60000);
    const stats = limiter.getStats();
    expect(stats.tracked).toBeGreaterThanOrEqual(1);
    expect(stats.blocked).toBeGreaterThanOrEqual(1);
  });

  test("record 与 isAllowed 等价", () => {
    const r1 = limiter.record("user10");
    const r2 = limiter.isAllowed("user10");
    // 两次调用计数不同，但 allowed 行为一致（都在限制内）
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});
