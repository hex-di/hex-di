/**
 * Command Handlers for DevTools Runtime
 *
 * Implements reducer-style command handlers for state transitions.
 * Each command type maps to a pure function that returns a new state.
 *
 * @packageDocumentation
 */

import type {
  DevToolsRuntimeState,
  DevToolsCommand,
  DevToolsEvent,
  SelectTabCommand,
  SelectContainersCommand,
  SetThresholdCommand,
} from "./types.js";

/**
 * Result of processing a command.
 *
 * Contains the new state and optionally an event to emit.
 * If state is unchanged, event should be undefined.
 */
export interface CommandResult {
  /** The new state after processing the command */
  readonly state: DevToolsRuntimeState;
  /** Event to emit, or undefined if state was unchanged */
  readonly event: DevToolsEvent | undefined;
}

/**
 * Handle selectTab command.
 *
 * Updates activeTabId if the new tab is different from current.
 */
function handleSelectTab(state: DevToolsRuntimeState, command: SelectTabCommand): CommandResult {
  // No change if already on this tab
  if (state.activeTabId === command.tabId) {
    return { state, event: undefined };
  }

  const newState: DevToolsRuntimeState = {
    ...state,
    activeTabId: command.tabId,
  };

  return {
    state: newState,
    event: { type: "tabChanged", tabId: command.tabId },
  };
}

/**
 * Handle selectContainers command.
 *
 * Replaces the entire container selection.
 */
function handleSelectContainers(
  state: DevToolsRuntimeState,
  command: SelectContainersCommand
): CommandResult {
  // Check if selection is the same
  if (setsAreEqual(state.selectedContainerIds, command.ids)) {
    return { state, event: undefined };
  }

  const newState: DevToolsRuntimeState = {
    ...state,
    selectedContainerIds: command.ids,
  };

  return {
    state: newState,
    event: { type: "containersSelected", ids: command.ids },
  };
}

/**
 * Handle toggleTracing command.
 *
 * Toggles the tracingEnabled state.
 */
function handleToggleTracing(state: DevToolsRuntimeState): CommandResult {
  const newEnabled = !state.tracingEnabled;

  const newState: DevToolsRuntimeState = {
    ...state,
    tracingEnabled: newEnabled,
  };

  return {
    state: newState,
    event: {
      type: "tracingStateChanged",
      enabled: newEnabled,
      paused: state.tracingPaused,
    },
  };
}

/**
 * Handle pauseTracing command.
 *
 * Sets tracingPaused to true.
 */
function handlePauseTracing(state: DevToolsRuntimeState): CommandResult {
  // No change if already paused
  if (state.tracingPaused) {
    return { state, event: undefined };
  }

  const newState: DevToolsRuntimeState = {
    ...state,
    tracingPaused: true,
  };

  return {
    state: newState,
    event: {
      type: "tracingStateChanged",
      enabled: state.tracingEnabled,
      paused: true,
    },
  };
}

/**
 * Handle resumeTracing command.
 *
 * Sets tracingPaused to false.
 */
function handleResumeTracing(state: DevToolsRuntimeState): CommandResult {
  // No change if not paused
  if (!state.tracingPaused) {
    return { state, event: undefined };
  }

  const newState: DevToolsRuntimeState = {
    ...state,
    tracingPaused: false,
  };

  return {
    state: newState,
    event: {
      type: "tracingStateChanged",
      enabled: state.tracingEnabled,
      paused: false,
    },
  };
}

/**
 * Handle setThreshold command.
 *
 * Updates the tracing threshold value.
 */
function handleSetThreshold(
  state: DevToolsRuntimeState,
  command: SetThresholdCommand
): CommandResult {
  // No change if same threshold
  if (state.tracingThreshold === command.value) {
    return { state, event: undefined };
  }

  const newState: DevToolsRuntimeState = {
    ...state,
    tracingThreshold: command.value,
  };

  // setThreshold emits a tracingStateChanged event
  return {
    state: newState,
    event: {
      type: "tracingStateChanged",
      enabled: state.tracingEnabled,
      paused: state.tracingPaused,
    },
  };
}

/**
 * Handle clearTraces command.
 *
 * Does not change state but emits an event for external systems.
 */
function handleClearTraces(state: DevToolsRuntimeState): CommandResult {
  // clearTraces doesn't modify runtime state,
  // but it emits an event that external systems (like TracingAPI) can listen to
  return {
    state,
    event: { type: "tracesCleared" },
  };
}

/**
 * Process a command and return the result.
 *
 * This is the main reducer function that dispatches to specific handlers
 * based on command type. It ensures exhaustive handling of all command types.
 *
 * @param state - Current state
 * @param command - Command to process
 * @returns Result with new state and optional event
 *
 * @example
 * ```typescript
 * const currentState = runtime.getState();
 * const { state: newState, event } = processCommand(
 *   currentState,
 *   { type: "selectTab", tabId: "services" }
 * );
 *
 * if (event) {
 *   emitter.emit(event);
 * }
 * ```
 */
export function processCommand(
  state: DevToolsRuntimeState,
  command: DevToolsCommand
): CommandResult {
  switch (command.type) {
    case "selectTab":
      return handleSelectTab(state, command);

    case "selectContainers":
      return handleSelectContainers(state, command);

    case "toggleTracing":
      return handleToggleTracing(state);

    case "pauseTracing":
      return handlePauseTracing(state);

    case "resumeTracing":
      return handleResumeTracing(state);

    case "setThreshold":
      return handleSetThreshold(state, command);

    case "clearTraces":
      return handleClearTraces(state);

    default: {
      // Exhaustiveness check - TypeScript will error if a case is missing
      const _exhaustiveCheck: never = command;
      throw new Error(`Unknown command type: ${(_exhaustiveCheck as DevToolsCommand).type}`);
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if two ReadonlySet instances have the same elements.
 */
function setsAreEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a.size !== b.size) {
    return false;
  }

  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }

  return true;
}
