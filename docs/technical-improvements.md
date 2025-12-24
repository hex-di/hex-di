# HexDI Technical Improvements

This document outlines identified architectural issues and their concrete solutions.

---

## 1. Intersection Type Accumulation

### Problem

The current implementation accumulates type information via intersections:

```typescript
type AddEdge<TMap, TProvides, TRequires> = TMap & { [K in TProvides]: TRequires };
```

After 50+ `.provide()` calls, TypeScript struggles with deeply nested intersections:

```
A & B & C & D & E & F & ... // TypeScript performance degrades
```

### Solution: Union of Tuples

Replace intersection accumulation with a union-based approach:

```typescript
// Edge represented as a tuple
type DepEdge = readonly [provides: string, requires: string];

// GraphBuilder tracks edges as a union (not intersection)
type GraphBuilder<
  TProvides = never,
  TRequires = never,
  TEdges extends DepEdge = never,  // Union grows linearly
  TLifetimes extends readonly [string, number] = never,
> = ...

// Adding an edge extends the union
type AddEdge<
  TEdges extends DepEdge,
  P extends string,
  R extends string
> = TEdges | readonly [P, R];

// Lookup uses Extract instead of index access
type GetDeps<TEdges extends DepEdge, P extends string> =
  Extract<TEdges, readonly [P, string]>[1];
```

**Benefits:**

- Union types grow linearly, intersections grow exponentially in complexity
- TypeScript handles large unions more efficiently than deep intersections
- Same information, better IDE performance

---

## 2. Silent Depth Limit Failure

### Problem

Cycle detection has a hard limit of 30 levels and silently returns `false`:

```typescript
type MaxDepth = 30;

// If depth exceeded, assume no cycle (WRONG)
DepthExceeded<TDepth> extends true ? false : ...
```

Cycles deeper than 30 levels pass compile-time validation silently.

### Solution A: Fail Loudly

If you must have a limit, make failures visible:

```typescript
type DepthLimitError = {
  readonly __error: "DEPTH_LIMIT_EXCEEDED";
  readonly __message: "Dependency graph too deep for compile-time validation. Restructure your graph or rely on runtime checks.";
};

type IsReachable<...> =
  DepthExceeded<TDepth> extends true
    ? DepthLimitError  // Visible error, not silent false
    : ...
```

### Solution B: BFS Traversal (Higher Effective Limit)

Restructure to breadth-first using an accumulator pattern:

```typescript
type IsReachableBFS<
  TMap,
  TQueue extends string, // Ports to check (union)
  TTarget extends string,
  TVisited extends string = never,
  TDepth extends unknown[] = [],
> =
  // Depth check
  TDepth["length"] extends 50
    ? DepthLimitError
    : // Empty queue - not found
      [TQueue] extends [never]
      ? false
      : // Skip visited
        TQueue extends TVisited
        ? IsReachableBFS<TMap, Exclude<TQueue, TVisited>, TTarget, TVisited, TDepth>
        : // Found target
          TQueue extends TTarget
          ? true
          : // Expand frontier
            IsReachableBFS<
              TMap,
              GetAllDeps<TMap, TQueue>, // Next level
              TTarget,
              TVisited | TQueue,
              [...TDepth, unknown]
            >;
```

BFS processes level-by-level, reducing type instantiation depth compared to DFS.

---

## 3. ContainerImpl God Class

### Problem

`ContainerImpl` is 900+ lines with 16 private fields handling:

- Root container logic
- Child container logic
- Async initialization
- Resolution hooks
- Scope management
- Disposal

### Solution: Composition Over Inheritance

Split into focused, single-responsibility classes:

#### ResolutionEngine

```typescript
/**
 * Handles service resolution only.
 * No lifecycle, no initialization, no hooks.
 */
class ResolutionEngine<TProvides extends Port<unknown, string>> {
  constructor(
    private readonly adapterMap: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    private readonly singletonMemo: MemoMap,
    private readonly resolutionContext: ResolutionContext
  ) {}

  resolve<P extends TProvides>(port: P, scopedMemo: MemoMap): InferService<P> {
    const adapter = this.adapterMap.get(port);
    if (!adapter) {
      throw new Error(`No adapter for port '${port.__portName}'`);
    }
    return this.resolveWithAdapter(port, adapter, scopedMemo);
  }

  private resolveWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): InferService<P> {
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          port,
          () => this.createInstance(port, adapter, scopedMemo),
          adapter.finalizer
        );
      case "scoped":
        return scopedMemo.getOrElseMemoize(
          port,
          () => this.createInstance(port, adapter, scopedMemo),
          adapter.finalizer
        );
      case "transient":
        return this.createInstance(port, adapter, scopedMemo);
    }
  }

  private createInstance<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): InferService<P> {
    this.resolutionContext.enter(port.__portName);
    try {
      const deps: Record<string, unknown> = {};
      for (const req of adapter.requires) {
        deps[req.__portName] = this.resolve(req as TProvides, scopedMemo);
      }
      return adapter.factory(deps);
    } finally {
      this.resolutionContext.exit(port.__portName);
    }
  }
}
```

#### LifecycleManager

```typescript
/**
 * Manages parent-child relationships and disposal.
 */
class LifecycleManager {
  private readonly children = new Set<Disposable>();
  private disposed = false;

  register(child: Disposable): void {
    if (this.disposed) {
      throw new Error("Cannot register child on disposed container");
    }
    this.children.add(child);
  }

  unregister(child: Disposable): void {
    this.children.delete(child);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    // LIFO disposal
    const children = Array.from(this.children).reverse();
    for (const child of children) {
      await child.dispose();
    }
    this.children.clear();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
```

#### AsyncInitializer

```typescript
/**
 * Handles async adapter initialization.
 */
class AsyncInitializer {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly asyncAdapters: readonly RuntimeAdapter[]) {}

  async initialize(resolveFn: (port: Port<unknown, string>) => Promise<unknown>): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize(resolveFn);
    await this.initPromise;
    this.initialized = true;
  }

  private async doInitialize(
    resolveFn: (port: Port<unknown, string>) => Promise<unknown>
  ): Promise<void> {
    for (const adapter of this.asyncAdapters) {
      await resolveFn(adapter.provides);
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}
```

#### HooksRunner

```typescript
/**
 * Manages resolution hooks for DevTools integration.
 */
class HooksRunner {
  private readonly parentStack: Array<{ port: Port<unknown, string>; startTime: number }> = [];

  constructor(
    private readonly hooks: {
      beforeResolve?: (ctx: ResolutionHookContext) => void;
      afterResolve?: (ctx: AfterResolveContext) => void;
    }
  ) {}

  wrap<T>(
    port: Port<unknown, string>,
    lifetime: Lifetime,
    scopeId: string | null,
    isCacheHit: boolean,
    fn: () => T
  ): T {
    const context = this.createContext(port, lifetime, scopeId, isCacheHit);

    this.hooks.beforeResolve?.(context);

    const startTime = Date.now();
    this.parentStack.push({ port, startTime });

    let error: Error | null = null;
    try {
      return fn();
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      this.parentStack.pop();
      this.hooks.afterResolve?.({
        ...context,
        duration: Date.now() - startTime,
        error,
      });
    }
  }

  private createContext(
    port: Port<unknown, string>,
    lifetime: Lifetime,
    scopeId: string | null,
    isCacheHit: boolean
  ): ResolutionHookContext {
    const parent = this.parentStack[this.parentStack.length - 1];
    return {
      port,
      portName: port.__portName,
      lifetime,
      scopeId,
      parentPort: parent?.port ?? null,
      isCacheHit,
      depth: this.parentStack.length,
    };
  }
}
```

#### Composed Container

```typescript
/**
 * Container is now pure composition.
 */
class Container<TProvides extends Port<unknown, string>> {
  private readonly resolution: ResolutionEngine<TProvides>;
  private readonly lifecycle: LifecycleManager;
  private readonly initializer: AsyncInitializer;
  private readonly hooks: HooksRunner | null;
  private readonly singletonMemo: MemoMap;

  constructor(graph: Graph<TProvides>, options?: ContainerOptions) {
    this.singletonMemo = new MemoMap();
    this.lifecycle = new LifecycleManager();
    this.resolution = new ResolutionEngine(
      this.buildAdapterMap(graph),
      this.singletonMemo,
      new ResolutionContext()
    );
    this.initializer = new AsyncInitializer(this.extractAsyncAdapters(graph));
    this.hooks = options?.hooks ? new HooksRunner(options.hooks) : null;
  }

  resolve<P extends TProvides>(port: P): InferService<P> {
    this.lifecycle.isDisposed && throwDisposed(port);

    const doResolve = () => this.resolution.resolve(port, this.singletonMemo);

    return this.hooks ? this.hooks.wrap(port, "singleton", null, false, doResolve) : doResolve();
  }

  async initialize(): Promise<this> {
    await this.initializer.initialize(p => this.resolveAsync(p));
    return this;
  }

  async dispose(): Promise<void> {
    await this.lifecycle.dispose();
    await this.singletonMemo.dispose();
  }

  // ... other methods delegate to composed parts
}
```

**Result:** Each class is <200 lines, single responsibility, independently testable.

---

## 4. React Integration Type Cast

### Problem

A cast is used to bridge Container/Scope types:

```typescript
function extractMethods(resolver: unknown): ResolvableMethods {
  const r = resolver as ResolvableMethods; // Type safety bypassed
  // ...
}
```

### Solution: Common Interface

Define a structural interface that all resolvers implement:

```typescript
/**
 * Common interface for Container, ChildContainer, and Scope.
 * This is the ONLY type needed for resolution operations.
 */
interface Resolver<TProvides extends Port<unknown, string>> {
  resolve<P extends TProvides>(port: P): InferService<P>;
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;
  createScope(): Resolver<TProvides>;
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

// Container implements Resolver
class Container<TProvides> implements Resolver<TProvides> { ... }

// Scope implements Resolver
class Scope<TProvides> implements Resolver<TProvides> { ... }

// React integration uses the interface directly
function createTypedHooks<TProvides extends Port<unknown, string>>() {
  const ResolverContext = createContext<Resolver<TProvides> | null>(null);

  function ContainerProvider({
    container
  }: {
    container: Resolver<TProvides>
  }) {
    // No cast needed - container is already typed
    return (
      <ResolverContext.Provider value={container}>
        {children}
      </ResolverContext.Provider>
    );
  }

  function usePort<P extends TProvides>(port: P): InferService<P> {
    const resolver = useContext(ResolverContext);
    if (!resolver) throw new MissingProviderError("usePort", "ContainerProvider");
    return resolver.resolve(port); // Fully typed, no cast
  }

  // ...
}
```

**Benefits:**

- No runtime type assertions
- TypeScript validates everything at compile time
- Simpler mental model

---

## 5. Builder O(n²) Allocations

### Problem

Each `.provide()` copies the entire adapters array:

```typescript
provide(adapter: A) {
  return new GraphBuilder([...this.adapters, adapter]); // O(n) copy
}
```

For n adapters: 1 + 2 + 3 + ... + n = O(n²) total allocations.

### Solution: Persistent Linked List

Use a cons-cell structure for O(1) prepend:

```typescript
/**
 * Immutable linked list node for adapters.
 */
interface AdapterNode {
  readonly adapter: RuntimeAdapter;
  readonly next: AdapterNode | null;
}

class GraphBuilder<
  TProvides = never,
  TRequires = never,
  TAsyncPorts = never,
  TDepGraph = {},
  TLifetimeMap = {},
> {
  private constructor(
    private readonly head: AdapterNode | null,
    private readonly size: number,
  ) {}

  static create(): GraphBuilder<never, never, never, {}, {}> {
    return new GraphBuilder(null, 0);
  }

  provide<A extends Adapter<any, any, any, any>>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, TAsyncPorts, TDepGraph, TLifetimeMap, A> {
    // O(1) prepend - no array copying
    const newHead: AdapterNode = {
      adapter,
      next: this.head
    };

    return new GraphBuilder(
      newHead,
      this.size + 1
    ) as ProvideResult<...>;
  }

  build(): Graph<TProvides, TAsyncPorts> {
    // O(n) materialization happens once at build time
    const adapters: RuntimeAdapter[] = new Array(this.size);

    let node = this.head;
    let i = this.size - 1;

    // Traverse and fill array in reverse (restore insertion order)
    while (node !== null) {
      adapters[i] = node.adapter;
      node = node.next;
      i--;
    }

    return Object.freeze({
      adapters: Object.freeze(adapters)
    });
  }
}
```

**Complexity:**

- `.provide()`: O(1) time, O(1) space
- `.build()`: O(n) time, O(n) space
- Total for n adapters: O(n) vs previous O(n²)

---

## 6. Verbose Internal Type Names

### Problem

Internal type names are excessively long:

```typescript
type AdapterProvidesNameForLifetime<A> = ...  // 28 characters
type AdapterRequiresNamesForLifetime<A> = ... // 29 characters
type InferManyAsyncPorts<A> = ...             // 18 characters
```

### Solution A: Shorter Names

```typescript
// Before
type AdapterProvidesNameForLifetime<A> = ...
type AdapterRequiresNamesForLifetime<A> = ...
type InferAdapterProvides<A> = ...
type InferAdapterRequires<A> = ...

// After
type ProvName<A> = ...   // Provides Name
type ReqNames<A> = ...   // Requires Names
type Prov<A> = ...       // Provides (port)
type Req<A> = ...        // Requires (ports)
```

### Solution B: Namespace Grouping

```typescript
namespace Infer {
  export type Provides<A> = A extends { provides: infer P } ? P : never;
  export type Requires<A> = A extends { requires: readonly (infer R)[] } ? R : never;
  export type Lifetime<A> = A extends { lifetime: infer L } ? L : "singleton";
  export type FactoryKind<A> = A extends { factoryKind: infer K } ? K : "sync";
  export type PortName<P> = P extends Port<unknown, infer N> ? N : never;
}

// Usage
type MyProvides = Infer.Provides<typeof MyAdapter>;
type MyLifetime = Infer.Lifetime<typeof MyAdapter>;
```

### Solution C: Single Generic with Discriminant

```typescript
type From<A, K extends "provides" | "requires" | "lifetime" | "name"> = K extends "provides"
  ? A extends { provides: infer P }
    ? P
    : never
  : K extends "requires"
    ? A extends { requires: readonly (infer R)[] }
      ? R
      : never
    : K extends "lifetime"
      ? A extends { lifetime: infer L }
        ? L
        : "singleton"
      : K extends "name"
        ? A extends { provides: Port<unknown, infer N> }
          ? N
          : never
        : never;

// Usage
type MyProvides = From<typeof MyAdapter, "provides">;
type MyName = From<typeof MyAdapter, "name">;
```

---

## Implementation Priority

| Issue               | Impact          | Effort | Priority |
| ------------------- | --------------- | ------ | -------- |
| Silent depth limit  | Correctness     | Low    | **P0**   |
| ContainerImpl split | Maintainability | High   | **P1**   |
| Intersection types  | Performance     | Medium | **P1**   |
| Builder allocations | Performance     | Low    | **P2**   |
| React cast          | Type safety     | Medium | **P2**   |
| Verbose names       | Readability     | Low    | **P3**   |

**Recommended order:**

1. Fix silent depth limit (quick win, correctness issue)
2. Split ContainerImpl (unblocks other refactors)
3. Switch to union-based type tracking
4. Implement persistent builder
5. Add Resolver interface for React
6. Rename types (can be done incrementally)
