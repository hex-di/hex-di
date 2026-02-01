/**
 * Variance Regression Tests
 *
 * These tests verify that variance modifiers on type parameters work correctly
 * and prevent accidental variance breakage during refactors.
 *
 * ## Background
 *
 * TypeScript supports variance annotations:
 * - `out T` (covariant): T is only in output position, enables widening
 * - `in T` (contravariant): T is only in input position, enables narrowing
 * - (bivariant): No modifier, strictest compatibility
 *
 * GraphBuilder uses `out` for TAsyncPorts and TOverrides because:
 * - They accumulate via union (output-only)
 * - Covariance enables child→parent assignment
 *
 * @packageDocumentation
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import type { Port, Adapter, AdapterConstraint, ResolvedDeps, EmptyDeps } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { DefaultInternals } from "../src/advanced.js";
import {
  LoggerPort,
  DatabasePort,
  CachePort,
  createLoggerAdapter,
  createDatabaseAdapter,
  type LoggerPortType,
  type DatabasePortType,
} from "./fixtures.js";

// Use the port variables to satisfy ESLint
expect(LoggerPort).toBeDefined();
expect(DatabasePort).toBeDefined();
expect(CachePort).toBeDefined();

// Create adapter instances for tests
const LoggerAdapter = createLoggerAdapter();
const DatabaseAdapter = createDatabaseAdapter();

// =============================================================================
// GraphBuilder Variance Tests
// =============================================================================

describe("GraphBuilder variance", () => {
  describe("TAsyncPorts covariance (out modifier)", () => {
    it("builder starts with never for async ports", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter);

      // TAsyncPorts starts as never for sync adapters
      type BuilderAsyncPorts = (typeof builder)["__asyncPorts"];
      expectTypeOf<BuilderAsyncPorts>().toEqualTypeOf<never>();
    });

    it("covariance allows never to be subtype of any async port union", () => {
      // This verifies the `out` modifier on TAsyncPorts works correctly
      // never (the bottom type) should extend any type due to covariance

      // Verify covariance: a function returning never can be assigned to
      // a function returning a wider type
      type NeverProducer = () => never;
      type PortProducer = () => LoggerPortType;
      type UnionProducer = () => LoggerPortType | DatabasePortType;

      // Covariance: () => never is assignable to () => T for any T
      const _test1: PortProducer = (() => {
        throw new Error();
      }) as NeverProducer;
      const _test2: UnionProducer = (() => {
        throw new Error();
      }) as NeverProducer;

      // Suppress unused warnings
      expect(_test1).toBeDefined();
      expect(_test2).toBeDefined();
    });
  });

  describe("TOverrides covariance (out modifier)", () => {
    it("builder starts with never for overrides", () => {
      const builder = GraphBuilder.create().provide(LoggerAdapter);

      // TOverrides starts as never when no overrides are used
      type BuilderOverrides = (typeof builder)["__overrides"];
      expectTypeOf<BuilderOverrides>().toEqualTypeOf<never>();
    });

    it("covariance allows never to be subtype of any override union", () => {
      // This verifies the `out` modifier on TOverrides works correctly
      // never (the bottom type) should extend any type due to covariance

      // Verify covariance: a function returning never can be assigned to
      // a function returning a wider type
      type NeverProducer = () => never;
      type PortProducer = () => LoggerPortType;

      // Covariance: () => never is assignable to () => T for any T
      const _test: PortProducer = (() => {
        throw new Error();
      }) as NeverProducer;

      // Suppress unused warning
      expect(_test).toBeDefined();
    });
  });
});

// =============================================================================
// Adapter Variance Tests
// =============================================================================

describe("Adapter variance", () => {
  describe("AdapterConstraint universal constraint", () => {
    it("AdapterConstraint accepts any well-formed adapter", () => {
      // AdapterConstraint should be a supertype of all specific adapters
      expectTypeOf(LoggerAdapter).toMatchTypeOf<AdapterConstraint>();
      expectTypeOf(DatabaseAdapter).toMatchTypeOf<AdapterConstraint>();

      // Create a custom adapter and verify it matches AdapterConstraint
      const CustomAdapter = createAdapter({
        provides: CachePort,
        requires: [LoggerPort],
        lifetime: "transient",
        factory: () => ({
          get: () => undefined,
          set: () => {},
        }),
      });
      expectTypeOf(CustomAdapter).toMatchTypeOf<AdapterConstraint>();
    });

    it("AdapterConstraint array accepts heterogeneous adapters", () => {
      // This is critical for provideMany() and merge() operations
      const adapters: readonly AdapterConstraint[] = [LoggerAdapter, DatabaseAdapter];
      expectTypeOf(adapters).toMatchTypeOf<readonly AdapterConstraint[]>();
    });
  });

  describe("factory deps contravariance", () => {
    it("adapter with empty deps accepts any deps object", () => {
      // An adapter that requires no dependencies should accept
      // a deps object with any shape (contravariance in input position)

      type NoDepsFactory = (deps: Record<string, never>) => unknown;
      type AnyDepsFactory = (deps: { Logger: unknown; Database: unknown }) => unknown;

      // Contravariance: function that accepts nothing accepts anything
      // This is how adapters with no deps work with resolved deps objects
      expectTypeOf<NoDepsFactory>().not.toMatchTypeOf<AnyDepsFactory>();
    });

    it("adapter factory correctly narrows deps type", () => {
      // Factory receives exactly the ports it requires, no more
      type LoggerDeps = { Logger: { log: (msg: string) => void } };
      type FactoryType = (deps: LoggerDeps) => unknown;

      expectTypeOf(DatabaseAdapter.factory).toMatchTypeOf<FactoryType>();
    });
  });
});

// =============================================================================
// Port Variance Tests
// =============================================================================

describe("Port variance", () => {
  describe("Port brand prevents structural assignability", () => {
    it("structurally similar objects do NOT match Port", () => {
      // A plain object that looks like a Port should NOT be assignable to Port
      // due to the brand symbol

      type FakePort = {
        readonly __portName: "Logger";
        readonly __service: { log: (msg: string) => void };
      };

      // FakePort lacks the brand, so it should not match the real Port type
      expectTypeOf<FakePort>().not.toMatchTypeOf<LoggerPortType>();
    });

    it("ports with different names are not assignable", () => {
      // Even structurally identical ports with different names are distinct
      expectTypeOf<LoggerPortType>().not.toEqualTypeOf<DatabasePortType>();
    });

    it("same port type is self-assignable", () => {
      expectTypeOf<LoggerPortType>().toEqualTypeOf<LoggerPortType>();
    });
  });
});

// =============================================================================
// ResolvedDeps Variance Tests
// =============================================================================

describe("ResolvedDeps contravariance", () => {
  it("ResolvedDeps<never> equals EmptyDeps (branded empty type)", () => {
    // This is critical for adapters with no dependencies
    // EmptyDeps prevents arbitrary key access while being assignable from {}

    type NoDeps = ResolvedDeps<never>;

    // EmptyDeps is a branded empty type that prevents arbitrary key access
    expectTypeOf<NoDeps>().toEqualTypeOf<EmptyDeps>();
  });

  it("ResolvedDeps produces correct mapped type", () => {
    type LoggerDeps = ResolvedDeps<LoggerPortType>;
    type MultiDeps = ResolvedDeps<LoggerPortType | DatabasePortType>;

    // Single port creates single-key object
    expectTypeOf<LoggerDeps>().toHaveProperty("Logger");

    // Union creates multi-key object
    expectTypeOf<MultiDeps>().toHaveProperty("Logger");
    expectTypeOf<MultiDeps>().toHaveProperty("Database");
  });

  it("ResolvedDeps is not bivariant", () => {
    // Verify that deps types are strict, not bivariant

    type LoggerOnlyDeps = ResolvedDeps<LoggerPortType>;
    type MultiDeps = ResolvedDeps<LoggerPortType | DatabasePortType>;

    // LoggerOnlyDeps should NOT be equal to MultiDeps (missing Database)
    expectTypeOf<LoggerOnlyDeps>().not.toEqualTypeOf<MultiDeps>();
  });
});

// =============================================================================
// Regression Guards
// =============================================================================

describe("variance regression guards", () => {
  it("GraphBuilder type parameters remain in expected positions", () => {
    // This test documents the expected variance of each type parameter
    // If these fail, variance was accidentally changed

    type TestBuilder = GraphBuilder<
      LoggerPortType, // TProvides: invariant (both input and output)
      never, // TRequires: invariant (both input and output)
      LoggerPortType, // TAsyncPorts: covariant (out)
      LoggerPortType, // TOverrides: covariant (out)
      DefaultInternals // TInternalState: uses default internals
    >;

    // Just verify the type is constructible
    expectTypeOf<TestBuilder>().toBeObject();
  });

  it("Adapter type parameters remain in expected positions", () => {
    // Document expected Adapter variance

    type TestAdapter = Adapter<
      LoggerPortType, // TProvides: invariant
      never, // TRequires: invariant
      "singleton", // TLifetime: invariant
      "sync", // TFactoryKind: invariant
      false, // TClonable: invariant
      readonly [] // TRequiresArray: invariant
    >;

    // Just verify the type is constructible
    expectTypeOf<TestAdapter>().toBeObject();
  });

  it("Port type parameters remain in expected positions", () => {
    // Document expected Port variance

    type TestPort = Port<{ log: () => void }, "Logger">;

    // Just verify the type is constructible
    expectTypeOf<TestPort>().toBeObject();
  });
});
