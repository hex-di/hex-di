import type { Port, InferService } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "@hex-di/graph";
import type { MemoMap } from "../common/memo-map.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

import type { InheritanceMode } from "../types.js";

/**
 * Internal type for inheritance mode map.
 * Maps port names to their inheritance modes.
 * @internal
 */
export type InheritanceModeMap = ReadonlyMap<string, InheritanceMode>;

/**
 * Internal adapter type with runtime-accessible properties.
 * @internal
 */
export type RuntimeAdapter = Adapter<
  Port<unknown, string>,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind
>;

/**
 * Interface for accessing adapters via ADAPTER_ACCESS symbol.
 * Used for type-safe access to parent container's adapter map.
 * @internal
 */
export interface AdapterAccessor {
  readonly [ADAPTER_ACCESS]: (port: Port<unknown, string>) => RuntimeAdapter | undefined;
}

/**
 * Interface for child container registration/unregistration.
 * Used for cascade disposal tracking.
 * @internal
 */
export interface ChildContainerRegistry {
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
}

/**
 * Combined internal interface for containers/child containers that includes
 * both public methods and internal symbol-accessed methods.
 *
 * This type allows accessing internal methods without casting by explicitly
 * declaring all the properties that exist on the wrapper objects.
 *
 * @internal
 */
export interface InternalResolveAccess<TProvides extends Port<unknown, string>> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
}

/**
 * Internal methods shared by Container and ChildContainer wrappers.
 * Used for child container creation, inspection, and disposal tracking.
 * @internal
 */
export interface InternalContainerMethods<TProvides extends Port<unknown, string>>
  extends AdapterAccessor, ChildContainerRegistry, InternalResolveAccess<TProvides> {
  hasAdapter(port: Port<unknown, string>): boolean;
}

export interface ContainerWithInternals<
  TProvides extends Port<unknown, string>,
> extends InternalContainerMethods<TProvides> {
  resolve(port: TProvides): unknown;
  resolveAsync(port: TProvides): Promise<unknown>;
  has(port: Port<unknown, string>): boolean;
}

/**
 * Minimal interface for disposable children (containers).
 * @internal
 */
export interface DisposableChild {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

/**
 * Parent container type that can be either a root Container or a ChildContainer.
 * This structural type captures what we need from both Container and ChildContainer
 * without requiring type casts.
 *
 * Note: The resolve signature uses a callable type instead of a method signature
 * to avoid contravariance issues with Container/ChildContainer's phase-conditional
 * resolve signatures. At runtime, we know the resolve function works correctly.
 *
 * @internal
 */
export interface ParentContainerLike<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string>,
>
  extends AdapterAccessor, ChildContainerRegistry, InternalResolveAccess<TProvides> {
  // Reference to the original container/wrapper for the `parent` property.
  // This is the object users see when accessing child.parent.
  // Type-erased due to Container/ChildContainer contravariant method signatures.
  // Narrowed via type guard at getParent() return.
  originalParent: unknown;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}

/**
 * Interface for the methods ScopeImpl needs from ChildContainerImpl.
 * Using an interface allows proper type variance.
 * @internal
 */
export interface ScopeContainerAccess<TProvides extends Port<unknown, string>> {
  resolveInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): InferService<P>;
  resolveAsyncInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<InferService<P>>;
  getSingletonMemo(): MemoMap;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}
