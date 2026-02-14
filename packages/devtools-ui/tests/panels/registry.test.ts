/**
 * Tests for PanelRegistry.
 *
 * Spec Section 43.2.2:
 * 1. register() adds a panel
 * 2. unregister() removes a panel
 * 3. getAll() returns panels sorted by order
 * 4. getById() returns the panel or undefined
 * 5. registerFromLibrary() tracks library panels
 * 6. unregisterLibrary() removes all library panels
 * 7. duplicate registration replaces previous panel
 */

import { describe, it, expect } from "vitest";
import { PanelRegistry } from "../../src/panels/registry.js";
import type { DevToolsPanel, PanelProps } from "../../src/panels/types.js";

function DummyPanel(_props: PanelProps): null {
  return null;
}

function makePanelDef(id: string, order: number): DevToolsPanel {
  return {
    id,
    label: id,
    icon: "box",
    order,
    component: DummyPanel,
  };
}

describe("PanelRegistry", () => {
  it("register() adds a panel and getAll() returns it", () => {
    const registry = new PanelRegistry();
    const panel = makePanelDef("overview", 0);

    registry.register(panel);

    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("overview");
  });

  it("unregister() removes a panel", () => {
    const registry = new PanelRegistry();
    registry.register(makePanelDef("overview", 0));
    registry.register(makePanelDef("graph", 10));

    registry.unregister("overview");

    const all = registry.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("graph");
  });

  it("getAll() returns panels sorted by order", () => {
    const registry = new PanelRegistry();
    registry.register(makePanelDef("graph", 10));
    registry.register(makePanelDef("overview", 0));
    registry.register(makePanelDef("events", 30));

    const all = registry.getAll();
    expect(all.map(p => p.id)).toEqual(["overview", "graph", "events"]);
  });

  it("getById() returns the panel or undefined", () => {
    const registry = new PanelRegistry();
    registry.register(makePanelDef("overview", 0));

    expect(registry.getById("overview")?.id).toBe("overview");
    expect(registry.getById("nonexistent")).toBeUndefined();
  });

  it("registerFromLibrary() tracks library panels", () => {
    const registry = new PanelRegistry();
    registry.registerFromLibrary("flow", makePanelDef("flow-activities", 100));

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getById("flow-activities")?.id).toBe("flow-activities");
  });

  it("unregisterLibrary() removes all library panels", () => {
    const registry = new PanelRegistry();
    registry.register(makePanelDef("overview", 0));
    registry.registerFromLibrary("flow", makePanelDef("flow-activities", 100));
    registry.registerFromLibrary("flow", makePanelDef("flow-events", 110));

    expect(registry.getAll()).toHaveLength(3);

    registry.unregisterLibrary("flow");

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0].id).toBe("overview");
  });

  it("duplicate registration replaces previous panel", () => {
    const registry = new PanelRegistry();
    registry.register(makePanelDef("overview", 0));

    const updatedPanel: DevToolsPanel = {
      ...makePanelDef("overview", 0),
      label: "Updated Overview",
    };
    registry.register(updatedPanel);

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getById("overview")?.label).toBe("Updated Overview");
  });
});
