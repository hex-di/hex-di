/**
 * Type-level tests for LazyContainerProvider.
 *
 * These tests verify compile-time type safety for:
 * 1. LazyContainerProviderProps accepts correct LazyContainer types
 * 2. LazyContainerStatus is the correct union
 * 3. UseLazyContainerStateResult has correct shape
 * 4. LazyContainer type is re-exported correctly
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import type { ReactNode } from "react";
import type { Port } from "@hex-di/core";
import type { LazyContainer } from "@hex-di/runtime";
import type {
  LazyContainerProviderProps,
  LazyContainerLoadingProps,
  LazyContainerErrorProps,
  LazyContainerReadyProps,
  LazyContainerProviderComponent,
  LazyContainerStatus,
  UseLazyContainerStateResult,
} from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface PluginService {
  run(): void;
}

// =============================================================================
// Test Port Types
// =============================================================================

type LoggerPortType = Port<Logger, "Logger">;
type DatabasePortType = Port<Database, "Database">;
type PluginServicePortType = Port<PluginService, "PluginService">;

type ParentPorts = LoggerPortType | DatabasePortType;
type PluginPorts = PluginServicePortType;

// =============================================================================
// LazyContainerProviderProps Tests
// =============================================================================

describe("LazyContainerProviderProps", () => {
  it("accepts LazyContainer with matching type parameters", () => {
    type Props = LazyContainerProviderProps<ParentPorts, PluginPorts, never>;

    // Should have lazyContainer property
    expectTypeOf<Props["lazyContainer"]>().toEqualTypeOf<
      LazyContainer<ParentPorts, PluginPorts, never>
    >();

    // Should have children property
    expectTypeOf<Props["children"]>().toEqualTypeOf<ReactNode>();

    // Should have optional autoLoad property
    expectTypeOf<Props["autoLoad"]>().toEqualTypeOf<boolean | undefined>();

    // Should have optional loadingFallback property
    expectTypeOf<Props["loadingFallback"]>().toEqualTypeOf<ReactNode | undefined>();

    // Should have optional errorFallback property
    expectTypeOf<Props["errorFallback"]>().toEqualTypeOf<
      ((error: Error) => ReactNode) | undefined
    >();
  });

  it("defaults TExtends and TAsyncPorts to never", () => {
    type Props = LazyContainerProviderProps<ParentPorts>;

    expectTypeOf<Props["lazyContainer"]>().toEqualTypeOf<
      LazyContainer<ParentPorts, never, never>
    >();
  });

  it("accepts LazyContainer with async ports", () => {
    type Props = LazyContainerProviderProps<ParentPorts, PluginPorts, DatabasePortType>;

    expectTypeOf<Props["lazyContainer"]>().toEqualTypeOf<
      LazyContainer<ParentPorts, PluginPorts, DatabasePortType>
    >();
  });
});

// =============================================================================
// Compound Component Props Tests
// =============================================================================

describe("LazyContainerProvider compound component props", () => {
  it("Loading accepts children", () => {
    expectTypeOf<LazyContainerLoadingProps["children"]>().toEqualTypeOf<ReactNode>();
  });

  it("Error accepts children or render function", () => {
    type ChildrenType = LazyContainerErrorProps["children"];

    // Should accept ReactNode or (error: Error) => ReactNode
    expectTypeOf<ChildrenType>().toEqualTypeOf<ReactNode | ((error: Error) => ReactNode)>();
  });

  it("Ready accepts children", () => {
    expectTypeOf<LazyContainerReadyProps["children"]>().toEqualTypeOf<ReactNode>();
  });
});

// =============================================================================
// LazyContainerProviderComponent Tests
// =============================================================================

describe("LazyContainerProviderComponent", () => {
  it("is callable", () => {
    type Component = LazyContainerProviderComponent<ParentPorts, PluginPorts>;
    expectTypeOf<Component>().toBeFunction();
  });

  it("has Loading compound component", () => {
    type Component = LazyContainerProviderComponent<ParentPorts, PluginPorts>;
    expectTypeOf<Component>().toHaveProperty("Loading");
  });

  it("has Error compound component", () => {
    type Component = LazyContainerProviderComponent<ParentPorts, PluginPorts>;
    expectTypeOf<Component>().toHaveProperty("Error");
  });

  it("has Ready compound component", () => {
    type Component = LazyContainerProviderComponent<ParentPorts, PluginPorts>;
    expectTypeOf<Component>().toHaveProperty("Ready");
  });
});

// =============================================================================
// LazyContainerStatus Tests
// =============================================================================

describe("LazyContainerStatus", () => {
  it("is union of status strings", () => {
    expectTypeOf<LazyContainerStatus>().toEqualTypeOf<"pending" | "loading" | "ready" | "error">();
  });

  it("includes pending for manual loading", () => {
    const status: LazyContainerStatus = "pending";
    expectTypeOf(status).toMatchTypeOf<LazyContainerStatus>();
  });
});

// =============================================================================
// UseLazyContainerStateResult Tests
// =============================================================================

describe("UseLazyContainerStateResult", () => {
  it("has status property", () => {
    expectTypeOf<UseLazyContainerStateResult["status"]>().toEqualTypeOf<LazyContainerStatus>();
  });

  it("has isLoaded boolean", () => {
    expectTypeOf<UseLazyContainerStateResult["isLoaded"]>().toEqualTypeOf<boolean>();
  });

  it("has isLoading boolean", () => {
    expectTypeOf<UseLazyContainerStateResult["isLoading"]>().toEqualTypeOf<boolean>();
  });

  it("has isPending boolean", () => {
    expectTypeOf<UseLazyContainerStateResult["isPending"]>().toEqualTypeOf<boolean>();
  });

  it("has error property", () => {
    expectTypeOf<UseLazyContainerStateResult["error"]>().toEqualTypeOf<Error | null>();
  });

  it("has load function", () => {
    expectTypeOf<UseLazyContainerStateResult["load"]>().toEqualTypeOf<() => void>();
  });
});

// =============================================================================
// LazyContainer Re-export Tests
// =============================================================================

describe("LazyContainer type re-export", () => {
  it("LazyContainer is exported from @hex-di/react", () => {
    // Import from our package
    type LazyContainerFromReact = import("../src/index.js").LazyContainer<
      ParentPorts,
      PluginPorts,
      never
    >;

    // Should match the runtime type
    expectTypeOf<LazyContainerFromReact>().toEqualTypeOf<
      LazyContainer<ParentPorts, PluginPorts, never>
    >();
  });
});
