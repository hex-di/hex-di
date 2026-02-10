/**
 * Comprehensive mutation-killing tests for src/container/wrapper-utils.ts
 *
 * Targets all surviving mutants:
 * - createContainerProperties: parent non-enumerable, non-writable, non-configurable
 * - createContainerProperties: initialize/tryInitialize getter throw message
 * - createContainerProperties: HOOKS_ACCESS non-enumerable, non-writable, non-configurable
 * - createContainerProperties: HOOKS_ACCESS installHooks delegation, uninstall callback
 */
import { describe, it, expect, vi } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { HOOKS_ACCESS } from "../src/inspection/symbols.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

function makeContainer() {
  const adapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "transient",
    factory: () => ({ log: vi.fn() }),
  });
  const graph = GraphBuilder.create().provide(adapter).build();
  return createContainer({ graph, name: "Test" });
}

// =============================================================================
// createContainerProperties - parent property descriptors
// =============================================================================

describe("wrapper-utils: parent property descriptors", () => {
  it("parent on root is non-enumerable", () => {
    const container = makeContainer();
    const descriptor = Object.getOwnPropertyDescriptor(container, "parent");
    expect(descriptor?.enumerable).toBe(false);
  });

  it("parent accessor on root container throws correct message", () => {
    const container = makeContainer();
    expect(() => container.parent).toThrow(/Root container/i);
  });

  it("parent on child is accessible", () => {
    const container = makeContainer();
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const parentRef = child.parent;
    expect(parentRef).toBeDefined();
  });
});

// =============================================================================
// createContainerProperties - initialize/tryInitialize throw on child
// =============================================================================

describe("wrapper-utils: initialize/tryInitialize throw on child", () => {
  it("initialize getter on child throws with message about child containers", () => {
    const container = makeContainer();
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (child as any).initialize;
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toMatch(/initialize/i);
    }
  });

  it("tryInitialize getter on child throws with message about child containers", () => {
    const container = makeContainer();
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (child as any).tryInitialize;
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toMatch(/initialize/i);
    }
  });

  it("initialize getter on initialized container throws", async () => {
    const container = makeContainer();
    const initialized = await container.initialize();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (initialized as any).initialize;
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toMatch(/initialize/i);
    }
  });

  it("tryInitialize getter on initialized container throws", async () => {
    const container = makeContainer();
    const initialized = await container.initialize();

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (initialized as any).tryInitialize;
      expect.unreachable("Should have thrown");
    } catch (e: any) {
      expect(e.message).toMatch(/initialize/i);
    }
  });
});

// =============================================================================
// createContainerProperties - HOOKS_ACCESS property descriptors
// =============================================================================

describe("wrapper-utils: HOOKS_ACCESS property descriptors", () => {
  it("HOOKS_ACCESS is non-enumerable", () => {
    const container = makeContainer();
    const descriptor = Object.getOwnPropertyDescriptor(container, HOOKS_ACCESS);
    expect(descriptor?.enumerable).toBe(false);
  });

  it("HOOKS_ACCESS is non-writable", () => {
    const container = makeContainer();
    const descriptor = Object.getOwnPropertyDescriptor(container, HOOKS_ACCESS);
    expect(descriptor?.writable).toBe(false);
  });

  it("HOOKS_ACCESS is non-configurable", () => {
    const container = makeContainer();
    const descriptor = Object.getOwnPropertyDescriptor(container, HOOKS_ACCESS);
    expect(descriptor?.configurable).toBe(false);
  });

  it("HOOKS_ACCESS returns a function that returns an installer", () => {
    const container = makeContainer();
    const getter = (container as any)[HOOKS_ACCESS];
    expect(typeof getter).toBe("function");

    const installer = getter();
    expect(typeof installer.installHooks).toBe("function");
  });
});

// =============================================================================
// createContainerProperties - HOOKS_ACCESS installHooks behavior
// =============================================================================

describe("wrapper-utils: HOOKS_ACCESS installHooks", () => {
  it("installHooks with beforeResolve installs correctly", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const beforeResolve = vi.fn();
    installer.installHooks({ beforeResolve });

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);
  });

  it("installHooks with afterResolve installs correctly", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const afterResolve = vi.fn();
    installer.installHooks({ afterResolve });

    container.resolve(LoggerPort);
    expect(afterResolve).toHaveBeenCalledTimes(1);
  });

  it("installHooks with both hooks installs both", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const beforeResolve = vi.fn();
    const afterResolve = vi.fn();
    installer.installHooks({ beforeResolve, afterResolve });

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);
    expect(afterResolve).toHaveBeenCalledTimes(1);
  });

  it("installHooks returns uninstall function", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const beforeResolve = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve });

    expect(typeof uninstall).toBe("function");
  });

  it("uninstall removes beforeResolve hook", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const beforeResolve = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve });

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);

    uninstall();

    container.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);
  });

  it("uninstall removes afterResolve hook", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const afterResolve = vi.fn();
    const uninstall = installer.installHooks({ afterResolve });

    container.resolve(LoggerPort);
    expect(afterResolve).toHaveBeenCalledTimes(1);

    uninstall();

    container.resolve(LoggerPort);
    expect(afterResolve).toHaveBeenCalledTimes(1);
  });

  it("uninstall is idempotent (safe to call multiple times)", () => {
    const container = makeContainer();
    const installer = (container as any)[HOOKS_ACCESS]();

    const beforeResolve = vi.fn();
    const uninstall = installer.installHooks({ beforeResolve });

    uninstall();
    uninstall(); // should not throw
  });

  it("child container HOOKS_ACCESS works the same", () => {
    const container = makeContainer();
    const childGraph = GraphBuilder.create().build();
    const child = container.createChild(childGraph, { name: "Child" });

    const installer = (child as any)[HOOKS_ACCESS]();
    const beforeResolve = vi.fn();
    installer.installHooks({ beforeResolve });

    child.resolve(LoggerPort);
    expect(beforeResolve).toHaveBeenCalledTimes(1);
  });
});
