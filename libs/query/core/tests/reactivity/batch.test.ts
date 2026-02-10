import { describe, it, expect, vi, afterEach } from "vitest";
import {
  batch,
  isInBatch,
  getBatchDepth,
  batchTargets,
  setBatchDiagnostics,
  createSignal,
  createEffect,
  createIsolatedReactiveSystem,
} from "../../src/index.js";

afterEach(() => {
  // Reset diagnostics after each test
  setBatchDiagnostics(null);
});

// =============================================================================
// batch()
// =============================================================================

describe("batch", () => {
  it("defers notifications until batch completes", () => {
    const s = createSignal(0);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(s.get());
    });

    expect(values).toEqual([0]);

    const target = {};
    const result = batch(target, () => {
      s.set(1);
      s.set(2);
      s.set(3);
    });

    expect(result.isOk()).toBe(true);
    // Effect should have only run once for the final value
    expect(values).toEqual([0, 3]);

    effect.dispose();
  });

  it("returns Ok on successful execution", () => {
    const target = {};
    const result = batch(target, () => {
      // no-op
    });
    expect(result.isOk()).toBe(true);
  });

  it("returns Err with BatchExecutionFailed when fn throws", () => {
    const target = {};
    const result = batch(target, () => {
      throw new Error("boom");
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("BatchExecutionFailed");
    }
  });

  it("supports nested batches", () => {
    const s = createSignal(0);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(s.get());
    });

    expect(values).toEqual([0]);

    const target = {};
    batch(target, () => {
      s.set(1);
      batch(target, () => {
        s.set(2);
      });
      s.set(3);
    });

    // Only the final value should trigger the effect
    expect(values).toEqual([0, 3]);

    effect.dispose();
  });

  it("works with null target (no per-target tracking)", () => {
    const s = createSignal(0);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(s.get());
    });

    const result = batch(null, () => {
      s.set(10);
    });

    expect(result.isOk()).toBe(true);
    expect(values).toEqual([0, 10]);

    effect.dispose();
  });

  it("works with isolated reactive system", () => {
    const system = createIsolatedReactiveSystem();
    const s = createSignal(0, system);
    const values: number[] = [];

    const effect = createEffect(() => {
      values.push(s.get());
    }, system);

    expect(values).toEqual([0]);

    const target = {};
    batch(
      target,
      () => {
        s.set(1);
        s.set(2);
      },
      system
    );

    expect(values).toEqual([0, 2]);

    effect.dispose();
  });

  it("cleans up depth tracking even when fn throws", () => {
    const target = {};
    expect(isInBatch(target)).toBe(false);

    batch(target, () => {
      throw new Error("fail");
    });

    // Depth should be cleaned up despite the error
    expect(isInBatch(target)).toBe(false);
    expect(getBatchDepth(target)).toBe(0);
  });
});

// =============================================================================
// isInBatch / getBatchDepth
// =============================================================================

describe("isInBatch", () => {
  it("returns false when not in a batch", () => {
    const target = {};
    expect(isInBatch(target)).toBe(false);
  });

  it("returns true inside a batch", () => {
    const target = {};
    let insideBatch = false;

    batch(target, () => {
      insideBatch = isInBatch(target);
    });

    expect(insideBatch).toBe(true);
  });
});

describe("getBatchDepth", () => {
  it("returns 0 when not in a batch", () => {
    expect(getBatchDepth({})).toBe(0);
  });

  it("tracks nesting depth", () => {
    const target = {};
    const depths: number[] = [];

    batch(target, () => {
      depths.push(getBatchDepth(target));
      batch(target, () => {
        depths.push(getBatchDepth(target));
        batch(target, () => {
          depths.push(getBatchDepth(target));
        });
      });
    });

    expect(depths).toEqual([1, 2, 3]);
  });
});

// =============================================================================
// batchTargets
// =============================================================================

describe("batchTargets", () => {
  it("returns empty set when no targets are batched", () => {
    const a = {};
    const b = {};
    expect(batchTargets([a, b]).size).toBe(0);
  });

  it("returns targets currently in a batch", () => {
    const a = {};
    const b = {};
    let result: ReadonlySet<object> = new Set();

    batch(a, () => {
      result = batchTargets([a, b]);
    });

    // Outside the batch, a is no longer tracked
    expect(batchTargets([a, b]).size).toBe(0);
  });
});

// =============================================================================
// setBatchDiagnostics (cross-container detection)
// =============================================================================

describe("setBatchDiagnostics", () => {
  it("fires callback on cross-container batching", () => {
    const callback = vi.fn();
    setBatchDiagnostics(callback);

    const containerA = { name: "A" };
    const containerB = { name: "B" };

    // Start a batch on A, then start one on B inside
    batch(containerA, () => {
      batch(containerB, () => {
        // nested cross-container batch
      });
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(containerB, containerA);
  });

  it("does not fire when same target is used", () => {
    const callback = vi.fn();
    setBatchDiagnostics(callback);

    const target = {};
    batch(target, () => {
      batch(target, () => {
        // same target — no cross-container
      });
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("can be disabled by passing null", () => {
    const callback = vi.fn();
    setBatchDiagnostics(callback);
    setBatchDiagnostics(null);

    const a = {};
    const b = {};
    batch(a, () => {
      batch(b, () => {});
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
