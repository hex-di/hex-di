/**
 * Runtime tests for adapterOrDie() and adapterOrElse().
 *
 * Tests that these functions correctly wrap factory functions to handle
 * Result-like returns at runtime.
 *
 * @packageDocumentation
 */

import { describe, expect, it, vi } from "vitest";
import { port, createAdapter, adapterOrDie, adapterOrElse } from "../src/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

// =============================================================================
// adapterOrDie
// =============================================================================

describe("adapterOrDie", () => {
  it("should pass through non-Result factory returns unchanged", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrDie(adapter);
    const result = wrapped.factory({});
    expect(result).toEqual({ log: expect.any(Function) });
  });

  it("should unwrap Ok results", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () =>
        ({ _tag: "Ok", value: { log: () => {} } }) as
          | { readonly _tag: "Ok"; readonly value: Logger }
          | { readonly _tag: "Err"; readonly error: string },
    });

    const wrapped = adapterOrDie(adapter);
    const result = wrapped.factory({});
    expect(result).toEqual({ log: expect.any(Function) });
  });

  it("should throw on Err results", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () =>
        ({ _tag: "Err", error: "connection failed" }) as
          | { readonly _tag: "Ok"; readonly value: Logger }
          | { readonly _tag: "Err"; readonly error: string },
    });

    const wrapped = adapterOrDie(adapter);
    expect(() => wrapped.factory({})).toThrow("connection failed");
  });

  it("should preserve adapter metadata", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      lifetime: "scoped",
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrDie(adapter);
    expect(wrapped.provides).toBe(adapter.provides);
    expect(wrapped.lifetime).toBe("scoped");
    expect(wrapped.requires).toEqual([]);
    expect(wrapped.factoryKind).toBe("sync");
  });

  it("should preserve clonable flag", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      clonable: true,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrDie(adapter);
    expect(wrapped.clonable).toBe(true);
  });

  it("should return a frozen adapter", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrDie(adapter);
    expect(Object.isFrozen(wrapped)).toBe(true);
  });
});

// =============================================================================
// adapterOrElse
// =============================================================================

describe("adapterOrElse", () => {
  const fallbackAdapter = createAdapter({
    provides: LoggerPort,
    factory: () => ({ log: () => {} }),
  });

  it("should pass through non-Result factory returns unchanged", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(adapter, fallbackAdapter);
    const result = wrapped.factory({});
    expect(result).toEqual({ log: expect.any(Function) });
  });

  it("should unwrap Ok results", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () =>
        ({ _tag: "Ok", value: { log: () => {} } }) as
          | { readonly _tag: "Ok"; readonly value: Logger }
          | { readonly _tag: "Err"; readonly error: string },
    });

    const wrapped = adapterOrElse(adapter, fallbackAdapter);
    const result = wrapped.factory({});
    expect(result).toEqual({ log: expect.any(Function) });
  });

  it("should call fallback adapter factory on Err results", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () =>
        ({ _tag: "Err", error: "connection failed" }) as
          | { readonly _tag: "Ok"; readonly value: Logger }
          | { readonly _tag: "Err"; readonly error: string },
    });

    const specificFallbackLogger: Logger = { log: () => {} };
    const specificFallback = createAdapter({
      provides: LoggerPort,
      factory: () => specificFallbackLogger,
    });

    const wrapped = adapterOrElse(adapter, specificFallback);
    const result = wrapped.factory({});
    expect(result).toBe(specificFallbackLogger);
  });

  it("should preserve primary adapter metadata", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      lifetime: "transient",
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(adapter, fallbackAdapter);
    expect(wrapped.provides).toBe(adapter.provides);
    expect(wrapped.lifetime).toBe("transient");
  });

  it("should merge requires from both adapters", () => {
    interface Config { host: string }
    const ConfigPort = port<Config>()({ name: "Config" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: (_deps) => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fallbackAdapter);
    expect(wrapped.requires).toEqual([ConfigPort]);
  });

  it("should dedup requires by port name", () => {
    interface Config { host: string }
    const ConfigPort = port<Config>()({ name: "Config" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: (_deps) => ({ log: () => {} }),
    });
    const fallbackWithDep = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: (_deps) => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fallbackWithDep);
    expect(wrapped.requires).toHaveLength(1);
    expect(wrapped.requires[0]).toBe(ConfigPort);
  });

  it("should return a frozen adapter", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(adapter, fallbackAdapter);
    expect(Object.isFrozen(wrapped)).toBe(true);
  });

  it("should be async if fallback is async", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    const asyncFallback = createAdapter({
      provides: LoggerPort,
      factory: async () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, asyncFallback);
    expect(wrapped.factoryKind).toBe("async");
  });

  it("should NOT call fallback when primary returns Ok", () => {
    const fallbackFn = vi.fn(() => ({ log: () => {} }));
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () =>
        ({ _tag: "Ok", value: { log: () => {} } }) as
          | { readonly _tag: "Ok"; readonly value: Logger }
          | { readonly _tag: "Err"; readonly error: string },
    });
    const fb = createAdapter({ provides: LoggerPort, factory: fallbackFn });

    const wrapped = adapterOrElse(primary, fb);
    wrapped.factory({});
    expect(fallbackFn).not.toHaveBeenCalled();
  });

  it("should NOT call fallback when primary returns plain value", () => {
    const fallbackFn = vi.fn(() => ({ log: () => {} }));
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    const fb = createAdapter({ provides: LoggerPort, factory: fallbackFn });

    const wrapped = adapterOrElse(primary, fb);
    wrapped.factory({});
    expect(fallbackFn).not.toHaveBeenCalled();
  });

  it("async primary + sync fallback → factoryKind async", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: async () => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.factoryKind).toBe("async");
  });

  it("async primary + async fallback → factoryKind async", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: async () => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: async () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.factoryKind).toBe("async");
  });

  it("sync primary + sync fallback → factoryKind sync", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.factoryKind).toBe("sync");
  });

  it("async primary Ok → unwraps correctly", async () => {
    const logger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: async (): Promise<
        | { readonly _tag: "Ok"; readonly value: Logger }
        | { readonly _tag: "Err"; readonly error: string }
      > => ({ _tag: "Ok", value: logger }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(logger);
  });

  it("async primary Err → calls async fallback", async () => {
    const fallbackLogger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: async (): Promise<
        | { readonly _tag: "Ok"; readonly value: Logger }
        | { readonly _tag: "Err"; readonly error: string }
      > => ({ _tag: "Err", error: "fail" }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: async () => fallbackLogger,
    });

    const wrapped = adapterOrElse(primary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(fallbackLogger);
  });

  it("primary returns thenable Ok → unwraps via isThenable", async () => {
    const logger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: async () => logger,
    });
    // Make primary return a thenable Ok at runtime
    const thenableOk = { then: (cb: (v: unknown) => void) => cb({ _tag: "Ok", value: logger }) };
    const thenablePrimary = createAdapter({
      provides: LoggerPort,
      factory: () => thenableOk as unknown as Promise<Logger>,
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    // Force async path by pairing with an async fallback
    const wrapped = adapterOrElse(thenablePrimary, createAdapter({
      provides: LoggerPort,
      factory: async () => ({ log: () => {} }),
    }));
    const result = await wrapped.factory({});
    expect(result).toBe(logger);
  });

  it("primary returns thenable Err → calls fallback", async () => {
    const fallbackLogger: Logger = { log: () => {} };
    const thenableErr = { then: (cb: (v: unknown) => void) => cb({ _tag: "Err", error: "fail" }) };
    const thenablePrimary = createAdapter({
      provides: LoggerPort,
      factory: () => thenableErr as unknown as Promise<Logger>,
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: async () => fallbackLogger,
    });

    const wrapped = adapterOrElse(thenablePrimary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(fallbackLogger);
  });

  it("fallback returns thenable → unwraps via isThenable", async () => {
    const fallbackLogger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: async (): Promise<
        | { readonly _tag: "Ok"; readonly value: Logger }
        | { readonly _tag: "Err"; readonly error: string }
      > => ({ _tag: "Err", error: "fail" }),
    });
    const thenableFb = { then: (cb: (v: unknown) => void) => cb(fallbackLogger) };
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => thenableFb as unknown as Promise<Logger>,
    });

    const wrapped = adapterOrElse(primary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(fallbackLogger);
  });

  it("preserves finalizer from primary adapter", () => {
    const finalizerFn = vi.fn();
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
      finalizer: finalizerFn,
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.finalizer).toBe(finalizerFn);
  });

  it("no finalizer when primary has none", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.finalizer).toBeUndefined();
  });

  it("merges requires from both adapters with distinct ports", () => {
    interface Config { host: string }
    interface Db { query(): void }
    const ConfigPort = port<Config>()({ name: "Config" });
    const DbPort = port<Db>()({ name: "Db" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: (_deps) => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      requires: [DbPort],
      factory: (_deps) => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.requires).toHaveLength(2);
    expect(wrapped.requires[0]).toBe(ConfigPort);
    expect(wrapped.requires[1]).toBe(DbPort);
  });

  it("preserves clonable flag from primary", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      clonable: true,
      factory: () => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    expect(wrapped.clonable).toBe(true);
  });
});

// =============================================================================
// adapterOrDie - finalizer preservation
// =============================================================================

describe("adapterOrDie finalizer", () => {
  it("preserves finalizer from adapter", () => {
    const finalizerFn = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
      finalizer: finalizerFn,
    });

    const wrapped = adapterOrDie(adapter);
    expect(wrapped.finalizer).toBe(finalizerFn);
  });
});
