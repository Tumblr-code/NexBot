/**
 * Cache 单元测试
 * 测试 TTL 过期、LRU 淘汰、命中率统计、getOrSet 防穿透
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Cache } from "../../src/utils/cache.js";

describe("Cache", () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache({ maxSize: 5, defaultTTL: 1000, cleanupInterval: 60000 });
  });

  afterEach(() => {
    cache.destroy();
  });

  test("set / get 基础读写", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  test("不存在的 key 返回 undefined", () => {
    expect(cache.get("not-exist")).toBeUndefined();
  });

  test("TTL 过期后返回 undefined", async () => {
    cache.set("expiring", "hello", 50); // 50ms TTL
    expect(cache.get("expiring")).toBe("hello");
    await Bun.sleep(60);
    expect(cache.get("expiring")).toBeUndefined();
  });

  test("ttl=0 表示永不过期", async () => {
    cache.set("forever", "yes", 0);
    await Bun.sleep(60);
    expect(cache.get("forever")).toBe("yes");
  });

  test("has 正确判断存在性", () => {
    cache.set("key2", "v2");
    expect(cache.has("key2")).toBe(true);
    expect(cache.has("no-key")).toBe(false);
  });

  test("has 对过期条目返回 false", async () => {
    cache.set("temp", "data", 30);
    expect(cache.has("temp")).toBe(true);
    await Bun.sleep(50);
    expect(cache.has("temp")).toBe(false);
  });

  test("delete 删除条目", () => {
    cache.set("key3", "v3");
    expect(cache.delete("key3")).toBe(true);
    expect(cache.get("key3")).toBeUndefined();
  });

  test("clear 清空所有缓存", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  test("超出 maxSize 时淘汰最久未使用条目", () => {
    // maxSize=5，写入6个
    cache.set("k1", "v1");
    cache.set("k2", "v2");
    cache.set("k3", "v3");
    cache.set("k4", "v4");
    cache.set("k5", "v5");
    // 访问 k1~k5，k1最近访问最早（相对k2-k5）
    // 写入 k6 应淘汰最旧的
    cache.set("k6", "v6");
    const stats = cache.getStats();
    expect(stats.size).toBeLessThanOrEqual(5);
  });

  test("getOrSet 在 miss 时调用 factory", async () => {
    let called = 0;
    const val = await cache.getOrSet("computed", async () => {
      called++;
      return "result";
    });
    expect(val).toBe("result");
    expect(called).toBe(1);
  });

  test("getOrSet 在 hit 时不重复调用 factory", async () => {
    let called = 0;
    await cache.getOrSet("computed2", async () => { called++; return "r"; });
    await cache.getOrSet("computed2", async () => { called++; return "r"; });
    expect(called).toBe(1);
  });

  test("getOrSet 防穿透：并发调用只执行一次 factory", async () => {
    let called = 0;
    const factory = async () => { called++; await Bun.sleep(20); return "data"; };
    await Promise.all([
      cache.getOrSet("concurrent", factory),
      cache.getOrSet("concurrent", factory),
      cache.getOrSet("concurrent", factory),
    ]);
    expect(called).toBe(1);
  });

  test("getStats 命中率计算", () => {
    cache.set("s1", "v1");
    cache.get("s1"); // hit
    cache.get("s1"); // hit
    cache.get("s2"); // miss
    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    expect(stats.hitRate).toBeGreaterThan(0);
  });
});
