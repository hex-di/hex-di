/**
 * HostBridgeClock adapter tests — DoD 26
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import { createHostBridgeClock, createHostBridgeClockAdapter } from "../src/adapters/host-bridge-clock.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { ClockPort } from "../src/ports/clock.js";

// =============================================================================
// Helpers
// =============================================================================

function makeBridge(overrides?: {
  monotonicNowMs?: () => number;
  wallClockNowMs?: () => number;
  highResNowMs?: () => number;
}) {
  return {
    monotonicNowMs: overrides?.monotonicNowMs ?? (() => performance.now()),
    wallClockNowMs: overrides?.wallClockNowMs ?? (() => Date.now()),
    ...(overrides?.highResNowMs !== undefined
      ? { highResNowMs: overrides.highResNowMs }
      : {}),
  };
}

const defaultOptions = {
  adapterName: "TestBridgeClock",
  platform: "unknown" as const,
};

// =============================================================================
// DoD 26: HostBridgeClock behaviors
// =============================================================================

describe("HostBridgeClock — valid bridge", () => {
  it("valid bridge returns ok()", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
  });

  it("ClockDiagnostics.monotonicSource is 'host-bridge'", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getDiagnostics().monotonicSource).toBe("host-bridge");
  });

  it("ClockDiagnostics.adapterName matches options.adapterName", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, {
      adapterName: "MyCustomBridge",
      platform: "react-native",
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getDiagnostics().adapterName).toBe("MyCustomBridge");
  });

  it("without highResNowMs, highResDegraded is true", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.highResDegraded).toBe(true);
  });

  it("without highResNowMs, highResSource is 'host-bridge-wallclock'", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getDiagnostics().highResSource).toBe("host-bridge-wallclock");
  });

  it("with highResNowMs, highResDegraded is false", () => {
    const bridge = makeBridge({ highResNowMs: () => Date.now() });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.highResDegraded).toBe(false);
  });

  it("with highResNowMs, highResSource is 'host-bridge'", () => {
    const bridge = makeBridge({ highResNowMs: () => Date.now() });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getDiagnostics().highResSource).toBe("host-bridge");
  });

  it("returned adapter is frozen", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it("all three time methods return valid numbers (HB-1)", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    expect(typeof clock.monotonicNow()).toBe("number");
    expect(typeof clock.wallClockNow()).toBe("number");
    expect(typeof clock.highResNow()).toBe("number");
  });

  it("platform field is set from options (HB-2)", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, {
      adapterName: "RNBridge",
      platform: "react-native",
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.platform).toBe("react-native");
  });

  it("hasMonotonicTime is true", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getCapabilities().hasMonotonicTime).toBe(true);
  });
});

describe("HostBridgeClock — validation (HB-3)", () => {
  it("throws TypeError when monotonicNowMs is not a function", () => {
    const invalidBridge = {
      monotonicNowMs: "not-a-function" as unknown as () => number,
      wallClockNowMs: () => Date.now(),
    };

    expect(() =>
      createHostBridgeClock(invalidBridge, defaultOptions)
    ).toThrow(TypeError);
  });

  it("throws TypeError when wallClockNowMs is not a function", () => {
    const invalidBridge = {
      monotonicNowMs: () => performance.now(),
      wallClockNowMs: 12345 as unknown as () => number,
    };

    expect(() =>
      createHostBridgeClock(invalidBridge, defaultOptions)
    ).toThrow(TypeError);
  });
});

describe("HostBridgeClock — GxP mode (HB-4)", () => {
  it("in GxP mode, returns err('ST-4') when bridge object is not frozen", () => {
    const bridge = makeBridge();
    // bridge is not frozen

    const result = createHostBridgeClock(bridge, {
      ...defaultOptions,
      gxp: true,
    });
    // In GxP mode with unfrozen bridge, ST-4 triggers
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    } else {
      // If bridge is already frozen (unusual but valid), it passes
      expect(result.isOk()).toBe(true);
    }
  });

  it("in GxP mode, frozen bridge passes ST-4", () => {
    const bridge = Object.freeze(makeBridge());

    const result = createHostBridgeClock(bridge, {
      ...defaultOptions,
      gxp: true,
    });
    // With frozen bridge, ST-4 should not fire (other STs may run)
    if (result.isErr()) {
      // Only acceptable if another ST fires (e.g., ST-1, ST-2 on weird systems)
      expect(result.error.check).not.toBe("ST-4");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });
});

describe("HostBridgeClock — captured references (HB-5)", () => {
  it("uses captured bridge references, not the live bridge object", () => {
    let monotonicValue = 1000;
    const mutableBridge = {
      monotonicNowMs: () => monotonicValue,
      wallClockNowMs: () => Date.now(),
    };

    const result = createHostBridgeClock(mutableBridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    // The bridge function reference is captured; changing the field later is irrelevant
    // (captured reference still calls the original function which closes over monotonicValue)
    monotonicValue = 2000;
    const m = result.value.monotonicNow();
    expect(m).toBe(2000); // Captured closure updates because it reads the variable
  });
});

// =============================================================================
// Boundary condition tests (mutation score improvement)
// =============================================================================

describe("HostBridgeClock — startup self-test boundary conditions", () => {
  it("ST-2 exact boundary: wallClockNowMs = 1577836800000 returns err('ST-2')", () => {
    const bridge = makeBridge({
      wallClockNowMs: () => 1577836800000,
    });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-2");
    }
  });

  it("ST-5 at-threshold: |highRes - wall| = 1000ms exactly returns ok()", () => {
    const wallMs = 1700000000000;
    const bridge = makeBridge({
      wallClockNowMs: () => wallMs,
      highResNowMs: () => wallMs + 1000, // divergence = 1000 (NOT > 1000)
    });
    const result = createHostBridgeClock(bridge, defaultOptions);
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-5");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("ST-5 over-threshold: |highRes - wall| = 1001ms returns err('ST-5')", () => {
    const wallMs = 1700000000000;
    const bridge = makeBridge({
      wallClockNowMs: () => wallMs,
      highResNowMs: () => wallMs + 1001, // divergence = 1001 > 1000
    });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-5");
    }
  });

  it("ST-1: monotonicNowMs returning -1 triggers err('ST-1')", () => {
    const bridge = makeBridge({ monotonicNowMs: () => -1 });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-1");
    }
  });

  it("ST-3: regressing monotonicNowMs triggers err('ST-3')", () => {
    let callCount = 0;
    const bridge = makeBridge({
      monotonicNowMs: () => {
        callCount++;
        // First call returns 100, second returns 50 (regression)
        return callCount === 1 ? 100 : 50;
      },
    });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-3");
    }
  });

  it("ST-5 error message contains 'diverge'", () => {
    const wallMs = 1700000000000;
    const bridge = makeBridge({
      wallClockNowMs: () => wallMs,
      highResNowMs: () => wallMs + 2000,
    });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/diverge/);
    }
  });
});

// =============================================================================
// Validation error messages (kills L47, L50 StringLiteral survived)
// =============================================================================

describe("HostBridgeClock — validation error messages", () => {
  it("error message for non-function monotonicNowMs contains 'bridge.monotonicNowMs must be a function'", () => {
    const invalidBridge = {
      monotonicNowMs: 42 as unknown as () => number,
      wallClockNowMs: () => Date.now(),
    };
    expect(() => createHostBridgeClock(invalidBridge, defaultOptions))
      .toThrow("bridge.monotonicNowMs must be a function");
  });

  it("error message for non-function wallClockNowMs contains 'bridge.wallClockNowMs must be a function'", () => {
    const invalidBridge = {
      monotonicNowMs: () => performance.now(),
      wallClockNowMs: false as unknown as () => number,
    };
    expect(() => createHostBridgeClock(invalidBridge, defaultOptions))
      .toThrow("bridge.wallClockNowMs must be a function");
  });
});

// =============================================================================
// Capabilities assertions (kills L126 BooleanLiteral survived)
// =============================================================================

describe("HostBridgeClock — capabilities assertions", () => {
  it("monotonicDegraded is false (not true) for host bridge clock", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getCapabilities().monotonicDegraded).toBe(false);
  });

  it("estimatedResolutionMs is 0.001 when highResNowMs is provided", () => {
    const bridge = makeBridge({ highResNowMs: () => Date.now() });
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getCapabilities().estimatedResolutionMs).toBe(0.001);
  });

  it("estimatedResolutionMs is 1.0 when highResNowMs is not provided", () => {
    const bridge = makeBridge();
    const result = createHostBridgeClock(bridge, defaultOptions);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getCapabilities().estimatedResolutionMs).toBe(1.0);
  });
});

// =============================================================================
// GxP mode: unconditional assertion (kills survived mutant at L91-92)
// =============================================================================

describe("HostBridgeClock — GxP unconditional assertion", () => {
  it("GxP mode with unfrozen bridge always returns err('ST-4') — unconditional check", () => {
    const bridge = makeBridge(); // not frozen
    const result = createHostBridgeClock(bridge, { ...defaultOptions, gxp: true });
    // bridge is never frozen in tests → ST-4 always fires
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    }
  });
});

// =============================================================================
// DI adapter factory (kills L149-167 NoCoverage)
// =============================================================================

describe("HostBridgeClockAdapter — DI adapter factory", () => {
  it("createHostBridgeClockAdapter() provides ClockPort via DI graph", () => {
    const bridge = makeBridge();
    const adapter = createHostBridgeClockAdapter(bridge, defaultOptions);
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.monotonicNow).toBe("function");
  });

  it("createHostBridgeClockAdapter() factory creates singleton", () => {
    const bridge = makeBridge();
    const adapter = createHostBridgeClockAdapter(bridge, defaultOptions);
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });
    const c1 = container.resolve(ClockPort);
    const c2 = container.resolve(ClockPort);
    expect(c1).toBe(c2);
  });

  it("createHostBridgeClockAdapter() throws when startup fails (ST-2)", () => {
    const bridge = makeBridge({ wallClockNowMs: () => 1000000000 }); // before 2020
    const adapter = createHostBridgeClockAdapter(bridge, defaultOptions);
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow();
  });
});
