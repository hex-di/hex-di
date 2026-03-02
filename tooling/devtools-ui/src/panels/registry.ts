/**
 * PanelRegistry for managing built-in and library-contributed panels.
 *
 * Maintains a sorted collection of panels and supports dynamic
 * registration/unregistration of library-provided panels.
 *
 * @packageDocumentation
 */

import type { DevToolsPanel } from "./types.js";
import { OverviewPanel } from "./overview-panel.js";
import { ContainerPanel } from "./container-panel.js";
import { GraphPanel } from "./graph-panel.js";
import { ScopeTreePanel } from "./scope-tree-panel.js";
import { EventLogPanel } from "./event-log-panel.js";
import { TracingPanel } from "./tracing-panel.js";
import { ResultPanel } from "./result-panel.js";
import { HealthPanel } from "./health-panel.js";
import { GuardPanel } from "./guard-panel.js";

/**
 * Registry for devtools panels.
 *
 * Panels are stored in a map keyed by ID. `getAll()` returns panels
 * sorted by their `order` field.
 */
export class PanelRegistry {
  private readonly panels = new Map<string, DevToolsPanel>();
  private readonly libraryPanelIds = new Map<string, Set<string>>();

  /**
   * Registers a panel. If a panel with the same ID exists, it is replaced.
   */
  register(panel: DevToolsPanel): void {
    this.panels.set(panel.id, panel);
  }

  /**
   * Unregisters a panel by ID.
   */
  unregister(panelId: string): void {
    this.panels.delete(panelId);
  }

  /**
   * Returns all registered panels sorted by `order`.
   */
  getAll(): readonly DevToolsPanel[] {
    return [...this.panels.values()].sort((a, b) => a.order - b.order);
  }

  /**
   * Returns a panel by ID, or undefined if not registered.
   */
  getById(id: string): DevToolsPanel | undefined {
    return this.panels.get(id);
  }

  /**
   * Registers a panel provided by a library.
   */
  registerFromLibrary(libraryName: string, panel: DevToolsPanel): void {
    this.panels.set(panel.id, panel);

    let ids = this.libraryPanelIds.get(libraryName);
    if (ids === undefined) {
      ids = new Set();
      this.libraryPanelIds.set(libraryName, ids);
    }
    ids.add(panel.id);
  }

  /**
   * Removes all panels registered by a given library.
   */
  unregisterLibrary(libraryName: string): void {
    const ids = this.libraryPanelIds.get(libraryName);
    if (ids === undefined) return;

    for (const id of ids) {
      this.panels.delete(id);
    }
    this.libraryPanelIds.delete(libraryName);
  }
}

/**
 * Returns the 8 built-in panel descriptors wired to their
 * actual component implementations.
 */
export function getBuiltInPanels(): readonly DevToolsPanel[] {
  return [
    {
      id: "overview",
      label: "Overview",
      icon: "layout",
      order: 0,
      component: OverviewPanel,
    },
    {
      id: "result",
      label: "Result",
      icon: "check-circle",
      order: 3,
      component: ResultPanel,
    },
    {
      id: "guard",
      label: "Guard",
      icon: "shield",
      order: 4,
      component: GuardPanel,
    },
    {
      id: "container",
      label: "Container",
      icon: "box",
      order: 5,
      component: ContainerPanel,
    },
    {
      id: "graph",
      label: "Graph",
      icon: "network",
      order: 10,
      component: GraphPanel,
    },
    {
      id: "scopes",
      label: "Scopes",
      icon: "layers",
      order: 20,
      component: ScopeTreePanel,
    },
    {
      id: "events",
      label: "Events",
      icon: "list",
      order: 30,
      component: EventLogPanel,
    },
    {
      id: "tracing",
      label: "Tracing",
      icon: "activity",
      order: 40,
      component: TracingPanel,
    },
    {
      id: "health",
      label: "Health",
      icon: "heart",
      order: 50,
      component: HealthPanel,
    },
  ];
}

/**
 * Creates a PanelRegistry pre-populated with the 7 built-in panels,
 * using the actual panel component implementations.
 */
export function createBuiltInRegistry(panels: readonly DevToolsPanel[]): PanelRegistry {
  const registry = new PanelRegistry();
  for (const panel of panels) {
    registry.register(panel);
  }
  return registry;
}
