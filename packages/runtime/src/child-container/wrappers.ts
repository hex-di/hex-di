import type { Port, InferService } from "@hex-di/ports";
import type { ChildContainer, Scope } from "../types.js";
import { ChildContainerBrand, ScopeBrand } from "../types.js";
import type { ParentContainerLike, InternalContainerMethods } from "./internal-types.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "../inspector/symbols.js";
import { ScopeImpl } from "../scope/impl.js";
import type { ChildContainerImpl } from "./impl.js"; // Forward reference, type-only
import { isRecord } from "../common/type-guards.js";
import { unreachable } from "../common/unreachable.js";

/**
 * Type guard to check if a value has internal container methods.
 * @internal
 */
export function hasInternalMethods(
  value: unknown
): value is InternalContainerMethods<Port<unknown, string>> {
  if (!isRecord(value)) {
    return false;
  }
  return (
    ADAPTER_ACCESS in value &&
    typeof value[ADAPTER_ACCESS] === "function" &&
    "registerChildContainer" in value &&
    typeof value["registerChildContainer"] === "function" &&
    "unregisterChildContainer" in value &&
    typeof value["unregisterChildContainer"] === "function" &&
    "resolveInternal" in value &&
    typeof value["resolveInternal"] === "function" &&
    "resolveAsyncInternal" in value &&
    typeof value["resolveAsyncInternal"] === "function" &&
    "hasAdapter" in value &&
    typeof value["hasAdapter"] === "function"
  );
}

function isChildContainerParent<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(value: unknown): value is ChildContainer<TProvides, TExtends, TAsyncPorts>["parent"] {
  if (!isRecord(value)) {
    return false;
  }
  return (
    "resolve" in value &&
    typeof value["resolve"] === "function" &&
    "resolveAsync" in value &&
    typeof value["resolveAsync"] === "function" &&
    "createScope" in value &&
    typeof value["createScope"] === "function" &&
    "dispose" in value &&
    typeof value["dispose"] === "function" &&
    "has" in value &&
    typeof value["has"] === "function" &&
    "isDisposed" in value
  );
}

/**
 * Extracts a ParentContainerLike from a ChildContainer wrapper.
 * @internal
 */
export function asParentContainerLike<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  wrapper: ChildContainer<TProvides, TExtends, TAsyncPorts>
): ParentContainerLike<TProvides | TExtends, TAsyncPorts> {
  if (!hasInternalMethods(wrapper)) {
    throw new Error(
      "Invalid ChildContainer wrapper: missing internal methods. " +
        "This indicates a bug in createChildContainerWrapper."
    );
  }
  return {
    resolveInternal: <P extends TProvides | TExtends>(port: P): InferService<P> =>
      wrapper.resolveInternal(port),
    resolveAsyncInternal: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      wrapper.resolveAsyncInternal(port),
    [ADAPTER_ACCESS]: wrapper[ADAPTER_ACCESS],
    registerChildContainer: wrapper.registerChildContainer,
    unregisterChildContainer: wrapper.unregisterChildContainer,
    originalParent: wrapper,
    has: (port: Port<unknown, string>): boolean => wrapper.has(port),
    hasAdapter: (port: Port<unknown, string>): boolean => wrapper.hasAdapter(port),
  };
}

/**
 * Creates a frozen ChildContainer wrapper.
 */
export function createChildContainerWrapper<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>
): ChildContainer<TProvides, TExtends, TAsyncPorts> {
  type ChildContainerInternals = ChildContainer<TProvides, TExtends, TAsyncPorts> &
    InternalContainerMethods<TProvides | TExtends>;

  function resolve<P extends Exclude<TProvides | TExtends, TAsyncPorts>>(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const childContainer: ChildContainerInternals = {
    resolve,
    resolveAsync: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    resolveInternal: <P extends TProvides | TExtends>(port: P): InferService<P> =>
      impl.resolve(port),
    resolveAsyncInternal: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> =>
      impl.resolveAsync(port),
    has: port => impl.has(port),
    hasAdapter: port => impl.hasAdapter(port),
    createScope: () => impl.createScope(),
    createChild: () => impl.createChild(),
    dispose: () => impl.dispose(),
    get isDisposed() {
      return impl.isDisposed;
    },
    get parent() {
      const parent = impl.getParent();
      if (!isChildContainerParent<TProvides, TExtends, TAsyncPorts>(parent)) {
        throw new Error("Invalid child container parent reference.");
      }
      return parent;
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: port => impl.getAdapter(port),
    registerChildContainer: child => impl.registerChildContainer(child),
    unregisterChildContainer: child => impl.unregisterChildContainer(child),
    get [ChildContainerBrand]() {
      return unreachable<{ provides: TProvides; extends: TExtends }>(
        "ChildContainer brand is type-only"
      );
    },
  };

  impl.setWrapper(childContainer);
  Object.freeze(childContainer);
  return childContainer;
}

/**
 * Creates a frozen Scope wrapper for child container scopes.
 */
export function createScopeWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>(impl: ScopeImpl<TProvides, TAsyncPorts, TPhase>): Scope<TProvides, TAsyncPorts, TPhase> {
  function resolve<
    P extends TPhase extends "initialized" ? TProvides : Exclude<TProvides, TAsyncPorts>,
  >(port: P): InferService<P> {
    return impl.resolve(port);
  }

  const scope: Scope<TProvides, TAsyncPorts, TPhase> = {
    resolve,
    resolveAsync: port => impl.resolveAsync(port),
    createScope: () => impl.createScope(),
    dispose: () => impl.dispose(),
    get isDisposed() {
      return impl.isDisposed;
    },
    has: port => impl.has(port),
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    get [ScopeBrand]() {
      return unreachable<{ provides: TProvides }>("Scope brand is type-only");
    },
  };
  Object.freeze(scope);
  return scope;
}
