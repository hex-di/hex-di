/**
 * StateService implementation backed by alien-signals.
 *
 * @packageDocumentation
 */

import type { ActionMap, BoundActions } from "../types/index.js";
import type { EffectMap, EffectErrorHandler, ActionEvent, ActionEffect } from "../types/index.js";
import { EffectFailedError, EffectAdapterError, EffectErrorHandlerError } from "../types/index.js";
import type { StoreRuntimeError } from "../types/index.js";
import type { DeepReadonly, StateService, StateListener, Unsubscribe } from "../types/index.js";
import type { StoreInspectorInternal } from "../types/inspection.js";
import type {
  StoreTracerLike,
  StoreTracingHook,
  StoreSpanContext,
} from "../integration/tracing-bridge.js";
import { createStoreTracingBridge } from "../integration/tracing-bridge.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { createSignal, createEffect } from "../reactivity/signals.js";
import type { Signal } from "../reactivity/signals.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { DisposedStateAccess } from "../errors/index.js";
import { trackSelector, hasPathChanged } from "../reactivity/path-tracking.js";
import { tryCatch, isResultAsync } from "@hex-di/result";

// =============================================================================
// Config
// =============================================================================

export interface StateServiceConfig<TState, TActions extends ActionMap<TState>> {
  readonly portName: string;
  readonly containerName: string;
  readonly initial: TState;
  readonly actions: TActions;
  readonly effects?: Partial<EffectMap<TState, TActions>>;
  readonly onEffectError?: EffectErrorHandler<TState, TActions>;
  readonly effectAdapters?: readonly ActionEffect[];
  readonly onError?: (error: StoreRuntimeError) => void;
  /** Optional tracing hook. Takes precedence over `tracer` if both are provided. */
  readonly tracingHook?: StoreTracingHook;
  /**
   * Shorthand: pass a StoreTracerLike and a StoreTracingHook is auto-created.
   * Ignored when `tracingHook` is already provided.
   */
  readonly tracer?: StoreTracerLike;
  readonly inspector?: StoreInspectorInternal;
  readonly reactiveSystem?: ReactiveSystemInstance;
}

// =============================================================================
// Internal extension (for introspection / lifecycle)
// =============================================================================

export interface StateServiceInternal<
  TState,
  TActions extends ActionMap<TState>,
> extends StateService<TState, TActions> {
  dispose(): void;
  readonly actionCount: number;
  readonly lastActionAt: number | null;
  readonly subscriberCount: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Invoke a reducer from ActionMap dynamically.
 *
 * ActionMap reducers are typed as `(state: TState, ...args: never[]) => TState` to
 * allow both 1-ary `(state) => state` and 2-ary `(state, payload) => state` shapes.
 * Since `never[]` rest prevents direct invocation with runtime args, we use
 * Function.prototype.apply at the boundary where runtime dispatch meets static types.
 *
 * This is the ONLY place where we bridge the static/dynamic gap for action dispatch.
 */
/** Type guard: narrows unknown to a callable with unknown args */
function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Dynamically apply a function with given arguments.
 *
 * Bridges the static/dynamic gap: ActionMap reducers and effect functions have
 * per-key signatures whose unions can't be directly called.  This helper
 * widens the function reference to `unknown` then narrows it via a type guard,
 * allowing invocation with runtime arguments while preserving the return type
 * `R` for downstream callers through the overload signature.
 */
function applyDynamic<R>(fn: (...args: never[]) => R, args: readonly unknown[]): R;
function applyDynamic(fn: (...args: never[]) => unknown, args: readonly unknown[]): unknown {
  // Widen to unknown, then narrow via type guard to bridge the never[]/unknown[] gap
  const callable: unknown = fn;
  if (!isCallable(callable)) return undefined;
  return callable(...args);
}

function callReducer<TState>(
  reducer: (state: TState, ...args: never[]) => TState,
  state: TState,
  args: readonly unknown[]
): TState {
  return applyDynamic(reducer, [state, ...args]);
}

/**
 * Invoke an effect function dynamically (same bridging rationale as callReducer).
 */
function callEffect(effectFn: (...args: never[]) => unknown, context: unknown): unknown {
  return applyDynamic(effectFn, [context]);
}

// =============================================================================
// Factory
// =============================================================================

export function createStateServiceImpl<TState, TActions extends ActionMap<TState>>(
  config: StateServiceConfig<TState, TActions>
): StateServiceInternal<TState, TActions> {
  // Resolve tracing: explicit tracingHook takes precedence over tracer shorthand
  const resolvedTracingHook =
    config.tracingHook ??
    (config.tracer !== undefined ? createStoreTracingBridge({ tracer: config.tracer }) : undefined);

  const sig: Signal<TState> = createSignal(config.initial, config.reactiveSystem);
  let disposed = false;
  const activeEffects: Array<{ dispose(): void }> = [];
  let _actionCount = 0;
  let _lastActionAt: number | null = null;
  let _subscriberCount = 0;

  function checkDisposed(operation: "state" | "actions" | "subscribe"): void {
    if (disposed) {
      throw DisposedStateAccess({
        portName: config.portName,
        containerName: config.containerName,
        operation,
      });
    }
  }

  function notifyEffectAdapters(
    portName: string,
    actionName: string,
    payload: unknown,
    prevState: TState,
    nextState: TState,
    phase: "action" | "effect-error",
    error?: EffectFailedError,
    traceId?: string
  ): void {
    if (!config.effectAdapters || config.effectAdapters.length === 0) return;

    const event: ActionEvent = {
      portName,
      actionName,
      payload,
      prevState,
      nextState,
      timestamp: Date.now(),
      phase,
      error,
      traceId,
    };

    for (const adapter of config.effectAdapters) {
      // Effect adapter errors are swallowed — cross-cutting concerns
      // must not disrupt the main state transition flow
      tryCatch(
        () => {
          void adapter.onAction(event);
        },
        cause => EffectAdapterError({ cause })
      ).inspectErr(err => config.onError?.(err));
    }
  }

  function handleEffectError(
    effectError: EffectFailedError,
    actionName: string,
    prevState: TState,
    nextState: TState,
    traceId?: string
  ): void {
    notifyEffectAdapters(
      config.portName,
      actionName,
      undefined,
      prevState,
      nextState,
      "effect-error",
      effectError,
      traceId
    );

    if (config.onEffectError) {
      const handler = config.onEffectError;
      tryCatch(
        () => callOnEffectError(handler, effectError, actionName, prevState, nextState),
        handlerError =>
          EffectErrorHandlerError({
            portName: config.portName,
            actionName,
            originalError: effectError,
            handlerError,
          })
      ).inspectErr(err => config.onError?.(err));
    }
  }

  /**
   * Bridge for calling onEffectError with the correct argument shape.
   * EffectErrorHandler expects `actionName: keyof TActions & string` but we have
   * a runtime `string`. The overload bridges this at the type boundary.
   */
  function callOnEffectError(
    handler: EffectErrorHandler<TState, TActions>,
    effectError: EffectFailedError,
    actionName: string,
    prevState: TState,
    nextState: TState
  ): void {
    Function.prototype.apply.call(handler, undefined, [
      {
        error: effectError,
        actionName,
        state: deepFreeze(nextState),
        prevState: deepFreeze(prevState),
        actions: boundActions,
      },
    ]);
  }

  // Build bound actions using overloaded builder that returns the branded type.
  // Internally works with Record<string, Function>; the public BoundActions<TState, TActions>
  // type is structurally identical at runtime.
  function buildBoundActions(): BoundActions<TState, TActions>;
  function buildBoundActions(): Record<string, (...args: unknown[]) => void> {
    const record: Record<string, (...args: unknown[]) => void> = {};

    for (const actionName of Object.keys(config.actions)) {
      const reducer = config.actions[actionName];
      if (!reducer) continue;

      record[actionName] = (...args: unknown[]): void => {
        checkDisposed("actions");

        const spanResult = tryCatch(
          () =>
            resolvedTracingHook?.onActionStart(config.portName, actionName, config.containerName),
          () => undefined
        );
        const spanCtx: StoreSpanContext =
          spanResult.isOk() && spanResult.value ? spanResult.value : {};
        let actionOk = true;

        const prevState = sig.get();
        const nextState = callReducer(reducer, prevState, args);

        sig.set(nextState);
        _actionCount++;
        _lastActionAt = Date.now();

        // Determine effect status for inspector recording
        let effectStatus: "none" | "pending" | "completed" | "failed" = "none";

        // Fire inline effects
        const effectFn = config.effects?.[actionName];
        if (effectFn) {
          const effectContext = {
            state: deepFreeze(nextState),
            prevState: deepFreeze(prevState),
            payload: args.length > 0 ? args[0] : undefined,
          };

          const effectResult = tryCatch(
            () => callEffect(effectFn, effectContext),
            cause => EffectFailedError({ portName: config.portName, actionName, cause })
          );

          effectResult.match(
            result => {
              if (isResultAsync(result)) {
                effectStatus = "pending";
                config.inspector?.incrementPendingEffects();
                void result.match(
                  () => {
                    config.inspector?.decrementPendingEffects();
                    config.inspector?.emit({
                      type: "effect-completed",
                      portName: config.portName,
                      actionName,
                    });
                    notifyEffectAdapters(
                      config.portName,
                      actionName,
                      args[0],
                      prevState,
                      nextState,
                      "action",
                      undefined,
                      spanCtx.traceId
                    );
                  },
                  (cause: unknown) => {
                    config.inspector?.decrementPendingEffects();
                    actionOk = false;
                    const effectError = EffectFailedError({
                      portName: config.portName,
                      actionName,
                      cause,
                    });
                    config.inspector?.emit({
                      type: "effect-failed",
                      portName: config.portName,
                      actionName,
                      error: effectError,
                    });
                    handleEffectError(
                      effectError,
                      actionName,
                      prevState,
                      nextState,
                      spanCtx.traceId
                    );
                  }
                );
              } else {
                effectStatus = "completed";
                notifyEffectAdapters(
                  config.portName,
                  actionName,
                  args[0],
                  prevState,
                  nextState,
                  "action",
                  undefined,
                  spanCtx.traceId
                );
              }
            },
            effectError => {
              effectStatus = "failed";
              actionOk = false;
              handleEffectError(effectError, actionName, prevState, nextState, spanCtx.traceId);
            }
          );
        } else {
          notifyEffectAdapters(
            config.portName,
            actionName,
            args[0],
            prevState,
            nextState,
            "action",
            undefined,
            spanCtx.traceId
          );
        }

        // Auto-record action in inspector
        if (config.inspector) {
          config.inspector.recordAction({
            id: `${config.portName}-${_actionCount}`,
            portName: config.portName,
            actionName,
            payload: args.length > 0 ? args[0] : undefined,
            prevState: deepFreeze(prevState),
            nextState: deepFreeze(nextState),
            timestamp: Date.now(),
            effectStatus,
            parentId: null,
            order: _actionCount,
            traceId: spanCtx.traceId,
            spanId: spanCtx.spanId,
          });
        }

        tryCatch(
          () => {
            resolvedTracingHook?.onActionEnd(actionOk);
          },
          () => undefined
        );
      };
    }

    return Object.freeze(record);
  }

  const boundActions = buildBoundActions();

  function createSubscription(fn: () => void): Unsubscribe {
    _subscriberCount++;
    const eff = createEffect(fn, config.reactiveSystem);
    activeEffects.push(eff);
    return () => {
      eff.dispose();
      _subscriberCount--;
      const idx = activeEffects.indexOf(eff);
      if (idx >= 0) activeEffects.splice(idx, 1);
    };
  }

  function subscribeToState(listener: StateListener<TState>): Unsubscribe {
    checkDisposed("subscribe");
    let prevSnapshot = deepFreeze(sig.get());
    return createSubscription(() => {
      const currentSnapshot = deepFreeze(sig.get());
      if (currentSnapshot !== prevSnapshot) {
        const prev = prevSnapshot;
        prevSnapshot = currentSnapshot;
        listener(currentSnapshot, prev);
      }
    });
  }

  function subscribeToSelector<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe {
    checkDisposed("subscribe");
    const eqFn = equalityFn ?? Object.is;

    // Initial run: track paths and capture selected value.
    // On frozen objects, nested non-configurable properties can't be proxied,
    // so paths are tracked at the parent level. This is still correct because
    // hasPathChanged uses Object.is at each path segment, catching reference changes.
    let prevState = deepFreeze(sig.get());
    let tracking = trackSelector(prevState, selector);
    let prevSelected = tracking.value;

    return createSubscription(() => {
      const currentState = deepFreeze(sig.get());

      // Fast path: skip selector if none of the tracked paths changed
      if (!hasPathChanged(prevState, currentState, tracking.paths)) {
        return;
      }

      // Re-run selector and re-track paths (handles dynamic selectors)
      prevState = currentState;
      tracking = trackSelector(currentState, selector);
      const selected = tracking.value;

      if (!eqFn(selected, prevSelected)) {
        const prev = prevSelected;
        prevSelected = selected;
        listener(selected, prev);
      }
    });
  }

  // Subscribe dispatches to the correct implementation based on argument count.
  // The public API matches StateService's overloaded subscribe method.
  function subscribeImpl(listener: StateListener<TState>): Unsubscribe;
  function subscribeImpl<TSelected>(
    selector: (state: DeepReadonly<TState>) => TSelected,
    listener: (value: TSelected, prev: TSelected) => void,
    equalityFn?: (a: TSelected, b: TSelected) => boolean
  ): Unsubscribe;
  function subscribeImpl(...args: [unknown, ...unknown[]]): Unsubscribe {
    if (args.length === 1) {
      return applyDynamic(subscribeToState, args);
    }
    return applyDynamic(subscribeToSelector, args);
  }

  return {
    get state(): DeepReadonly<TState> {
      checkDisposed("state");
      return deepFreeze(sig.get());
    },

    get actions(): BoundActions<TState, TActions> {
      checkDisposed("actions");
      return boundActions;
    },

    subscribe: subscribeImpl,

    get isDisposed() {
      return disposed;
    },
    get actionCount() {
      return _actionCount;
    },
    get lastActionAt() {
      return _lastActionAt;
    },
    get subscriberCount() {
      return _subscriberCount;
    },

    dispose(): void {
      disposed = true;
      for (const eff of activeEffects) {
        eff.dispose();
      }
      activeEffects.length = 0;
      _subscriberCount = 0;
    },
  };
}
