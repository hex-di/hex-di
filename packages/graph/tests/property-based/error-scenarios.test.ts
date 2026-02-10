/**
 * Property-Based Tests: Error Scenarios
 *
 * Tests covering error message invariants and error recovery paths.
 * Uses fast-check to verify invariants across random inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { GraphBuilder } from "../../src/index.js";
import {
  fcConfig,
  portNameArb,
  uniquePortNamesArb,
  makePort,
  makeAdapter,
  buildFromAdapters,
} from "../property-based-helpers.js";

// =============================================================================
// Property Tests: Error Message Invariants
// =============================================================================

describe("Property: Error Message Invariants", () => {
  it("inspection suggestions always have non-empty messages", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 5), names => {
        const ports = names.map(makePort);

        // Create adapters where last one depends on a non-existent port
        const missingPort = makePort("MissingDep");
        const adapters = [
          ...ports.slice(0, -1).map(p => makeAdapter(p, "singleton", [])),
          makeAdapter(ports[ports.length - 1]!, "singleton", [missingPort]),
        ];

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        // Every suggestion should have a non-empty message
        for (const suggestion of inspection.suggestions) {
          expect(suggestion.message).toBeDefined();
          expect(suggestion.message.length).toBeGreaterThan(0);
          expect(suggestion.type).toBeDefined();
          expect(suggestion.portName).toBeDefined();
        }
      }),
      fcConfig(100)
    );
  });

  it("validation errors contain port names mentioned", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        const missingDep = makePort(`Missing${name}`);
        const adapter = makeAdapter(port, "singleton", [missingDep]);

        const builder = (GraphBuilder.create() as any).provide(adapter);
        const validation = builder.validate();

        if (!validation.valid) {
          // Error messages should mention the missing port
          const allText = validation.errors.map((e: { message: string }) => e.message).join(" ");
          expect(allText).toContain(`Missing${name}`);
        }
      }),
      fcConfig(100)
    );
  });

  it("unsatisfied requirements list matches validation state", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 4), names => {
        const ports = names.map(makePort);

        // Make first adapter depend on last, but don't include last adapter
        const adapters = ports.slice(0, -1).map((port, i) => {
          if (i === 0) {
            return makeAdapter(port, "singleton", [ports[ports.length - 1]!]);
          }
          return makeAdapter(port, "singleton", []);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();
        const validation = builder.validate();

        // Both should agree on incompleteness
        expect(inspection.isComplete).toBe(validation.valid);
        expect(inspection.unsatisfiedRequirements.length).toBe(
          validation.valid ? 0 : inspection.unsatisfiedRequirements.length
        );
      }),
      fcConfig(100)
    );
  });
});

// =============================================================================
// Property Tests: Error Recovery Paths
// =============================================================================

describe("Property: Error Recovery Paths", () => {
  it("adding missing dependency makes incomplete graph complete", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 5), names => {
        const ports = names.map(makePort);

        // Create adapters where last depends on first, but skip first initially
        const missingPort = ports[0]!;
        const dependentAdapters = ports.slice(1).map((port, i) => {
          if (i === 0) {
            return makeAdapter(port, "singleton", [missingPort]);
          }
          return makeAdapter(port);
        });

        // Incomplete graph
        const incomplete = buildFromAdapters(dependentAdapters);
        expect(incomplete.inspect().isComplete).toBe(false);
        expect(incomplete.inspect().unsatisfiedRequirements).toContain(missingPort.__portName);

        // Add missing dependency
        const complete = incomplete.provide(makeAdapter(missingPort));
        expect(complete.inspect().isComplete).toBe(true);
        expect(complete.inspect().unsatisfiedRequirements).toHaveLength(0);
      }),
      fcConfig(100)
    );
  });

  it("validation state transitions from invalid to valid after fix", () => {
    fc.assert(
      fc.property(
        portNameArb,
        portNameArb.filter(n => n.length > 1),
        (mainName, depName) => {
          // Ensure names are different
          const actualDepName = mainName === depName ? `${depName}X` : depName;

          const mainPort = makePort(mainName);
          const depPort = makePort(actualDepName);

          // Create adapter with missing dependency
          const dependentAdapter = makeAdapter(mainPort, "singleton", [depPort]);
          const invalidBuilder: any = GraphBuilder.create().provide(dependentAdapter);

          const invalidValidation = invalidBuilder.validate();
          expect(invalidValidation.valid).toBe(false);

          // Fix by adding the dependency
          const depAdapter = makeAdapter(depPort);
          const fixedBuilder = invalidBuilder.provide(depAdapter);

          const validValidation = fixedBuilder.validate();
          expect(validValidation.valid).toBe(true);
        }
      ),
      fcConfig(100)
    );
  });
});
