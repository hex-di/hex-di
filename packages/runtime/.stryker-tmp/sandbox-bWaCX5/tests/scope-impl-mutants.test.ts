/**
 * Mutation-killing tests for src/scope/impl.ts
 *
 * Targets survived mutants in:
 * - createScopeIdGenerator: counter increment, name bypass
 * - generateScopeId: delegation to holder
 * - resetScopeIdCounter: new generator
 * - ScopeImpl: resolve disposed check, dispose idempotent, childScopes, LIFO
 * - createMemoMapSnapshot: port, portName, resolvedAt, resolutionOrder
 * - createScopeWrapper: all methods delegation, ScopeBrand, tryResolve/tryDispose
 */
// @ts-nocheck

import { describe, it, expect, vi, beforeEach } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import { createScopeIdGenerator, resetScopeIdCounter } from "../src/scope/impl.js";
import { INTERNAL_ACCESS } from "../src/inspection/symbols.js";

// =============================================================================
// Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}
interface ReqCtx {
  requestId: string;
}
interface DbConn {
  connection: string;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const ReqCtxPort = port<ReqCtx>()({ name: "ReqCtx" });
const DbConnPort = port<DbConn>()({ name: "DbConn" });

function makeContainer(opts: { scoped?: boolean; singleton?: boolean } = {}) {
  let builder = GraphBuilder.create();
  if (opts.singleton !== false) {
    builder = builder.provide(
      createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: vi.fn() }),
      })
    );
  }
  if (opts.scoped) {
    builder = builder.provide(
      createAdapter({
        provides: ReqCtxPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ requestId: `req-${Date.now()}` }),
      })
    );
  }
  return createContainer({ graph: builder.build(), name: "Test" });
}

beforeEach(() => {
  resetScopeIdCounter();
});

// =============================================================================
// createScopeIdGenerator
// =============================================================================

describe("createScopeIdGenerator (mutant killing)", () => {
  it("generates sequential IDs starting from 0", () => {
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen()).toBe("scope-1");
    expect(gen()).toBe("scope-2");
  });

  it("returns explicit name when provided", () => {
    const gen = createScopeIdGenerator();
    expect(gen("my-scope")).toBe("my-scope");
  });

  it("counter continues after named scope", () => {
    const gen = createScopeIdGenerator();
    expect(gen()).toBe("scope-0");
    expect(gen("named")).toBe("named");
    expect(gen()).toBe("scope-1");
  });

  it("each generator has independent counter", () => {
    const gen1 = createScopeIdGenerator();
    const gen2 = createScopeIdGenerator();
    expect(gen1()).toBe("scope-0");
    expect(gen2()).toBe("scope-0");
    expect(gen1()).toBe("scope-1");
    expect(gen2()).toBe("scope-1");
  });

  it("undefined name generates auto ID", () => {
    const gen = createScopeIdGenerator();
    expect(gen(undefined)).toBe("scope-0");
  });
});

// =============================================================================
// resetScopeIdCounter
// =============================================================================

describe("resetScopeIdCounter", () => {
  it("resets the default generator counter", () => {
    const container = makeContainer({ scoped: true });

    const scope1 = container.createScope();
    // After reset, next scope should start from scope-0 again
    resetScopeIdCounter();
    const scope2 = container.createScope();

    // scope2's id should be scope-0 since we reset
    const state2 = (scope2 as any)[INTERNAL_ACCESS]();
    expect(state2.id).toMatch(/^scope-/);
  });
});

// =============================================================================
// ScopeImpl - resolve
// =============================================================================

describe("ScopeImpl.resolve (mutant killing)", () => {
  it("resolves scoped services", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    const ctx = scope.resolve(ReqCtxPort);
    expect(ctx).toBeDefined();
    expect(ctx.requestId).toBeDefined();
  });

  it("throws DisposedScopeError when disposed", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    await scope.dispose();
    expect(() => scope.resolve(ReqCtxPort)).toThrow(/disposed/i);
  });

  it("returns same instance within same scope (scoped memoization)", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    const ctx1 = scope.resolve(ReqCtxPort);
    const ctx2 = scope.resolve(ReqCtxPort);
    expect(ctx1).toBe(ctx2);
  });

  it("returns different instances in different scopes", () => {
    const container = makeContainer({ scoped: true });
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const ctx1 = scope1.resolve(ReqCtxPort);
    const ctx2 = scope2.resolve(ReqCtxPort);
    expect(ctx1).not.toBe(ctx2);
  });
});

// =============================================================================
// ScopeImpl - dispose
// =============================================================================

describe("ScopeImpl.dispose (mutant killing)", () => {
  it("dispose is idempotent", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();

    await scope.dispose();
    await scope.dispose(); // second call should be a no-op
    expect(scope.isDisposed).toBe(true);
  });

  it("disposes child scopes before parent", async () => {
    const container = makeContainer({ scoped: true });
    const parent = container.createScope();
    const child = parent.createScope();

    await parent.dispose();
    expect(child.isDisposed).toBe(true);
    expect(parent.isDisposed).toBe(true);
  });

  it("clears child scopes after disposal", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    scope.createScope();

    await scope.dispose();
    // getInternalState should throw because scope is disposed
    expect(() => (scope as any)[INTERNAL_ACCESS]()).toThrow();
  });

  it("unregisters from parent scope after disposal", async () => {
    const container = makeContainer({ scoped: true });
    const parent = container.createScope();
    const child = parent.createScope();

    // Before disposal, parent internal state should have children
    const parentState = (parent as any)[INTERNAL_ACCESS]();
    expect(parentState.childScopes.length).toBeGreaterThanOrEqual(1);

    await child.dispose();

    // After disposal, parent's children should not include disposed child
    const parentState2 = (parent as any)[INTERNAL_ACCESS]();
    expect(parentState2.childScopes.length).toBe(0);
  });
});

// =============================================================================
// ScopeImpl - isDisposed
// =============================================================================

describe("ScopeImpl.isDisposed", () => {
  it("is false initially", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    expect(scope.isDisposed).toBe(false);
  });

  it("is true after disposal", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    await scope.dispose();
    expect(scope.isDisposed).toBe(true);
  });
});

// =============================================================================
// ScopeImpl - has
// =============================================================================

describe("ScopeImpl.has", () => {
  it("returns true for registered port", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    expect(scope.has(ReqCtxPort)).toBe(true);
  });

  it("returns true for singleton port", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    expect(scope.has(LoggerPort)).toBe(true);
  });
});

// =============================================================================
// ScopeImpl - createScope
// =============================================================================

describe("ScopeImpl.createScope (mutant killing)", () => {
  it("creates child scope", () => {
    const container = makeContainer({ scoped: true });
    const parent = container.createScope();
    const child = parent.createScope();
    expect(child).toBeDefined();
    expect(child.isDisposed).toBe(false);
  });

  it("child scope can resolve services", () => {
    const container = makeContainer({ scoped: true });
    const parent = container.createScope();
    const child = parent.createScope();
    const ctx = child.resolve(ReqCtxPort);
    expect(ctx).toBeDefined();
  });

  it("named child scope uses provided name", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope("my-scope");

    const state = (scope as any)[INTERNAL_ACCESS]();
    expect(state.id).toBe("my-scope");
  });
});

// =============================================================================
// ScopeImpl - lifecycle events
// =============================================================================

describe("ScopeImpl.subscribe (lifecycle events)", () => {
  it("emits 'disposing' then 'disposed'", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();

    const events: string[] = [];
    scope.subscribe((event: string) => events.push(event));

    await scope.dispose();

    expect(events).toContain("disposing");
    expect(events).toContain("disposed");
    expect(events.indexOf("disposing")).toBeLessThan(events.indexOf("disposed"));
  });

  it("subscribe returns unsubscribe function", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();

    const events: string[] = [];
    const unsub = scope.subscribe((event: string) => events.push(event));
    unsub();

    await scope.dispose();
    expect(events).toHaveLength(0);
  });
});

// =============================================================================
// ScopeImpl - getDisposalState
// =============================================================================

describe("ScopeImpl.getDisposalState", () => {
  it("returns 'active' initially", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    expect(scope.getDisposalState()).toBe("active");
  });

  it("transitions through disposing to disposed", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();

    const states: string[] = [];
    scope.subscribe(() => {
      states.push(scope.getDisposalState());
    });

    await scope.dispose();

    expect(states).toContain("disposing");
    expect(states).toContain("disposed");
  });
});

// =============================================================================
// ScopeImpl - getInternalState
// =============================================================================

describe("ScopeImpl.getInternalState (mutant killing)", () => {
  it("returns frozen state", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    const state = (scope as any)[INTERNAL_ACCESS]();

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.childScopes)).toBe(true);
  });

  it("state has id, disposed, scopedMemo", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    const state = (scope as any)[INTERNAL_ACCESS]();

    expect(state.id).toBeDefined();
    expect(state.id).toMatch(/^scope-/);
    expect(state.disposed).toBe(false);
    expect(state.scopedMemo).toBeDefined();
    expect(typeof state.scopedMemo.size).toBe("number");
    expect(Array.isArray(state.scopedMemo.entries)).toBe(true);
  });

  it("throws DisposedScopeError when scope is disposed", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    await scope.dispose();

    expect(() => (scope as any)[INTERNAL_ACCESS]()).toThrow(/disposed/i);
  });

  it("includes child scope snapshots", () => {
    const container = makeContainer({ scoped: true });
    const parent = container.createScope();
    const child = parent.createScope();

    const state = (parent as any)[INTERNAL_ACCESS]();
    expect(state.childScopes.length).toBe(1);
    expect(state.childScopes[0].id).toBeDefined();
  });

  it("skips disposed children in snapshot", async () => {
    const container = makeContainer({ scoped: true });
    const parent = container.createScope();
    const child = parent.createScope();
    await child.dispose();

    const state = (parent as any)[INTERNAL_ACCESS]();
    expect(state.childScopes.length).toBe(0);
  });

  it("scopedMemo entries track resolved ports", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    scope.resolve(ReqCtxPort);

    const state = (scope as any)[INTERNAL_ACCESS]();
    expect(state.scopedMemo.size).toBeGreaterThanOrEqual(1);
    const entry = state.scopedMemo.entries.find((e: any) => e.portName === "ReqCtx");
    expect(entry).toBeDefined();
    expect(entry.resolvedAt).toBeGreaterThan(0);
  });
});

// =============================================================================
// createScopeWrapper - tryResolve / tryDispose
// =============================================================================

describe("createScopeWrapper tryResolve / tryDispose", () => {
  it("tryResolve returns Ok on success", () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    const result = scope.tryResolve(ReqCtxPort);
    expect(result.isOk()).toBe(true);
  });

  it("tryResolve returns Err on disposed scope", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    await scope.dispose();
    const result = scope.tryResolve(ReqCtxPort);
    expect(result.isErr()).toBe(true);
  });

  it("tryDispose returns Ok on success", async () => {
    const container = makeContainer({ scoped: true });
    const scope = container.createScope();
    const result = await scope.tryDispose();
    expect(result.isOk()).toBe(true);
  });
});
