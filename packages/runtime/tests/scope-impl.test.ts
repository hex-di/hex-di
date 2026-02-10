/**
 * Tests for src/scope/impl.ts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ScopeImpl,
  createScopeIdGenerator,
  resetScopeIdCounter,
  createScopeWrapper,
} from "../src/scope/impl.js";
import { MemoMap } from "../src/util/memo-map.js";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { DisposedScopeError } from "../src/errors/index.js";

// Ports
const PortA = port<string>()({ name: "PortA" });

describe("createScopeIdGenerator", () => {
  it("generates sequential scope IDs", () => {
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen()).toBe("scope-1");
    expect(gen()).toBe("scope-2");
  });

  it("returns explicit name when provided", () => {
    const gen = createScopeIdGenerator();
    expect(gen("my-scope")).toBe("my-scope");
  });

  it("continues counter after explicit name", () => {
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen("custom")).toBe("custom");
    expect(gen()).toBe("scope-1");
  });

  it("creates isolated generators", () => {
    const gen1 = createScopeIdGenerator();
    const gen2 = createScopeIdGenerator();
    expect(gen1()).toBe("scope-0");
    expect(gen2()).toBe("scope-0"); // Independent counter
    expect(gen1()).toBe("scope-1");
    expect(gen2()).toBe("scope-1");
  });
});

describe("resetScopeIdCounter", () => {
  beforeEach(() => {
    resetScopeIdCounter();
  });

  it("resets the global default counter", () => {
    // Create a container with a scope to use up some IDs
    const adapter = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "scoped",
      factory: () => "value",
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "Test" });

    // Create scopes to increment the global counter
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    expect(scope1.resolve(PortA)).toBe("value");
    expect(scope2.resolve(PortA)).toBe("value");

    // Reset and verify counter restarts
    resetScopeIdCounter();
    const scope3 = container.createScope();
    // scope3 should have a low-numbered ID after reset
    expect(scope3.resolve(PortA)).toBe("value");
  });
});

describe("ScopeImpl and createScopeWrapper", () => {
  function createTestContainer() {
    const adapter = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "scoped",
      factory: () => "scoped-value",
    });
    const graph = GraphBuilder.create().provide(adapter).build();
    return createContainer({ graph, name: "Test" });
  }

  it("creates scope with resolve capability", () => {
    const container = createTestContainer();
    const scope = container.createScope();
    expect(scope.resolve(PortA)).toBe("scoped-value");
  });

  it("scope.has returns true for available ports", () => {
    const container = createTestContainer();
    const scope = container.createScope();
    expect(scope.has(PortA)).toBe(true);
  });

  it("scope.has returns false for unknown ports", () => {
    const container = createTestContainer();
    const scope = container.createScope();
    const UnknownPort = port<string>()({ name: "Unknown" });
    expect(scope.has(UnknownPort)).toBe(false);
  });

  it("scope.isDisposed returns false before disposal", () => {
    const container = createTestContainer();
    const scope = container.createScope();
    expect(scope.isDisposed).toBe(false);
  });

  it("scope.isDisposed returns true after disposal", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    await scope.dispose();
    expect(scope.isDisposed).toBe(true);
  });

  it("throws DisposedScopeError when resolving from disposed scope", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    await scope.dispose();
    expect(() => scope.resolve(PortA)).toThrow(DisposedScopeError);
  });

  it("dispose is idempotent", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    await scope.dispose();
    // Second call should not throw
    await scope.dispose();
    expect(scope.isDisposed).toBe(true);
  });

  it("creates nested child scopes", () => {
    const container = createTestContainer();
    const parentScope = container.createScope();
    const childScope = parentScope.createScope();

    expect(childScope.resolve(PortA)).toBe("scoped-value");
    expect(childScope.isDisposed).toBe(false);
  });

  it("disposing parent scope disposes child scopes", async () => {
    const container = createTestContainer();
    const parentScope = container.createScope();
    const childScope = parentScope.createScope();

    await parentScope.dispose();
    expect(parentScope.isDisposed).toBe(true);
    expect(childScope.isDisposed).toBe(true);
  });

  it("resolveAsync works on scope", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    const result = await scope.resolveAsync(PortA);
    expect(result).toBe("scoped-value");
  });

  it("resolveAsync throws DisposedScopeError on disposed scope", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    await scope.dispose();
    await expect(scope.resolveAsync(PortA)).rejects.toThrow(DisposedScopeError);
  });

  it("tryResolve returns Ok result on success", () => {
    const container = createTestContainer();
    const scope = container.createScope();
    const result = scope.tryResolve(PortA);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("scoped-value");
    }
  });

  it("tryResolve returns Err result on disposed scope", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    await scope.dispose();
    const result = scope.tryResolve(PortA);
    expect(result.isErr()).toBe(true);
  });

  it("tryDispose returns Ok result on success", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    const result = await scope.tryDispose();
    expect(result.isOk()).toBe(true);
  });

  it("subscribe emits lifecycle events", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    const events: string[] = [];
    scope.subscribe(event => events.push(event));
    await scope.dispose();
    expect(events).toContain("disposing");
    expect(events).toContain("disposed");
  });

  it("getDisposalState returns active before disposal", () => {
    const container = createTestContainer();
    const scope = container.createScope();
    expect(scope.getDisposalState()).toBe("active");
  });

  it("getDisposalState returns disposed after disposal", async () => {
    const container = createTestContainer();
    const scope = container.createScope();
    await scope.dispose();
    expect(scope.getDisposalState()).toBe("disposed");
  });

  it("scope with explicit name", () => {
    const container = createTestContainer();
    const scope = container.createScope("my-named-scope");
    expect(scope.resolve(PortA)).toBe("scoped-value");
  });
});
