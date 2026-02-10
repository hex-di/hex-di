/**
 * E2E: Scope Lifecycle
 *
 * Full end-to-end tests for scoped state using real GraphBuilder + createContainer.
 */

import { describe, it, expect } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createStatePort, createStateAdapter } from "../../src/index.js";

// =============================================================================
// Types
// =============================================================================

interface ScopedState {
  readonly value: number;
}

const scopedActions = {
  set: (_state: ScopedState, value: number): ScopedState => ({ value }),
  increment: (state: ScopedState): ScopedState => ({ value: state.value + 1 }),
};

type ScopedActions = typeof scopedActions;

// =============================================================================
// E2E Tests
// =============================================================================

describe("E2E: Scope Lifecycle", () => {
  it("create scope → resolve scoped state → act → dispose", async () => {
    const ScopedPort = createStatePort<ScopedState, ScopedActions>()({
      name: "Scoped",
    });
    const adapter = createStateAdapter({
      provides: ScopedPort,
      lifetime: "scoped",
      initial: { value: 0 },
      actions: scopedActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-scope" });

    // Create scope and resolve
    const scope = container.createScope("child-scope");
    const service = scope.resolve(ScopedPort);

    expect(service.state).toEqual({ value: 0 });

    service.actions.set(42);
    expect(service.state).toEqual({ value: 42 });

    service.actions.increment();
    expect(service.state).toEqual({ value: 43 });

    // Dispose scope
    await scope.dispose();

    // Verify disposed
    expect(scope.isDisposed).toBe(true);

    await container.dispose();
  });

  it("disposed scope: scope itself is disposed, no new resolutions", async () => {
    const ScopedPort = createStatePort<ScopedState, ScopedActions>()({
      name: "Scoped",
    });
    const adapter = createStateAdapter({
      provides: ScopedPort,
      lifetime: "scoped",
      initial: { value: 0 },
      actions: scopedActions,
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "e2e-scope-disposed" });

    const scope = container.createScope("disposable");
    const service = scope.resolve(ScopedPort);

    // Works before dispose
    expect(service.state).toEqual({ value: 0 });

    // Dispose scope
    await scope.dispose();

    // Scope is disposed
    expect(scope.isDisposed).toBe(true);
    // New resolutions should throw
    expect(() => scope.resolve(ScopedPort)).toThrow();

    await container.dispose();
  });
});
