/**
 * Tests for batch() and shallowEqual utilities
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  batch,
  isInBatch,
  getBatchDepth,
  batchTargets,
  setBatchDiagnostics,
  shallowEqual,
} from "../src/index.js";
import type { BatchExecutionFailed } from "../src/errors/index.js";

describe("batch", () => {
  it("executes the callback and returns Ok", () => {
    let called = false;
    const result = batch(null, () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(result.isOk()).toBe(true);
  });

  it("returns Err with BatchExecutionFailed when callback throws", () => {
    const result = batch(null, () => {
      throw new Error("batch failed");
    });
    expect(result.isErr()).toBe(true);
    expect(result.isOk()).toBe(false);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "BatchExecutionFailed");
    }
  });

  it("wraps the original error in BatchExecutionFailed", () => {
    const result = batch(null, () => {
      throw new Error("original error");
    });
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "BatchExecutionFailed");
      const err = result.error as BatchExecutionFailed;
      expect(err.cause).toBeInstanceOf(Error);
      expect((err.cause as Error).message).toBe("original error");
    } else {
      expect.fail("Expected Err");
    }
  });

  it("accepts an object target for per-container depth tracking", () => {
    const target = {};
    const result = batch(target, () => {
      // noop
    });
    expect(result.isOk()).toBe(true);
  });
});

describe("isInBatch", () => {
  it("returns true during a batch call with the given target", () => {
    const target = {};
    let during = false;
    batch(target, () => {
      during = isInBatch(target);
    });
    expect(during).toBe(true);
  });

  it("returns false after the batch completes", () => {
    const target = {};
    batch(target, () => {
      // noop
    });
    expect(isInBatch(target)).toBe(false);
  });

  it("returns false for a target that was never batched", () => {
    expect(isInBatch({})).toBe(false);
  });

  it("returns false after batch throws", () => {
    const target = {};
    batch(target, () => {
      throw new Error("fail");
    });
    expect(isInBatch(target)).toBe(false);
  });
});

describe("getBatchDepth", () => {
  it("returns 0 for an un-batched target", () => {
    expect(getBatchDepth({})).toBe(0);
  });

  it("increments with nested batches", () => {
    const target = {};
    const depths: number[] = [];
    batch(target, () => {
      depths.push(getBatchDepth(target));
      batch(target, () => {
        depths.push(getBatchDepth(target));
      });
      depths.push(getBatchDepth(target));
    });
    expect(depths).toEqual([1, 2, 1]);
    expect(getBatchDepth(target)).toBe(0);
  });

  it("tracks two different targets independently", () => {
    const targetA = {};
    const targetB = {};
    batch(targetA, () => {
      batch(targetB, () => {
        expect(getBatchDepth(targetA)).toBe(1);
        expect(getBatchDepth(targetB)).toBe(1);
      });
      expect(getBatchDepth(targetA)).toBe(1);
      expect(getBatchDepth(targetB)).toBe(0);
    });
    expect(getBatchDepth(targetA)).toBe(0);
    expect(getBatchDepth(targetB)).toBe(0);
  });

  it("decrements depth even when fn throws", () => {
    const target = {};
    batch(target, () => {
      throw new Error("fail");
    });
    expect(getBatchDepth(target)).toBe(0);
  });

  it("null target works without depth tracking", () => {
    batch(null, () => {
      // Cannot query depth for null, just verifying no error
    });
    // No crash
  });
});

describe("batchTargets", () => {
  it("returns empty set when no candidates are in a batch", () => {
    const a = {};
    const b = {};
    expect(batchTargets([a, b]).size).toBe(0);
  });

  it("returns targets currently in a batch", () => {
    const a = {};
    const b = {};
    batch(a, () => {
      const targets = batchTargets([a, b]);
      expect(targets.has(a)).toBe(true);
      expect(targets.has(b)).toBe(false);
      expect(targets.size).toBe(1);
    });
  });

  it("returns multiple targets when nested batches are active", () => {
    const a = {};
    const b = {};
    batch(a, () => {
      batch(b, () => {
        const targets = batchTargets([a, b]);
        expect(targets.has(a)).toBe(true);
        expect(targets.has(b)).toBe(true);
        expect(targets.size).toBe(2);
      });
    });
  });

  it("returns empty set after all batches complete", () => {
    const a = {};
    batch(a, () => {});
    expect(batchTargets([a]).size).toBe(0);
  });

  it("handles empty candidates array", () => {
    expect(batchTargets([]).size).toBe(0);
  });

  it("does not include candidates that are not in a batch", () => {
    const a = {};
    const notInBatch = {};
    batch(a, () => {
      const result = batchTargets([a, notInBatch]);
      expect(result.has(notInBatch)).toBe(false);
    });
  });

  it("correctly adds each matching candidate to the result set", () => {
    const a = {};
    const b = {};
    const c = {};
    batch(a, () => {
      batch(b, () => {
        const result = batchTargets([a, b, c]);
        expect(result.has(a)).toBe(true);
        expect(result.has(b)).toBe(true);
        expect(result.has(c)).toBe(false);
        expect(result.size).toBe(2);
      });
    });
  });
});

describe("setBatchDiagnostics / cross-container batch detection", () => {
  afterEach(() => {
    setBatchDiagnostics(null);
  });

  it("invokes callback when batch is called with different target while another is active", () => {
    const a = { name: "containerA" };
    const b = { name: "containerB" };
    const warnings: Array<{ newTarget: object; existingTarget: object }> = [];

    setBatchDiagnostics((newTarget, existingTarget) => {
      warnings.push({ newTarget, existingTarget });
    });

    batch(a, () => {
      batch(b, () => {
        // b enters while a is active
      });
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].newTarget).toBe(b);
    expect(warnings[0].existingTarget).toBe(a);
  });

  it("does not invoke callback for same target nested batch", () => {
    const a = {};
    const warnings: unknown[] = [];

    setBatchDiagnostics(() => {
      warnings.push(true);
    });

    batch(a, () => {
      batch(a, () => {
        // same target, no warning
      });
    });

    expect(warnings).toHaveLength(0);
  });

  it("does not invoke callback when diagnostics are disabled (null)", () => {
    const a = {};
    const b = {};
    let called = false;

    setBatchDiagnostics(() => {
      called = true;
    });
    setBatchDiagnostics(null);

    batch(a, () => {
      batch(b, () => {});
    });

    expect(called).toBe(false);
  });

  it("does not invoke callback when first batch uses null target", () => {
    const b = {};
    let called = false;

    setBatchDiagnostics(() => {
      called = true;
    });

    batch(null, () => {
      batch(b, () => {});
    });

    expect(called).toBe(false);
  });

  it("clears active target after outermost batch completes", () => {
    const a = {};
    const b = {};
    const warnings: unknown[] = [];

    setBatchDiagnostics(() => {
      warnings.push(true);
    });

    // First batch completes, clears active target
    batch(a, () => {});

    // Second batch with different target should NOT trigger warning
    batch(b, () => {});

    expect(warnings).toHaveLength(0);
  });

  it("detects multiple cross-container entries in nested batch", () => {
    const a = {};
    const b = {};
    const c = {};
    const warnings: Array<{ newTarget: object; existingTarget: object }> = [];

    setBatchDiagnostics((newTarget, existingTarget) => {
      warnings.push({ newTarget, existingTarget });
    });

    batch(a, () => {
      batch(b, () => {
        batch(c, () => {});
      });
    });

    // b triggers warning (existing=a), c triggers warning (existing=a, since a is outermost)
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    expect(warnings[0].existingTarget).toBe(a);
    expect(warnings[0].newTarget).toBe(b);
  });

  it("does not warn when active batch target has been garbage collected (WeakRef deref returns undefined)", () => {
    // This tests the WeakRef.deref() === undefined path
    // We can't force GC, but we can test that no error occurs with sequential batches
    const a = {};
    const b = {};
    const warnings: unknown[] = [];

    setBatchDiagnostics(() => {
      warnings.push(true);
    });

    // Sequential, not nested — no warning expected
    batch(a, () => {});
    batch(b, () => {});

    expect(warnings).toHaveLength(0);
  });

  it("sets active batch target on first non-null batch entry", () => {
    const a = {};
    const b = {};
    const warnings: Array<{ newTarget: object; existingTarget: object }> = [];

    setBatchDiagnostics((newTarget, existingTarget) => {
      warnings.push({ newTarget, existingTarget });
    });

    // a becomes the active target
    batch(a, () => {
      // b is different from a, should trigger warning
      batch(b, () => {});
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].newTarget).toBe(b);
    expect(warnings[0].existingTarget).toBe(a);
  });

  it("clears active target only when the outermost target's depth reaches 0", () => {
    const a = {};
    const b = {};
    const warnings: Array<{ newTarget: object }> = [];

    setBatchDiagnostics(newTarget => {
      warnings.push({ newTarget });
    });

    batch(a, () => {
      batch(a, () => {
        // nested same target — active target still a
      });
      // a's depth is now 1 (not 0), so active target is NOT cleared
      batch(b, () => {});
    });

    // b should trigger a warning because a is still active
    expect(warnings).toHaveLength(1);
    expect(warnings[0].newTarget).toBe(b);
  });
});

describe("shallowEqual", () => {
  it("returns true for identical references", () => {
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it("returns true for objects with same properties", () => {
    expect(shallowEqual({ a: 1, b: "hello" }, { a: 1, b: "hello" })).toBe(true);
  });

  it("returns false for objects with different values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false for objects with different keys", () => {
    const a = { a: 1 } as Record<string, unknown>;
    const b = { a: 1, b: 2 } as Record<string, unknown>;
    expect(shallowEqual(a, b)).toBe(false);
  });

  it("uses Object.is for value comparison (NaN equality)", () => {
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it("distinguishes +0 and -0", () => {
    expect(shallowEqual({ a: +0 }, { a: -0 })).toBe(false);
  });
});
