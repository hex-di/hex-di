/**
 * Tests for src/resolution/core.ts
 * Covers getMemoForLifetime, resolveWithMemo, resolveWithMemoAsync,
 * buildDependencies, buildDependenciesAsync.
 */
import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import {
  getMemoForLifetime,
  resolveWithMemo,
  resolveWithMemoAsync,
  buildDependencies,
  buildDependenciesAsync,
} from "../src/resolution/core.js";
import { MemoMap } from "../src/util/memo-map.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });

describe("getMemoForLifetime", () => {
  it("returns singletonMemo for 'singleton' lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    expect(getMemoForLifetime("singleton", singletonMemo, scopedMemo)).toBe(singletonMemo);
  });

  it("returns scopedMemo for 'scoped' lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    expect(getMemoForLifetime("scoped", singletonMemo, scopedMemo)).toBe(scopedMemo);
  });

  it("returns null for 'transient' lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    expect(getMemoForLifetime("transient", singletonMemo, scopedMemo)).toBeNull();
  });

  it("throws for unknown lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    expect(() => getMemoForLifetime("unknown" as any, singletonMemo, scopedMemo)).toThrow(
      /Unknown lifetime/
    );
  });
});

describe("resolveWithMemo", () => {
  it("calls factory directly for transient lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    const factory = vi.fn().mockReturnValue({ log: vi.fn() });

    const result = resolveWithMemo(LoggerPort, "transient", singletonMemo, scopedMemo, factory);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ log: expect.any(Function) });
  });

  it("creates new transient instance on each call", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    let count = 0;
    const factory = () => ({ id: ++count, log: vi.fn() });

    const r1 = resolveWithMemo(LoggerPort, "transient", singletonMemo, scopedMemo, factory);
    const r2 = resolveWithMemo(LoggerPort, "transient", singletonMemo, scopedMemo, factory);

    expect(r1).not.toBe(r2);
    expect((r1 as any).id).toBe(1);
    expect((r2 as any).id).toBe(2);
  });

  it("memoizes for singleton lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    let count = 0;
    const factory = () => ({ id: ++count, log: vi.fn() });

    const r1 = resolveWithMemo(LoggerPort, "singleton", singletonMemo, scopedMemo, factory);
    const r2 = resolveWithMemo(LoggerPort, "singleton", singletonMemo, scopedMemo, factory);

    expect(r1).toBe(r2);
    expect((r1 as any).id).toBe(1);
  });

  it("memoizes for scoped lifetime", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    let count = 0;
    const factory = () => ({ id: ++count, log: vi.fn() });

    const r1 = resolveWithMemo(LoggerPort, "scoped", singletonMemo, scopedMemo, factory);
    const r2 = resolveWithMemo(LoggerPort, "scoped", singletonMemo, scopedMemo, factory);

    expect(r1).toBe(r2);
    expect((r1 as any).id).toBe(1);
  });

  it("passes finalizer to MemoMap for singleton", () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    const factory = () => ({ log: vi.fn() });
    const finalizer = vi.fn();

    resolveWithMemo(LoggerPort, "singleton", singletonMemo, scopedMemo, factory, finalizer);

    // Finalizer is registered but not called until disposal
    expect(finalizer).not.toHaveBeenCalled();
  });
});

describe("resolveWithMemoAsync", () => {
  it("calls factory directly for transient lifetime", async () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    const factory = vi.fn().mockResolvedValue({ log: vi.fn() });

    const result = await resolveWithMemoAsync(
      LoggerPort,
      "transient",
      singletonMemo,
      scopedMemo,
      factory
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ log: expect.any(Function) });
  });

  it("memoizes for singleton lifetime (async)", async () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    let count = 0;
    const factory = async () => ({ id: ++count, log: vi.fn() });

    const r1 = await resolveWithMemoAsync(
      LoggerPort,
      "singleton",
      singletonMemo,
      scopedMemo,
      factory
    );
    const r2 = await resolveWithMemoAsync(
      LoggerPort,
      "singleton",
      singletonMemo,
      scopedMemo,
      factory
    );

    expect(r1).toBe(r2);
    expect((r1 as any).id).toBe(1);
  });

  it("memoizes for scoped lifetime (async)", async () => {
    const singletonMemo = new MemoMap();
    const scopedMemo = new MemoMap();
    let count = 0;
    const factory = async () => ({ id: ++count, log: vi.fn() });

    const r1 = await resolveWithMemoAsync(LoggerPort, "scoped", singletonMemo, scopedMemo, factory);
    const r2 = await resolveWithMemoAsync(LoggerPort, "scoped", singletonMemo, scopedMemo, factory);

    expect(r1).toBe(r2);
  });
});

describe("buildDependencies", () => {
  it("builds empty deps record for no requirements", () => {
    const deps = buildDependencies([], () => "ignored");
    expect(deps).toEqual({});
  });

  it("builds deps record mapping port names to resolved values", () => {
    const resolve = (port: any) => `resolved-${port.__portName}`;
    const deps = buildDependencies([LoggerPort, DatabasePort], resolve);

    expect(deps["Logger"]).toBe("resolved-Logger");
    expect(deps["Database"]).toBe("resolved-Database");
  });

  it("calls resolve for each required port", () => {
    const resolve = vi.fn().mockReturnValue("value");
    buildDependencies([LoggerPort, DatabasePort], resolve);

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(resolve).toHaveBeenCalledWith(LoggerPort);
    expect(resolve).toHaveBeenCalledWith(DatabasePort);
  });
});

describe("buildDependenciesAsync", () => {
  it("builds empty deps record for no requirements", async () => {
    const deps = await buildDependenciesAsync([], async () => "ignored");
    expect(deps).toEqual({});
  });

  it("builds deps record asynchronously", async () => {
    const resolve = async (port: any) => `resolved-${port.__portName}`;
    const deps = await buildDependenciesAsync([LoggerPort, DatabasePort], resolve);

    expect(deps["Logger"]).toBe("resolved-Logger");
    expect(deps["Database"]).toBe("resolved-Database");
  });

  it("resolves dependencies concurrently", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const resolve = async (port: any) => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 10));
      concurrent--;
      return `resolved-${port.__portName}`;
    };

    await buildDependenciesAsync([LoggerPort, DatabasePort], resolve);
    expect(maxConcurrent).toBe(2);
  });
});
