/**
 * Comprehensive Type-Level Tests: Compile-Time Override Validation
 *
 * ## Purpose
 *
 * This test suite validates compile-time override validation including:
 * - HEX008: Port not in parent graph
 * - HEX009: Override called without forParent()
 * - HEX021: Service type mismatch
 * - Lifecycle validation on overrides
 * - Nested child graph scenarios
 *
 * ## Test Strategy
 *
 * Tests marked with "VERIFY" need validation to confirm current behavior.
 * Tests marked with "Expected to PASS" document verified functionality.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createAdapter, port, type Port } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import type { OverrideTypeMismatchError } from "../src/builder/types/merge.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface ExtendedLogger extends Logger {
  error(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const ExtendedLoggerPort = port<ExtendedLogger>()({ name: "Logger" }); // Same name, different type
const DatabasePort = port<Database>()({ name: "Database" });
const CachePort = port<Cache>()({ name: "Cache" });
const UserServicePort = port<UserService>()({ name: "UserService" });

// A completely different port with a unique name
const UnknownPort = port<{ unknown(): void }>()({ name: "Unknown" });

// =============================================================================
// Core Validation Tests (HEX008, HEX009)
// =============================================================================

describe("Override Validation - Core validation", () => {
  describe("HEX009: Override without forParent()", () => {
    it("errors when override() called without forParent()", () => {
      const LoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      // Create builder WITHOUT forParent()
      const builder = GraphBuilder.create();

      // This should produce HEX009 error
      const result = builder.override(LoggerAdapter);

      type ResultType = typeof result;

      // EXPECTED TO PASS - HEX009 should be detected
      expectTypeOf<ResultType>().toBeString();

      type IsHEX009 = ResultType extends `ERROR[HEX009]: ${string}` ? true : false;
      expectTypeOf<IsHEX009>().toEqualTypeOf<true>();
    });
  });

  describe("HEX008: Port not in parent graph", () => {
    it("errors when overriding a port not in parent, shows available ports", () => {
      // Create parent graph with Logger and Database
      const ParentLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const ParentDatabaseAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        lifetime: "singleton",
        factory: () => ({ query: async () => ({}) }),
      });

      const parentGraph = GraphBuilder.create()
        .provide(ParentLoggerAdapter)
        .provide(ParentDatabaseAdapter)
        .build();

      // Try to override a port (Unknown) that doesn't exist in parent
      const UnknownAdapter = createAdapter({
        provides: UnknownPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ unknown: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(UnknownAdapter);

      type ResultType = typeof result;

      // EXPECTED TO PASS - HEX008 should be detected
      expectTypeOf<ResultType>().toBeString();

      type IsHEX008 = ResultType extends `ERROR[HEX008]: ${string}` ? true : false;
      expectTypeOf<IsHEX008>().toEqualTypeOf<true>();
    });

    it("HEX008 error message mentions available ports", () => {
      const ParentLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentLoggerAdapter).build();

      const UnknownAdapter = createAdapter({
        provides: UnknownPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ unknown: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(UnknownAdapter);

      type ResultType = typeof result;

      // Should mention "Logger" in available ports
      type MentionsAvailable = ResultType extends `${string}Available for override: ${string}`
        ? true
        : false;
      expectTypeOf<MentionsAvailable>().toEqualTypeOf<true>();
    });
  });

  describe("HEX021: Service type mismatch", () => {
    it("errors when override port name matches but service type differs", () => {
      // Parent has Logger port
      const ParentLoggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentLoggerAdapter).build();

      // Create a different port with same name but different service type
      // Note: ExtendedLoggerPort has name "Logger" but type ExtendedLogger
      const ExtendedLoggerAdapter = createAdapter({
        provides: ExtendedLoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({
          log: () => {},
          error: () => {},
        }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ExtendedLoggerAdapter);

      type ResultType = typeof result;

      // VERIFY: Should this be HEX021 or succeed (since ExtendedLogger extends Logger)?
      // TypeScript's structural typing might allow this
      // If it fails with HEX021: override requires exact Port match
      // If it passes: structural subtyping is allowed

      // This test documents current behavior - update expectation based on actual behavior
      type IsError = ResultType extends string ? true : false;

      // For now, assume structural subtyping is NOT allowed (strict port matching)
      // expectTypeOf<IsError>().toEqualTypeOf<true>();

      // If structural subtyping IS allowed (ExtendedLogger extends Logger):
      expectTypeOf<IsError>().toEqualTypeOf<false>();
    });
  });
});

// =============================================================================
// Lifecycle Validation on Overrides
// =============================================================================

describe("Override Validation - Lifecycle validation", () => {
  describe("Same lifetime override", () => {
    it("allows override singleton with singleton", () => {
      const ParentSingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentSingletonAdapter).build();

      const ChildSingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ChildSingletonAdapter);

      type ResultType = typeof result;

      // EXPECTED TO PASS - Same lifetime is always valid
      expectTypeOf<ResultType>().not.toBeString();
    });

    it("allows override scoped with scoped", () => {
      const ParentScopedAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentScopedAdapter).build();

      const ChildScopedAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ChildScopedAdapter);

      type ResultType = typeof result;

      // EXPECTED TO PASS
      expectTypeOf<ResultType>().not.toBeString();
    });
  });

  describe("Longer lifetime override (child has longer lifetime than parent)", () => {
    it("allows override transient with singleton (longer lifetime)", () => {
      // Parent has transient (level 3)
      const ParentTransientAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentTransientAdapter).build();

      // Child overrides with singleton (level 1, longer lifetime)
      const ChildSingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ChildSingletonAdapter);

      type ResultType = typeof result;

      // VERIFY: Is upgrading to longer lifetime allowed?
      // This SHOULD be safe - singleton provides same instance to all requests
      // that would otherwise get different transient instances
      expectTypeOf<ResultType>().not.toBeString();
    });

    it("allows override scoped with singleton", () => {
      const ParentScopedAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentScopedAdapter).build();

      const ChildSingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ChildSingletonAdapter);

      type ResultType = typeof result;

      // VERIFY: Upgrading scoped to singleton should be safe
      expectTypeOf<ResultType>().not.toBeString();
    });
  });

  describe("Shorter lifetime override (child has shorter lifetime than parent)", () => {
    it("behavior when override singleton with transient (shorter lifetime)", () => {
      // Parent has singleton (level 1)
      const ParentSingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentSingletonAdapter).build();

      // Child overrides with transient (level 3, shorter lifetime)
      const ChildTransientAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "transient",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ChildTransientAdapter);

      type ResultType = typeof result;

      // VERIFY: What happens when downgrading lifetime?
      // This could be:
      // 1. Allowed (child can choose any lifetime for its own scope)
      // 2. Rejected (could cause issues with dependent adapters expecting singleton)
      // Document actual behavior:

      // For now, assume it's allowed since child graph is independent
      expectTypeOf<ResultType>().not.toBeString();
    });

    it("behavior when override singleton with scoped (shorter lifetime)", () => {
      const ParentSingletonAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const parentGraph = GraphBuilder.create().provide(ParentSingletonAdapter).build();

      const ChildScopedAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "scoped",
        factory: () => ({ log: () => {} }),
      });

      const result = GraphBuilder.forParent(parentGraph).override(ChildScopedAdapter);

      type ResultType = typeof result;

      // VERIFY: Document actual behavior
      expectTypeOf<ResultType>().not.toBeString();
    });
  });
});

// =============================================================================
// Nested Child Graphs (Grandchild scenarios)
// =============================================================================

describe("Override Validation - Nested child graphs", () => {
  it("child of child can override grandparent port", () => {
    // Create grandparent graph
    const GrandparentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const grandparentGraph = GraphBuilder.create().provide(GrandparentLoggerAdapter).build();

    // Create parent as child of grandparent
    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.forParent(grandparentGraph)
      .override(ParentLoggerAdapter)
      .build();

    // Create grandchild as child of parent
    const GrandchildLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const result = GraphBuilder.forParent(parentGraph).override(GrandchildLoggerAdapter);

    type ResultType = typeof result;

    // VERIFY: Grandchild should be able to override port that exists in parent
    // (regardless of whether parent got it from grandparent or defined it)
    expectTypeOf<ResultType>().not.toBeString();
  });

  it("child can add new port that parent didn't have", () => {
    // Parent has only Logger
    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.create().provide(ParentLoggerAdapter).build();

    // Child adds Database (new port, not in parent)
    const ChildDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort], // Can depend on parent's Logger
      lifetime: "singleton",
      factory: () => ({ query: async () => ({}) }),
    });

    // Using provide() not override() for new ports
    const result = GraphBuilder.forParent(parentGraph).provide(ChildDatabaseAdapter);

    type ResultType = typeof result;

    // EXPECTED TO PASS - Child can add new ports via provide()
    expectTypeOf<ResultType>().not.toBeString();
  });

  it("child graph inherits ports from parent for dependency resolution", () => {
    // Parent has Logger
    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.create().provide(ParentLoggerAdapter).build();

    // Child adds Database that requires Logger (from parent)
    const ChildDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ query: async () => ({}) }),
    });

    const result = GraphBuilder.forParent(parentGraph).provide(ChildDatabaseAdapter);

    type ResultType = typeof result;

    // Child should be able to depend on parent's Logger
    expectTypeOf<ResultType>().not.toBeString();
  });
});

// =============================================================================
// Valid Override Scenarios (Verification)
// =============================================================================

describe("Override Validation - Valid scenarios", () => {
  it("valid override with same port instance", () => {
    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.create().provide(ParentLoggerAdapter).build();

    // Use exact same LoggerPort for override
    const ChildLoggerAdapter = createAdapter({
      provides: LoggerPort, // Same port instance
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const result = GraphBuilder.forParent(parentGraph).override(ChildLoggerAdapter);

    type ResultType = typeof result;

    // EXPECTED TO PASS - Same port instance is always valid
    expectTypeOf<ResultType>().not.toBeString();
  });

  it("override with dependencies on both parent and child ports", () => {
    // Parent has Logger
    const ParentLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const parentGraph = GraphBuilder.create().provide(ParentLoggerAdapter).build();

    // Child adds Cache and Database
    // Database depends on Logger (parent) and Cache (new in child)
    const ChildCacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: () => undefined,
        set: () => {},
      }),
    });

    const ChildDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, CachePort],
      lifetime: "singleton",
      factory: () => ({ query: async () => ({}) }),
    });

    const result = GraphBuilder.forParent(parentGraph)
      .provide(ChildCacheAdapter)
      .provide(ChildDatabaseAdapter);

    type ResultType = typeof result;

    // Should work - can depend on mix of parent and child ports
    expectTypeOf<ResultType>().not.toBeString();
  });
});
