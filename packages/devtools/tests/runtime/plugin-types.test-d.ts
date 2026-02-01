/**
 * Type-level tests for DevTools Plugin Types.
 *
 * These tests verify:
 * 1. Plugin with all required fields compiles
 * 2. Plugin missing required field fails to compile
 * 3. PluginProps type includes runtime access
 * 4. PluginShortcut type structure
 * 5. Utility types work correctly
 * 6. Plugin component receives correct props
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  DevToolsPlugin,
  PluginProps,
  PluginShortcut,
  ContainerEntry,
  PluginRuntimeAccess,
  PluginCommand,
  PluginStateSnapshot,
  ExtractPluginIds,
  PluginConfig,
  HasShortcuts,
  StrictPlugin,
  MinimalPlugin,
} from "../../src/runtime/index.js";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI, ContainerSnapshot } from "@hex-di/core";
import type { ReactElement } from "react";

// =============================================================================
// DevToolsPlugin - Required Fields Tests
// =============================================================================

describe("DevToolsPlugin with all required fields compiles", () => {
  it("should accept a valid plugin with all required fields", () => {
    // Arrange: Create a component that accepts PluginProps
    const TestComponent = (_props: PluginProps): null => null;

    // Act: Define a complete plugin
    const validPlugin: DevToolsPlugin = {
      id: "test-plugin",
      label: "Test Plugin",
      component: TestComponent,
    };

    // Assert: The plugin should be assignable to DevToolsPlugin
    expectTypeOf(validPlugin).toMatchTypeOf<DevToolsPlugin>();
  });

  it("should accept a plugin with all optional fields", () => {
    const TestComponent = (_props: PluginProps): null => null;
    const testIcon = null as unknown as ReactElement;

    const fullPlugin: DevToolsPlugin = {
      id: "full-plugin",
      label: "Full Plugin",
      icon: testIcon,
      shortcuts: [
        {
          key: "f",
          action: () => {},
          description: "Focus full plugin",
        },
      ],
      component: TestComponent,
    };

    expectTypeOf(fullPlugin).toMatchTypeOf<DevToolsPlugin>();
  });

  it("should have id as string", () => {
    expectTypeOf<DevToolsPlugin["id"]>().toBeString();
  });

  it("should have label as string", () => {
    expectTypeOf<DevToolsPlugin["label"]>().toBeString();
  });

  it("should have component accepting PluginProps", () => {
    expectTypeOf<DevToolsPlugin["component"]>().toMatchTypeOf<React.ComponentType<PluginProps>>();
  });
});

describe("DevToolsPlugin missing required field fails", () => {
  it("should require id field", () => {
    const TestComponent = (_props: PluginProps): null => null;

    // This should fail because 'id' is missing
    // @ts-expect-error - id is required
    const _invalidPlugin: DevToolsPlugin = {
      label: "Test",
      component: TestComponent,
    };

    void _invalidPlugin;
  });

  it("should require label field", () => {
    const TestComponent = (_props: PluginProps): null => null;

    // This should fail because 'label' is missing
    // @ts-expect-error - label is required
    const _invalidPlugin: DevToolsPlugin = {
      id: "test",
      component: TestComponent,
    };

    void _invalidPlugin;
  });

  it("should require component field", () => {
    // This should fail because 'component' is missing
    // @ts-expect-error - component is required
    const _invalidPlugin: DevToolsPlugin = {
      id: "test",
      label: "Test",
    };

    void _invalidPlugin;
  });

  it("should require component to accept PluginProps", () => {
    // Components must accept PluginProps to be valid
    // We verify this by checking the component type constraint
    type ComponentType = DevToolsPlugin["component"];
    type PropsType = React.ComponentProps<ComponentType>;

    // The props type should include all required PluginProps fields
    expectTypeOf<PropsType>().toHaveProperty("runtime");
    expectTypeOf<PropsType>().toHaveProperty("state");
    expectTypeOf<PropsType>().toHaveProperty("graph");
    expectTypeOf<PropsType>().toHaveProperty("containers");
  });
});

// =============================================================================
// PluginProps - Runtime Access Tests
// =============================================================================

describe("PluginProps type includes runtime access", () => {
  it("should have runtime property of type PluginRuntimeAccess", () => {
    expectTypeOf<PluginProps["runtime"]>().toEqualTypeOf<PluginRuntimeAccess>();
  });

  it("should have state property of type PluginStateSnapshot", () => {
    expectTypeOf<PluginProps["state"]>().toEqualTypeOf<PluginStateSnapshot>();
  });

  it("should have graph property of type ExportedGraph", () => {
    expectTypeOf<PluginProps["graph"]>().toEqualTypeOf<ExportedGraph>();
  });

  it("should have optional tracingAPI property", () => {
    expectTypeOf<PluginProps["tracingAPI"]>().toEqualTypeOf<TracingAPI | undefined>();
  });

  it("should have containers as readonly ContainerEntry array", () => {
    expectTypeOf<PluginProps["containers"]>().toEqualTypeOf<readonly ContainerEntry[]>();
  });

  it("runtime.dispatch should accept PluginCommand", () => {
    type DispatchFn = PluginRuntimeAccess["dispatch"];
    expectTypeOf<DispatchFn>().toBeFunction();
    expectTypeOf<Parameters<DispatchFn>[0]>().toEqualTypeOf<PluginCommand>();
  });
});

// =============================================================================
// PluginShortcut Type Structure Tests
// =============================================================================

describe("PluginShortcut type structure", () => {
  it("should have key as string", () => {
    expectTypeOf<PluginShortcut["key"]>().toBeString();
  });

  it("should have action as function returning void", () => {
    expectTypeOf<PluginShortcut["action"]>().toEqualTypeOf<() => void>();
  });

  it("should have description as string", () => {
    expectTypeOf<PluginShortcut["description"]>().toBeString();
  });

  it("should accept valid shortcut object", () => {
    const shortcut: PluginShortcut = {
      key: "ctrl+g",
      action: () => {},
      description: "Focus graph",
    };

    expectTypeOf(shortcut).toMatchTypeOf<PluginShortcut>();
  });

  it("should be assignable to DevToolsPlugin shortcuts array", () => {
    const shortcuts: PluginShortcut[] = [
      { key: "a", action: () => {}, description: "Action A" },
      { key: "b", action: () => {}, description: "Action B" },
    ];

    expectTypeOf(shortcuts).toMatchTypeOf<NonNullable<DevToolsPlugin["shortcuts"]>>();
  });
});

// =============================================================================
// ContainerEntry Type Tests
// =============================================================================

describe("ContainerEntry type structure", () => {
  it("should have id as string", () => {
    expectTypeOf<ContainerEntry["id"]>().toBeString();
  });

  it("should have name as string", () => {
    expectTypeOf<ContainerEntry["name"]>().toBeString();
  });

  it("should have path as string", () => {
    expectTypeOf<ContainerEntry["path"]>().toBeString();
  });

  it("should have kind as container kind", () => {
    expectTypeOf<ContainerEntry["kind"]>().toEqualTypeOf<"root" | "child" | "lazy">();
  });

  it("should have state as ContainerDiscoveryState", () => {
    // ContainerDiscoveryState is the lifecycle state type
    type ExpectedStates =
      | "pending"
      | "subscribing"
      | "active"
      | "paused"
      | "error"
      | "disposing"
      | "disposed";
    expectTypeOf<ContainerEntry["state"]>().toEqualTypeOf<ExpectedStates>();
  });

  it("should have isSelected as boolean", () => {
    expectTypeOf<ContainerEntry["isSelected"]>().toBeBoolean();
  });

  it("should have optional snapshot of type ContainerSnapshot", () => {
    expectTypeOf<ContainerEntry["snapshot"]>().toEqualTypeOf<ContainerSnapshot | undefined>();
  });

  it("should accept valid container entry with all required fields", () => {
    const entry: ContainerEntry = {
      id: "container-1",
      name: "Root Container",
      path: "container-1",
      kind: "root",
      state: "active",
      isSelected: true,
    };

    expectTypeOf(entry).toMatchTypeOf<ContainerEntry>();
  });

  it("should accept container entry with optional snapshot", () => {
    const mockSnapshot = {
      kind: "root",
      phase: "initialized",
      isInitialized: true,
      containerName: "Root",
      singletons: [],
      scopes: {
        id: "root",
        status: "active",
        resolvedCount: 0,
        totalCount: 0,
        children: [],
        resolvedPorts: [],
      },
      isDisposed: false,
      asyncAdaptersTotal: 0,
      asyncAdaptersInitialized: 0,
    } as const;

    const entry: ContainerEntry = {
      id: "container-1",
      name: "Root Container",
      path: "container-1",
      kind: "root",
      state: "active",
      isSelected: false,
      snapshot: mockSnapshot,
    };

    expectTypeOf(entry).toMatchTypeOf<ContainerEntry>();
  });
});

// =============================================================================
// PluginCommand Discriminated Union Tests
// =============================================================================

describe("PluginCommand discriminated union", () => {
  it("should include selectTab command", () => {
    const cmd: PluginCommand = { type: "selectTab", tabId: "graph" };
    expectTypeOf(cmd).toMatchTypeOf<PluginCommand>();
  });

  it("should include selectContainers command", () => {
    const cmd: PluginCommand = { type: "selectContainers", ids: new Set(["c1"]) };
    expectTypeOf(cmd).toMatchTypeOf<PluginCommand>();
  });

  it("should include toggleTracing command", () => {
    const cmd: PluginCommand = { type: "toggleTracing" };
    expectTypeOf(cmd).toMatchTypeOf<PluginCommand>();
  });

  it("should include setThreshold command", () => {
    const cmd: PluginCommand = { type: "setThreshold", value: 100 };
    expectTypeOf(cmd).toMatchTypeOf<PluginCommand>();
  });

  it("should narrow correctly in switch", () => {
    function handleCommand(cmd: PluginCommand): string {
      switch (cmd.type) {
        case "selectTab":
          return cmd.tabId;
        case "selectContainers":
          return String(cmd.ids.size);
        case "toggleTracing":
        case "pauseTracing":
        case "resumeTracing":
        case "clearTraces":
          return cmd.type;
        case "setThreshold":
          return String(cmd.value);
        case "pinTrace":
        case "unpinTrace":
          return cmd.traceId;
        default: {
          const _exhaustive: never = cmd;
          return _exhaustive;
        }
      }
    }
    void handleCommand;
  });
});

// =============================================================================
// Utility Types Tests
// =============================================================================

describe("ExtractPluginIds utility type", () => {
  it("should extract plugin ids from tuple", () => {
    const TestComponent = (_props: PluginProps): null => null;

    const _plugins = [
      { id: "graph", label: "Graph", component: TestComponent },
      { id: "services", label: "Services", component: TestComponent },
    ] as const;

    type PluginIds = ExtractPluginIds<typeof _plugins>;

    // The extracted type should be a union of the plugin ids
    expectTypeOf<PluginIds>().toEqualTypeOf<"graph" | "services">();
  });
});

describe("HasShortcuts utility type", () => {
  it("should return true for plugin with shortcuts", () => {
    const TestComponent = (_props: PluginProps): null => null;

    const _pluginWithShortcuts = {
      id: "test",
      label: "Test",
      component: TestComponent,
      shortcuts: [{ key: "t", action: () => {}, description: "Test" }],
    } as const;

    type Result = HasShortcuts<typeof _pluginWithShortcuts>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("should return false for plugin without shortcuts", () => {
    const TestComponent = (_props: PluginProps): null => null;

    const _pluginWithoutShortcuts = {
      id: "test",
      label: "Test",
      component: TestComponent,
    } as const;

    type Result = HasShortcuts<typeof _pluginWithoutShortcuts>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

describe("StrictPlugin utility type", () => {
  it("should require id, label, and component", () => {
    expectTypeOf<StrictPlugin>().toHaveProperty("id");
    expectTypeOf<StrictPlugin>().toHaveProperty("label");
    expectTypeOf<StrictPlugin>().toHaveProperty("component");
  });

  it("should allow optional icon and shortcuts", () => {
    expectTypeOf<StrictPlugin["icon"]>().toEqualTypeOf<ReactElement | undefined>();
    expectTypeOf<StrictPlugin["shortcuts"]>().toEqualTypeOf<
      readonly PluginShortcut[] | undefined
    >();
  });
});

describe("MinimalPlugin utility type", () => {
  it("should only include id, label, and component", () => {
    type Keys = keyof MinimalPlugin;
    expectTypeOf<Keys>().toEqualTypeOf<"id" | "label" | "component">();
  });
});

describe("PluginConfig type", () => {
  it("should be equivalent to DevToolsPlugin structure", () => {
    const TestComponent = (_props: PluginProps): null => null;

    const config: PluginConfig = {
      id: "test",
      label: "Test",
      component: TestComponent,
    };

    // PluginConfig should be assignable to DevToolsPlugin
    expectTypeOf(config).toMatchTypeOf<DevToolsPlugin>();
  });
});

// =============================================================================
// PluginStateSnapshot Tests
// =============================================================================

describe("PluginStateSnapshot type structure", () => {
  it("should have activeTabId as string", () => {
    expectTypeOf<PluginStateSnapshot["activeTabId"]>().toBeString();
  });

  it("should have selectedContainerIds as ReadonlySet<string>", () => {
    expectTypeOf<PluginStateSnapshot["selectedContainerIds"]>().toEqualTypeOf<
      ReadonlySet<string>
    >();
  });

  it("should have tracing state properties", () => {
    expectTypeOf<PluginStateSnapshot["tracingEnabled"]>().toBeBoolean();
    expectTypeOf<PluginStateSnapshot["tracingPaused"]>().toBeBoolean();
    expectTypeOf<PluginStateSnapshot["tracingThreshold"]>().toBeNumber();
  });

  it("should have plugins as readonly DevToolsPlugin array", () => {
    expectTypeOf<PluginStateSnapshot["plugins"]>().toEqualTypeOf<readonly DevToolsPlugin[]>();
  });
});

// =============================================================================
// Plugin Component Type Safety Tests
// =============================================================================

describe("Plugin component receives correct props", () => {
  it("should allow function component accepting PluginProps", () => {
    function MyPlugin(props: PluginProps): null {
      // Can access all props
      const _tabId = props.state.activeTabId;
      const _graph = props.graph;
      const _containers = props.containers;
      props.runtime.dispatch({ type: "selectTab", tabId: "test" });
      return null;
    }

    const plugin: DevToolsPlugin = {
      id: "my-plugin",
      label: "My Plugin",
      component: MyPlugin,
    };

    expectTypeOf(plugin.component).toMatchTypeOf<React.ComponentType<PluginProps>>();
  });

  it("should allow arrow function component", () => {
    const ArrowPlugin = (_props: PluginProps): null => null;

    const plugin: DevToolsPlugin = {
      id: "arrow-plugin",
      label: "Arrow Plugin",
      component: ArrowPlugin,
    };

    expectTypeOf(plugin.component).toMatchTypeOf<React.ComponentType<PluginProps>>();
  });
});
