/**
 * Container builder for creating child containers.
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { InferAdapterProvides } from "@hex-di/graph";
import type {
  ContainerBuilder,
  Container,
  InheritanceMode,
  OverrideResult,
  ExtendResult,
  InheritanceModeConfig,
} from "../types.js";
import type {
  ParentContainerLike,
  RuntimeAdapter,
  RuntimeAdapterFor,
  ChildContainerConfig,
} from "./internal-types.js";
import {
  isAdapterProvidedByParent,
  isAdapterProvidedByParentOrExtensions,
  isInheritanceMode,
} from "./helpers.js";
import { ContainerImpl } from "./impl.js";
import { createChildContainerWrapper } from "./wrappers.js";

/**
 * Builder for creating child containers with overrides and extensions.
 * @internal
 */
export class ContainerBuilderImpl<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TExtends extends Port<unknown, string> = never,
> implements ContainerBuilder<TParentProvides, TAsyncPorts, TExtends> {
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
  ): ContainerBuilder<TParentProvides, TAsyncPorts, never> {
    return new ContainerBuilderImpl(parentContainer, new Map(), new Map(), new Map());
  }

  override<P extends Port<unknown, string>, A extends RuntimeAdapterFor<P>>(
    adapter: A
  ): OverrideResult<TParentProvides, TExtends, TAsyncPorts, A> {
    if (!isAdapterProvidedByParent(this.parentContainer, adapter)) {
      return this;
    }
    const newOverrides = new Map(this.overrides);
    newOverrides.set(adapter.provides, adapter);
    return new ContainerBuilderImpl(
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
      return new ContainerBuilderImpl<
        TParentProvides,
        TAsyncPorts,
        TExtends | InferAdapterProvides<A>
      >(this.parentContainer, this.overrides, this.extensions, this.inheritanceModes);
    }
    const newExtensions = new Map(this.extensions);
    newExtensions.set(adapter.provides, adapter);
    return new ContainerBuilderImpl<
      TParentProvides,
      TAsyncPorts,
      TExtends | InferAdapterProvides<A>
    >(this.parentContainer, this.overrides, newExtensions, this.inheritanceModes);
  }

  withInheritanceMode<TConfig extends InheritanceModeConfig<TParentProvides>>(
    config: TConfig
  ): ContainerBuilder<TParentProvides, TAsyncPorts, TExtends> {
    const newModes = new Map(this.inheritanceModes);
    for (const [portName, mode] of Object.entries(config)) {
      if (isInheritanceMode(mode)) {
        newModes.set(portName, mode);
      }
    }
    return new ContainerBuilderImpl(
      this.parentContainer,
      this.overrides,
      this.extensions,
      newModes
    );
  }

  build(): Container<TParentProvides, TExtends, TAsyncPorts> {
    const config: ChildContainerConfig<TParentProvides, TAsyncPorts> = {
      kind: "child",
      parent: this.parentContainer,
      overrides: this.overrides,
      extensions: this.extensions,
      inheritanceModes: this.inheritanceModes,
    };
    const impl = new ContainerImpl<TParentProvides, TExtends, TAsyncPorts>(config);
    return createChildContainerWrapper(impl);
  }
}

/**
 * Creates a ContainerBuilder from a ParentContainerLike.
 * Used internally when creating child containers from factory.ts.
 * @internal
 */
export function createContainerBuilderFromLike<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  parentLike: ParentContainerLike<TParentProvides, TAsyncPorts>
): ContainerBuilder<TParentProvides, TAsyncPorts> {
  return ContainerBuilderImpl.create(parentLike);
}
