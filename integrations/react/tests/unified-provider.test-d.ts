/**
 * Type-level tests for Unified Provider Design
 *
 * These tests verify compile-time type safety for:
 * 1. ContainerProvider discriminated union props
 * 2. AsyncContainerProvider discriminated union props
 * 3. inheritanceModes key validation
 * 4. Override exclusion from inheritance keys
 * 5. Factory pattern type inference
 *
 * @packageDocumentation
 */

import { expectTypeOf, describe, it } from "vitest";
import type { Port } from "@hex-di/core";
import type { Container, InheritanceMode } from "@hex-di/runtime";
import type { Graph } from "@hex-di/graph";
import type {
  ExtractPortNames,
  ValidatedInheritanceModes,
  ContainerProviderContainerProps,
  ContainerProviderGraphProps,
  ChildTypedReactIntegration,
  TypedContainerProviderComponent,
  TypedAsyncContainerProviderComponent,
  StrictInheritanceModeConfig,
  ExtendedTypedReactIntegration,
} from "../src/types/unified.js";
import type { TypedReactIntegration, Resolver } from "../src/types/index.js";

// =============================================================================
// Test Setup: Port Definitions
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface Config {
  get(key: string): string;
}

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface Analytics {
  track(event: string): void;
}

// Port type aliases for type testing (no runtime values needed)
type LoggerPortType = Port<Logger, "Logger">;
type DatabasePortType = Port<Database, "Database">;
type ConfigPortType = Port<Config, "Config">;
type CachePortType = Port<Cache, "Cache">;
type AnalyticsPortType = Port<Analytics, "Analytics">;

// =============================================================================
// Test Setup: Graph Definitions
// =============================================================================

// Parent provides Logger, Database, Config
type ParentPorts = LoggerPortType | DatabasePortType | ConfigPortType;

// Child graph type: overrides Logger, adds Cache
type ChildGraphType = Graph<
  LoggerPortType | CachePortType, // provides (Logger override + Cache extension)
  never, // async ports
  LoggerPortType // overrides (Logger is an override)
>;

// Async child graph type: overrides Database, adds Analytics (async)
type _AsyncChildGraphType = Graph<
  DatabasePortType | AnalyticsPortType, // provides
  AnalyticsPortType, // async ports
  DatabasePortType // overrides
>;

// =============================================================================
// Test 1: ExtractPortNames
// =============================================================================

describe("ExtractPortNames", () => {
  it("extracts single port name", () => {
    type Result = ExtractPortNames<LoggerPortType>;
    expectTypeOf<Result>().toEqualTypeOf<"Logger">();
  });

  it("extracts union of port names", () => {
    type Result = ExtractPortNames<ParentPorts>;
    expectTypeOf<Result>().toEqualTypeOf<"Logger" | "Database" | "Config">();
  });

  it("returns never for non-port types", () => {
    type Result = ExtractPortNames<never>;
    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Test 2: ValidatedInheritanceModes
// =============================================================================

describe("ValidatedInheritanceModes", () => {
  it("includes all parent ports when no overrides", () => {
    type Result = ValidatedInheritanceModes<ParentPorts, never>;
    // All parent ports should be valid keys
    expectTypeOf<Result>().toMatchTypeOf<{
      Logger?: InheritanceMode;
      Database?: InheritanceMode;
      Config?: InheritanceMode;
    }>();
  });

  it("excludes overridden ports", () => {
    type Overrides = LoggerPortType;
    type Result = ValidatedInheritanceModes<ParentPorts, Overrides>;

    // Logger should NOT be a valid key (it's overridden)
    // Only Database and Config should be valid
    expectTypeOf<Result>().toMatchTypeOf<{
      Database?: InheritanceMode;
      Config?: InheritanceMode;
    }>();

    // Verify Logger is excluded
    type Keys = keyof Result;
    expectTypeOf<Keys>().toEqualTypeOf<"Database" | "Config">();
  });

  it("handles multiple overrides", () => {
    type Overrides = LoggerPortType | ConfigPortType;
    type Result = ValidatedInheritanceModes<ParentPorts, Overrides>;

    // Only Database should be valid
    type Keys = keyof Result;
    expectTypeOf<Keys>().toEqualTypeOf<"Database">();
  });

  it("returns empty when all ports overridden", () => {
    type Result = ValidatedInheritanceModes<ParentPorts, ParentPorts>;

    // No keys should be valid
    type Keys = keyof Result;
    expectTypeOf<Keys>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Test 3: ContainerProviderContainerProps
// =============================================================================

describe("ContainerProviderContainerProps", () => {
  it("requires container prop", () => {
    type Props = ContainerProviderContainerProps<ParentPorts>;

    expectTypeOf<Props["container"]>().toEqualTypeOf<Container<ParentPorts>>();
  });

  it("disallows graph prop (is undefined)", () => {
    type Props = ContainerProviderContainerProps<ParentPorts>;

    // graph should be never | undefined which resolves to undefined
    type GraphProp = Props["graph"];
    expectTypeOf<GraphProp>().toEqualTypeOf<undefined>();
  });

  it("disallows inheritanceModes (is undefined)", () => {
    type Props = ContainerProviderContainerProps<ParentPorts>;

    // inheritanceModes should be never | undefined which resolves to undefined
    type InheritanceProp = Props["inheritanceModes"];
    expectTypeOf<InheritanceProp>().toEqualTypeOf<undefined>();
  });
});

// =============================================================================
// Test 4: ContainerProviderGraphProps
// =============================================================================

describe("ContainerProviderGraphProps", () => {
  type Props = ContainerProviderGraphProps<ParentPorts, ChildGraphType>;

  it("requires graph prop", () => {
    expectTypeOf<Props["graph"]>().toEqualTypeOf<ChildGraphType>();
  });

  it("disallows container prop (is undefined)", () => {
    type ContainerProp = Props["container"];
    expectTypeOf<ContainerProp>().toEqualTypeOf<undefined>();
  });

  it("validates inheritanceModes against parent minus overrides", () => {
    // ChildGraph overrides Logger, so only Database and Config are valid keys
    type InheritanceConfig = NonNullable<Props["inheritanceModes"]>;

    // Keys should be Database | Config (Logger excluded)
    type Keys = keyof InheritanceConfig;
    expectTypeOf<Keys>().toEqualTypeOf<"Database" | "Config">();
  });
});

// =============================================================================
// Test 5: TypedContainerProviderComponent Function Overloads
// =============================================================================

describe("TypedContainerProviderComponent", () => {
  it("is a function type", () => {
    type Component = TypedContainerProviderComponent<ParentPorts>;
    expectTypeOf<Component>().toBeFunction();
  });

  it("first overload accepts container props", () => {
    type Component = TypedContainerProviderComponent<ParentPorts>;

    // First parameter type should be compatible with container props
    type FirstParam = Parameters<Component>[0];
    expectTypeOf<FirstParam>().toHaveProperty("children");
  });
});

// =============================================================================
// Test 6: ChildTypedReactIntegration
// =============================================================================

describe("ChildTypedReactIntegration", () => {
  type ChildIntegration = ChildTypedReactIntegration<ParentPorts, ChildGraphType>;

  it("has ContainerProvider component", () => {
    // ContainerProvider should exist
    type ContainerProvider = ChildIntegration["ContainerProvider"];
    expectTypeOf<ContainerProvider>().toBeFunction();
  });

  it("validates inheritanceModes in ContainerProvider props", () => {
    // Get the props type for the ContainerProvider
    type ContainerProvider = ChildIntegration["ContainerProvider"];
    type Props = Parameters<ContainerProvider>[0];

    // inheritanceModes should only accept Database and Config (Logger is overridden)
    type InheritanceConfig = NonNullable<Props["inheritanceModes"]>;
    type Keys = keyof InheritanceConfig;
    expectTypeOf<Keys>().toEqualTypeOf<"Database" | "Config">();
  });

  it("captures the graph", () => {
    type GraphType = ChildIntegration["graph"];
    expectTypeOf<GraphType>().toEqualTypeOf<ChildGraphType>();
  });
});

// =============================================================================
// Test 7: ExtendedTypedReactIntegration with createChildHooks
// =============================================================================

describe("ExtendedTypedReactIntegration.createChildHooks", () => {
  it("createChildHooks is a function", () => {
    type DI = ExtendedTypedReactIntegration<ParentPorts>;
    type CreateChildHooks = DI["createChildHooks"];

    // Should be a function that takes a graph
    expectTypeOf<CreateChildHooks>().toBeFunction();
  });

  it("createChildHooks returns integration with ContainerProvider", () => {
    type DI = ExtendedTypedReactIntegration<ParentPorts>;
    type CreateChildHooks = DI["createChildHooks"];

    // Get the return type when called with ChildGraphType
    type ChildDI = ReturnType<CreateChildHooks>;

    // Should have ContainerProvider
    expectTypeOf<ChildDI>().toHaveProperty("ContainerProvider");
    expectTypeOf<ChildDI>().toHaveProperty("graph");
  });
});

// =============================================================================
// Test 8: AsyncContainerProvider
// =============================================================================

describe("TypedAsyncContainerProviderComponent", () => {
  type AsyncProvider = TypedAsyncContainerProviderComponent<ParentPorts>;

  it("is callable", () => {
    expectTypeOf<AsyncProvider>().toBeFunction();
  });

  it("has Loading compound component", () => {
    expectTypeOf<AsyncProvider>().toHaveProperty("Loading");
  });

  it("has Error compound component", () => {
    expectTypeOf<AsyncProvider>().toHaveProperty("Error");
  });

  it("has Ready compound component", () => {
    expectTypeOf<AsyncProvider>().toHaveProperty("Ready");
  });
});

// =============================================================================
// Test 9: StrictInheritanceModeConfig
// =============================================================================

describe("StrictInheritanceModeConfig", () => {
  it("only allows valid keys from parent minus overrides", () => {
    type ValidConfig = StrictInheritanceModeConfig<ParentPorts, LoggerPortType>;

    // Keys should be Database | Config (Logger excluded)
    type Keys = keyof ValidConfig;
    expectTypeOf<Keys>().toEqualTypeOf<"Database" | "Config">();
  });

  it("allows valid inheritance mode values", () => {
    type ValidConfig = StrictInheritanceModeConfig<ParentPorts, LoggerPortType>;

    // Values should be InheritanceMode | undefined
    type Values = ValidConfig[keyof ValidConfig];
    expectTypeOf<Values>().toEqualTypeOf<InheritanceMode | undefined>();
  });
});

// =============================================================================
// Test 10: Resolver Type
// =============================================================================

describe("Resolver", () => {
  type AppResolver = Resolver<ParentPorts>;

  it("has resolve method", () => {
    expectTypeOf<AppResolver>().toHaveProperty("resolve");
  });

  it("has resolveAsync method", () => {
    expectTypeOf<AppResolver>().toHaveProperty("resolveAsync");
  });

  it("has createScope method", () => {
    expectTypeOf<AppResolver>().toHaveProperty("createScope");
  });

  it("has dispose method", () => {
    expectTypeOf<AppResolver>().toHaveProperty("dispose");
  });

  it("has isDisposed property", () => {
    type IsDisposed = AppResolver["isDisposed"];
    expectTypeOf<IsDisposed>().toEqualTypeOf<boolean>();
  });
});

// =============================================================================
// Test 11: Complete TypedReactIntegration Shape
// =============================================================================

describe("TypedReactIntegration shape", () => {
  type DI = TypedReactIntegration<ParentPorts>;

  it("has ContainerProvider", () => {
    expectTypeOf<DI>().toHaveProperty("ContainerProvider");
  });

  it("has ScopeProvider", () => {
    type ScopeProvider = DI["ScopeProvider"];
    expectTypeOf<ScopeProvider>().toBeFunction();
  });

  it("has AutoScopeProvider", () => {
    type AutoScopeProvider = DI["AutoScopeProvider"];
    expectTypeOf<AutoScopeProvider>().toBeFunction();
  });

  it("has AsyncContainerProvider", () => {
    expectTypeOf<DI>().toHaveProperty("AsyncContainerProvider");
  });

  it("has usePort", () => {
    type UsePort = DI["usePort"];
    expectTypeOf<UsePort>().toBeFunction();
  });

  it("has usePortOptional", () => {
    type UsePortOptional = DI["usePortOptional"];
    expectTypeOf<UsePortOptional>().toBeFunction();
  });

  it("has useContainer", () => {
    type UseContainer = DI["useContainer"];
    expectTypeOf<UseContainer>().toBeFunction();
  });

  it("has useScope", () => {
    type UseScope = DI["useScope"];
    expectTypeOf<UseScope>().toBeFunction();
  });

  // Note: createChildHooks is part of ExtendedTypedReactIntegration, not TypedReactIntegration
  // See ExtendedTypedReactIntegration.createChildHooks tests above
});
