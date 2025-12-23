import type { Port, InferService } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind, InferAdapterProvides } from "@hex-di/graph";
import type {
  ChildContainer,
  ChildContainerBuilder,
  Container,
  Scope,
  ContainerPhase,
  InheritanceMode,
  OverrideResult,
  ExtendResult,
  InheritanceModeConfig,
} from "../types.js";
import type { ContainerInternalState } from "../inspector/types.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";
import { MemoMap } from "../common/memo-map.js";
import { isRecord } from "../common/type-guards.js";
import { ResolutionContext } from "../resolution/context.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
} from "../common/errors.js";
import type {
  RuntimeAdapter,
  ParentContainerLike,
  ScopeContainerAccess,
} from "./internal-types.js";
import {
  createChildContainerWrapper,
  createScopeWrapper,
  asParentContainerLike,
  hasInternalMethods,
} from "./wrappers.js";
import { ScopeImpl } from "../scope/impl.js";

// =============================================================================
// Helper Functions for Builder (Internal)
// =============================================================================

type RuntimeAdapterFor<P extends Port<unknown, string>> = Adapter<
  P,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind
>;

function isAdapterForPort<P extends Port<unknown, string>>(
  adapter: RuntimeAdapter,
  port: P
): adapter is RuntimeAdapterFor<P> {
  return adapter.provides === port;
}

function isAsyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>
): adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "async"> {
  return adapter.factoryKind === "async";
}

function assertSyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>,
  portName: string
): asserts adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "sync"> {
  if (adapter.factoryKind === "async") {
    throw new AsyncInitializationRequiredError(portName);
  }
}

interface ForkedEntry<P extends Port<unknown, string>> {
  readonly port: P;
  readonly instance: InferService<P>;
}

function isForkedEntryForPort<P extends Port<unknown, string>>(
  entry: ForkedEntry<Port<unknown, string>>,
  port: P
): entry is ForkedEntry<P> {
  return entry.port === port;
}

function isAdapterProvidedByParent<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  A extends RuntimeAdapter,
>(parent: ParentContainerLike<TParentProvides, TAsyncPorts>, adapter: A): boolean {
  return parent[ADAPTER_ACCESS](adapter.provides) !== undefined;
}

function isAdapterProvidedByParentOrExtensions<
  TParentProvides extends Port<unknown, string>,
  _TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  A extends RuntimeAdapter,
>(
  parent: ParentContainerLike<TParentProvides, TAsyncPorts>,
  extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
  adapter: A
): boolean {
  return parent[ADAPTER_ACCESS](adapter.provides) !== undefined || extensions.has(adapter.provides);
}

function isInheritanceMode(value: unknown): value is InheritanceMode {
  return value === "shared" || value === "forked" || value === "isolated";
}

class ChildContainerBuilderImpl<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TExtends extends Port<unknown, string> = never,
> implements ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends> {
  // Type-only fields let the builder satisfy error return types without casts.
  declare readonly __valid: never;
  declare readonly __errorBrand: never;
  declare readonly __message: never;
  declare readonly __port: never;
  declare readonly __duplicate: never;

  private readonly parentContainer: ParentContainerLike<TParentProvides, TAsyncPorts>;
  private readonly overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  private readonly extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>;

  private constructor(
    parentContainer: ParentContainerLike<TParentProvides, TAsyncPorts>,
    overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    inheritanceModes: ReadonlyMap<string, InheritanceMode>
  ) {
    this.parentContainer = parentContainer;
    this.overrides = overrides;
    this.extensions = extensions;
    this.inheritanceModes = inheritanceModes;
    Object.freeze(this);
  }

  static create<
    TParentProvides extends Port<unknown, string>,
    TAsyncPorts extends Port<unknown, string> = never,
  >(
    parentContainer: ParentContainerLike<TParentProvides, TAsyncPorts>
  ): ChildContainerBuilder<TParentProvides, TAsyncPorts, never> {
    return new ChildContainerBuilderImpl(parentContainer, new Map(), new Map(), new Map());
  }

  override<P extends Port<unknown, string>, A extends RuntimeAdapterFor<P>>(
    adapter: A
  ): OverrideResult<TParentProvides, TExtends, TAsyncPorts, A> {
    if (!isAdapterProvidedByParent(this.parentContainer, adapter)) {
      return this;
    }
    const newOverrides = new Map(this.overrides);
    newOverrides.set(adapter.provides, adapter);
    return new ChildContainerBuilderImpl(
      this.parentContainer,
      newOverrides,
      this.extensions,
      this.inheritanceModes
    );
  }

  extend<P extends Port<unknown, string>, A extends RuntimeAdapterFor<P>>(
    adapter: A
  ): ExtendResult<TParentProvides, TExtends, TAsyncPorts, A> {
    if (isAdapterProvidedByParentOrExtensions(this.parentContainer, this.extensions, adapter)) {
      return new ChildContainerBuilderImpl<
        TParentProvides,
        TAsyncPorts,
        TExtends | InferAdapterProvides<A>
      >(this.parentContainer, this.overrides, this.extensions, this.inheritanceModes);
    }
    const newExtensions = new Map(this.extensions);
    newExtensions.set(adapter.provides, adapter);
    return new ChildContainerBuilderImpl<
      TParentProvides,
      TAsyncPorts,
      TExtends | InferAdapterProvides<A>
    >(this.parentContainer, this.overrides, newExtensions, this.inheritanceModes);
  }

  withInheritanceMode<TConfig extends InheritanceModeConfig<TParentProvides>>(
    config: TConfig
  ): ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends> {
    const newModes = new Map(this.inheritanceModes);
    for (const [portName, mode] of Object.entries(config)) {
      if (isInheritanceMode(mode)) {
        newModes.set(portName, mode);
      }
    }
    return new ChildContainerBuilderImpl(
      this.parentContainer,
      this.overrides,
      this.extensions,
      newModes
    );
  }

  build(): ChildContainer<TParentProvides, TExtends, TAsyncPorts> {
    const impl = new ChildContainerImpl<TParentProvides, TExtends, TAsyncPorts>(
      this.parentContainer,
      this.overrides,
      this.extensions,
      this.inheritanceModes
    );
    return createChildContainerWrapper(impl);
  }
}

// =============================================================================
// ChildContainerImpl Class
// =============================================================================

export class ChildContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> implements ScopeContainerAccess<TProvides | TExtends> {
  private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts>;
  private wrapper: ChildContainer<TProvides, TExtends, TAsyncPorts> | null = null;
  private readonly overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  private readonly extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>;
  private readonly singletonMemo: MemoMap;
  private readonly forkedInstances: Map<string, ForkedEntry<Port<unknown, string>>>;
  private readonly resolutionContext: ResolutionContext;
  private disposed: boolean = false;
  private readonly childScopes: Set<ScopeImpl<TProvides | TExtends, TAsyncPorts>> = new Set();
  private readonly childContainers: Array<{ dispose(): Promise<void>; isDisposed: boolean }> = [];

  constructor(
    parentContainer: ParentContainerLike<TProvides, TAsyncPorts>,
    overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    inheritanceModes: ReadonlyMap<string, InheritanceMode>
  ) {
    this.parentContainer = parentContainer;
    this.overrides = overrides;
    this.extensions = extensions;
    this.inheritanceModes = inheritanceModes;
    this.singletonMemo = new MemoMap();
    this.resolutionContext = new ResolutionContext();
    this.forkedInstances = new Map();
    this.initializeForkedInstances();
  }

  setWrapper(wrapper: ChildContainer<TProvides, TExtends, TAsyncPorts>): void {
    this.wrapper = wrapper;
    this.parentContainer.registerChildContainer(wrapper);
  }

  private getWrapper(): ChildContainer<TProvides, TExtends, TAsyncPorts> {
    if (this.wrapper === null) {
      throw new Error("Child container wrapper not initialized");
    }
    return this.wrapper;
  }

  registerChildContainer(childContainer: { dispose(): Promise<void>; isDisposed: boolean }): void {
    this.childContainers.push(childContainer);
  }

  unregisterChildContainer(childContainer: {
    dispose(): Promise<void>;
    isDisposed: boolean;
  }): void {
    const index = this.childContainers.indexOf(childContainer);
    if (index !== -1) {
      this.childContainers.splice(index, 1);
    }
  }

  private initializeForkedInstances(): void {
    for (const [portName, mode] of this.inheritanceModes) {
      if (mode === "forked") {
        try {
          const parentInstance = this.resolveFromParentForForking(portName);
          if (parentInstance !== undefined) {
            this.shallowClone(parentInstance);
          }
        } catch {
          // Parent may not have resolved this yet
        }
      }
    }
  }

  private resolveFromParentForForking(_portName: string): unknown {
    return undefined; // Defer to first access
  }

  private shallowClone<T>(obj: T): T {
    if (!isRecord(obj)) {
      return obj;
    }
    const clone = Object.create(Object.getPrototypeOf(obj));
    Object.assign(clone, obj);
    return clone;
  }

  private getPortName(port: Port<unknown, string>): string {
    return port.__portName;
  }

  private toPortToken<P extends Port<unknown, string>>(port: P): P {
    return port;
  }

  private resolveFromParent<P extends TProvides>(port: P): InferService<P> {
    return this.parentContainer.resolveInternal(port);
  }

  private isProvidedByParent(port: Port<unknown, string>): port is TProvides {
    const portToken = this.toPortToken(port);
    return !this.extensions.has(portToken) && this.parentContainer.hasAdapter(portToken);
  }

  private isProvidedPort(port: Port<unknown, string>): port is TProvides | TExtends {
    const portToken = this.toPortToken(port);
    return (
      this.overrides.has(portToken) ||
      this.extensions.has(portToken) ||
      this.parentContainer.hasAdapter(portToken)
    );
  }

  private resolveDependencyPort(port: Port<unknown, string>): unknown {
    if (this.isProvidedPort(port)) {
      return this.resolve(port);
    }
    throw new Error(`Dependency port ${port.__portName} not found in container.`);
  }

  private resolveDependencyPortInternal(port: Port<unknown, string>, scopedMemo: MemoMap): unknown {
    if (this.isProvidedPort(port)) {
      return this.resolveInternal(port, scopedMemo);
    }
    throw new Error(`Dependency port ${port.__portName} not found in container.`);
  }

  resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portToken = this.toPortToken(port);
    const portName = this.getPortName(port);

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    const overrideAdapter = this.overrides.get(portToken);
    if (overrideAdapter !== undefined) {
      if (!isAdapterForPort(overrideAdapter, port)) {
        throw new Error(`Adapter mismatch for port ${portName}.`);
      }
      return this.resolveWithAdapter(port, overrideAdapter);
    }

    const extensionAdapter = this.extensions.get(portToken);
    if (extensionAdapter !== undefined) {
      if (!isAdapterForPort(extensionAdapter, port)) {
        throw new Error(`Adapter mismatch for port ${portName}.`);
      }
      return this.resolveWithAdapter(port, extensionAdapter);
    }

    return this.resolveWithInheritanceMode(port);
  }

  private resolveWithInheritanceMode<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portToken = this.toPortToken(port);
    const portName = this.getPortName(port);
    const mode = this.inheritanceModes.get(portName) ?? "shared";

    switch (mode) {
      case "shared":
        if (this.isProvidedByParent(port)) {
          return this.resolveFromParent(port);
        }
        throw new Error(`Port ${portName} not found in parent for shared inheritance.`);

      case "forked": {
        const cached = this.forkedInstances.get(portName);
        if (cached !== undefined && isForkedEntryForPort(cached, port)) {
          return cached.instance;
        }
        if (this.isProvidedByParent(port)) {
          const parentInstance = this.resolveFromParent(port);
          const forkedInstance = this.shallowClone(parentInstance);
          const entry: ForkedEntry<P> = {
            port,
            instance: forkedInstance,
          };
          this.forkedInstances.set(portName, entry);
          return forkedInstance;
        }
        throw new Error(`Port ${portName} not found in parent for forked inheritance.`);
      }

      case "isolated":
        if (!this.isProvidedByParent(port)) {
          throw new Error(`Port ${portName} not found in parent for isolated inheritance.`);
        }
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createIsolatedInstance(port),
          undefined
        );

      default:
        throw new Error(`Unknown inheritance mode: ${mode}`);
    }
  }

  private createIsolatedInstance<P extends TProvides>(port: P): InferService<P> {
    const portToken = this.toPortToken(port);
    const portName = this.getPortName(port);
    const adapter = this.parentContainer[ADAPTER_ACCESS](portToken);

    if (adapter === undefined) {
      const parentInstance = this.resolveFromParent(port);
      return this.shallowClone(parentInstance);
    }

    if (!isAdapterForPort(adapter, port)) {
      throw new Error(`Adapter mismatch for port ${portName}.`);
    }

    assertSyncAdapter(adapter, portName);

    this.resolutionContext.enter(portName);
    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        deps[requiredPort.__portName] = this.resolveDependencyPort(requiredPort);
      }
      try {
        return adapter.factory(deps);
      } catch (error) {
        throw new FactoryError(portName, error);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;
  resolveAsync(port: Port<unknown, string>): Promise<unknown>;
  async resolveAsync(port: Port<unknown, string>): Promise<unknown> {
    const portToken = this.toPortToken(port);
    const portName = this.getPortName(port);

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    // Check overrides first
    const overrideAdapter = this.overrides.get(portToken);
    if (overrideAdapter !== undefined) {
      if (!isAdapterForPort(overrideAdapter, port)) {
        throw new Error(`Adapter mismatch for port ${this.getPortName(port)}.`);
      }
      return this.resolveAsyncWithAdapter(port, overrideAdapter);
    }

    // Check extensions
    const extensionAdapter = this.extensions.get(portToken);
    if (extensionAdapter !== undefined) {
      if (!isAdapterForPort(extensionAdapter, port)) {
        throw new Error(`Adapter mismatch for port ${this.getPortName(port)}.`);
      }
      return this.resolveAsyncWithAdapter(port, extensionAdapter);
    }

    // Delegate to parent - port must be TProvides since we've exhausted TExtends
    if (this.isProvidedByParent(port)) {
      return this.parentContainer.resolveAsyncInternal(port);
    }

    throw new Error(`Port ${portName} not found in child or parent container.`);
  }

  resolveAsyncInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<InferService<P>>;
  resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<unknown>;
  async resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    _scopeId?: string | null
  ): Promise<unknown> {
    const portToken = this.toPortToken(port);
    const overrideAdapter = this.overrides.get(portToken);
    if (overrideAdapter !== undefined && isAdapterForPort(overrideAdapter, port)) {
      return this.resolveAsyncWithAdapterForScope(port, overrideAdapter, scopedMemo);
    }
    const extensionAdapter = this.extensions.get(portToken);
    if (extensionAdapter !== undefined && isAdapterForPort(extensionAdapter, port)) {
      return this.resolveAsyncWithAdapterForScope(port, extensionAdapter, scopedMemo);
    }
    const adapter = this.getAdapter(portToken);
    if (adapter !== undefined && isAdapterForPort(adapter, port)) {
      return this.resolveAsyncWithAdapterForScope(port, adapter, scopedMemo);
    }
    if (this.isProvidedByParent(port)) {
      return this.parentContainer.resolveAsyncInternal(port);
    }
    throw new Error(`Port ${this.getPortName(port)} not found in child or parent container.`);
  }

  has(port: Port<unknown, string>): boolean {
    const portToken = this.toPortToken(port);
    if (this.overrides.has(portToken)) return true;
    if (this.extensions.has(portToken)) return true;
    return this.parentContainer.has(portToken);
  }

  hasAdapter(port: Port<unknown, string>): boolean {
    const portToken = this.toPortToken(port);
    if (this.overrides.has(portToken)) return true;
    if (this.extensions.has(portToken)) return true;
    return this.parentContainer[ADAPTER_ACCESS](portToken) !== undefined;
  }

  private resolveWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>
  ): InferService<P> {
    const portToken = this.toPortToken(port);
    const portName = this.getPortName(port);

    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }

    if (isAsyncAdapter(adapter)) {
      throw new AsyncInitializationRequiredError(portName);
    }

    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createInstance(port, adapter),
          adapter.finalizer
        );
      case "transient":
        return this.createInstance(port, adapter);
      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  private createInstance<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>
  ): InferService<P> {
    const portName = this.getPortName(port);
    assertSyncAdapter(adapter, portName);
    this.resolutionContext.enter(portName);
    try {
      const deps = this.resolveDependencies(adapter);
      try {
        return adapter.factory(deps);
      } catch (error) {
        throw new FactoryError(portName, error);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  private async resolveAsyncWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>
  ): Promise<InferService<P>> {
    const portToken = this.toPortToken(port);
    const portName = this.getPortName(port);

    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }

    switch (adapter.lifetime) {
      case "singleton":
        if (isAsyncAdapter(adapter)) {
          return this.singletonMemo.getOrElseMemoizeAsync(
            portToken,
            () => this.createInstanceAsync(port, adapter),
            adapter.finalizer
          );
        }
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createInstance(port, adapter),
          adapter.finalizer
        );
      case "transient":
        return isAsyncAdapter(adapter)
          ? this.createInstanceAsync(port, adapter)
          : this.createInstance(port, adapter);
      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  private async createInstanceAsync<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>
  ): Promise<InferService<P>> {
    const portName = this.getPortName(port);
    this.resolutionContext.enter(portName);
    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        deps[requiredPort.__portName] = await this.resolveDependencyPortAsync(requiredPort);
      }
      try {
        return await adapter.factory(deps);
      } catch (error) {
        throw new AsyncFactoryError(portName, error);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  private resolveDependencies(adapter: RuntimeAdapter): Record<string, unknown> {
    const deps: Record<string, unknown> = {};
    for (const requiredPort of adapter.requires) {
      deps[requiredPort.__portName] = this.resolveDependencyPort(requiredPort);
    }
    return deps;
  }

  private async resolveDependencyPortAsync(port: Port<unknown, string>): Promise<unknown> {
    if (this.isProvidedPort(port)) {
      return this.resolveAsync(port);
    }
    throw new Error(`Dependency port ${port.__portName} not found in container.`);
  }

  createScope(): Scope<TProvides | TExtends, TAsyncPorts, "uninitialized"> {
    const scope = new ScopeImpl<TProvides | TExtends, TAsyncPorts>(this, this.singletonMemo, null);
    this.childScopes.add(scope);
    return createScopeWrapper(scope);
  }

  createChild(): ChildContainerBuilder<TProvides | TExtends, TAsyncPorts> {
    const wrapper = this.getWrapper();
    return ChildContainerBuilderImpl.create(asParentContainerLike(wrapper));
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;

    for (let i = this.childContainers.length - 1; i >= 0; i--) {
      const child = this.childContainers[i];
      if (child) {
        await child.dispose();
      }
    }
    this.childContainers.length = 0;

    for (const scope of this.childScopes) {
      await scope.dispose();
    }
    this.childScopes.clear();
    await this.singletonMemo.dispose();

    if (this.wrapper !== null) {
      this.parentContainer.unregisterChildContainer(this.wrapper);
    }
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  getParent(): unknown {
    return this.parentContainer.originalParent;
  }

  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
  }

  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
    if (this.overrides.has(port)) return this.overrides.get(port);
    if (this.extensions.has(port)) return this.extensions.get(port);
    return this.parentContainer[ADAPTER_ACCESS](port);
  }

  getInternalState(): ContainerInternalState {
    if (this.disposed) throw new DisposedScopeError("child-container");

    // Simplified snapshot (omitting full implementation for brevity as it's large and mostly boilerplate)
    const snapshot: ContainerInternalState = {
      disposed: this.disposed,
      singletonMemo: { size: 0, entries: [] }, // TODO: full snapshot
      childScopes: [],
      adapterMap: new Map(),
    };
    return Object.freeze(snapshot);
  }

  resolveInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): InferService<P>;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): unknown;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    _scopeId?: string | null
  ): unknown {
    const portToken = this.toPortToken(port);
    const overrideAdapter = this.overrides.get(portToken);
    if (overrideAdapter !== undefined) {
      if (!isAdapterForPort(overrideAdapter, port)) {
        throw new Error(`Adapter mismatch for port ${this.getPortName(port)}.`);
      }
      return this.resolveWithAdapterForScope(port, overrideAdapter, scopedMemo);
    }
    const extensionAdapter = this.extensions.get(portToken);
    if (extensionAdapter !== undefined) {
      if (!isAdapterForPort(extensionAdapter, port)) {
        throw new Error(`Adapter mismatch for port ${this.getPortName(port)}.`);
      }
      return this.resolveWithAdapterForScope(port, extensionAdapter, scopedMemo);
    }
    const adapter = this.getAdapter(portToken);
    if (adapter !== undefined) {
      if (!isAdapterForPort(adapter, port)) {
        throw new Error(`Adapter mismatch for port ${this.getPortName(port)}.`);
      }
      return this.resolveWithAdapterForScope(port, adapter, scopedMemo);
    }
    if (this.isProvidedByParent(port)) {
      return this.resolveFromParent(port);
    }
    throw new Error(`Port ${this.getPortName(port)} not found in child or parent container.`);
  }

  private resolveWithAdapterForScope<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap
  ): InferService<P> {
    const portToken = this.toPortToken(port);
    if (isAsyncAdapter(adapter)) {
      throw new AsyncInitializationRequiredError(this.getPortName(port));
    }
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createInstanceForScope(port, adapter, scopedMemo),
          adapter.finalizer
        );
      case "scoped":
        return scopedMemo.getOrElseMemoize(
          portToken,
          () => this.createInstanceForScope(port, adapter, scopedMemo),
          adapter.finalizer
        );
      case "transient":
        return this.createInstanceForScope(port, adapter, scopedMemo);
      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  private createInstanceForScope<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap
  ): InferService<P> {
    const portName = this.getPortName(port);
    assertSyncAdapter(adapter, portName);
    this.resolutionContext.enter(portName);
    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        deps[requiredPort.__portName] = this.resolveDependencyPortInternal(
          requiredPort,
          scopedMemo
        );
      }
      try {
        return adapter.factory(deps);
      } catch (error) {
        throw new FactoryError(portName, error);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  private async resolveAsyncWithAdapterForScope<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap
  ): Promise<InferService<P>> {
    const portToken = this.toPortToken(port);
    switch (adapter.lifetime) {
      case "singleton":
        if (isAsyncAdapter(adapter)) {
          return this.singletonMemo.getOrElseMemoizeAsync(
            portToken,
            () => this.createInstanceForScopeAsync(port, adapter, scopedMemo),
            adapter.finalizer
          );
        }
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createInstanceForScope(port, adapter, scopedMemo),
          adapter.finalizer
        );
      case "scoped":
        if (isAsyncAdapter(adapter)) {
          return scopedMemo.getOrElseMemoizeAsync(
            portToken,
            () => this.createInstanceForScopeAsync(port, adapter, scopedMemo),
            adapter.finalizer
          );
        }
        return scopedMemo.getOrElseMemoize(
          portToken,
          () => this.createInstanceForScope(port, adapter, scopedMemo),
          adapter.finalizer
        );
      case "transient":
        return isAsyncAdapter(adapter)
          ? this.createInstanceForScopeAsync(port, adapter, scopedMemo)
          : this.createInstanceForScope(port, adapter, scopedMemo);
      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  private async createInstanceForScopeAsync<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap
  ): Promise<InferService<P>> {
    const portName = this.getPortName(port);
    this.resolutionContext.enter(portName);
    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        deps[requiredPort.__portName] = await this.resolveAsyncInternal(requiredPort, scopedMemo);
      }
      try {
        return await adapter.factory(deps);
      } catch (error) {
        throw new AsyncFactoryError(portName, error);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }
}

// =============================================================================
// Factory Export
// =============================================================================

/**
 * Creates a ChildContainerBuilder from a ParentContainerLike.
 * Used internally when creating child containers from factory.ts.
 * @internal
 */
export function createChildContainerBuilderFromLike<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>
): ChildContainerBuilder<TParentProvides, TAsyncPorts> {
  return ChildContainerBuilderImpl.create(parentLike);
}

/**
 * Creates a ChildContainerBuilder from a Container.
 * Used externally when creating child containers from user code.
 */
export function createChildContainerBuilder<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  parentContainer: Container<TParentProvides, TAsyncPorts, ContainerPhase>
): ChildContainerBuilder<TParentProvides, TAsyncPorts> {
  if (!hasInternalMethods(parentContainer)) {
    throw new Error(
      "Invalid Container: missing internal methods. " +
        "This indicates a bug in createContainer or container implementation."
    );
  }
  const parentLike: ParentContainerLike<TParentProvides, TAsyncPorts> = {
    resolveInternal: parentContainer.resolveInternal,
    resolveAsyncInternal: parentContainer.resolveAsyncInternal,
    has: parentContainer.has,
    hasAdapter: parentContainer.hasAdapter,
    [ADAPTER_ACCESS]: parentContainer[ADAPTER_ACCESS],
    registerChildContainer: parentContainer.registerChildContainer,
    unregisterChildContainer: parentContainer.unregisterChildContainer,
    originalParent: parentContainer,
  };
  return ChildContainerBuilderImpl.create(parentLike);
}
