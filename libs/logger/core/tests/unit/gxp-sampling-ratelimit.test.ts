/**
 * GxP sampling and rate-limit tests.
 *
 * Verifies seedable PRNG, drop notification callbacks,
 * and deterministic testing support.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createMemoryLogger, withSampling, withRateLimit } from "../../src/index.js";

describe("withSampling - GxP extensions", () => {
  it("should produce deterministic results with seedable PRNG", () => {
    let callCount = 0;
    const deterministicRandom = (): number => {
      callCount++;
      // Alternates: 0.1, 0.9, 0.1, 0.9, ...
      return callCount % 2 === 1 ? 0.1 : 0.9;
    };

    const mem = createMemoryLogger();
    const logger = withSampling(mem, {
      rate: 0.5,
      alwaysLogErrors: false,
      randomFn: deterministicRandom,
    });

    // With rate 0.5: random < 0.5 → keep, random >= 0.5 → drop
    // 0.1 → keep, 0.9 → drop, 0.1 → keep, 0.9 → drop
    logger.info("msg1"); // keep (0.1 < 0.5)
    logger.info("msg2"); // drop (0.9 >= 0.5)
    logger.info("msg3"); // keep (0.1 < 0.5)
    logger.info("msg4"); // drop (0.9 >= 0.5)

    const entries = mem.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe("msg1");
    expect(entries[1].message).toBe("msg3");
  });

  it("should still work with default Math.random", () => {
    const mem = createMemoryLogger();
    const logger = withSampling(mem, { rate: 1.0 });

    logger.info("test");
    expect(mem.getEntries()).toHaveLength(1);
  });

  it("should invoke onDrop callback when entry is dropped", () => {
    const drops: Array<{ level: string; count: number }> = [];

    const mem = createMemoryLogger();
    const logger = withSampling(mem, {
      rate: 0.0,
      alwaysLogErrors: false,
      onDrop: (level, count) => {
        drops.push({ level, count });
      },
    });

    logger.info("dropped1");
    logger.info("dropped2");
    logger.warn("dropped3");

    expect(drops).toHaveLength(3);
    expect(drops[0]).toEqual({ level: "info", count: 1 });
    expect(drops[1]).toEqual({ level: "info", count: 2 });
    expect(drops[2]).toEqual({ level: "warn", count: 3 });
  });

  it("should always sample error/fatal by default", () => {
    const mem = createMemoryLogger();
    const logger = withSampling(mem, {
      rate: 0.0,
      // alwaysLogErrors defaults to true
    });

    logger.info("dropped");
    logger.error("kept");
    logger.fatal("also kept");

    const entries = mem.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].level).toBe("error");
    expect(entries[1].level).toBe("fatal");
  });
});

describe("withRateLimit - GxP extensions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should invoke onDrop callback when entries exceed limit", () => {
    const drops: Array<{ count: number; windowMs: number }> = [];
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const mem = createMemoryLogger();
    const logger = withRateLimit(mem, {
      maxEntries: 2,
      windowMs: 60_000,
      onDrop: (count, windowMs) => {
        drops.push({ count, windowMs });
      },
    });

    logger.info("msg1"); // allowed
    logger.info("msg2"); // allowed
    logger.info("msg3"); // dropped
    logger.info("msg4"); // dropped

    expect(mem.getEntries()).toHaveLength(2);
    expect(drops).toHaveLength(2);
    expect(drops[0]).toEqual({ count: 1, windowMs: 60_000 });
    expect(drops[1]).toEqual({ count: 2, windowMs: 60_000 });
  });

  it("should use seedable randomFn in sample strategy", () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const mem = createMemoryLogger();
    const logger = withRateLimit(mem, {
      maxEntries: 1,
      windowMs: 60_000,
      strategy: "sample",
      randomFn: () => 0.0001, // Very low = always passes sample check
    });

    logger.info("msg1"); // allowed (within limit)
    logger.info("msg2"); // over limit, but sample with low random → allowed

    expect(mem.getEntries()).toHaveLength(2);
  });
});
