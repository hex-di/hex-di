/**
 * Auto-Registration Integration Tests
 *
 * Tests that adapters with `inspection: true` auto-register with StoreRegistry
 * and that the inspector auto-discovers registered ports.
 */

import { describe, it, expect } from "vitest";
import { createStoreRegistry } from "../../src/inspection/store-registry.js";
import { createStoreInspectorImpl } from "../../src/inspection/store-inspector-impl.js";
import { createStateAdapter } from "../../src/adapters/state-adapter.js";
import { createAtomAdapter } from "../../src/adapters/atom-adapter.js";
import { createDerivedAdapter } from "../../src/adapters/derived-adapter.js";
import { createAsyncDerivedAdapter } from "../../src/adapters/async-derived-adapter.js";
import { createLinkedDerivedAdapter } from "../../src/adapters/linked-derived-adapter.js";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
} from "../../src/ports/index.js";
import { ResultAsync } from "@hex-di/result";
import type { StoreRegistry } from "../../src/inspection/store-registry.js";
import type { StoreInspectorInternal } from "../../src/types/inspection.js";

// =============================================================================
// Helpers
// =============================================================================

interface CounterState {
  readonly count: number;
}
const counterActions = {
  increment: (state: CounterState) => ({ count: state.count + 1 }),
};

const CounterPort = createStatePort<CounterState, typeof counterActions>()({ name: "Counter" });
const ThemePort = createAtomPort<string>()({ name: "Theme" });
const DoublePort = createDerivedPort<number>()({ name: "Double" });
const AsyncDataPort = createAsyncDerivedPort<string, Error>()({ name: "AsyncData" });
const LinkedPort = createLinkedDerivedPort<number>()({ name: "Linked" });

/**
 * Creates inspection deps and resolves an adapter with them.
 *
 * When `inspection: true` is set, adapters conditionally add inspection ports
 * to `requires` at runtime. The static return type (`StoreAdapterResult`) erases
 * TRequires to `never` (→ EmptyDeps), so the typed factory won't accept
 * inspection deps due to excess property checking. This helper assigns deps to
 * a widened variable first to bypass the excess property check while staying
 * structurally sound.
 */
function resolveWithInspection(
  adapter: { readonly factory: (deps: object) => unknown },
  inspectionDeps: {
    readonly StoreRegistry: StoreRegistry;
    readonly StoreInspectorInternal: StoreInspectorInternal;
  },
  extraDeps?: Record<string, unknown>
): void {
  const deps: Record<string, unknown> = { ...inspectionDeps, ...extraDeps };
  adapter.factory(deps);
}

// =============================================================================
// Tests
// =============================================================================

describe("Auto-Registration", () => {
  it("state adapter with inspection: true auto-registers with StoreRegistry", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
      inspection: true,
    });

    resolveWithInspection(adapter, {
      StoreRegistry: registry,
      StoreInspectorInternal: inspector,
    });

    const entries = registry.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.portName).toBe("Counter");
  });

  it("atom adapter with inspection: true auto-registers", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createAtomAdapter({
      provides: ThemePort,
      initial: "light",
      inspection: true,
    });

    resolveWithInspection(adapter, {
      StoreRegistry: registry,
      StoreInspectorInternal: inspector,
    });

    const entries = registry.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.portName).toBe("Theme");
  });

  it("derived adapter with inspection: true auto-registers", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createDerivedAdapter({
      provides: DoublePort,
      requires: [CounterPort],
      select: () => 42,
      inspection: true,
    });

    resolveWithInspection(
      adapter,
      {
        StoreRegistry: registry,
        StoreInspectorInternal: inspector,
      },
      {
        Counter: { state: { count: 21 } },
      }
    );

    const entries = registry.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.portName).toBe("Double");
  });

  it("async derived adapter with inspection: true auto-registers", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createAsyncDerivedAdapter({
      provides: AsyncDataPort,
      requires: [],
      select: () => ResultAsync.ok("data"),
      inspection: true,
    });

    resolveWithInspection(adapter, {
      StoreRegistry: registry,
      StoreInspectorInternal: inspector,
    });

    const entries = registry.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.portName).toBe("AsyncData");
  });

  it("linked derived adapter with inspection: true auto-registers", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createLinkedDerivedAdapter({
      provides: LinkedPort,
      requires: [CounterPort],
      select: () => 42,
      write: () => {},
      inspection: true,
    });

    resolveWithInspection(
      adapter,
      {
        StoreRegistry: registry,
        StoreInspectorInternal: inspector,
      },
      {
        Counter: { state: { count: 42 } },
      }
    );

    const entries = registry.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.portName).toBe("Linked");
  });

  it("inspector auto-discovers registered ports via registry subscription", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
      inspection: true,
    });

    resolveWithInspection(adapter, {
      StoreRegistry: registry,
      StoreInspectorInternal: inspector,
    });

    const ports = inspector.listStatePorts();
    expect(ports).toHaveLength(1);
    expect(ports[0]?.portName).toBe("Counter");
    expect(ports[0]?.kind).toBe("state");
  });

  it("getSnapshot() returns port data after auto-registration", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
      inspection: true,
    });

    resolveWithInspection(adapter, {
      StoreRegistry: registry,
      StoreInspectorInternal: inspector,
    });

    const snapshot = inspector.getSnapshot();
    expect(snapshot.ports).toHaveLength(1);
    expect(snapshot.ports[0]?.portName).toBe("Counter");
    expect(snapshot.ports[0]?.kind).toBe("state");
  });

  it("adapter without inspection: true does not register", () => {
    const registry = createStoreRegistry();

    const adapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
    });

    adapter.factory({});

    const entries = registry.getAll();
    expect(entries).toHaveLength(0);
  });

  it("multiple adapters with inspection: true all register", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const stateAdapter = createStateAdapter({
      provides: CounterPort,
      initial: { count: 0 },
      actions: counterActions,
      inspection: true,
    });

    const atomAdapter = createAtomAdapter({
      provides: ThemePort,
      initial: "dark",
      inspection: true,
    });

    const inspDeps = {
      StoreRegistry: registry,
      StoreInspectorInternal: inspector,
    };

    resolveWithInspection(stateAdapter, inspDeps);
    resolveWithInspection(atomAdapter, inspDeps);

    const entries = registry.getAll();
    expect(entries).toHaveLength(2);
    const portNames = entries.map(e => e.portName);
    expect(portNames).toContain("Counter");
    expect(portNames).toContain("Theme");
  });
});
