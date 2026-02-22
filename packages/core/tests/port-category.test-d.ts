/**
 * Type Tests for Port Category Tracking
 *
 * Verifies compile-time behavior of the TCategory phantom parameter
 * on DirectedPort, InboundPort, OutboundPort, and related utilities.
 *
 * @packageDocumentation
 */

import { describe, it, expectTypeOf } from "vitest";
import { port, createPort } from "../src/ports/factory.js";
import { createLibraryInspectorPort } from "../src/inspection/library-inspector-types.js";
import type {
  DirectedPort,
  InboundPort,
  OutboundPort,
  InboundPorts,
  OutboundPorts,
  InferPortCategory,
} from "../src/ports/types.js";
import type { LibraryInspector } from "../src/inspection/library-inspector-types.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface Logger {
  log(msg: string): void;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

// =============================================================================
// DirectedPort TCategory defaults
// =============================================================================

describe("DirectedPort TCategory parameter", () => {
  it("defaults 4th param to string when omitted", () => {
    type ThreeParam = DirectedPort<"Logger", Logger, "outbound">;
    type FourParam = DirectedPort<"Logger", Logger, "outbound", string>;
    expectTypeOf<ThreeParam>().toEqualTypeOf<FourParam>();
  });

  it("preserves literal category", () => {
    type WithCategory = DirectedPort<"Logger", Logger, "outbound", "domain">;
    expectTypeOf<InferPortCategory<WithCategory>>().toEqualTypeOf<"domain">();
  });
});

// =============================================================================
// InboundPort / OutboundPort aliases
// =============================================================================

describe("InboundPort category", () => {
  it("defaults category to string", () => {
    type DefaultCat = InboundPort<"UserService", UserService>;
    type ExplicitString = InboundPort<"UserService", UserService, string>;
    expectTypeOf<DefaultCat>().toEqualTypeOf<ExplicitString>();
  });

  it("preserves literal category", () => {
    type WithCat = InboundPort<"UserService", UserService, "domain">;
    expectTypeOf<InferPortCategory<WithCat>>().toEqualTypeOf<"domain">();
  });
});

describe("OutboundPort category", () => {
  it("defaults category to string", () => {
    type DefaultCat = OutboundPort<"Logger", Logger>;
    type ExplicitString = OutboundPort<"Logger", Logger, string>;
    expectTypeOf<DefaultCat>().toEqualTypeOf<ExplicitString>();
  });

  it("preserves literal category", () => {
    type WithCat = OutboundPort<"Logger", Logger, "infrastructure">;
    expectTypeOf<InferPortCategory<WithCat>>().toEqualTypeOf<"infrastructure">();
  });
});

// =============================================================================
// port() builder category inference
// =============================================================================

describe("port() builder category inference", () => {
  it("has category string when no category specified", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });
    expectTypeOf<InferPortCategory<typeof LoggerPort>>().toEqualTypeOf<string>();
  });

  it("infers literal category from config", () => {
    const LoggerPort = port<Logger>()({ name: "Logger", category: "domain" });
    expectTypeOf<InferPortCategory<typeof LoggerPort>>().toEqualTypeOf<"domain">();
  });

  it("infers library-inspector category", () => {
    const InspectorPort = port<LibraryInspector>()({
      name: "FlowInspector",
      category: "library-inspector",
    });
    expectTypeOf<InferPortCategory<typeof InspectorPort>>().toEqualTypeOf<"library-inspector">();
  });
});

// =============================================================================
// InferPortCategory
// =============================================================================

describe("InferPortCategory", () => {
  it("extracts literal category", () => {
    type Cat = InferPortCategory<DirectedPort<"Logger", Logger, "outbound", "domain">>;
    expectTypeOf<Cat>().toEqualTypeOf<"domain">();
  });

  it("returns string for uncategorized ports", () => {
    type Cat = InferPortCategory<DirectedPort<"Logger", Logger, "outbound">>;
    expectTypeOf<Cat>().toEqualTypeOf<string>();
  });

  it("returns never for non-directed ports", () => {
    type Cat = InferPortCategory<{ foo: string }>;
    expectTypeOf<Cat>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// InboundPorts / OutboundPorts preserve category
// =============================================================================

describe("InboundPorts preserves category", () => {
  it("preserves category in filtered result", () => {
    type DomainInbound = InboundPort<"UserService", UserService, "domain">;
    type InfraOutbound = OutboundPort<"Logger", Logger, "infrastructure">;
    type All = DomainInbound | InfraOutbound;

    type Filtered = InboundPorts<All>;
    expectTypeOf<InferPortCategory<Filtered>>().toEqualTypeOf<"domain">();
  });
});

describe("OutboundPorts preserves category", () => {
  it("preserves category in filtered result", () => {
    type DomainInbound = InboundPort<"UserService", UserService, "domain">;
    type InfraOutbound = OutboundPort<"Logger", Logger, "infrastructure">;
    type All = DomainInbound | InfraOutbound;

    type Filtered = OutboundPorts<All>;
    expectTypeOf<InferPortCategory<Filtered>>().toEqualTypeOf<"infrastructure">();
  });
});

// =============================================================================
// createLibraryInspectorPort
// =============================================================================

describe("createLibraryInspectorPort", () => {
  it("returns correct type with library-inspector category", () => {
    const FlowPort = createLibraryInspectorPort({ name: "FlowInspector" });
    expectTypeOf<InferPortCategory<typeof FlowPort>>().toEqualTypeOf<"library-inspector">();
    expectTypeOf(FlowPort).toEqualTypeOf<
      DirectedPort<"FlowInspector", LibraryInspector, "outbound", "library-inspector">
    >();
  });

  it("service type is LibraryInspector", () => {
    const FlowPort = createLibraryInspectorPort({ name: "FlowInspector" });
    type Service =
      typeof FlowPort extends DirectedPort<string, infer S, "outbound", string> ? S : never;
    expectTypeOf<Service>().toEqualTypeOf<LibraryInspector>();
  });
});
