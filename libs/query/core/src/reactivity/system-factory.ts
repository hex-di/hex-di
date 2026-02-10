/**
 * Per-Container Isolated Reactive System Factory
 *
 * Ports alien-signals' module-level signal/computed/effect implementation
 * into an instance-scoped factory. Each call to `createIsolatedReactiveSystem()`
 * returns an independent reactive graph with its own batching, queue, and
 * subscriber tracking — eliminating cross-container interference.
 *
 * Built on `createReactiveSystem` from `alien-signals/system`, which provides
 * the low-level dependency graph primitives (link, unlink, propagate, checkDirty,
 * shallowPropagate). This module adds the signal/computed/effect layer on top,
 * using closure-scoped state instead of module globals.
 *
 * @packageDocumentation
 */

import { createReactiveSystem } from "alien-signals/system";

// =============================================================================
// Types
// =============================================================================

/**
 * An isolated reactive system instance.
 *
 * Each instance maintains its own dependency graph, batch queue, and
 * subscriber tracking. Signals created in one system cannot register
 * as dependencies in another system's computeds or effects.
 */
export interface ReactiveSystemInstance {
  /** Create a reactive signal with read/write function interface */
  signal<T>(initialValue: T): { (): T; (value: T): void };
  /** Create a computed value that auto-tracks dependencies */
  computed<T>(getter: (previousValue?: T) => T): () => T;
  /** Create a reactive effect; returns a dispose function */
  effect(fn: () => void): () => void;
  /** Begin a batch — defers notifications until matching endBatch() */
  startBatch(): void;
  /** End a batch — flushes deferred notifications when outermost batch ends */
  endBatch(): void;
  /** Get the current active subscriber (for untracked reads) */
  getActiveSub(): ReactiveNode | undefined;
  /** Set the active subscriber; returns the previous one */
  setActiveSub(sub?: ReactiveNode): ReactiveNode | undefined;
}

// Internal node types mirroring alien-signals' structure.
// These are structural types — not imported from alien-signals/system
// because the system.d.ts uses `declare const enum` which erases at runtime.

interface ReactiveNode {
  deps?: Link;
  depsTail?: Link;
  subs?: Link;
  subsTail?: Link;
  flags: number;
  [key: string]: unknown;
}

interface Link {
  version: number;
  dep: ReactiveNode;
  sub: ReactiveNode;
  prevSub: Link | undefined;
  nextSub: Link | undefined;
  prevDep: Link | undefined;
  nextDep: Link | undefined;
}

interface SignalNode extends ReactiveNode {
  currentValue: unknown;
  pendingValue: unknown;
}

interface ComputedNode extends ReactiveNode {
  value: unknown;
  getter: (previousValue?: unknown) => unknown;
}

interface EffectNode extends ReactiveNode {
  fn: () => void;
}

// Reactive flags (mirroring alien-signals values)
const MUTABLE = 1;
const WATCHING = 2;
const RECURSED_CHECK = 4;
// const RECURSED = 8;  // unused standalone but used in bitwise ops
const DIRTY = 16;
const PENDING = 32;

// =============================================================================
// Factory
// =============================================================================

/**
 * Creates a fully isolated reactive system.
 *
 * All state (cycle counter, batch depth, active subscriber, effect queue)
 * is closure-scoped to the returned instance. Two systems cannot interfere
 * with each other's batching, notification ordering, or dependency tracking.
 */
export function createIsolatedReactiveSystem(): ReactiveSystemInstance {
  // Instance-scoped state (replaces module globals from alien-signals/index.mjs)
  let cycle = 0;
  let batchDepth = 0;
  let notifyIndex = 0;
  let queuedLength = 0;
  let activeSub: ReactiveNode | undefined;
  const queued: Array<EffectNode | undefined> = [];

  // Create the low-level reactive system from alien-signals/system
  const { link, unlink, propagate, checkDirty, shallowPropagate } = createReactiveSystem({
    update(node: ReactiveNode): boolean {
      if (node.depsTail !== undefined) {
        return updateComputed(node as ComputedNode);
      }
      return updateSignal(node as SignalNode);
    },
    notify(effectNode: ReactiveNode): void {
      const e = effectNode as EffectNode;
      let insertIndex = queuedLength;
      const firstInsertedIndex = insertIndex;
      let current: EffectNode | undefined = e;
      while (current !== undefined) {
        queued[insertIndex++] = current;
        current.flags &= ~WATCHING;
        const nextSub = current.subs?.sub as EffectNode | undefined;
        current = nextSub !== undefined && nextSub.flags & WATCHING ? nextSub : undefined;
      }
      queuedLength = insertIndex;
      let lo = firstInsertedIndex;
      let hi = insertIndex - 1;
      while (lo < hi) {
        const left = queued[lo];
        queued[lo++] = queued[hi];
        queued[hi--] = left;
      }
    },
    unwatched(node: ReactiveNode): void {
      if (!(node.flags & MUTABLE)) {
        effectScopeOper(node);
      } else if (node.depsTail !== undefined) {
        node.depsTail = undefined;
        node.flags = MUTABLE | DIRTY;
        purgeDeps(node);
      }
    },
  });

  // =========================================================================
  // Internal helpers (ported from alien-signals index.mjs)
  // =========================================================================

  function updateComputed(c: ComputedNode): boolean {
    ++cycle;
    c.depsTail = undefined;
    c.flags = MUTABLE | RECURSED_CHECK;
    const prevSub = activeSub;
    activeSub = c;
    try {
      const oldValue = c.value;
      return oldValue !== (c.value = c.getter(oldValue));
    } finally {
      activeSub = prevSub;
      c.flags &= ~RECURSED_CHECK;
      purgeDeps(c);
    }
  }

  function updateSignal(s: SignalNode): boolean {
    s.flags = MUTABLE;
    return s.currentValue !== (s.currentValue = s.pendingValue);
  }

  function run(e: EffectNode): void {
    const flags = e.flags;
    if (flags & DIRTY || (flags & PENDING && checkDirty(e.deps!, e))) {
      ++cycle;
      e.depsTail = undefined;
      e.flags = WATCHING | RECURSED_CHECK;
      const prevSub = activeSub;
      activeSub = e;
      try {
        e.fn();
      } finally {
        activeSub = prevSub;
        e.flags &= ~RECURSED_CHECK;
        purgeDeps(e);
      }
    } else {
      e.flags = WATCHING;
    }
  }

  function flush(): void {
    try {
      while (notifyIndex < queuedLength) {
        const eff = queued[notifyIndex];
        queued[notifyIndex++] = undefined;
        if (eff !== undefined) {
          run(eff);
        }
      }
    } finally {
      while (notifyIndex < queuedLength) {
        const eff = queued[notifyIndex];
        queued[notifyIndex++] = undefined;
        if (eff !== undefined) {
          eff.flags |= WATCHING | 8; // WATCHING | RECURSED
        }
      }
      notifyIndex = 0;
      queuedLength = 0;
    }
  }

  function purgeDeps(sub: ReactiveNode): void {
    const depsTail = sub.depsTail;
    let dep = depsTail !== undefined ? depsTail.nextDep : sub.deps;
    while (dep !== undefined) {
      dep = unlink(dep, sub) as Link | undefined;
    }
  }

  function effectScopeOper(node: ReactiveNode): void {
    node.depsTail = undefined;
    node.flags = 0;
    purgeDeps(node);
    const sub = node.subs;
    if (sub !== undefined) {
      unlink(sub);
    }
  }

  // =========================================================================
  // Public API
  // =========================================================================

  function signalOper(node: SignalNode, ...value: unknown[]): unknown {
    if (value.length) {
      if (node.pendingValue !== (node.pendingValue = value[0])) {
        node.flags = MUTABLE | DIRTY;
        const subs = node.subs;
        if (subs !== undefined) {
          propagate(subs);
          if (!batchDepth) {
            flush();
          }
        }
      }
      return undefined;
    }

    if (node.flags & DIRTY) {
      if (updateSignal(node)) {
        const subs = node.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    }
    let sub = activeSub;
    while (sub !== undefined) {
      if (sub.flags & (MUTABLE | WATCHING)) {
        link(node, sub, cycle);
        break;
      }
      sub = sub.subs?.sub;
    }
    return node.currentValue;
  }

  function computedOper(node: ComputedNode): unknown {
    const flags = node.flags;
    if (
      flags & DIRTY ||
      (flags & PENDING &&
        (checkDirty(node.deps!, node) || ((node.flags = flags & ~PENDING), false)))
    ) {
      if (updateComputed(node)) {
        const subs = node.subs;
        if (subs !== undefined) {
          shallowPropagate(subs);
        }
      }
    } else if (!flags) {
      node.flags = MUTABLE | RECURSED_CHECK;
      const prevSub = activeSub;
      activeSub = node;
      try {
        node.value = node.getter();
      } finally {
        activeSub = prevSub;
        node.flags &= ~RECURSED_CHECK;
      }
    }
    const sub = activeSub;
    if (sub !== undefined) {
      link(node, sub, cycle);
    }
    return node.value;
  }

  return {
    signal<T>(initialValue: T): { (): T; (value: T): void } {
      const node: SignalNode = {
        currentValue: initialValue,
        pendingValue: initialValue,
        subs: undefined,
        subsTail: undefined,
        flags: MUTABLE,
      };
      return ((...value: unknown[]) => signalOper(node, ...value)) as { (): T; (value: T): void };
    },

    computed<T>(getter: (previousValue?: T) => T): () => T {
      const node: ComputedNode = {
        value: undefined,
        subs: undefined,
        subsTail: undefined,
        deps: undefined,
        depsTail: undefined,
        flags: 0,
        getter: getter as (previousValue?: unknown) => unknown,
      };
      return (() => computedOper(node)) as () => T;
    },

    effect(fn: () => void): () => void {
      const e: EffectNode = {
        fn,
        subs: undefined,
        subsTail: undefined,
        deps: undefined,
        depsTail: undefined,
        flags: WATCHING | RECURSED_CHECK,
      };
      const prevSub = activeSub;
      activeSub = e;
      if (prevSub !== undefined) {
        link(e, prevSub, 0);
      }
      try {
        e.fn();
      } finally {
        activeSub = prevSub;
        e.flags &= ~RECURSED_CHECK;
      }
      return effectScopeOper.bind(undefined, e);
    },

    startBatch(): void {
      ++batchDepth;
    },

    endBatch(): void {
      if (!--batchDepth) {
        flush();
      }
    },

    getActiveSub(): ReactiveNode | undefined {
      return activeSub;
    },

    setActiveSub(sub?: ReactiveNode): ReactiveNode | undefined {
      const prev = activeSub;
      activeSub = sub;
      return prev;
    },
  };
}
