/**
 * DevTools Runtime Implementation
 *
 * The runtime is the central hub for all DevTools state and operations.
 * It provides a synchronous state management model optimized for
 * React's useSyncExternalStore pattern.
 *
 * @packageDocumentation
 */

import type {
  DevToolsRuntime,
  DevToolsRuntimeState,
  DevToolsCommand,
  StateListener,
  EventListener,
} from "./types.js";
import { processCommand } from "./commands.js";
import { createEventEmitter, type EventEmitter } from "./events.js";

/**
 * Internal runtime implementation.
 *
 * This class encapsulates the state management logic while exposing
 * only the public DevToolsRuntime interface methods.
 */
class DevToolsRuntimeImpl implements DevToolsRuntime {
  /** Current immutable state */
  private currentState: DevToolsRuntimeState;

  /** Set of state change listeners */
  private readonly stateListeners = new Set<StateListener>();

  /** Event emitter for granular event subscriptions */
  private readonly eventEmitter: EventEmitter;

  constructor(initialState: DevToolsRuntimeState) {
    this.currentState = initialState;
    this.eventEmitter = createEventEmitter();
  }

  /**
   * Dispatch a command to mutate state.
   *
   * Commands are processed synchronously. If state changes,
   * listeners are notified and events are emitted.
   */
  dispatch(command: DevToolsCommand): void {
    const { state: newState, event } = processCommand(this.currentState, command);

    // Only update and notify if state actually changed
    if (newState !== this.currentState) {
      this.currentState = newState;
      this.notifyStateListeners();
    }

    // Emit event if one was produced (even if state didn't change, like clearTraces)
    if (event) {
      this.eventEmitter.emit(event);
    }
  }

  /**
   * Subscribe to state changes.
   *
   * The listener is called after any command that changes state.
   * Returns an unsubscribe function.
   */
  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Subscribe to runtime events.
   *
   * Events provide more granular information about what changed.
   * Returns an unsubscribe function.
   */
  subscribeToEvents(listener: EventListener): () => void {
    return this.eventEmitter.subscribe(listener);
  }

  /**
   * Get the current state.
   *
   * Returns the same reference until state changes.
   */
  getState(): DevToolsRuntimeState {
    return this.currentState;
  }

  /**
   * Get a state snapshot for useSyncExternalStore.
   *
   * This method has the same behavior as getState() but follows
   * the naming convention expected by React's useSyncExternalStore.
   */
  getSnapshot(): DevToolsRuntimeState {
    return this.currentState;
  }

  /**
   * Get a server-side state snapshot for SSR.
   *
   * Returns the same state as getSnapshot() since the runtime
   * is initialized with a valid state.
   */
  getServerSnapshot(): DevToolsRuntimeState {
    return this.currentState;
  }

  /**
   * Notify all state listeners of a change.
   *
   * Creates a snapshot of listeners to handle unsubscription during iteration.
   */
  private notifyStateListeners(): void {
    // Snapshot listeners to handle unsubscription during iteration
    const listeners = [...this.stateListeners];

    for (const listener of listeners) {
      // Only call if still subscribed
      if (this.stateListeners.has(listener)) {
        listener();
      }
    }
  }
}

/**
 * Creates a DevToolsRuntime instance with the given initial state.
 *
 * This is an internal factory used by createDevToolsRuntime().
 * The state should already be validated before calling this function.
 *
 * @param initialState - Validated initial state
 * @returns A frozen DevToolsRuntime instance
 *
 * @internal
 */
export function createRuntimeInstance(initialState: DevToolsRuntimeState): DevToolsRuntime {
  const runtime = new DevToolsRuntimeImpl(initialState);

  // Return a frozen object that only exposes the public interface
  return Object.freeze({
    dispatch: runtime.dispatch.bind(runtime),
    subscribe: runtime.subscribe.bind(runtime),
    subscribeToEvents: runtime.subscribeToEvents.bind(runtime),
    getState: runtime.getState.bind(runtime),
    getSnapshot: runtime.getSnapshot.bind(runtime),
    getServerSnapshot: runtime.getServerSnapshot.bind(runtime),
  });
}
