/**
 * Type Tests for Graph Port Category Utilities
 *
 * Verifies PortsByCategory, HasCategory, and category flow through
 * GraphBuilder.provide() into InferGraphProvides.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { createAdapter, port, type DirectedPort, type InferPortCategory } from "@hex-di/core";
import { createLibraryInspectorPort } from "@hex-di/core";
import type { LibraryInspector } from "@hex-di/core";
import { GraphBuilder, InferGraphProvides } from "../src/index.js";
import type { PortsByCategory, HasCategory } from "../src/builder/types/inspection.js";
import { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "../src/internal.js";

void __emptyDepGraphBrand;
void __emptyLifetimeMapBrand;

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger", category: "domain" });
const InfraPort = port<Logger>()({ name: "InfraLogger", category: "infrastructure" });
const UncategorizedPort = port<Logger>()({ name: "PlainLogger" });

const InspectorPort = createLibraryInspectorPort({
  name: "FlowInspector",
  description: "Flow library inspection",
});

type LoggerPortType = typeof LoggerPort;
type InfraPortType = typeof InfraPort;
type UncategorizedPortType = typeof UncategorizedPort;
type InspectorPortType = typeof InspectorPort;

type AllPorts = LoggerPortType | InfraPortType | InspectorPortType;

// =============================================================================
// PortsByCategory
// =============================================================================

describe("PortsByCategory", () => {
  it("filters provides union by category", () => {
    type DomainPorts = PortsByCategory<AllPorts, "domain">;
    expectTypeOf<DomainPorts>().toEqualTypeOf<LoggerPortType>();
  });

  it("returns never when no match", () => {
    type NoPorts = PortsByCategory<AllPorts, "persistence">;
    expectTypeOf<NoPorts>().toEqualTypeOf<never>();
  });

  it("extracts library-inspector ports", () => {
    type LIPorts = PortsByCategory<AllPorts, "library-inspector">;
    expectTypeOf<LIPorts>().toEqualTypeOf<InspectorPortType>();
  });
});

// =============================================================================
// HasCategory
// =============================================================================

describe("HasCategory", () => {
  it("returns true when category present", () => {
    type Result = HasCategory<AllPorts, "domain">;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("returns false when category absent", () => {
    type Result = HasCategory<AllPorts, "persistence">;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Category flow through GraphBuilder
// =============================================================================

describe("category flows through GraphBuilder.provide()", () => {
  it("preserves category in InferGraphProvides", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const InspectorAdapter = createAdapter({
      provides: InspectorPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        name: "flow",
        getSnapshot: () => Object.freeze({}),
      }),
    });

    const builder = GraphBuilder.create().provide(LoggerAdapter).provide(InspectorAdapter);

    type Provides = InferGraphProvides<typeof builder>;
    type InspectorPorts = PortsByCategory<Provides, "library-inspector">;
    type HasInspector = HasCategory<Provides, "library-inspector">;
    type HasDomain = HasCategory<Provides, "domain">;

    expectTypeOf<HasInspector>().toEqualTypeOf<true>();
    expectTypeOf<HasDomain>().toEqualTypeOf<true>();
    expectTypeOf<InferPortCategory<InspectorPorts>>().toEqualTypeOf<"library-inspector">();
  });
});
