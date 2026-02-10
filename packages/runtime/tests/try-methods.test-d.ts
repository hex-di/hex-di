/**
 * Type-level tests for try* methods on Container, Scope, and LazyContainer.
 *
 * Verifies:
 * - Return types (Result vs ResultAsync)
 * - Error types (ContainerError vs DisposalError)
 * - Phase-dependent port constraints on tryResolve match resolve
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import type { ResolutionError, ResultStatistics, InspectorAPI } from "@hex-di/core";
import type { Result, ResultAsync } from "@hex-di/result";
import type { Container, Scope, LazyContainer } from "../src/index.js";
import { resolveResult, recordResult } from "../src/index.js";
import { ok } from "@hex-di/result";
import type { ContainerError, DisposalError } from "../src/errors/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
void LoggerPort;
void DatabasePort;

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;

// =============================================================================
// Helper: extract return type from a generic method called with a specific arg
// =============================================================================

/**
 * Calls `obj.tryResolve(port)` at the type level and extracts the return type.
 */
type TryResolveReturnFor<T extends { tryResolve(port: never): unknown }, P> = T extends {
  tryResolve(port: P): infer R;
}
  ? R
  : never;

/**
 * Calls `obj.tryResolveAsync(port)` at the type level and extracts the return type.
 */
type TryResolveAsyncReturnFor<T extends { tryResolveAsync(port: never): unknown }, P> = T extends {
  tryResolveAsync(port: P): infer R;
}
  ? R
  : never;

// =============================================================================
// Container tryResolve return types
// =============================================================================

describe("Container tryResolve types", () => {
  it("tryResolve returns Result<Service, ContainerError> on initialized container", () => {
    type C = Container<LoggerPortType, never, never, "initialized">;
    type R = TryResolveReturnFor<C, LoggerPortType>;
    expectTypeOf<R>().toEqualTypeOf<Result<Logger, ContainerError>>();
  });

  it("tryResolve accepts sync ports on uninitialized container", () => {
    type C = Container<LoggerPortType | DatabasePortType, never, DatabasePortType, "uninitialized">;
    type TryResolveParam = Parameters<C["tryResolve"]>[0];

    // Should accept LoggerPort (sync)
    expectTypeOf<LoggerPortType>().toMatchTypeOf<TryResolveParam>();

    // Should NOT accept DatabasePort (async, uninitialized)
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<TryResolveParam>();
  });

  it("tryResolve accepts all ports on initialized container", () => {
    type C = Container<LoggerPortType | DatabasePortType, never, DatabasePortType, "initialized">;
    type TryResolveParam = Parameters<C["tryResolve"]>[0];

    // Both sync and async ports accepted after initialization
    expectTypeOf<LoggerPortType>().toMatchTypeOf<TryResolveParam>();
    expectTypeOf<DatabasePortType>().toMatchTypeOf<TryResolveParam>();
  });
});

// =============================================================================
// Container tryResolveAsync return types
// =============================================================================

describe("Container tryResolveAsync types", () => {
  it("tryResolveAsync returns ResultAsync<Service, ContainerError>", () => {
    type C = Container<LoggerPortType, never, never, "uninitialized">;
    type R = TryResolveAsyncReturnFor<C, LoggerPortType>;
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<Logger, ContainerError>>();
  });

  it("tryResolveAsync accepts all ports regardless of phase", () => {
    type C = Container<LoggerPortType | DatabasePortType, never, DatabasePortType, "uninitialized">;
    type TryResolveAsyncParam = Parameters<C["tryResolveAsync"]>[0];

    // Both sync and async ports accepted (unlike tryResolve)
    expectTypeOf<LoggerPortType>().toMatchTypeOf<TryResolveAsyncParam>();
    expectTypeOf<DatabasePortType>().toMatchTypeOf<TryResolveAsyncParam>();
  });
});

// =============================================================================
// Container tryInitialize return types
// =============================================================================

describe("Container tryInitialize types", () => {
  it("tryInitialize returns ResultAsync<Container<..., 'initialized'>, ContainerError> on uninitialized root", () => {
    type C = Container<LoggerPortType | DatabasePortType, never, DatabasePortType, "uninitialized">;
    type R = ReturnType<C["tryInitialize"]>;
    expectTypeOf<R>().toEqualTypeOf<
      ResultAsync<
        Container<LoggerPortType | DatabasePortType, never, DatabasePortType, "initialized">,
        ContainerError
      >
    >();
  });

  it("tryInitialize is never on initialized containers", () => {
    type C = Container<LoggerPortType, never, never, "initialized">;
    expectTypeOf<C["tryInitialize"]>().toBeNever();
  });

  it("tryInitialize is never on child containers", () => {
    type C = Container<LoggerPortType, DatabasePortType, never, "initialized">;
    expectTypeOf<C["tryInitialize"]>().toBeNever();
  });
});

// =============================================================================
// Container tryDispose return types
// =============================================================================

describe("Container tryDispose types", () => {
  it("tryDispose returns ResultAsync<void, DisposalError>", () => {
    type C = Container<LoggerPortType, never, never, "initialized">;
    type R = ReturnType<C["tryDispose"]>;
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<void, DisposalError>>();
  });
});

// =============================================================================
// Scope try method types
// =============================================================================

describe("Scope tryResolve types", () => {
  it("tryResolve returns Result<Service, ContainerError>", () => {
    type S = Scope<LoggerPortType, never, "initialized">;
    type R = TryResolveReturnFor<S, LoggerPortType>;
    expectTypeOf<R>().toEqualTypeOf<Result<Logger, ContainerError>>();
  });

  it("tryResolve excludes async ports on uninitialized scope", () => {
    type S = Scope<LoggerPortType | DatabasePortType, DatabasePortType, "uninitialized">;
    type TryResolveParam = Parameters<S["tryResolve"]>[0];

    // Should accept LoggerPort (sync)
    expectTypeOf<LoggerPortType>().toMatchTypeOf<TryResolveParam>();

    // Should NOT accept DatabasePort (async, uninitialized)
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<TryResolveParam>();
  });
});

describe("Scope tryResolveAsync types", () => {
  it("tryResolveAsync returns ResultAsync<Service, ContainerError>", () => {
    type S = Scope<LoggerPortType, never, "initialized">;
    type R = TryResolveAsyncReturnFor<S, LoggerPortType>;
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<Logger, ContainerError>>();
  });
});

describe("Scope tryDispose types", () => {
  it("tryDispose returns ResultAsync<void, DisposalError>", () => {
    type S = Scope<LoggerPortType, never, "initialized">;
    type R = ReturnType<S["tryDispose"]>;
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<void, DisposalError>>();
  });
});

// =============================================================================
// LazyContainer try method types
// =============================================================================

describe("LazyContainer tryResolve types", () => {
  it("tryResolve returns ResultAsync (not sync Result)", () => {
    type LC = LazyContainer<LoggerPortType, never, never>;
    type R = TryResolveReturnFor<LC, LoggerPortType>;

    // LazyContainer.tryResolve always returns ResultAsync
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<Logger, ContainerError>>();
  });
});

describe("LazyContainer tryResolveAsync types", () => {
  it("tryResolveAsync returns ResultAsync<Service, ContainerError>", () => {
    type LC = LazyContainer<LoggerPortType, never, never>;
    type R = TryResolveAsyncReturnFor<LC, LoggerPortType>;
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<Logger, ContainerError>>();
  });
});

describe("LazyContainer tryDispose types", () => {
  it("tryDispose returns ResultAsync<void, DisposalError>", () => {
    type LC = LazyContainer<LoggerPortType, never, never>;
    type R = ReturnType<LC["tryDispose"]>;
    expectTypeOf<R>().toEqualTypeOf<ResultAsync<void, DisposalError>>();
  });
});

// =============================================================================
// Phase constraint parity: tryResolve matches resolve
// =============================================================================

describe("Phase constraint parity", () => {
  it("Container tryResolve has same constraints as resolve", () => {
    type C = Container<LoggerPortType | DatabasePortType, never, DatabasePortType, "uninitialized">;
    type ResolveParam = Parameters<C["resolve"]>[0];
    type TryResolveParam = Parameters<C["tryResolve"]>[0];

    // Both should accept LoggerPort
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ResolveParam>();
    expectTypeOf<LoggerPortType>().toMatchTypeOf<TryResolveParam>();

    // Both should reject DatabasePort (async, uninitialized)
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<ResolveParam>();
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<TryResolveParam>();
  });

  it("Scope tryResolve has same constraints as resolve", () => {
    type S = Scope<LoggerPortType | DatabasePortType, DatabasePortType, "uninitialized">;
    type ResolveParam = Parameters<S["resolve"]>[0];
    type TryResolveParam = Parameters<S["tryResolve"]>[0];

    // Both should accept LoggerPort
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ResolveParam>();
    expectTypeOf<LoggerPortType>().toMatchTypeOf<TryResolveParam>();

    // Both should reject DatabasePort (async, uninitialized)
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<ResolveParam>();
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<TryResolveParam>();
  });
});

// =============================================================================
// resolveResult types
// =============================================================================

describe("resolveResult types", () => {
  it("returns Result<T, ResolutionError>", () => {
    const result = resolveResult(() => 42);
    expectTypeOf(result).toEqualTypeOf<Result<number, ResolutionError>>();
  });

  it("infers value type from callback return", () => {
    const result = resolveResult(() => "hello");
    expectTypeOf(result).toEqualTypeOf<Result<string, ResolutionError>>();
  });
});

// =============================================================================
// InspectorAPI result statistics types
// =============================================================================

describe("InspectorAPI result statistics types", () => {
  it("getResultStatistics returns ResultStatistics | undefined", () => {
    type R = ReturnType<InspectorAPI["getResultStatistics"]>;
    expectTypeOf<R>().toEqualTypeOf<ResultStatistics | undefined>();
  });

  it("getAllResultStatistics returns ReadonlyMap<string, ResultStatistics>", () => {
    type R = ReturnType<InspectorAPI["getAllResultStatistics"]>;
    expectTypeOf<R>().toEqualTypeOf<ReadonlyMap<string, ResultStatistics>>();
  });

  it("getHighErrorRatePorts returns readonly ResultStatistics[]", () => {
    type R = ReturnType<InspectorAPI["getHighErrorRatePorts"]>;
    expectTypeOf<R>().toEqualTypeOf<readonly ResultStatistics[]>();
  });
});

// =============================================================================
// recordResult types
// =============================================================================

describe("recordResult types", () => {
  it("returns same type as input result", () => {
    const inspector = {} as InspectorAPI;

    const okResult = ok(42);
    const recorded = recordResult(inspector, "test", okResult);
    expectTypeOf(recorded).toEqualTypeOf<Result<number, never>>();
  });

  it("preserves error type", () => {
    const inspector = {} as InspectorAPI;
    const result = {} as Result<string, { readonly code: "MY_ERR" }>;

    const recorded = recordResult(inspector, "test", result);
    expectTypeOf(recorded).toEqualTypeOf<Result<string, { readonly code: "MY_ERR" }>>();
  });
});
