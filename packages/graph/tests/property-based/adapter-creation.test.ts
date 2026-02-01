/**
 * Property-Based Tests: Adapter Creation
 *
 * Tests covering adapter creation, configuration fuzzing, and async adapter handling.
 * Uses fast-check to verify invariants across random inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createAdapter } from "@hex-di/core";
import {
  fcConfig,
  portNameArb,
  lifetimeArb,
  uniquePortNamesArb,
  makePort,
  makeAdapter,
  buildFromAdapters,
} from "../property-based-helpers.js";

// =============================================================================
// Property Tests: Adapter Creation
// =============================================================================

describe("Property: Adapter Creation", () => {
  it("any valid port name creates a valid port", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        expect(port.__portName).toBe(name);
        expect(typeof port.__portName).toBe("string");
      }),
      fcConfig(500)
    );
  });

  it("any lifetime value creates a valid adapter", () => {
    fc.assert(
      fc.property(portNameArb, lifetimeArb, (name, lifetime) => {
        const port = makePort(name);
        const adapter = makeAdapter(port, lifetime);

        expect(adapter.provides).toBe(port);
        expect(adapter.lifetime).toBe(lifetime);
        expect(adapter.factoryKind).toBe("sync");
      }),
      fcConfig(500)
    );
  });

  it("factory always returns the expected shape", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        const adapter = makeAdapter(port);

        const result = adapter.factory({});
        expect(result).toEqual({ value: name });
      }),
      fcConfig(500)
    );
  });
});

// =============================================================================
// Property Tests: Adapter Configuration Fuzzing
// =============================================================================

describe("Property: Adapter Configuration Fuzzing", () => {
  it("random lifetime combinations create valid adapters", () => {
    fc.assert(
      fc.property(portNameArb, lifetimeArb, (name, lifetime) => {
        const port = makePort(name);
        const adapter = createAdapter({
          provides: port,
          requires: [] as const,
          lifetime,
          factory: () => ({ value: name }),
        });

        expect(adapter.provides).toBe(port);
        expect(adapter.lifetime).toBe(lifetime);
        expect(adapter.factoryKind).toBe("sync");
      }),
      fcConfig(300)
    );
  });

  it("adapters with random dependency counts maintain correct requires array", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(2, 6), fc.integer({ min: 0, max: 5 }), (names, depCount) => {
        const ports = names.map(makePort);
        const mainPort = ports[0]!;
        const depPorts = ports.slice(1, Math.min(depCount + 1, ports.length));

        const adapter = makeAdapter(mainPort, "singleton", depPorts);

        expect(adapter.requires.length).toBe(depPorts.length);
        for (let i = 0; i < depPorts.length; i++) {
          expect(adapter.requires[i]).toBe(depPorts[i]);
        }
      }),
      fcConfig(200)
    );
  });

  it("all lifetime values produce comparable factory behavior", () => {
    fc.assert(
      fc.property(portNameArb, name => {
        const port = makePort(name);
        const lifetimes: ("singleton" | "scoped" | "transient")[] = [
          "singleton",
          "scoped",
          "transient",
        ];

        const adapters = lifetimes.map(lifetime => makeAdapter(port, lifetime));

        // All factories should produce same result shape regardless of lifetime
        for (const adapter of adapters) {
          const result = adapter.factory({});
          expect(result).toEqual({ value: name });
        }
      }),
      fcConfig(200)
    );
  });
});

// =============================================================================
// Property Tests: Async Adapter Handling
// =============================================================================

describe("Property: Async Adapter Handling", () => {
  it("graph with sync adapters is complete and valid", () => {
    fc.assert(
      fc.property(uniquePortNamesArb(1, 5), names => {
        const ports = names.map(makePort);

        // Create all sync adapters
        const adapters = ports.map(port => makeAdapter(port));

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.isComplete).toBe(true);
        expect(inspection.adapterCount).toBe(names.length);
      }),
      fcConfig(100)
    );
  });

  it("dependency chain is tracked correctly", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 4 }), chainLength => {
        // Create chain of adapters
        const names = Array.from({ length: chainLength }, (_, i) => `Chain${i}`);
        const ports = names.map(makePort);

        // First adapter has no deps, rest depend on previous
        const adapters = ports.map((port, i) => {
          if (i === 0) {
            return makeAdapter(port);
          }
          return makeAdapter(port, "singleton", [ports[i - 1]!]);
        });

        const builder = buildFromAdapters(adapters);
        const inspection = builder.inspect();

        expect(inspection.isComplete).toBe(true);
        expect(inspection.adapterCount).toBe(chainLength);
        expect(inspection.maxChainDepth).toBe(chainLength - 1);
      }),
      fcConfig(50)
    );
  });
});
