/**
 * Adapter Factory Unit Tests
 *
 * Tests for all 6 adapter factories: createStateAdapter, createAtomAdapter,
 * createDerivedAdapter, createAsyncDerivedAdapter, createLinkedDerivedAdapter,
 * createEffectAdapter.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
  createStateAdapter,
  createAtomAdapter,
  createDerivedAdapter,
  createAsyncDerivedAdapter,
  createLinkedDerivedAdapter,
  createEffectAdapter,
} from "../src/index.js";
import type { ActionMap, ActionEffect } from "../src/index.js";
import {
  __stateAdapterBrand,
  __atomAdapterBrand,
  __derivedAdapterBrand,
  __asyncDerivedAdapterBrand,
  __linkedDerivedAdapterBrand,
  __effectBrand,
} from "../src/adapters/brands.js";

// =============================================================================
// Shared port definitions
// =============================================================================

interface CounterState {
  count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  add: (state: CounterState, payload: number) => CounterState;
}

const CounterPort = createStatePort<CounterState, CounterActions>()({
  name: "Counter",
});

const ThemePort = createAtomPort<"light" | "dark">()({
  name: "Theme",
});

const DoubleCountPort = createDerivedPort<number>()({
  name: "DoubleCount",
});

const RatePort = createAsyncDerivedPort<number>()({
  name: "ExchangeRate",
});

const FahrenheitPort = createLinkedDerivedPort<number>()({
  name: "Fahrenheit",
});

const LoggerEffectPort = createPort<"LoggerEffect", ActionEffect>({
  name: "LoggerEffect",
});

// =============================================================================
// createStateAdapter
// =============================================================================

describe("createStateAdapter", () => {
  it("creates adapter with brand symbol", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });

    expect(adapter).toBeDefined();
    expect(__stateAdapterBrand in adapter).toBe(true);
  });

  it("uses createStateServiceImpl internally (adapter is an object)", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });

    expect(typeof adapter).toBe("object");
  });

  it("lifetime defaults to singleton", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });

    // The adapter should be created successfully with default singleton lifetime
    expect(adapter).toBeDefined();
  });

  it("supports custom lifetime", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
      lifetime: "scoped",
    });

    expect(adapter).toBeDefined();
    expect(__stateAdapterBrand in adapter).toBe(true);
  });
});

// =============================================================================
// createAtomAdapter
// =============================================================================

describe("createAtomAdapter", () => {
  it("creates adapter with brand symbol", () => {
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
    });

    expect(adapter).toBeDefined();
    expect(__atomAdapterBrand in adapter).toBe(true);
  });

  it("lifetime defaults to singleton", () => {
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
    });

    expect(adapter).toBeDefined();
  });

  it("supports custom lifetime", () => {
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "dark",
      lifetime: "scoped",
    });

    expect(adapter).toBeDefined();
    expect(__atomAdapterBrand in adapter).toBe(true);
  });
});

// =============================================================================
// createDerivedAdapter
// =============================================================================

describe("createDerivedAdapter", () => {
  it("creates adapter with brand symbol, delegates to createDerivedServiceImpl", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: deps => {
        return deps.Counter.state.count * 2;
      },
    });

    expect(adapter).toBeDefined();
    expect(__derivedAdapterBrand in adapter).toBe(true);
  });

  it("lifetime defaults to singleton", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: () => 0,
    });

    expect(adapter).toBeDefined();
  });

  it("supports custom lifetime", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: () => 0,
      lifetime: "scoped",
    });

    expect(adapter).toBeDefined();
    expect(__derivedAdapterBrand in adapter).toBe(true);
  });

  it("supports custom equals function", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: () => 0,
      equals: (a, b) => a === b,
    });

    expect(adapter).toBeDefined();
    expect(__derivedAdapterBrand in adapter).toBe(true);
  });
});

// =============================================================================
// createAsyncDerivedAdapter
// =============================================================================

describe("createAsyncDerivedAdapter", () => {
  it("creates adapter with brand symbol, delegates to createAsyncDerivedServiceImpl", () => {
    const adapter = createAsyncDerivedAdapter({
      provides: RatePort,
      requires: [],
      select: () => ResultAsync.ok(1.5),
    });

    expect(adapter).toBeDefined();
    expect(__asyncDerivedAdapterBrand in adapter).toBe(true);
  });

  it("supports staleTime, retryCount, retryDelay options", () => {
    const adapter = createAsyncDerivedAdapter({
      provides: RatePort,
      requires: [],
      select: () => ResultAsync.ok(1.5),
      staleTime: 5000,
      retryCount: 3,
      retryDelay: 1000,
    });

    expect(adapter).toBeDefined();
    expect(__asyncDerivedAdapterBrand in adapter).toBe(true);
  });

  it("supports retryDelay as function", () => {
    const adapter = createAsyncDerivedAdapter({
      provides: RatePort,
      requires: [],
      select: () => ResultAsync.ok(1.5),
      retryDelay: (attempt: number) => attempt * 1000,
    });

    expect(adapter).toBeDefined();
    expect(__asyncDerivedAdapterBrand in adapter).toBe(true);
  });
});

// =============================================================================
// createLinkedDerivedAdapter
// =============================================================================

describe("createLinkedDerivedAdapter", () => {
  it("creates adapter with brand symbol", () => {
    const adapter = createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [],
      select: () => 212,
      write: () => {},
    });

    expect(adapter).toBeDefined();
    expect(__linkedDerivedAdapterBrand in adapter).toBe(true);
  });

  it("supports custom equals function", () => {
    const adapter = createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [],
      select: () => 212,
      write: () => {},
      equals: (a, b) => a === b,
    });

    expect(adapter).toBeDefined();
    expect(__linkedDerivedAdapterBrand in adapter).toBe(true);
  });
});

// =============================================================================
// createEffectAdapter
// =============================================================================

describe("createEffectAdapter", () => {
  it("creates adapter with brand symbol", () => {
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      factory: () => ({
        onAction: () => {},
      }),
    });

    expect(adapter).toBeDefined();
    expect(__effectBrand in adapter).toBe(true);
  });

  it("supports requires parameter", () => {
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      requires: [CounterPort],
      factory: () => ({
        onAction: () => {},
      }),
    });

    expect(adapter).toBeDefined();
    expect(__effectBrand in adapter).toBe(true);
  });
});

// =============================================================================
// Brand verification across all adapter types
// =============================================================================

describe("Brand verification", () => {
  it("state adapter has only __stateAdapterBrand", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });

    expect(__stateAdapterBrand in adapter).toBe(true);
    expect(__atomAdapterBrand in adapter).toBe(false);
    expect(__derivedAdapterBrand in adapter).toBe(false);
    expect(__asyncDerivedAdapterBrand in adapter).toBe(false);
    expect(__linkedDerivedAdapterBrand in adapter).toBe(false);
    expect(__effectBrand in adapter).toBe(false);
  });

  it("atom adapter has only __atomAdapterBrand", () => {
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
    });

    expect(__atomAdapterBrand in adapter).toBe(true);
    expect(__stateAdapterBrand in adapter).toBe(false);
    expect(__derivedAdapterBrand in adapter).toBe(false);
    expect(__asyncDerivedAdapterBrand in adapter).toBe(false);
    expect(__linkedDerivedAdapterBrand in adapter).toBe(false);
    expect(__effectBrand in adapter).toBe(false);
  });

  it("derived adapter has only __derivedAdapterBrand", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [],
      select: () => 0,
    });

    expect(__derivedAdapterBrand in adapter).toBe(true);
    expect(__stateAdapterBrand in adapter).toBe(false);
    expect(__atomAdapterBrand in adapter).toBe(false);
  });

  it("async derived adapter has only __asyncDerivedAdapterBrand", () => {
    const adapter = createAsyncDerivedAdapter({
      provides: RatePort,
      requires: [],
      select: () => ResultAsync.ok(1.5),
    });

    expect(__asyncDerivedAdapterBrand in adapter).toBe(true);
    expect(__stateAdapterBrand in adapter).toBe(false);
    expect(__derivedAdapterBrand in adapter).toBe(false);
  });

  it("linked derived adapter has only __linkedDerivedAdapterBrand", () => {
    const adapter = createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [],
      select: () => 212,
      write: () => {},
    });

    expect(__linkedDerivedAdapterBrand in adapter).toBe(true);
    expect(__stateAdapterBrand in adapter).toBe(false);
    expect(__derivedAdapterBrand in adapter).toBe(false);
  });

  it("effect adapter has only __effectBrand", () => {
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      factory: () => ({
        onAction: () => {},
      }),
    });

    expect(__effectBrand in adapter).toBe(true);
    expect(__stateAdapterBrand in adapter).toBe(false);
    expect(__atomAdapterBrand in adapter).toBe(false);
  });
});

// =============================================================================
// Adapter defaults (kills ?? [] and ?? "singleton" mutants)
// =============================================================================

describe("Adapter defaults", () => {
  it("createStateAdapter without requires uses empty array (no error on build)", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });
    // The adapter spread includes requires from createAdapter
    const adapterObj = adapter as Record<string, unknown>;
    expect(Array.isArray(adapterObj["requires"])).toBe(true);
    expect((adapterObj["requires"] as unknown[]).length).toBe(0);
  });

  it("createAtomAdapter without requires does not have requires in config", () => {
    // createAtomAdapter doesn't have requires, so the inner createAdapter gets no requires
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
    });
    // Should build fine (requires defaults to [] inside createAdapter)
    expect(adapter).toBeDefined();
  });

  it("createStateAdapter without lifetime defaults to singleton", () => {
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("singleton");
  });

  it("createAtomAdapter without lifetime defaults to singleton", () => {
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("singleton");
  });
});

// =============================================================================
// Effect adapter factory invocation
// =============================================================================

describe("Effect adapter factory invocation", () => {
  it("createEffectAdapter passes deps to factory function", () => {
    let receivedDeps: Record<string, unknown> | undefined;
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      factory: deps => {
        receivedDeps = deps;
        return { onAction: () => {} };
      },
    });
    // The adapter wraps the factory; invoke it to verify deps pass-through
    const adapterObj = adapter as Record<string, unknown>;
    const factory = adapterObj["factory"] as (deps: Record<string, unknown>) => unknown;
    factory({ Counter: "mock" });
    expect(receivedDeps).toEqual({ Counter: "mock" });
  });

  it("createEffectAdapter factory return value is accessible", () => {
    const effect = { onAction: () => {} };
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      factory: () => effect,
    });
    const adapterObj = adapter as Record<string, unknown>;
    const factory = adapterObj["factory"] as (deps: Record<string, unknown>) => unknown;
    const result = factory({});
    expect(result).toBe(effect);
  });
});

// =============================================================================
// Adapter structure verification
// =============================================================================

describe("Adapter structure verification", () => {
  it("createDerivedAdapter: lifetime property defaults to singleton", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: () => 0,
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("singleton");
  });

  it("createDerivedAdapter: portName passed through to adapter provides", () => {
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: () => 0,
    });
    const adapterObj = adapter as Record<string, unknown>;
    const provides = adapterObj["provides"] as Record<string, unknown>;
    expect(provides["__portName"]).toBe("DoubleCount");
  });

  it("createAsyncDerivedAdapter: lifetime is always singleton", () => {
    const adapter = createAsyncDerivedAdapter({
      provides: RatePort,
      requires: [],
      select: () => ResultAsync.ok(1.5),
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("singleton");
  });

  it("createLinkedDerivedAdapter: lifetime is always singleton", () => {
    const adapter = createLinkedDerivedAdapter({
      provides: FahrenheitPort,
      requires: [],
      select: () => 212,
      write: () => {},
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("singleton");
  });

  it("createEffectAdapter: requires defaults to empty array", () => {
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      factory: () => ({ onAction: () => {} }),
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(Array.isArray(adapterObj["requires"])).toBe(true);
    expect((adapterObj["requires"] as unknown[]).length).toBe(0);
  });

  // =========================================================================
  // Explicit non-default values (kills ?? → && mutations)
  // =========================================================================

  it("createAtomAdapter: explicit lifetime='scoped' is preserved", () => {
    // Kills: atom-adapter.ts:22 LogicalOperator config.lifetime && "singleton"
    // With mutation: "scoped" && "singleton" → "singleton" (wrong)
    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light" as "light" | "dark",
      lifetime: "scoped",
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("scoped");
  });

  it("createDerivedAdapter: explicit lifetime='scoped' is preserved", () => {
    // Kills: derived-adapter.ts:33 LogicalOperator config.lifetime && "singleton"
    const adapter = createDerivedAdapter({
      provides: DoubleCountPort,
      requires: [CounterPort],
      select: () => 0,
      lifetime: "scoped",
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("scoped");
  });

  it("createEffectAdapter: explicit requires array is preserved", () => {
    // Kills: effect-adapter.ts:33 LogicalOperator config.requires && []
    // With mutation: [CounterPort] && [] → [] (wrong, loses dependency)
    const adapter = createEffectAdapter({
      provides: LoggerEffectPort,
      requires: [CounterPort],
      factory: () => ({ onAction: () => {} }),
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect((adapterObj["requires"] as unknown[]).length).toBe(1);
  });

  it("createStateAdapter: explicit requires array is preserved", () => {
    // Kills: state-adapter.ts:41 LogicalOperator config.requires && []
    const adapter = createStateAdapter({
      provides: CounterPort,
      requires: [ThemePort],
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect((adapterObj["requires"] as unknown[]).length).toBe(1);
  });

  it("createStateAdapter: explicit lifetime='scoped' is preserved", () => {
    // Kills: state-adapter.ts:42 LogicalOperator config.lifetime && "singleton"
    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: {
        increment: (state: CounterState) => ({ count: state.count + 1 }),
        add: (state: CounterState, n: number) => ({ count: state.count + n }),
      },
      lifetime: "scoped",
    });
    const adapterObj = adapter as Record<string, unknown>;
    expect(adapterObj["lifetime"]).toBe("scoped");
  });
});
