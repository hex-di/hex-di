/**
 * fast-check arbitrary generators for graph composition law tests.
 *
 * Provides arbitraries for generating ports, adapters, and graph builders
 * suitable for property-based testing of algebraic composition laws.
 *
 * Cross-ref: BEH-GR-07 (Graph Composition Law Tests)
 */

import * as fc from "fast-check";
import { createPort, createAdapter, type Port, type Lifetime } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";

// =============================================================================
// Types
// =============================================================================

/** Standard service type produced by test adapters */
export interface LawTestService {
  readonly value: string;
}

/** Standard port type used in law tests */
export type LawTestPort = Port<string, LawTestService>;

// =============================================================================
// Primitive Arbitraries
// =============================================================================

/**
 * Generates valid port names (uppercase-starting alphanumeric strings).
 * Restricted to a small alphabet to increase collision rates for commutativity tests.
 */
export const portNameArb: fc.Arbitrary<string> = fc.stringMatching(/^[A-Z][a-zA-Z0-9]{0,14}$/);

/**
 * Generates lifetime values.
 */
export const lifetimeArb: fc.Arbitrary<Lifetime> = fc.constantFrom<Lifetime>(
  "singleton",
  "scoped",
  "transient"
);

// =============================================================================
// Port & Adapter Factories
// =============================================================================

/**
 * Creates a port with the given name.
 */
export function makePort(name: string): LawTestPort {
  return createPort({ name });
}

/**
 * Creates an adapter providing the given port with no dependencies.
 * Returns `any` to allow dynamic composition in property tests
 * (port names are generated at runtime, not compile time).
 */
export function makeAdapter(port: LawTestPort, lifetime: Lifetime = "singleton"): any {
  return createAdapter({
    provides: port,
    requires: [],
    lifetime,
    factory: () => ({ value: port.__portName }),
  });
}

// =============================================================================
// Composite Arbitraries
// =============================================================================

/**
 * Generates a unique list of port names with a given prefix.
 * The prefix ensures disjointness when composing multiple arbitraries.
 */
export function uniquePrefixedNamesArb(
  prefix: string,
  minLength = 0,
  maxLength = 5
): fc.Arbitrary<string[]> {
  return fc
    .array(portNameArb, { minLength, maxLength })
    .map(names => [...new Set(names)].map(n => `${prefix}${n}`))
    .filter(names => names.length >= minLength);
}

/**
 * Generates an arbitrary port from a name arbitrary.
 */
export function arbPort(nameArb: fc.Arbitrary<string> = portNameArb): fc.Arbitrary<LawTestPort> {
  return nameArb.map(makePort);
}

/**
 * Generates an arbitrary adapter (no dependencies) from a port arbitrary.
 */
export function arbAdapter(
  portArb: fc.Arbitrary<LawTestPort> = arbPort(),
  ltArb: fc.Arbitrary<Lifetime> = lifetimeArb
): fc.Arbitrary<any> {
  return fc.tuple(portArb, ltArb).map(([p, lt]) => makeAdapter(p, lt));
}

/**
 * Generates an arbitrary GraphBuilder from a list of independent adapters
 * using unique port names with the given prefix.
 *
 * The prefix ensures that builders from different arbitraries have disjoint ports,
 * which is critical for associativity and commutativity tests.
 */
export function arbGraphBuilder(
  prefix: string,
  minAdapters = 0,
  maxAdapters = 5
): fc.Arbitrary<any> {
  return uniquePrefixedNamesArb(prefix, minAdapters, maxAdapters).map(names => {
    const ports = names.map(makePort);
    const adapters = ports.map(p => makeAdapter(p));
    let builder: any = GraphBuilder.create();
    for (const adapter of adapters) {
      builder = builder.provide(adapter);
    }
    return builder;
  });
}

// =============================================================================
// Graph Equivalence Helpers
// =============================================================================

/**
 * Extracts the set of provided port names from a builder's inspection.
 */
export function providedPortNames(builder: any): Set<string> {
  const inspection = builder.inspect();
  return new Set(
    (inspection.provides as readonly string[]).map((p: string) => p.replace(/ \(.*\)$/, ""))
  );
}

/**
 * Extracts the set of override port names from a builder.
 */
export function overridePortNameSet(builder: any): Set<string> {
  return new Set(builder.overridePortNames);
}

/**
 * Checks structural equivalence of two builders:
 * - Same set of adapter port names (order-insensitive)
 * - Same override port names
 * - Same adapter count
 * - Same isComplete status
 */
export function assertBuildersEquivalent(
  left: any,
  right: any
): { equivalent: boolean; reason?: string } {
  const leftProvides = providedPortNames(left);
  const rightProvides = providedPortNames(right);

  if (leftProvides.size !== rightProvides.size) {
    return {
      equivalent: false,
      reason: `Different provide counts: ${leftProvides.size} vs ${rightProvides.size}`,
    };
  }

  for (const name of leftProvides) {
    if (!rightProvides.has(name)) {
      return {
        equivalent: false,
        reason: `Port "${name}" in left but not right`,
      };
    }
  }

  const leftOverrides = overridePortNameSet(left);
  const rightOverrides = overridePortNameSet(right);

  if (leftOverrides.size !== rightOverrides.size) {
    return {
      equivalent: false,
      reason: `Different override counts: ${leftOverrides.size} vs ${rightOverrides.size}`,
    };
  }

  for (const name of leftOverrides) {
    if (!rightOverrides.has(name)) {
      return {
        equivalent: false,
        reason: `Override "${name}" in left but not right`,
      };
    }
  }

  const leftInspection = left.inspect();
  const rightInspection = right.inspect();

  if (leftInspection.adapterCount !== rightInspection.adapterCount) {
    return {
      equivalent: false,
      reason: `Different adapter counts: ${leftInspection.adapterCount} vs ${rightInspection.adapterCount}`,
    };
  }

  if (leftInspection.isComplete !== rightInspection.isComplete) {
    return {
      equivalent: false,
      reason: `Different completeness: ${leftInspection.isComplete} vs ${rightInspection.isComplete}`,
    };
  }

  return { equivalent: true };
}
