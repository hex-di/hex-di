/**
 * Property-Based Test Helpers for @hex-di/graph
 *
 * Shared utilities, arbitraries, and configuration for property-based testing
 * with fast-check. This module provides reproducible test infrastructure and
 * common generators used across property-based test suites.
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   fcConfig,
 *   portNameArb,
 *   lifetimeArb,
 *   makePort,
 *   makeAdapter,
 *   uniquePortNamesArb,
 *   buildFromAdapters,
 *   dagArb,
 * } from "./property-based-helpers.js";
 * ```
 *
 * ## Note on Type Assertions
 *
 * Property tests use `any` types in some places because:
 * - Port names are generated at runtime, not compile time
 * - TypeScript cannot track phantom types through dynamic loops
 * - Test files allow `any` for mocking flexibility (per project rules)
 */

import fc from "fast-check";
import { createPort, createAdapter, type Port, type Lifetime } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

// =============================================================================
// Seed Configuration for Reproducibility
// =============================================================================

// Declare NodeJS global for TypeScript - vitest runs in Node environment
declare const process: { env: Record<string, string | undefined> };

/**
 * Parse FC_SEED environment variable for reproducible test failures.
 *
 * Usage: FC_SEED=-1819918769 pnpm test tests/property-based.test.ts
 */
export function parseSeedFromEnv(): number | undefined {
  const seedStr = process.env.FC_SEED;
  if (!seedStr) return undefined;
  const seed = parseInt(seedStr, 10);
  if (Number.isNaN(seed)) return undefined;
  return seed;
}

export const SHARED_SEED = parseSeedFromEnv();

/**
 * Creates fast-check config with seed support.
 * @param numRuns - Number of test iterations
 */
export function fcConfig(numRuns: number): { numRuns: number; seed?: number; verbose: boolean } {
  return {
    numRuns,
    ...(SHARED_SEED !== undefined ? { seed: SHARED_SEED } : {}),
    verbose: true,
  };
}

// =============================================================================
// Port and Adapter Types
// =============================================================================

/** Standard port type used in property tests */
export type TestPort = Port<{ value: string }, string>;

/** Standard service type produced by test adapters */
export interface TestService {
  readonly value: string;
}

// =============================================================================
// Arbitraries for Generating Test Data
// =============================================================================

/**
 * Generates valid port names (non-empty alphanumeric strings starting with uppercase).
 */
export const portNameArb = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{0,19}$/);

/**
 * Generates lifetime values.
 */
export const lifetimeArb = fc.constantFrom<Lifetime>("singleton", "scoped", "transient");

/**
 * Generates a unique list of port names.
 */
export const uniquePortNamesArb = (minLength = 1, maxLength = 10) =>
  fc
    .array(portNameArb, { minLength, maxLength })
    .map(names => [...new Set(names)])
    .filter(names => names.length >= minLength);

/**
 * Generates a random DAG structure as an adjacency list.
 * Each node can only depend on nodes that come before it (ensures acyclicity).
 *
 * @param minNodes - Minimum number of nodes in the DAG
 * @param maxNodes - Maximum number of nodes in the DAG
 * @returns Arbitrary producing [names, ...depArrays] tuples
 */
export const dagArb = (minNodes = 2, maxNodes = 8) =>
  fc.integer({ min: minNodes, max: maxNodes }).chain(nodeCount => {
    // Generate unique names for each node
    const names = Array.from({ length: nodeCount }, (_, i) => `Node${i}`);

    // For each node (except first), randomly select dependencies from earlier nodes
    const depsArb = names.slice(1).map((_, i) => {
      const possibleDeps = names.slice(0, i + 1); // Nodes before this one
      return fc.subarray(possibleDeps, {
        minLength: 0,
        maxLength: Math.min(3, possibleDeps.length),
      });
    });

    return fc.tuple(fc.constant(names), ...depsArb);
  });

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Creates a port with the given name.
 */
export function makePort(name: string): TestPort {
  return createPort({ name });
}

/**
 * Creates an adapter for the given port with optional dependencies.
 * Returns `any` to allow dynamic composition in property tests.
 */
export function makeAdapter(
  port: TestPort,
  lifetime: Lifetime = "singleton",
  requires: readonly TestPort[] = []
): any {
  return createAdapter({
    provides: port,
    requires,
    lifetime,
    factory: () => ({ value: port.__portName }),
  });
}

/**
 * Helper to build a graph from a list of independent adapters.
 * Uses any-typed builder to bypass compile-time validation for runtime tests.
 */
export function buildFromAdapters(adapters: any[]): any {
  let builder: any = GraphBuilder.create();
  for (const adapter of adapters) {
    builder = builder.provide(adapter);
  }
  return builder;
}

/**
 * Helper to build a graph from a DAG structure.
 * Creates ports and adapters from a [names, ...depArrays] tuple.
 */
export function buildFromDag([names, ...depArrays]: readonly [readonly string[], ...string[][]]): {
  builder: any;
  ports: TestPort[];
  portByName: Map<string, TestPort>;
} {
  const ports = names.map(makePort);
  const portByName = new Map(names.map((n, i) => [n, ports[i]!]));

  const adapters = ports.map((port, i) => {
    if (i === 0) {
      return makeAdapter(port, "singleton", []);
    }
    const deps = (depArrays[i - 1] || []).map(name => portByName.get(name)!);
    return makeAdapter(port, "singleton", deps);
  });

  return {
    builder: buildFromAdapters(adapters),
    ports,
    portByName,
  };
}
