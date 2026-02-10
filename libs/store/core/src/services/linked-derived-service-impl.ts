/**
 * LinkedDerivedService implementation.
 *
 * @packageDocumentation
 */

import type { DeepReadonly, LinkedDerivedService, Unsubscribe } from "../types/index.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { createComputed, createEffect } from "../reactivity/signals.js";
import type { Computed } from "../reactivity/signals.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { DisposedStateAccess, DerivedComputationFailed } from "../errors/index.js";
import type { StoreInspectorInternal } from "../types/inspection.js";
import { tryCatch } from "@hex-di/result";
import { withCycleDetection, isCircularDerivedDependency } from "./cycle-detection.js";

export interface LinkedDerivedServiceConfig<TResult> {
  readonly portName: string;
  readonly containerName: string;
  readonly select: () => TResult;
  readonly write: (value: TResult) => void;
  readonly inspector?: StoreInspectorInternal;
  readonly reactiveSystem?: ReactiveSystemInstance;
}

export interface LinkedDerivedServiceInternal<TResult> extends LinkedDerivedService<TResult> {
  dispose(): void;
  readonly subscriberCount: number;
}

export function createLinkedDerivedServiceImpl<TResult>(
  config: LinkedDerivedServiceConfig<TResult>
): LinkedDerivedServiceInternal<TResult> {
  const comp: Computed<TResult> = createComputed(() => {
    const result = tryCatch(config.select, cause => {
      if (isCircularDerivedDependency(cause)) throw cause;
      return DerivedComputationFailed({ portName: config.portName, cause });
    });
    if (result.isErr()) throw result.error;
    return result.value;
  }, config.reactiveSystem);

  let disposed = false;
  const activeEffects: Array<{ dispose(): void }> = [];
  let _subscriberCount = 0;

  function checkDisposed(operation: "value" | "set" | "subscribe"): void {
    if (disposed) {
      throw DisposedStateAccess({
        portName: config.portName,
        containerName: config.containerName,
        operation,
      });
    }
  }

  const stableSet = (value: TResult): void => {
    checkDisposed("set");
    config.write(value);
    config.inspector?.emit({ type: "state-changed", portName: config.portName });
  };

  return {
    get value(): DeepReadonly<TResult> {
      checkDisposed("value");
      return withCycleDetection(config.portName, () => deepFreeze(comp.get()));
    },

    set: stableSet,

    subscribe(
      listener: (value: DeepReadonly<TResult>, prev: DeepReadonly<TResult>) => void
    ): Unsubscribe {
      checkDisposed("subscribe");
      let prevSnapshot = deepFreeze(comp.get());
      _subscriberCount++;
      const eff = createEffect(() => {
        const currentSnapshot = deepFreeze(comp.get());
        if (currentSnapshot !== prevSnapshot) {
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
