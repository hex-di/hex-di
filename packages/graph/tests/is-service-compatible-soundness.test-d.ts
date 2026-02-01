/**
 * Type-level tests for IsServiceCompatible soundness.
 *
 * This test file exposes edge cases in the IsServiceCompatible type that may
 * produce false positives (allowing invalid overrides) or false negatives
 * (rejecting valid overrides).
 *
 * Issues to test:
 * 1. Generic functions - may not compare correctly with non-generic functions
 * 2. Optional parameters - asymmetry between parent and override
 * 3. Method overloads - only the first overload signature is checked
 *
 * @packageDocumentation
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Test Fixtures - Generic Function Interfaces
// =============================================================================

/**
 * Service with a generic method.
 */
interface GenericRepository {
  find<T>(id: string): T | null;
}

/**
 * Service with non-generic method that returns a specific type.
 */
interface StringRepository {
  find(id: string): string | null;
}

/**
 * Service with generic identity method.
 */
interface GenericIdentity {
  identity<T>(value: T): T;
}

/**
 * Service with specific identity method.
 */
interface StringIdentity {
  identity(value: string): string;
}

// =============================================================================
// Test Fixtures - Optional Parameters
// =============================================================================

interface OptionalParamService {
  process(a: string, b?: number): void;
}

interface RequiredParamService {
  process(a: string, b: number): void;
}

interface FewerParamService {
  process(a: string): void;
}

// =============================================================================
// Test Fixtures - Method Overloads
// =============================================================================

interface OverloadedService {
  // Overload signatures
  fetch(id: string): Promise<string>;
  fetch(id: number): Promise<number>;
  // Implementation signature (not accessible at type level)
}

interface SingleFetchService {
  fetch(id: string): Promise<string>;
}

// =============================================================================
// Ports
// =============================================================================

const GenericRepoPort = createPort<"Repo", GenericRepository>("Repo");
const StringRepoPort = createPort<"Repo", StringRepository>("Repo");

const GenericIdentityPort = createPort<"Identity", GenericIdentity>("Identity");
const StringIdentityPort = createPort<"Identity", StringIdentity>("Identity");

const OptionalParamPort = createPort<"Processor", OptionalParamService>("Processor");
const RequiredParamPort = createPort<"Processor", RequiredParamService>("Processor");
const FewerParamPort = createPort<"Processor", FewerParamService>("Processor");

const OverloadedPort = createPort<"Fetcher", OverloadedService>("Fetcher");
const SingleFetchPort = createPort<"Fetcher", SingleFetchService>("Fetcher");

// =============================================================================
// Adapters
// =============================================================================

const GenericRepoAdapter = createAdapter({
  provides: GenericRepoPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ find: () => null }),
});

const StringRepoAdapter = createAdapter({
  provides: StringRepoPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ find: () => null }),
});

const GenericIdentityAdapter = createAdapter({
  provides: GenericIdentityPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ identity: <T>(v: T) => v }),
});

const StringIdentityAdapter = createAdapter({
  provides: StringIdentityPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ identity: (v: string) => v }),
});

const OptionalParamAdapter = createAdapter({
  provides: OptionalParamPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ process: () => {} }),
});

const RequiredParamAdapter = createAdapter({
  provides: RequiredParamPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ process: () => {} }),
});

const FewerParamAdapter = createAdapter({
  provides: FewerParamPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ process: () => {} }),
});

const OverloadedAdapter = createAdapter({
  provides: OverloadedPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    fetch: (id: string | number) => Promise.resolve(id) as Promise<string> & Promise<number>,
  }),
});

const SingleFetchAdapter = createAdapter({
  provides: SingleFetchPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ fetch: (id: string) => Promise.resolve(id) }),
});

// =============================================================================
// Generic Function Tests
// =============================================================================

describe("IsServiceCompatible generic function edge cases", () => {
  describe("generic method in parent", () => {
    it("rejects override with non-generic implementation (TypeScript limitation)", () => {
      const parentGraph = GraphBuilder.create().provide(GenericRepoAdapter).build();

      // TypeScript REJECTS this override because:
      // StringRepository.find(id: string): string | null
      // does NOT extend
      // GenericRepository.find<T>(id: string): T | null
      //
      // TypeScript cannot verify that `string | null` satisfies all possible `T | null`.
      // This is a known TypeScript limitation with generic method comparison.
      //
      // WORKAROUND: Use the same Port instance for both parent and override,
      // or ensure the override Port uses the exact same generic interface.
      const result = GraphBuilder.forParent(parentGraph).override(StringRepoAdapter);

      // CURRENT BEHAVIOR: Rejected with HEX021 due to TypeScript's generic handling
      expectTypeOf<typeof result>().toBeString();
    });
  });

  describe("generic identity function", () => {
    it("rejects override with specific type (TypeScript limitation)", () => {
      const parentGraph = GraphBuilder.create().provide(GenericIdentityAdapter).build();

      // TypeScript REJECTS this because:
      // StringIdentity.identity(value: string): string
      // does NOT extend
      // GenericIdentity.identity<T>(value: T): T
      //
      // Same limitation as above - TypeScript cannot verify type parameter substitution.
      const result = GraphBuilder.forParent(parentGraph).override(StringIdentityAdapter);

      // CURRENT BEHAVIOR: Rejected with HEX021
      expectTypeOf<typeof result>().toBeString();
    });
  });
});

// =============================================================================
// Optional Parameter Tests
// =============================================================================

describe("IsServiceCompatible optional parameter edge cases", () => {
  describe("parent with optional param, override with required", () => {
    it("allows override that requires previously optional param (bivariance)", () => {
      const parentGraph = GraphBuilder.create().provide(OptionalParamAdapter).build();

      // TypeScript ALLOWS this due to bivariant method parameter checking:
      // RequiredParamService.process(a: string, b: number): void
      // EXTENDS
      // OptionalParamService.process(a: string, b?: number): void
      //
      // This is technically unsound (callers might not provide the second arg),
      // but TypeScript uses bivariance for method parameters for practical reasons.
      //
      // WORKAROUND: Use the same Port instance, or rely on runtime validation.
      const result = GraphBuilder.forParent(parentGraph).override(RequiredParamAdapter);

      // CURRENT BEHAVIOR: Allowed due to TypeScript's bivariance
      expectTypeOf<typeof result>().not.toBeString();
    });
  });

  describe("parent with required param, override with optional", () => {
    it("allows override that makes param optional", () => {
      const parentGraph = GraphBuilder.create().provide(RequiredParamAdapter).build();

      // OptionalParamService.process(a: string, b?: number): void
      // EXTENDS
      // RequiredParamService.process(a: string, b: number): void
      //
      // This is safe - the override can handle all calls the parent could handle.
      const result = GraphBuilder.forParent(parentGraph).override(OptionalParamAdapter);

      expectTypeOf<typeof result>().not.toBeString();
    });
  });

  describe("parent with more params, override with fewer", () => {
    it("allows override with fewer parameters", () => {
      const parentGraph = GraphBuilder.create().provide(OptionalParamAdapter).build();

      // FewerParamService.process(a: string): void
      // EXTENDS
      // OptionalParamService.process(a: string, b?: number): void
      //
      // This is safe in JavaScript semantics - extra arguments are simply ignored.
      // TypeScript correctly allows this because a function with fewer parameters
      // can always be called with more arguments.
      const result = GraphBuilder.forParent(parentGraph).override(FewerParamAdapter);

      expectTypeOf<typeof result>().not.toBeString();
    });
  });
});

// =============================================================================
// Method Overload Tests
// =============================================================================

describe("IsServiceCompatible method overload edge cases", () => {
  describe("parent with overloaded method", () => {
    it("rejects override missing required overloads", () => {
      const parentGraph = GraphBuilder.create().provide(OverloadedAdapter).build();

      // TypeScript REJECTS this because:
      // SingleFetchService { fetch(id: string): Promise<string> }
      // does NOT extend
      // OverloadedService { fetch(id: string): ...; fetch(id: number): ... }
      //
      // The override is missing the number overload, so it cannot handle
      // all cases the parent can handle. This is correctly rejected.
      const result = GraphBuilder.forParent(parentGraph).override(SingleFetchAdapter);

      // CURRENT BEHAVIOR: Correctly rejected with HEX021
      expectTypeOf<typeof result>().toBeString();
    });
  });

  describe("parent with single method, override with overloaded", () => {
    it("allows override with additional overloads", () => {
      const parentGraph = GraphBuilder.create().provide(SingleFetchAdapter).build();

      // OverloadedService { fetch(id: string): ...; fetch(id: number): ... }
      // EXTENDS
      // SingleFetchService { fetch(id: string): Promise<string> }
      //
      // Adding overloads is safe - the override can handle everything the
      // parent could handle, plus additional cases.
      const result = GraphBuilder.forParent(parentGraph).override(OverloadedAdapter);

      expectTypeOf<typeof result>().not.toBeString();
    });
  });
});
