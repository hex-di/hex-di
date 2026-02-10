/**
 * DerivedService implementation.
 *
 * @packageDocumentation
 */

import type { DeepReadonly, DerivedService, Unsubscribe } from "../types/index.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { createComputed, createEffect } from "../reactivity/signals.js";
import type { Computed } from "../reactivity/signals.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { DisposedStateAccess, DerivedComputationFailed } from "../errors/index.js";
import type { StoreInspectorInternal } from "../types/inspection.js";
import type { StoreTracingHook } from "../integration/tracing-bridge.js";
import { tryCatch } from "@hex-di/result";
import { withCycleDetection, isCircularDerivedDependency } from "./cycle-detection.js";

export interface DerivedServiceConfig<TResult> {
  readonly portName: string;
  readonly containerName: string;
  readonly select: () => TResult;
  readonly equals?: (a: DeepReadonly<TResult>, b: DeepReadonly<TResult>) => boolean;
  readonly tracingHook?: StoreTracingHook;
  readonly inspector?: StoreInspectorInternal;
  readonly reactiveSystem?: ReactiveSystemInstance;
}

export interface DerivedServiceInternal<TResult> extends DerivedService<TResult> {
  dispose(): void;
  readonly subscriberCount: number;
}

export function createDerivedServiceImpl<TResult>(
  config: DerivedServiceConfig<TResult>
): DerivedServiceInternal<TResult> {
  const comp: Computed<TResult> = createComputed(() => {
    tryCatch(
      () => {
        config.tracingHook?.onDerivedRecompute?.(config.portName, config.containerName);
      },
      () => undefined
    );
    // tryCatch handles the try/catch internally; our code is try/catch-free.
    // createComputed requires synchronous return, so re-throw on Err.
    const result = tryCatch(config.select, cause => {
      if (isCircularDerivedDependency(cause)) throw cause;
      return DerivedComputationFailed({ portName: config.portName, cause });
    });
    const ok = result.isOk();
    tryCatch(
      () => {
        config.tracingHook?.onDerivedRecomputeEnd?.(ok);
      },
      () => undefined
    );
    if (result.isErr()) throw result.error;
    config.inspector?.emit({ type: "state-changed", portName: config.portName });
    return result.value;
  }, config.reactiveSystem);

  let disposed = false;
  const activeEffects: Array<{ dispose(): void }> = [];
  let _subscriberCount = 0;

  function checkDisposed(operation: "value" | "subscribe"): void {
    if (disposed) {
      throw DisposedStateAccess({
        portName: config.portName,
        containerName: config.containerName,
        operation,
      });
    }
  }

  return {
    get value(): DeepReadonly<TResult> {
      checkDisposed("value");
      return withCycleDetection(config.portName, () => deepFreeze(comp.get()));
    },

    subscribe(
      listener: (value: DeepReadonly<TResult>, prev: DeepReadonly<TResult>) => void
    ): Unsubscribe {
      checkDisposed("subscribe");
      const equalityFn = config.equals ?? Object.is;
      let prevSnapshot = deepFreeze(comp.get());
      _subscriberCount++;
      const eff = createEffect(() => {
        const currentSnapshot = deepFreeze(comp.get());
        if (!equalityFn(currentSnapshot, prevSnapshot)) {
          const prev = prevSnapshot;
          prevSnapshot = currentSnapshot;
          listener(currentSnapshot, prev);
        }
      }, config.reactiveSystem);
      activeEffects.push(eff);
      return () => {
        eff.dispose();
        _subscriberCount--;
        const idx = activeEffects.indexOf(eff);
        if (idx >= 0) activeEffects.splice(idx, 1);
      };
    },

    get isDisposed() {
      return disposed;
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
