/**
 * Runtime tests for adapterOrDie() and adapterOrElse().
 *
 * Tests that these functions correctly wrap factory functions to handle
 * Result-like returns at runtime.
 *
 * @packageDocumentation
 */

import { describe, expect, it, vi } from "vitest";
import { port, createAdapter, adapterOrDie, adapterOrElse, adapterOrHandle } from "../src/index.js";
import type { FactoryResult } from "../src/index.js";
import { ResultAsync } from "@hex-di/result";

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
      freeze: true,
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
    interface Config {
      host: string;
    }
    const ConfigPort = port<Config>()({ name: "Config" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: _deps => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fallbackAdapter);
    expect(wrapped.requires).toEqual([ConfigPort]);
  });

  it("should dedup requires by port name", () => {
    interface Config {
      host: string;
    }
    const ConfigPort = port<Config>()({ name: "Config" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: _deps => ({ log: () => {} }),
    });
    const fallbackWithDep = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: _deps => ({ log: () => {} }),
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

  it("ResultAsync fallback keeps factoryKind sync at runtime", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });
    const asyncFallback = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, asyncFallback);
    // ResultAsync-returning factories are sync at runtime (no async keyword)
    expect(wrapped.factoryKind).toBe("sync");
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

  it("ResultAsync primary + sync fallback → factoryKind sync at runtime", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    // ResultAsync-returning factories are sync at runtime (no async keyword)
    expect(wrapped.factoryKind).toBe("sync");
  });

  it("ResultAsync primary + ResultAsync fallback → factoryKind sync at runtime", () => {
    const primary = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    // ResultAsync-returning factories are sync at runtime (no async keyword)
    expect(wrapped.factoryKind).toBe("sync");
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

  it("PromiseLike primary Ok → unwraps correctly", async () => {
    const logger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: (): PromiseLike<
        | { readonly _tag: "Ok"; readonly value: Logger }
        | { readonly _tag: "Err"; readonly error: string }
      > => Promise.resolve({ _tag: "Ok" as const, value: logger }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: () => {} }),
    });

    const wrapped = adapterOrElse(primary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(logger);
  });

  it("PromiseLike primary Err → calls ResultAsync fallback", async () => {
    const fallbackLogger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: (): PromiseLike<
        | { readonly _tag: "Ok"; readonly value: Logger }
        | { readonly _tag: "Err"; readonly error: string }
      > => Promise.resolve({ _tag: "Err" as const, error: "fail" }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      factory: () => ResultAsync.ok(fallbackLogger),
    });

    const wrapped = adapterOrElse(primary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(fallbackLogger);
  });

  it("primary returns thenable Ok → unwraps via isThenable", async () => {
    const logger: Logger = { log: () => {} };
    // Make primary return a thenable Ok at runtime
    const thenableOk = { then: (cb: (v: unknown) => void) => cb({ _tag: "Ok", value: logger }) };
    const thenablePrimary = createAdapter({
      provides: LoggerPort,
      factory: () => thenableOk as unknown as Promise<Logger>,
    });

    // Force async path by pairing with a ResultAsync fallback
    const wrapped = adapterOrElse(
      thenablePrimary,
      createAdapter({
        provides: LoggerPort,
        factory: () => ResultAsync.ok({ log: () => {} }),
      })
    );
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
      factory: () => ResultAsync.ok(fallbackLogger),
    });

    const wrapped = adapterOrElse(thenablePrimary, fb);
    const result = await wrapped.factory({});
    expect(result).toBe(fallbackLogger);
  });

  it("fallback returns thenable → unwraps via isThenable", async () => {
    const fallbackLogger: Logger = { log: () => {} };
    const primary = createAdapter({
      provides: LoggerPort,
      factory: (): PromiseLike<
        | { readonly _tag: "Ok"; readonly value: Logger }
        | { readonly _tag: "Err"; readonly error: string }
      > => Promise.resolve({ _tag: "Err" as const, error: "fail" }),
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
    interface Config {
      host: string;
    }
    interface Db {
      query(): void;
    }
    const ConfigPort = port<Config>()({ name: "Config" });
    const DbPort = port<Db>()({ name: "Db" });

    const primary = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      factory: _deps => ({ log: () => {} }),
    });
    const fb = createAdapter({
      provides: LoggerPort,
      requires: [DbPort],
      factory: _deps => ({ log: () => {} }),
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
      freeze: true,
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

// =============================================================================
// adapterOrHandle
// =============================================================================

type NotFoundError = { readonly _tag: "NotFound"; readonly id: string };
type TimeoutError = { readonly _tag: "Timeout"; readonly ms: number };
type AuthError = { readonly _tag: "AuthError"; readonly code: number };
type TestErrors = NotFoundError | TimeoutError | AuthError;

describe("adapterOrHandle", () => {
  const defaultLogger: Logger = { log: () => {} };

  it("should pass through Ok results and unwrap the value", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, TestErrors> => ({
        _tag: "Ok" as const,
        value: defaultLogger,
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: { log: () => {} } }),
    });
    const result = wrapped.factory({});
    expect(result).toBe(defaultLogger);
  });

  it("should call matching handler on Err and unwrap its Ok result", () => {
    const fallback: Logger = { log: () => {} };
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, TestErrors> => ({
        _tag: "Err" as const,
        error: { _tag: "NotFound" as const, id: "abc" },
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: fallback }),
    });
    const result = wrapped.factory({});
    expect(result).toBe(fallback);
  });

  it("should return Err as-is when no matching handler exists", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, TestErrors> => ({
        _tag: "Err" as const,
        error: { _tag: "AuthError" as const, code: 403 },
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: defaultLogger }),
    });
    const result = wrapped.factory({});
    expect(result).toEqual({ _tag: "Err", error: { _tag: "AuthError", code: 403 } });
  });

  it("should pass through plain (non-Result) factory returns unchanged", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => defaultLogger,
    });

    const wrapped = adapterOrHandle(adapter, {});
    const result = wrapped.factory({});
    expect(result).toBe(defaultLogger);
  });

  it("should pass the full error object to the handler", () => {
    const handlerFn = vi.fn(() => ({
      _tag: "Ok" as const,
      value: defaultLogger,
    }));

    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, TestErrors> => ({
        _tag: "Err" as const,
        error: { _tag: "Timeout" as const, ms: 5000 },
      }),
    });

    const wrapped = adapterOrHandle(adapter, { Timeout: handlerFn });
    wrapped.factory({});
    expect(handlerFn).toHaveBeenCalledWith({ _tag: "Timeout", ms: 5000 });
  });

  it("should preserve adapter metadata", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      lifetime: "scoped",
      factory: (): FactoryResult<Logger, NotFoundError> => ({
        _tag: "Ok" as const,
        value: defaultLogger,
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: defaultLogger }),
    });
    expect(wrapped.provides).toBe(adapter.provides);
    expect(wrapped.lifetime).toBe("scoped");
    expect(wrapped.requires).toEqual([]);
    expect(wrapped.factoryKind).toBe("sync");
    expect(wrapped.clonable).toBe(false);
  });

  it("should preserve clonable flag", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      clonable: true,
      freeze: true,
      factory: (): FactoryResult<Logger, NotFoundError> => ({
        _tag: "Ok" as const,
        value: defaultLogger,
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: defaultLogger }),
    });
    expect(wrapped.clonable).toBe(true);
  });

  it("should preserve finalizer", () => {
    const finalizerFn = vi.fn();
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, NotFoundError> => ({
        _tag: "Ok" as const,
        value: defaultLogger,
      }),
      finalizer: finalizerFn,
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: defaultLogger }),
    });
    expect(wrapped.finalizer).toBe(finalizerFn);
  });

  it("should return a frozen adapter", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): FactoryResult<Logger, NotFoundError> => ({
        _tag: "Ok" as const,
        value: defaultLogger,
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: defaultLogger }),
    });
    expect(Object.isFrozen(wrapped)).toBe(true);
  });

  it("should handle PromiseLike (thenable) factory returns", async () => {
    const fallback: Logger = { log: () => {} };
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: (): PromiseLike<FactoryResult<Logger, NotFoundError>> =>
        Promise.resolve({
          _tag: "Err" as const,
          error: { _tag: "NotFound" as const, id: "xyz" },
        }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: fallback }),
    });
    const result = await wrapped.factory({});
    expect(result).toBe(fallback);
  });

  it("should handle async factory returns", async () => {
    const fallback: Logger = { log: () => {} };
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: async (): Promise<FactoryResult<Logger, NotFoundError>> => ({
        _tag: "Err" as const,
        error: { _tag: "NotFound" as const, id: "xyz" },
      }),
    });

    const wrapped = adapterOrHandle(adapter, {
      NotFound: () => ({ _tag: "Ok" as const, value: fallback }),
    });
    const result = await wrapped.factory({});
    expect(result).toBe(fallback);
  });
});
