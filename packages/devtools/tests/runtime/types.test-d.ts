/**
 * Type-level tests for DevTools Runtime Core Types.
 *
 * These tests verify:
 * 1. DevToolsRuntimeState has all required fields with correct types
 * 2. DevToolsCommand discriminated union is exhaustive
 * 3. DevToolsEvent discriminated union is exhaustive
 * 4. Type utilities work correctly
 * 5. Command and Event extraction types work
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  DevToolsRuntimeState,
  DevToolsPlugin,
  DevToolsCommand,
  DevToolsEvent,
  DevToolsRuntime,
  DevToolsRuntimeConfig,
  PluginProps,
  PluginShortcut,
  ContainerEntry,
  SelectTabCommand,
  SelectContainersCommand,
  ToggleTracingCommand,
  PauseTracingCommand,
  ResumeTracingCommand,
  SetThresholdCommand,
  ClearTracesCommand,
  TabChangedEvent,
  ContainersSelectedEvent,
  TracingStateChangedEvent,
  TracesClearedEvent,
  CommandType,
  EventType,
  ExtractCommand,
  ExtractEvent,
  StateListener,
  EventListener,
} from "../../src/runtime/types.js";
import type { ExportedGraph } from "@hex-di/devtools-core";
import type { TracingAPI, ContainerSnapshot } from "@hex-di/plugin";
import type { ReactElement } from "react";

// =============================================================================
// DevToolsRuntimeState Type Tests
// =============================================================================

describe("DevToolsRuntimeState type structure", () => {
  it("should have activeTabId as string", () => {
    expectTypeOf<DevToolsRuntimeState["activeTabId"]>().toBeString();
  });

  it("should have selectedContainerIds as ReadonlySet<string>", () => {
    expectTypeOf<DevToolsRuntimeState["selectedContainerIds"]>().toEqualTypeOf<
      ReadonlySet<string>
    >();
  });

  it("should have tracingEnabled as boolean", () => {
    expectTypeOf<DevToolsRuntimeState["tracingEnabled"]>().toBeBoolean();
  });

  it("should have tracingPaused as boolean", () => {
    expectTypeOf<DevToolsRuntimeState["tracingPaused"]>().toBeBoolean();
  });

  it("should have tracingThreshold as number", () => {
    expectTypeOf<DevToolsRuntimeState["tracingThreshold"]>().toBeNumber();
  });

  it("should have plugins as readonly DevToolsPlugin array", () => {
    expectTypeOf<DevToolsRuntimeState["plugins"]>().toEqualTypeOf<readonly DevToolsPlugin[]>();
  });

  it("should be assignable from valid state object", () => {
    const MockComponent = () => null;
    const validState = {
      activeTabId: "graph",
      selectedContainerIds: new Set<string>(),
      tracingEnabled: true,
      tracingPaused: false,
      tracingThreshold: 100,
      plugins: [{ id: "test", label: "Test", component: MockComponent }] as const,
    };

    expectTypeOf(validState).toMatchTypeOf<DevToolsRuntimeState>();
  });
});

// =============================================================================
// DevToolsPlugin Type Tests
// =============================================================================

describe("DevToolsPlugin type structure", () => {
  it("should have id as string", () => {
    expectTypeOf<DevToolsPlugin["id"]>().toBeString();
  });

  it("should have label as string", () => {
    expectTypeOf<DevToolsPlugin["label"]>().toBeString();
  });

  it("should have optional icon as ReactElement", () => {
    expectTypeOf<DevToolsPlugin["icon"]>().toEqualTypeOf<ReactElement | undefined>();
  });

  it("should have optional shortcuts as readonly PluginShortcut array", () => {
    expectTypeOf<DevToolsPlugin["shortcuts"]>().toEqualTypeOf<
      readonly PluginShortcut[] | undefined
    >();
  });

  it("should have component as React.ComponentType<PluginProps>", () => {
    expectTypeOf<DevToolsPlugin["component"]>().toMatchTypeOf<React.ComponentType<PluginProps>>();
  });
});

// =============================================================================
// PluginProps Type Tests
// =============================================================================

describe("PluginProps type structure", () => {
  it("should have runtime as PluginRuntimeAccess", () => {
    // PluginProps uses PluginRuntimeAccess which is a minimal subset of DevToolsRuntime
    // This is intentional for plugin isolation - plugins only get what they need
    expectTypeOf<PluginProps["runtime"]>().toHaveProperty("dispatch");
    expectTypeOf<PluginProps["runtime"]>().toHaveProperty("getState");
  });

  it("should have state as PluginStateSnapshot", () => {
    // PluginProps uses PluginStateSnapshot which mirrors DevToolsRuntimeState
    expectTypeOf<PluginProps["state"]>().toHaveProperty("activeTabId");
    expectTypeOf<PluginProps["state"]>().toHaveProperty("selectedContainerIds");
    expectTypeOf<PluginProps["state"]>().toHaveProperty("tracingEnabled");
    expectTypeOf<PluginProps["state"]>().toHaveProperty("plugins");
  });

  it("should have graph as ExportedGraph", () => {
    expectTypeOf<PluginProps["graph"]>().toEqualTypeOf<ExportedGraph>();
  });

  it("should have optional tracingAPI", () => {
    expectTypeOf<PluginProps["tracingAPI"]>().toEqualTypeOf<TracingAPI | undefined>();
  });

  it("should have containers as readonly ContainerEntry array", () => {
    expectTypeOf<PluginProps["containers"]>().toEqualTypeOf<readonly ContainerEntry[]>();
  });
});

// =============================================================================
// PluginShortcut Type Tests
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

  it("should have optional snapshot", () => {
    expectTypeOf<ContainerEntry["snapshot"]>().toEqualTypeOf<ContainerSnapshot | undefined>();
  });
});

// =============================================================================
// DevToolsCommand Discriminated Union Tests
// =============================================================================

describe("DevToolsCommand discriminated union", () => {
  it("should be a union of all command types", () => {
    type ExpectedUnion =
      | SelectTabCommand
      | SelectContainersCommand
      | ToggleTracingCommand
      | PauseTracingCommand
      | ResumeTracingCommand
      | SetThresholdCommand
      | ClearTracesCommand;

    expectTypeOf<DevToolsCommand>().toEqualTypeOf<ExpectedUnion>();
  });

  it("should narrow to SelectTabCommand by type", () => {
    function handleCommand(command: DevToolsCommand) {
      if (command.type === "selectTab") {
        expectTypeOf(command).toEqualTypeOf<SelectTabCommand>();
        expectTypeOf(command.tabId).toBeString();
      }
    }
    // Suppress unused function warning
    void handleCommand;
  });

  it("should narrow to SelectContainersCommand by type", () => {
    function handleCommand(command: DevToolsCommand) {
      if (command.type === "selectContainers") {
        expectTypeOf(command).toEqualTypeOf<SelectContainersCommand>();
        expectTypeOf(command.ids).toEqualTypeOf<ReadonlySet<string>>();
      }
    }
    void handleCommand;
  });

  it("should narrow to SetThresholdCommand by type", () => {
    function handleCommand(command: DevToolsCommand) {
      if (command.type === "setThreshold") {
        expectTypeOf(command).toEqualTypeOf<SetThresholdCommand>();
        expectTypeOf(command.value).toBeNumber();
      }
    }
    void handleCommand;
  });

  it("should be exhaustive in switch statement", () => {
    function assertExhaustive(command: DevToolsCommand): string {
      switch (command.type) {
        case "selectTab":
          return command.tabId;
        case "selectContainers":
          return String(command.ids.size);
        case "toggleTracing":
          return "toggle";
        case "pauseTracing":
          return "pause";
        case "resumeTracing":
          return "resume";
        case "setThreshold":
          return String(command.value);
        case "clearTraces":
          return "clear";
        default: {
          // This should never be reached if union is exhaustive
          const _exhaustive: never = command;
          return _exhaustive;
        }
      }
    }
    void assertExhaustive;
  });
});

// =============================================================================
// DevToolsEvent Discriminated Union Tests
// =============================================================================

describe("DevToolsEvent discriminated union", () => {
  it("should be a union of all event types", () => {
    type ExpectedUnion =
      | TabChangedEvent
      | ContainersSelectedEvent
      | TracingStateChangedEvent
      | TracesClearedEvent;

    expectTypeOf<DevToolsEvent>().toEqualTypeOf<ExpectedUnion>();
  });

  it("should narrow to TabChangedEvent by type", () => {
    function handleEvent(event: DevToolsEvent) {
      if (event.type === "tabChanged") {
        expectTypeOf(event).toEqualTypeOf<TabChangedEvent>();
        expectTypeOf(event.tabId).toBeString();
      }
    }
    void handleEvent;
  });

  it("should narrow to ContainersSelectedEvent by type", () => {
    function handleEvent(event: DevToolsEvent) {
      if (event.type === "containersSelected") {
        expectTypeOf(event).toEqualTypeOf<ContainersSelectedEvent>();
        expectTypeOf(event.ids).toEqualTypeOf<ReadonlySet<string>>();
      }
    }
    void handleEvent;
  });

  it("should narrow to TracingStateChangedEvent by type", () => {
    function handleEvent(event: DevToolsEvent) {
      if (event.type === "tracingStateChanged") {
        expectTypeOf(event).toEqualTypeOf<TracingStateChangedEvent>();
        expectTypeOf(event.enabled).toBeBoolean();
        expectTypeOf(event.paused).toBeBoolean();
      }
    }
    void handleEvent;
  });

  it("should be exhaustive in switch statement", () => {
    function assertExhaustive(event: DevToolsEvent): string {
      switch (event.type) {
        case "tabChanged":
          return event.tabId;
        case "containersSelected":
          return String(event.ids.size);
        case "tracingStateChanged":
          return `${event.enabled}-${event.paused}`;
        case "tracesCleared":
          return "cleared";
        default: {
          // This should never be reached if union is exhaustive
          const _exhaustive: never = event;
          return _exhaustive;
        }
      }
    }
    void assertExhaustive;
  });
});

// =============================================================================
// DevToolsRuntime Interface Tests
// =============================================================================

describe("DevToolsRuntime interface", () => {
  it("should have dispatch method accepting DevToolsCommand", () => {
    expectTypeOf<DevToolsRuntime["dispatch"]>().toEqualTypeOf<(command: DevToolsCommand) => void>();
  });

  it("should have subscribe method returning unsubscribe function", () => {
    expectTypeOf<DevToolsRuntime["subscribe"]>().toEqualTypeOf<
      (listener: StateListener) => () => void
    >();
  });

  it("should have subscribeToEvents method returning unsubscribe function", () => {
    expectTypeOf<DevToolsRuntime["subscribeToEvents"]>().toEqualTypeOf<
      (listener: EventListener) => () => void
    >();
  });

  it("should have getState method returning DevToolsRuntimeState", () => {
    expectTypeOf<DevToolsRuntime["getState"]>().toEqualTypeOf<() => DevToolsRuntimeState>();
  });

  it("should have getSnapshot method returning DevToolsRuntimeState", () => {
    expectTypeOf<DevToolsRuntime["getSnapshot"]>().toEqualTypeOf<() => DevToolsRuntimeState>();
  });

  it("should have getServerSnapshot method returning DevToolsRuntimeState", () => {
    expectTypeOf<DevToolsRuntime["getServerSnapshot"]>().toEqualTypeOf<
      () => DevToolsRuntimeState
    >();
  });
});

// =============================================================================
// DevToolsRuntimeConfig Tests
// =============================================================================

describe("DevToolsRuntimeConfig type structure", () => {
  it("should have required plugins property", () => {
    expectTypeOf<DevToolsRuntimeConfig["plugins"]>().toEqualTypeOf<readonly DevToolsPlugin[]>();
  });

  it("should have optional initialTabId", () => {
    expectTypeOf<DevToolsRuntimeConfig["initialTabId"]>().toEqualTypeOf<string | undefined>();
  });

  it("should have optional initialContainerIds", () => {
    expectTypeOf<DevToolsRuntimeConfig["initialContainerIds"]>().toEqualTypeOf<
      ReadonlySet<string> | undefined
    >();
  });

  it("should have optional tracingEnabled", () => {
    expectTypeOf<DevToolsRuntimeConfig["tracingEnabled"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("should have optional tracingThreshold", () => {
    expectTypeOf<DevToolsRuntimeConfig["tracingThreshold"]>().toEqualTypeOf<number | undefined>();
  });
});

// =============================================================================
// Utility Type Tests
// =============================================================================

describe("CommandType utility type", () => {
  it("should extract all command type strings", () => {
    type ExpectedTypes =
      | "selectTab"
      | "selectContainers"
      | "toggleTracing"
      | "pauseTracing"
      | "resumeTracing"
      | "setThreshold"
      | "clearTraces";

    expectTypeOf<CommandType>().toEqualTypeOf<ExpectedTypes>();
  });
});

describe("EventType utility type", () => {
  it("should extract all event type strings", () => {
    type ExpectedTypes =
      | "tabChanged"
      | "containersSelected"
      | "tracingStateChanged"
      | "tracesCleared";

    expectTypeOf<EventType>().toEqualTypeOf<ExpectedTypes>();
  });
});

describe("ExtractCommand utility type", () => {
  it("should extract SelectTabCommand by type", () => {
    expectTypeOf<ExtractCommand<"selectTab">>().toEqualTypeOf<SelectTabCommand>();
  });

  it("should extract SetThresholdCommand by type", () => {
    expectTypeOf<ExtractCommand<"setThreshold">>().toEqualTypeOf<SetThresholdCommand>();
  });

  it("should extract ClearTracesCommand by type", () => {
    expectTypeOf<ExtractCommand<"clearTraces">>().toEqualTypeOf<ClearTracesCommand>();
  });
});

describe("ExtractEvent utility type", () => {
  it("should extract TabChangedEvent by type", () => {
    expectTypeOf<ExtractEvent<"tabChanged">>().toEqualTypeOf<TabChangedEvent>();
  });

  it("should extract TracingStateChangedEvent by type", () => {
    expectTypeOf<ExtractEvent<"tracingStateChanged">>().toEqualTypeOf<TracingStateChangedEvent>();
  });

  it("should extract TracesClearedEvent by type", () => {
    expectTypeOf<ExtractEvent<"tracesCleared">>().toEqualTypeOf<TracesClearedEvent>();
  });
});

// =============================================================================
// Listener Type Tests
// =============================================================================

describe("StateListener type", () => {
  it("should be a function with no arguments returning void", () => {
    expectTypeOf<StateListener>().toEqualTypeOf<() => void>();
  });
});

describe("EventListener type", () => {
  it("should be a function accepting DevToolsEvent returning void", () => {
    expectTypeOf<EventListener>().toEqualTypeOf<(event: DevToolsEvent) => void>();
  });
});
