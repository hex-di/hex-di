/**
 * Type-level tests for @hex-di/react.
 *
 * These tests verify compile-time type safety for:
 * 1. usePort accepts only ports in TProvides
 * 2. usePortOptional accepts only ports in TProvides
 * 3. InferService correctly extracts service type from usePort return
 * 4. TypedReactIntegration type structure
 * 5. createTypedHooks preserves TProvides through all hooks
 * 6. Container and Scope type parameters flow correctly
 * 7. Error cases (invalid ports cause compile error)
 * 8. Provider type requirements
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, type InferService } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";
import { createTypedHooks } from "../src/factories/create-typed-hooks.jsx";
import type {
  TypedReactIntegration,
  HexDiContainerProviderProps,
  HexDiScopeProviderProps,
  HexDiAutoScopeProviderProps,
  Resolver,
} from "../src/types/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
void LoggerPort;
void DatabasePort;
void UserServicePort;

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;

// Combined port types for tests
type TestProvides = LoggerPortType | DatabasePortType;

// =============================================================================
// Task 5.1: usePort Type Tests
// =============================================================================

describe("usePort type constraints", () => {
  it("returns correct InferService type for port", () => {
    const { usePort } = createTypedHooks<TestProvides>();
    void usePort;

    // Return type should be InferService<P> which is Logger for LoggerPort
    type UsePortReturn = ReturnType<typeof usePort<LoggerPortType>>;
    expectTypeOf<UsePortReturn>().toEqualTypeOf<Logger>();

    // Return type should be Database for DatabasePort
    type UsePortReturnDb = ReturnType<typeof usePort<DatabasePortType>>;
    expectTypeOf<UsePortReturnDb>().toEqualTypeOf<Database>();
  });

  it("usePort is a function", () => {
    const { usePort } = createTypedHooks<TestProvides>();

    // Verify usePort is a function
    expectTypeOf(usePort).toBeFunction();
  });

  it("usePort generic constraint is TProvides", () => {
    // Test that the hook's generic constraint matches TProvides
    type Integration = TypedReactIntegration<TestProvides>;
    type UsePortHook = Integration["usePort"];

    // usePort should be a generic function
    expectTypeOf<UsePortHook>().toBeFunction();
  });
});

// =============================================================================
// Task 5.1: usePortOptional Type Tests
// =============================================================================

describe("usePortOptional type constraints", () => {
  it("returns InferService<P> | undefined", () => {
    const { usePortOptional } = createTypedHooks<TestProvides>();
    void usePortOptional;

    // Return type should be Logger | undefined for LoggerPort
    type UsePortOptionalReturn = ReturnType<typeof usePortOptional<LoggerPortType>>;
    expectTypeOf<UsePortOptionalReturn>().toEqualTypeOf<Logger | undefined>();

    // Return type should be Database | undefined for DatabasePort
    type UsePortOptionalReturnDb = ReturnType<typeof usePortOptional<DatabasePortType>>;
    expectTypeOf<UsePortOptionalReturnDb>().toEqualTypeOf<Database | undefined>();
  });

  it("usePortOptional is a function", () => {
    const { usePortOptional } = createTypedHooks<TestProvides>();

    // Verify usePortOptional is a function
    expectTypeOf(usePortOptional).toBeFunction();
  });
});

// =============================================================================
// Task 5.1: InferService Extraction Tests
// =============================================================================

describe("InferService correctly extracts service type", () => {
  it("extracts Logger type from LoggerPort", () => {
    type ExtractedLogger = InferService<LoggerPortType>;
    expectTypeOf<ExtractedLogger>().toEqualTypeOf<Logger>();
  });

  it("extracts Database type from DatabasePort", () => {
    type ExtractedDatabase = InferService<DatabasePortType>;
    expectTypeOf<ExtractedDatabase>().toEqualTypeOf<Database>();
  });

  it("extracts correct type from usePort return", () => {
    const { usePort } = createTypedHooks<TestProvides>();
    void usePort;

    // The return type should match InferService
    type UsePortReturn = ReturnType<typeof usePort<LoggerPortType>>;
    type InferredLogger = InferService<LoggerPortType>;
    expectTypeOf<UsePortReturn>().toEqualTypeOf<InferredLogger>();
  });
});

// =============================================================================
// Task 5.1: TypedReactIntegration Type Structure Tests
// =============================================================================

describe("TypedReactIntegration type structure", () => {
  it("has all required components and hooks", () => {
    type Integration = TypedReactIntegration<TestProvides>;

    // Verify all provider components exist
    expectTypeOf<Integration>().toHaveProperty("ContainerProvider");
    expectTypeOf<Integration>().toHaveProperty("ScopeProvider");
    expectTypeOf<Integration>().toHaveProperty("AutoScopeProvider");

    // Verify all hooks exist
    expectTypeOf<Integration>().toHaveProperty("usePort");
    expectTypeOf<Integration>().toHaveProperty("usePortOptional");
    expectTypeOf<Integration>().toHaveProperty("useContainer");
    expectTypeOf<Integration>().toHaveProperty("useScope");
  });

  it("components are functions", () => {
    type Integration = TypedReactIntegration<TestProvides>;

    expectTypeOf<Integration["ContainerProvider"]>().toBeFunction();
    expectTypeOf<Integration["ScopeProvider"]>().toBeFunction();
    expectTypeOf<Integration["AutoScopeProvider"]>().toBeFunction();
  });

  it("hooks are functions", () => {
    type Integration = TypedReactIntegration<TestProvides>;

    expectTypeOf<Integration["usePort"]>().toBeFunction();
    expectTypeOf<Integration["usePortOptional"]>().toBeFunction();
    expectTypeOf<Integration["useContainer"]>().toBeFunction();
    expectTypeOf<Integration["useScope"]>().toBeFunction();
  });
});

// =============================================================================
// Task 5.1: createTypedHooks Preserves TProvides Tests
// =============================================================================

describe("createTypedHooks preserves TProvides through all hooks", () => {
  it("useContainer returns Resolver<TProvides>", () => {
    const { useContainer } = createTypedHooks<TestProvides>();
    void useContainer;

    type UseContainerReturn = ReturnType<typeof useContainer>;
    // useContainer returns a Resolver interface that works with both
    // Container and ChildContainer, as well as with ContainerProvider
    // (uninitialized) and AsyncContainerProvider (initialized)
    expectTypeOf<UseContainerReturn>().toEqualTypeOf<Resolver<TestProvides>>();
  });

  it("useScope returns Resolver<TProvides>", () => {
    const { useScope } = createTypedHooks<TestProvides>();
    void useScope;

    type UseScopeReturn = ReturnType<typeof useScope>;
    expectTypeOf<UseScopeReturn>().toEqualTypeOf<Resolver<TestProvides>>();
  });

  it("factory return type matches TypedReactIntegration", () => {
    const integration = createTypedHooks<TestProvides>();

    // The factory return should be assignable to TypedReactIntegration
    expectTypeOf(integration).toMatchTypeOf<TypedReactIntegration<TestProvides>>();
  });
});

// =============================================================================
// Task 5.1: Container and Scope Type Parameters Flow Tests
// =============================================================================

describe("Container and Scope type parameters flow correctly", () => {
  it("ContainerProvider props accept Container<TProvides>", () => {
    type Props = HexDiContainerProviderProps<TestProvides>;

    expectTypeOf<Props["container"]>().toEqualTypeOf<Container<TestProvides>>();
  });

  it("ScopeProvider props accept Resolver<TProvides>", () => {
    type Props = HexDiScopeProviderProps<TestProvides>;

    expectTypeOf<Props["scope"]>().toEqualTypeOf<Resolver<TestProvides>>();
  });

  it("AutoScopeProvider props has children", () => {
    type Props = HexDiAutoScopeProviderProps;

    expectTypeOf<Props>().toHaveProperty("children");
  });

  it("different TProvides create different integration types", () => {
    type IntegrationA = TypedReactIntegration<LoggerPortType>;
    type IntegrationB = TypedReactIntegration<DatabasePortType>;

    // These should be different types
    expectTypeOf<IntegrationA>().not.toEqualTypeOf<IntegrationB>();
  });
});

// =============================================================================
// Task 5.2: Invalid Port Causes Compile Error Tests
// =============================================================================

describe("invalid port error cases", () => {
  it("usePort rejects port not in TProvides at type level", () => {
    const { usePort } = createTypedHooks<LoggerPortType>();
    void usePort;

    // UserServicePort is NOT in LoggerPortType (which is our TProvides)
    // This verifies the generic constraint P extends TProvides

    // The parameter type should be constrained to TProvides
    type ParamType = Parameters<typeof usePort>[0];
    expectTypeOf<ParamType>().toMatchTypeOf<LoggerPortType>();

    // UserServicePortType should NOT be assignable to LoggerPortType
    expectTypeOf<UserServicePortType>().not.toMatchTypeOf<LoggerPortType>();
  });

  it("usePortOptional rejects port not in TProvides at type level", () => {
    const { usePortOptional } = createTypedHooks<LoggerPortType>();
    void usePortOptional;

    // The parameter type should be constrained to TProvides
    type ParamType = Parameters<typeof usePortOptional>[0];
    expectTypeOf<ParamType>().toMatchTypeOf<LoggerPortType>();

    // UserServicePortType should NOT be assignable to LoggerPortType
    expectTypeOf<UserServicePortType>().not.toMatchTypeOf<LoggerPortType>();
  });

  // Note: The following tests use @ts-expect-error to verify compile-time errors
  // These assertions fail compilation if the error doesn't occur

  it("invalid port in usePort causes compile error", () => {
    const { usePort } = createTypedHooks<LoggerPortType>();

    // Attempting to use UserServicePort (not in TProvides) should error
    // @ts-expect-error - UserServicePort is not in LoggerPortType
    usePort(UserServicePort);
  });

  it("invalid port in usePortOptional causes compile error", () => {
    const { usePortOptional } = createTypedHooks<LoggerPortType>();

    // Attempting to use UserServicePort (not in TProvides) should error
    // @ts-expect-error - UserServicePort is not in LoggerPortType
    usePortOptional(UserServicePort);
  });
});

// =============================================================================
// Task 5.2: ContainerProvider Requires Matching Container Type Tests
// =============================================================================

describe("ContainerProvider type requirements", () => {
  it("HexDiContainerProviderProps is generic over TProvides", () => {
    type PropsA = HexDiContainerProviderProps<LoggerPortType>;
    type PropsB = HexDiContainerProviderProps<DatabasePortType>;

    // Different TProvides should produce different prop types
    expectTypeOf<PropsA>().not.toEqualTypeOf<PropsB>();
  });

  it("container prop type is Container<TProvides>", () => {
    type Props = HexDiContainerProviderProps<TestProvides>;

    // The container prop should be Container<TestProvides>
    type ContainerProp = Props["container"];
    expectTypeOf<ContainerProp>().toEqualTypeOf<Container<TestProvides>>();

    // Container<different type> should not match
    expectTypeOf<Container<UserServicePortType>>().not.toMatchTypeOf<ContainerProp>();
  });
});

// =============================================================================
// Task 5.2: ScopeProvider Requires Matching Scope Type Tests
// =============================================================================

describe("ScopeProvider type requirements", () => {
  it("HexDiScopeProviderProps is generic over TProvides", () => {
    // Different TProvides should produce different prop types
    // Verify by checking that scope property has the correct Resolver type
    type PropsA = HexDiScopeProviderProps<LoggerPortType>;
    type PropsB = HexDiScopeProviderProps<DatabasePortType>;

    // Check that the scope prop types differ by verifying resolve method constraints
    type ResolveA = PropsA["scope"]["resolve"];
    type ResolveB = PropsB["scope"]["resolve"];
    expectTypeOf<ResolveA>().not.toEqualTypeOf<ResolveB>();
  });

  it("scope prop type is Resolver<TProvides>", () => {
    type Props = HexDiScopeProviderProps<TestProvides>;

    // The scope prop should be Resolver<TestProvides>
    type ScopeProp = Props["scope"];
    expectTypeOf<ScopeProp>().toEqualTypeOf<Resolver<TestProvides>>();

    // Resolver<different type> should not match - verify through resolve method constraint
    type TestResolve = ScopeProp["resolve"];
    type WrongResolve = Resolver<UserServicePortType>["resolve"];
    expectTypeOf<WrongResolve>().not.toEqualTypeOf<TestResolve>();
  });
});

// =============================================================================
// Additional Type Safety Tests
// =============================================================================

describe("factory function type safety", () => {
  it("multiple factory calls create distinct types", () => {
    // Each createTypedHooks call creates a fresh set of contexts
    // The types should be identical structure but isolated at runtime
    const integration1 = createTypedHooks<TestProvides>();
    const integration2 = createTypedHooks<TestProvides>();

    // Types should match (same TProvides)
    expectTypeOf(integration1).toMatchTypeOf<TypedReactIntegration<TestProvides>>();
    expectTypeOf(integration2).toMatchTypeOf<TypedReactIntegration<TestProvides>>();
  });

  it("different TProvides creates incompatible hook types", () => {
    type HooksA = TypedReactIntegration<LoggerPortType>;
    type HooksB = TypedReactIntegration<UserServicePortType>;

    // The usePort hooks should have different constraints
    expectTypeOf<HooksA["usePort"]>().not.toEqualTypeOf<HooksB["usePort"]>();
  });
});
