/**
 * VirtualClock adapter tests — DoD 4
 */

import { describe, it, expect } from "vitest";
import { createVirtualClock } from "../src/testing/virtual-clock.js";
import { createClockRangeError } from "../src/clock-range-error.js";
import type { VirtualClockOptions } from "../src/testing/virtual-clock.js";

const DEFAULT_WALL_CLOCK = 1707753600000; // 2024-02-12T12:00:00Z

/** Unwrap createVirtualClock for tests where options are always valid. Throws on err. */
function makeClock(options?: VirtualClockOptions) {
  const result = createVirtualClock(options);
  if (result.isErr()) throw new Error(`Unexpected clock error: ${result.error.message}`);
  return result.value;
}

// =============================================================================
// DoD 4: Virtual Clock Adapter
// =============================================================================

describe("VirtualClock", () => {
  it("createVirtualClock() with defaults: monotonicNow returns 0", () => {
    const clock = makeClock();
    expect(clock.monotonicNow()).toBe(0);
  });

  it("createVirtualClock() with defaults: wallClockNow returns default epoch", () => {
    const clock = makeClock();
    expect(clock.wallClockNow()).toBe(DEFAULT_WALL_CLOCK);
  });

  it("createVirtualClock() with custom options uses provided values", () => {
    const clock = makeClock({ initialMonotonic: 500, initialWallClock: 1000000000000 });
    expect(clock.monotonicNow()).toBe(500);
    expect(clock.wallClockNow()).toBe(1000000000000);
  });

  it("advance() moves all three time functions forward", () => {
    const clock = makeClock({ initialMonotonic: 0, initialWallClock: DEFAULT_WALL_CLOCK });
    const m0 = clock.monotonicNow();
    const w0 = clock.wallClockNow();
    const h0 = clock.highResNow();

    clock.advance(100);

    expect(clock.monotonicNow()).toBe(m0 + 100);
    expect(clock.wallClockNow()).toBe(w0 + 100);
    expect(clock.highResNow()).toBe(h0 + 100);
  });

  it("advance() with 0 is a no-op", () => {
    const clock = makeClock({ initialMonotonic: 0 });
    clock.advance(0);
    expect(clock.monotonicNow()).toBe(0);
  });

  it("advance() with negative value returns err(ClockRangeError)", () => {
    const clock = makeClock();
    const result = clock.advance(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
      expect(result.error.value).toBe(-1);
    }
  });

  it("set() updates only specified time functions", () => {
    const clock = makeClock({
      initialMonotonic: 100,
      initialWallClock: DEFAULT_WALL_CLOCK,
      initialHighRes: DEFAULT_WALL_CLOCK,
    });
    clock.set({ monotonic: 999 });
    expect(clock.monotonicNow()).toBe(999);
    expect(clock.wallClockNow()).toBe(DEFAULT_WALL_CLOCK);
  });

  it("set() with empty object is a no-op", () => {
    const clock = makeClock({ initialMonotonic: 42 });
    clock.set({});
    expect(clock.monotonicNow()).toBe(42);
  });

  it("jumpWallClock() moves wallClock and highRes but not monotonic", () => {
    const clock = makeClock({
      initialMonotonic: 100,
      initialWallClock: DEFAULT_WALL_CLOCK,
    });
    const mono0 = clock.monotonicNow();
    clock.jumpWallClock(5000);
    expect(clock.monotonicNow()).toBe(mono0);
    expect(clock.wallClockNow()).toBe(DEFAULT_WALL_CLOCK + 5000);
    expect(clock.highResNow()).toBe(DEFAULT_WALL_CLOCK + 5000);
  });

  it("jumpWallClock() with negative value moves time backward", () => {
    const clock = makeClock({ initialWallClock: DEFAULT_WALL_CLOCK });
    clock.jumpWallClock(-1000);
    expect(clock.wallClockNow()).toBe(DEFAULT_WALL_CLOCK - 1000);
  });

  it("determinism: two instances with same operations produce same results", () => {
    const clock1 = makeClock({ initialMonotonic: 0, initialWallClock: 1000000 });
    const clock2 = makeClock({ initialMonotonic: 0, initialWallClock: 1000000 });

    clock1.advance(100);
    clock2.advance(100);

    expect(clock1.monotonicNow()).toBe(clock2.monotonicNow());
    expect(clock1.wallClockNow()).toBe(clock2.wallClockNow());
  });

  it("createVirtualClock() returns err when initialMonotonic is NaN", () => {
    const result = createVirtualClock({ initialMonotonic: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("createVirtualClock() returns err when initialWallClock is Infinity", () => {
    const result = createVirtualClock({ initialWallClock: Infinity });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("createVirtualClock() accepts negative initialMonotonic without error", () => {
    const result = createVirtualClock({ initialMonotonic: -100 });
    expect(result.isOk()).toBe(true);
  });

  it("set() returns err when any field is NaN", () => {
    const clock = makeClock();
    expect(clock.set({ monotonic: NaN }).isErr()).toBe(true);
    expect(clock.set({ wallClock: NaN }).isErr()).toBe(true);
    expect(clock.set({ highRes: NaN }).isErr()).toBe(true);
  });

  it("set() returns err when any field is Infinity or -Infinity", () => {
    const clock = makeClock();
    expect(clock.set({ monotonic: Infinity }).isErr()).toBe(true);
    expect(clock.set({ wallClock: -Infinity }).isErr()).toBe(true);
  });

  it("set() accepts negative values without error", () => {
    const clock = makeClock();
    expect(clock.set({ monotonic: -100 }).isOk()).toBe(true);
    expect(clock.set({ wallClock: -500 }).isOk()).toBe(true);
  });

  it("advance() with negative: returned err contains ClockRangeError with _tag 'ClockRangeError'", () => {
    const clock = makeClock();
    const result = clock.advance(-5);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("advance() with negative: returned ClockRangeError is frozen", () => {
    const clock = makeClock();
    const result = clock.advance(-5);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(Object.isFrozen(result.error)).toBe(true);
    }
  });

  it("advance() with negative: ClockRangeError includes parameter, value, and message fields", () => {
    const clock = makeClock();
    const result = clock.advance(-42);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(typeof result.error.parameter).toBe("string");
      expect(result.error.value).toBe(-42);
      expect(typeof result.error.message).toBe("string");
    }
  });

  it("VirtualClockAdapter does not access system clock after construction", () => {
    const clock = makeClock({ initialMonotonic: 100, initialWallClock: 5000 });
    const m1 = clock.monotonicNow();
    const w1 = clock.wallClockNow();
    const h1 = clock.highResNow();

    expect(m1).toBe(100);
    expect(w1).toBe(5000);
    expect(h1).toBe(5000); // defaults highRes to initialWallClock
  });

  it("createClockRangeError() returns a frozen object with _tag 'ClockRangeError'", () => {
    const error = createClockRangeError("ms", -1, "test error");
    expect(error._tag).toBe("ClockRangeError");
    expect(Object.isFrozen(error)).toBe(true);
  });
});

// =============================================================================
// DoD 4: Auto-Advance on Read
// =============================================================================

describe("VirtualClock auto-advance", () => {
  it("createVirtualClock({ autoAdvance: 10 }): first monotonicNow() returns 0, second returns 10", () => {
    const clock = makeClock({ initialMonotonic: 0, autoAdvance: 10 });
    expect(clock.monotonicNow()).toBe(0);
    expect(clock.monotonicNow()).toBe(10);
  });

  it("createVirtualClock({ autoAdvance: 10 }): wallClockNow() also advances by 10 on each read", () => {
    const clock = makeClock({ initialWallClock: DEFAULT_WALL_CLOCK, autoAdvance: 10 });
    expect(clock.wallClockNow()).toBe(DEFAULT_WALL_CLOCK);
    expect(clock.wallClockNow()).toBe(DEFAULT_WALL_CLOCK + 10);
  });

  it("createVirtualClock({ autoAdvance: 10 }): highResNow() also advances by 10 on each read", () => {
    const clock = makeClock({ initialHighRes: DEFAULT_WALL_CLOCK, autoAdvance: 10 });
    expect(clock.highResNow()).toBe(DEFAULT_WALL_CLOCK);
    expect(clock.highResNow()).toBe(DEFAULT_WALL_CLOCK + 10);
  });

  it("setAutoAdvance(0) disables auto-advance", () => {
    const clock = makeClock({ initialMonotonic: 0, autoAdvance: 10 });
    clock.setAutoAdvance(0);
    const v1 = clock.monotonicNow();
    const v2 = clock.monotonicNow();
    expect(v1).toBe(v2);
  });

  it("setAutoAdvance(5) overrides construction option", () => {
    const clock = makeClock({ initialMonotonic: 0, autoAdvance: 10 });
    clock.setAutoAdvance(5);
    expect(clock.monotonicNow()).toBe(0);
    expect(clock.monotonicNow()).toBe(5);
  });

  it("getAutoAdvance() returns the current auto-advance value", () => {
    const clock = makeClock({ autoAdvance: 7 });
    expect(clock.getAutoAdvance()).toBe(7);
    clock.setAutoAdvance(3);
    expect(clock.getAutoAdvance()).toBe(3);
  });

  it("auto-advance returns value BEFORE advancing (read-then-advance semantics)", () => {
    const clock = makeClock({ initialMonotonic: 100, autoAdvance: 10 });
    const firstRead = clock.monotonicNow();
    expect(firstRead).toBe(100);
    const secondRead = clock.monotonicNow();
    expect(secondRead).toBe(110);
  });

  it("setAutoAdvance() returns err for negative value", () => {
    const clock = makeClock();
    const result = clock.setAutoAdvance(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("createVirtualClock() returns err when autoAdvance is NaN", () => {
    const result = createVirtualClock({ autoAdvance: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });
});

// =============================================================================
// Mutation score improvement — error messages and boundary conditions
// =============================================================================

describe("VirtualClock — option validation error messages", () => {
  it("initialMonotonic: NaN err.message contains 'must be a finite'", () => {
    const result = createVirtualClock({ initialMonotonic: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/must be a finite/);
    }
  });

  it("initialMonotonic: Infinity err.parameter is 'initialMonotonic'", () => {
    const result = createVirtualClock({ initialMonotonic: Infinity });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.parameter).toBe("initialMonotonic");
    }
  });

  it("initialWallClock: Infinity err.parameter is 'initialWallClock'", () => {
    const result = createVirtualClock({ initialWallClock: Infinity });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.parameter).toBe("initialWallClock");
    }
  });

  it("initialHighRes: Infinity returns err(ClockRangeError)", () => {
    const result = createVirtualClock({ initialHighRes: Infinity });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("initialHighRes: NaN err.parameter is 'initialHighRes'", () => {
    const result = createVirtualClock({ initialHighRes: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.parameter).toBe("initialHighRes");
    }
  });

  it("autoAdvance: -1 (via constructor) returns err(ClockRangeError)", () => {
    const result = createVirtualClock({ autoAdvance: -1 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("autoAdvance: -1 (via constructor) err.parameter is 'autoAdvance'", () => {
    const result = createVirtualClock({ autoAdvance: -1 });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.parameter).toBe("autoAdvance");
    }
  });

  it("autoAdvance: 0 (via constructor) is valid — returns ok", () => {
    const result = createVirtualClock({ autoAdvance: 0 });
    expect(result.isOk()).toBe(true);
  });

  it("setAutoAdvance(-1) err.message contains 'non-negative'", () => {
    const clock = makeClock();
    const result = clock.setAutoAdvance(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/non-negative/);
    }
  });
});

describe("VirtualClock — advance() error message content", () => {
  it("advance(-1) error.parameter is 'ms'", () => {
    const clock = makeClock();
    const result = clock.advance(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.parameter).toBe("ms");
    }
  });

  it("advance(-1) error.message contains 'non-negative'", () => {
    const clock = makeClock();
    const result = clock.advance(-1);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/non-negative/);
    }
  });
});

describe("VirtualClock — set() and jumpWallClock() error messages", () => {
  it("set({ monotonic: NaN }) err.message contains 'monotonic'", () => {
    const clock = makeClock();
    const result = clock.set({ monotonic: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/monotonic/);
    }
  });

  it("set({ wallClock: NaN }) err.message contains 'wallClock'", () => {
    const clock = makeClock();
    const result = clock.set({ wallClock: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/wallClock/);
    }
  });

  it("set({ highRes: Infinity }) returns err(ClockRangeError)", () => {
    const clock = makeClock();
    const result = clock.set({ highRes: Infinity });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("set({ highRes: NaN }) err.message contains 'highRes'", () => {
    const clock = makeClock();
    const result = clock.set({ highRes: NaN });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/highRes/);
    }
  });

  it("jumpWallClock(NaN) returns err(ClockRangeError)", () => {
    const clock = makeClock();
    const result = clock.jumpWallClock(NaN);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("jumpWallClock(Infinity) returns err(ClockRangeError)", () => {
    const clock = makeClock();
    const result = clock.jumpWallClock(Infinity);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("ClockRangeError");
    }
  });

  it("jumpWallClock(NaN) err.message contains 'finite'", () => {
    const clock = makeClock();
    const result = clock.jumpWallClock(NaN);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/finite/);
    }
  });
});

describe("VirtualClock — autoAdvance=0 boundary (no spurious advance)", () => {
  it("wallClockNow() does NOT advance when autoAdvanceMs is 0 (default)", () => {
    const clock = makeClock();
    const v1 = clock.wallClockNow();
    const v2 = clock.wallClockNow();
    expect(v1).toBe(v2);
  });

  it("highResNow() does NOT advance when autoAdvanceMs is 0 (default)", () => {
    const clock = makeClock();
    const v1 = clock.highResNow();
    const v2 = clock.highResNow();
    expect(v1).toBe(v2);
  });

  it("after setAutoAdvance(0), wallClockNow() no longer advances", () => {
    const clock = makeClock({ autoAdvance: 10 });
    clock.setAutoAdvance(0);
    const v1 = clock.wallClockNow();
    const v2 = clock.wallClockNow();
    expect(v1).toBe(v2);
  });

  it("after setAutoAdvance(0), highResNow() no longer advances", () => {
    const clock = makeClock({ autoAdvance: 10 });
    clock.setAutoAdvance(0);
    const v1 = clock.highResNow();
    const v2 = clock.highResNow();
    expect(v1).toBe(v2);
  });
});

// =============================================================================
// Mutation score improvement — set() highRes valid value (kills CE true at L178)
// =============================================================================

describe("VirtualClock — set() highRes finite value does NOT err (kills id=1246)", () => {
  it("set({ highRes: 100 }) with finite value returns ok", () => {
    const clock = makeClock();
    const result = clock.set({ highRes: 100 });
    expect(result.isOk()).toBe(true);
  });

  it("set({ highRes: 100 }) updates highResNow() to 100", () => {
    const clock = makeClock();
    clock.set({ highRes: 100 });
    expect(clock.highResNow()).toBe(100);
  });

  it("set({ highRes: 0 }) is valid and updates highResNow()", () => {
    const clock = makeClock({ initialHighRes: 999 });
    const result = clock.set({ highRes: 0 });
    expect(result.isOk()).toBe(true);
    expect(clock.highResNow()).toBe(0);
  });
});
