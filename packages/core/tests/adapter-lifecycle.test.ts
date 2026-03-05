/**
 * Runtime tests for adapter lifecycle states.
 *
 * Verifies:
 * - Full lifecycle transition: created → initialized → active → disposed
 * - Service access only in active state
 * - Invalid transitions throw InvalidTransitionError
 * - assertTransition runtime safety net
 * - Handles are frozen (immutable)
 *
 * Requirements tested:
 * - BEH-CO-08-001: AdapterHandle Phantom State (runtime behavior)
 * - BEH-CO-08-003: State Transition Validation (runtime safety net)
 */

import { describe, it, expect, vi } from "vitest";
import { createAdapterHandle, assertTransition, InvalidTransitionError } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  greet(name: string): string;
}

function createTestService(): TestService {
  return { greet: (name: string) => `Hello, ${name}` };
}

// =============================================================================
// Full Lifecycle
// =============================================================================

describe("AdapterHandle full lifecycle", () => {
  it("transitions through created → initialized → active → disposed", async () => {
    const service = createTestService();

    const created = createAdapterHandle<TestService>({
      getService: () => service,
    });

    expect(created.state).toBe("created");

    const initialized = await created.initialize();
    expect(initialized.state).toBe("initialized");

    const active = initialized.activate();
    expect(active.state).toBe("active");

    const disposed = await active.dispose();
    expect(disposed.state).toBe("disposed");
  });

  it("exposes service only in active state", async () => {
    const service = createTestService();

    const created = createAdapterHandle<TestService>({
      getService: () => service,
    });

    // created: service is undefined at runtime (never at type level)
    expect(created.service).toBeUndefined();

    const initialized = await created.initialize();
    // initialized: service is undefined at runtime
    expect(initialized.service).toBeUndefined();

    const active = initialized.activate();
    // active: service is the actual instance
    expect(active.service).toBe(service);
    expect(active.service.greet("World")).toBe("Hello, World");

    const disposed = await active.dispose();
    // disposed: service is undefined at runtime
    expect(disposed.service).toBeUndefined();
  });

  it("calls onInitialize during initialize()", async () => {
    const onInitialize = vi.fn().mockResolvedValue(undefined);
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
      onInitialize,
    });

    await handle.initialize();
    expect(onInitialize).toHaveBeenCalledOnce();
  });

  it("calls onDispose during dispose()", async () => {
    const onDispose = vi.fn().mockResolvedValue(undefined);
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
      onDispose,
    });

    const initialized = await handle.initialize();
    const active = initialized.activate();
    await active.dispose();

    expect(onDispose).toHaveBeenCalledOnce();
  });

  it("calls getService during activate()", async () => {
    const getService = vi.fn(createTestService);
    const handle = createAdapterHandle<TestService>({
      getService,
    });

    const initialized = await handle.initialize();
    initialized.activate();

    expect(getService).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// Frozen Handles
// =============================================================================

describe("AdapterHandle immutability", () => {
  it("created handle is frozen", () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    expect(Object.isFrozen(handle)).toBe(true);
  });

  it("initialized handle is frozen", async () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    const initialized = await handle.initialize();
    expect(Object.isFrozen(initialized)).toBe(true);
  });

  it("active handle is frozen", async () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    const initialized = await handle.initialize();
    const active = initialized.activate();
    expect(Object.isFrozen(active)).toBe(true);
  });

  it("disposed handle is frozen", async () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    const initialized = await handle.initialize();
    const active = initialized.activate();
    const disposed = await active.dispose();
    expect(Object.isFrozen(disposed)).toBe(true);
  });
});

// =============================================================================
// assertTransition Runtime Safety
// =============================================================================

describe("assertTransition", () => {
  it("allows created → initialized", () => {
    expect(() => assertTransition("created", "initialized")).not.toThrow();
  });

  it("allows initialized → active", () => {
    expect(() => assertTransition("initialized", "active")).not.toThrow();
  });

  it("allows active → disposing", () => {
    expect(() => assertTransition("active", "disposing")).not.toThrow();
  });

  it("allows disposing → disposed", () => {
    expect(() => assertTransition("disposing", "disposed")).not.toThrow();
  });

  it("rejects created → active (skip)", () => {
    expect(() => assertTransition("created", "active")).toThrow(InvalidTransitionError);
  });

  it("rejects created → disposed (skip)", () => {
    expect(() => assertTransition("created", "disposed")).toThrow(InvalidTransitionError);
  });

  it("rejects active → created (backward)", () => {
    expect(() => assertTransition("active", "created")).toThrow(InvalidTransitionError);
  });

  it("rejects disposed → created (from terminal)", () => {
    expect(() => assertTransition("disposed", "created")).toThrow(InvalidTransitionError);
  });

  it("rejects disposed → initialized (from terminal)", () => {
    expect(() => assertTransition("disposed", "initialized")).toThrow(InvalidTransitionError);
  });

  it("rejects self-transition created → created", () => {
    expect(() => assertTransition("created", "created")).toThrow(InvalidTransitionError);
  });

  it("rejects initialized → disposed (skip)", () => {
    expect(() => assertTransition("initialized", "disposed")).toThrow(InvalidTransitionError);
  });
});

// =============================================================================
// InvalidTransitionError
// =============================================================================

describe("InvalidTransitionError", () => {
  it("has correct properties", () => {
    const err = new InvalidTransitionError("created", "active");

    expect(err).toBeInstanceOf(InvalidTransitionError);
    expect(err._tag).toBe("InvalidTransition");
    expect(err.code).toBe("INVALID_TRANSITION");
    expect(err.isProgrammingError).toBe(true);
    expect(err.fromState).toBe("created");
    expect(err.toState).toBe("active");
    expect(err.message).toContain("created");
    expect(err.message).toContain("active");
  });

  it("is frozen", () => {
    const err = new InvalidTransitionError("active", "created");
    expect(Object.isFrozen(err)).toBe(true);
  });
});

// =============================================================================
// Unavailable Methods
// =============================================================================

describe("unavailable methods are undefined at runtime", () => {
  it("created handle: activate, dispose are undefined", () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    expect(handle.activate).toBeUndefined();
    expect(handle.dispose).toBeUndefined();
  });

  it("initialized handle: initialize, dispose are undefined", async () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    const initialized = await handle.initialize();
    expect(initialized.initialize).toBeUndefined();
    expect(initialized.dispose).toBeUndefined();
  });

  it("active handle: initialize, activate are undefined", async () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    const initialized = await handle.initialize();
    const active = initialized.activate();
    expect(active.initialize).toBeUndefined();
    expect(active.activate).toBeUndefined();
  });

  it("disposed handle: all methods are undefined", async () => {
    const handle = createAdapterHandle<TestService>({
      getService: createTestService,
    });

    const initialized = await handle.initialize();
    const active = initialized.activate();
    const disposed = await active.dispose();
    expect(disposed.initialize).toBeUndefined();
    expect(disposed.activate).toBeUndefined();
    expect(disposed.dispose).toBeUndefined();
  });
});
