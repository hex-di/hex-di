/**
 * Effect Adapter Discovery Utility Tests
 *
 * Tests for isEffectAdapter and withEffectAdapters.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import {
  isEffectAdapter,
  withEffectAdapters,
  createEffectAdapter,
  createAtomAdapter,
  createStateAdapter,
  createAtomPort,
  createStatePort,
} from "../src/index.js";
import type { ActionMap, ActionEffect } from "../src/index.js";

// =============================================================================
// Shared port definitions
// =============================================================================

const TestAtomPort = createAtomPort<number>()({ name: "TestAtom" });

interface TestState {
  value: number;
}

interface TestActions extends ActionMap<TestState> {
  set: (state: TestState, v: number) => TestState;
}

const TestStatePort = createStatePort<TestState, TestActions>()({
  name: "TestState",
});

const TestEffectPort = createPort<"TestEffect", ActionEffect>({
  name: "TestEffect",
});

// =============================================================================
// isEffectAdapter
// =============================================================================

describe("isEffectAdapter", () => {
  it("returns true for effect adapters", () => {
    const effectAdapter = createEffectAdapter({
      provides: TestEffectPort,
      factory: () => ({ onAction: () => {} }),
    });
    expect(isEffectAdapter(effectAdapter)).toBe(true);
  });

  it("returns false for atom adapters", () => {
    const atomAdapter = createAtomAdapter({
      provides: TestAtomPort,
      initial: 0,
    });
    expect(isEffectAdapter(atomAdapter)).toBe(false);
  });

  it("returns false for state adapters", () => {
    const stateAdapter = createStateAdapter({
      provides: TestStatePort,
      initial: { value: 0 },
      actions: {
        set: (_state: TestState, v: number) => ({ value: v }),
      },
    });
    expect(isEffectAdapter(stateAdapter)).toBe(false);
  });
});

// =============================================================================
// withEffectAdapters
// =============================================================================

describe("withEffectAdapters", () => {
  it("filters only effect adapters from a mixed list", () => {
    const effectAdapter = createEffectAdapter({
      provides: TestEffectPort,
      factory: () => ({ onAction: () => {} }),
    });
    const atomAdapter = createAtomAdapter({
      provides: TestAtomPort,
      initial: 0,
    });

    const result = withEffectAdapters([effectAdapter, atomAdapter]);
    expect(result).toHaveLength(1);
    expect(isEffectAdapter(result[0])).toBe(true);
  });

  it("returns empty array when no effect adapters", () => {
    const atomAdapter = createAtomAdapter({
      provides: TestAtomPort,
      initial: 0,
    });
    expect(withEffectAdapters([atomAdapter])).toHaveLength(0);
  });
});
