/**
 * AtomService implementation.
 *
 * @packageDocumentation
 */

import type { DeepReadonly, AtomService, Unsubscribe } from "../types/index.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { createSignal, createEffect } from "../reactivity/signals.js";
import type { Signal } from "../reactivity/signals.js";
import type { ReactiveSystemInstance } from "../reactivity/system-factory.js";
import { DisposedStateAccess } from "../errors/index.js";
import type { StoreInspectorInternal } from "../types/inspection.js";
import type { StoreTracingHook } from "../integration/tracing-bridge.js";
import { tryCatch } from "@hex-di/result";

export interface AtomServiceConfig<TValue> {
  readonly portName: string;
  readonly containerName: string;
  readonly initial: TValue;
  readonly tracingHook?: StoreTracingHook;
  readonly inspector?: StoreInspectorInternal;
  readonly reactiveSystem?: ReactiveSystemInstance;
}

export interface AtomServiceInternal<TValue> extends AtomService<TValue> {
  dispose(): void;
  readonly subscriberCount: number;
}

export function createAtomServiceImpl<TValue>(
  config: AtomServiceConfig<TValue>
): AtomServiceInternal<TValue> {
  const sig: Signal<TValue> = createSignal(config.initial, config.reactiveSystem);
  let disposed = false;
  const activeEffects: Array<{ dispose(): void }> = [];
  let _subscriberCount = 0;

  function checkDisposed(operation: "value" | "set" | "update" | "subscribe"): void {
    if (disposed) {
      throw DisposedStateAccess({
        portName: config.portName,
        containerName: config.containerName,
        operation,
      });
    }
  }

  // Referentially stable set/update
  const stableSet = (value: TValue): void => {
    checkDisposed("set");
    tryCatch(
      () => config.tracingHook?.onAtomUpdate?.(config.portName, config.containerName),
      () => undefined
    );
    sig.set(value);
    config.inspector?.emit({ type: "state-changed", portName: config.portName });
    tryCatch(
      () => {
        config.tracingHook?.onAtomUpdateEnd?.(true);
      },
      () => undefined
    );
  };

  const stableUpdate = (fn: (current: TValue) => TValue): void => {
    checkDisposed("update");
    tryCatch(
      () => config.tracingHook?.onAtomUpdate?.(config.portName, config.containerName),
      () => undefined
    );
    const current = sig.get();
    sig.set(fn(current));
    config.inspector?.emit({ type: "state-changed", portName: config.portName });
    tryCatch(
      () => {
        config.tracingHook?.onAtomUpdateEnd?.(true);
      },
      () => undefined
    );
  };

  return {
    get value(): DeepReadonly<TValue> {
      checkDisposed("value");
      return deepFreeze(sig.get());
    },

    set: stableSet,
    update: stableUpdate,

    subscribe(
      listener: (value: DeepReadonly<TValue>, prev: DeepReadonly<TValue>) => void
    ): Unsubscribe {
      checkDisposed("subscribe");
      let prevSnapshot = deepFreeze(sig.get());
      _subscriberCount++;
      const eff = createEffect(() => {
        const currentSnapshot = deepFreeze(sig.get());
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
