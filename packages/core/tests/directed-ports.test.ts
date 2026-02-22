/**
 * Unit tests for Directed Port APIs.
 *
 * These tests verify:
 * 1. createInboundPort() creates ports with 'inbound' direction (PORT-01)
 * 2. createOutboundPort() creates ports with 'outbound' direction (PORT-02)
 * 3. Port metadata (description, category, tags) accessible (PORT-03)
 * 4. isDirectedPort() correctly narrows type (PORT-04)
 * 5. Backward compatibility - directed ports work like regular ports (PORT-05)
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  createPort,
  port,
  isDirectedPort,
  isInboundPort,
  isOutboundPort,
  getPortDirection,
  getPortMetadata,
  createAdapter,
} from "../src/index.js";
import type {
  Port,
  InboundPort,
  OutboundPort,
  DirectedPort,
  PortDirection,
  PortMetadata,
  InferService,
  InferPortName,
  InferPortDirection,
  InferPortMetadata,
  IsDirectedPort,
  InboundPorts,
  OutboundPorts,
} from "../src/index.js";

// =============================================================================
// Test Interfaces
// =============================================================================

interface UserService {
  getUser(id: string): { id: string; name: string };
}

interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

interface Logger {
  log(message: string): void;
}

// =============================================================================
// PORT-01: createPort() with inbound direction
// =============================================================================

describe("createPort() with inbound direction (PORT-01)", () => {
  it("creates port with 'inbound' direction", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    expect(getPortDirection(testPort)).toBe("inbound");
  });

  it("preserves port name as literal type", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    expect(testPort.__portName).toBe("UserService");
    expectTypeOf(testPort.__portName).toEqualTypeOf<"UserService">();
  });

  it("preserves service type (InferService works)", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    type Extracted = InferService<typeof testPort>;
    expectTypeOf<Extracted>().toEqualTypeOf<UserService>();
  });

  it("includes metadata when provided", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
      description: "User management use cases",
      category: "domain",
      tags: ["user", "crud"],
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("User management use cases");
    expect(metadata?.category).toBe("domain");
    expect(metadata?.tags).toEqual(["user", "crud"]);
  });

  it("works with empty metadata (only name)", () => {
    const testPort = port<Logger>()({
      name: "SimplePort",
      direction: "inbound",
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBeUndefined();
    expect(metadata?.category).toBeUndefined();
    // tags returns empty array when not specified
    expect(metadata?.tags).toEqual([]);
  });

  it("port is frozen (Object.isFrozen)", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    expect(Object.isFrozen(testPort)).toBe(true);
  });

  it("returns InboundPort type", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    expectTypeOf(testPort).toMatchTypeOf<InboundPort<"UserService", UserService>>();
  });
});

// =============================================================================
// PORT-02: createPort() with outbound direction (default)
// =============================================================================

describe("createPort() with outbound direction (PORT-02)", () => {
  it("creates port with 'outbound' direction", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
    });

    expect(getPortDirection(testPort)).toBe("outbound");
  });

  it("preserves port name as literal type", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
    });

    expect(testPort.__portName).toBe("UserRepository");
    expectTypeOf(testPort.__portName).toEqualTypeOf<"UserRepository">();
  });

  it("preserves service type (InferService works)", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
    });

    type Extracted = InferService<typeof testPort>;
    expectTypeOf<Extracted>().toEqualTypeOf<UserRepository>();
  });

  it("includes metadata when provided", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
      description: "User persistence operations",
      category: "infrastructure",
      tags: ["user", "database", "storage"],
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("User persistence operations");
    expect(metadata?.category).toBe("infrastructure");
    expect(metadata?.tags).toEqual(["user", "database", "storage"]);
  });

  it("works with empty metadata (only name)", () => {
    const testPort = port<UserRepository>()({
      name: "SimpleRepo",
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBeUndefined();
  });

  it("port is frozen (Object.isFrozen)", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
    });

    expect(Object.isFrozen(testPort)).toBe(true);
  });

  it("returns OutboundPort type", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
    });

    expectTypeOf(testPort).toMatchTypeOf<OutboundPort<"UserRepository", UserRepository>>();
  });
});

// =============================================================================
// PORT-03: Port metadata
// =============================================================================

describe("Port metadata (PORT-03)", () => {
  it("description field accessible via getPortMetadata()", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
      description: "A test port description",
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata?.description).toBe("A test port description");
  });

  it("category field accessible", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
      category: "infrastructure",
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata?.category).toBe("infrastructure");
  });

  it("tags array accessible and readonly", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
      tags: ["logging", "debug"],
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata?.tags).toEqual(["logging", "debug"]);

    // Type should be readonly
    expectTypeOf(metadata?.tags).toEqualTypeOf<readonly string[] | undefined>();
  });

  it("metadata accessible from port created with createPort", () => {
    const testPort = port<Logger>()({ name: "RegularPort" });

    const metadata = getPortMetadata(testPort);
    // New API: all ports have metadata (tags defaults to [])
    expect(metadata).toBeDefined();
    expect(metadata?.tags).toEqual([]);
  });

  it("metadata object is frozen", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
      description: "Frozen metadata",
    });

    const metadata = getPortMetadata(testPort);
    expect(Object.isFrozen(metadata)).toBe(true);
  });

  it("all metadata fields can be provided together", () => {
    const testPort = port<UserRepository>()({
      name: "FullMetadataPort",
      description: "Full metadata example",
      category: "domain",
      tags: ["test", "example", "full"],
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata).toEqual({
      description: "Full metadata example",
      category: "domain",
      tags: ["test", "example", "full"],
    });
  });
});

// =============================================================================
// PORT-04: isDirectedPort() type guard
// =============================================================================

describe("isDirectedPort() type guard (PORT-04)", () => {
  it("returns true for inbound ports", () => {
    const testPort = port<Logger>()({
      name: "TestInbound",
      direction: "inbound",
    });

    expect(isDirectedPort(testPort)).toBe(true);
  });

  it("returns true for outbound ports", () => {
    const testPort = port<UserRepository>()({
      name: "TestOutbound",
    });

    expect(isDirectedPort(testPort)).toBe(true);
  });

  it("all createPort ports are now directed", () => {
    // In the new unified API, all ports are DirectedPort (default outbound)
    const testPort = port<Logger>()({ name: "RegularPort" });

    expect(isDirectedPort(testPort)).toBe(true);
    expect(getPortDirection(testPort)).toBe("outbound");
  });

  it("type narrowing works correctly (expectTypeOf)", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
    });

    // Before narrowing - port is InboundPort
    expectTypeOf(testPort).toMatchTypeOf<InboundPort<"TestPort", Logger>>();

    if (isDirectedPort(testPort)) {
      // After narrowing - still DirectedPort
      expectTypeOf(testPort).toMatchTypeOf<DirectedPort<string, unknown, PortDirection>>();
    }
  });
});

// =============================================================================
// isInboundPort() and isOutboundPort() guards
// =============================================================================

describe("isInboundPort() and isOutboundPort() guards", () => {
  it("isInboundPort returns true only for inbound", () => {
    const inbound = port<Logger>()({
      name: "Inbound",
      direction: "inbound",
    });
    const outbound = port<UserRepository>()({ name: "Outbound" });

    expect(isInboundPort(inbound)).toBe(true);
    expect(isInboundPort(outbound)).toBe(false);
  });

  it("isOutboundPort returns true only for outbound", () => {
    const inbound = port<Logger>()({
      name: "Inbound",
      direction: "inbound",
    });
    const outbound = port<UserRepository>()({ name: "Outbound" });

    expect(isOutboundPort(inbound)).toBe(false);
    expect(isOutboundPort(outbound)).toBe(true);
  });

  it("default direction is outbound", () => {
    const testPort = port<Logger>()({ name: "Regular" });

    expect(isInboundPort(testPort)).toBe(false);
    expect(isOutboundPort(testPort)).toBe(true);
  });

  it("type narrowing is specific to direction for isInboundPort", () => {
    const testPort: Port<string, Logger> = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
    });

    if (isInboundPort(testPort)) {
      expectTypeOf(testPort).toMatchTypeOf<InboundPort<string, unknown>>();
    }
  });

  it("type narrowing is specific to direction for isOutboundPort", () => {
    const testPort: Port<string, UserRepository> = port<UserRepository>()({
      name: "TestPort",
    });

    if (isOutboundPort(testPort)) {
      expectTypeOf(testPort).toMatchTypeOf<OutboundPort<string, unknown>>();
    }
  });
});

// =============================================================================
// PORT-05: Backward compatibility
// =============================================================================

describe("Backward compatibility (PORT-05)", () => {
  it("directed ports have __portName property", () => {
    const inbound = port<Logger>()({
      name: "InboundTest",
      direction: "inbound",
    });
    const outbound = port<UserRepository>()({ name: "OutboundTest" });

    expect(inbound.__portName).toBe("InboundTest");
    expect(outbound.__portName).toBe("OutboundTest");
  });

  it("InferService<DirectedPort> returns service type", () => {
    const testPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    type Service = InferService<typeof testPort>;
    expectTypeOf<Service>().toEqualTypeOf<UserService>();
  });

  it("InferPortName<DirectedPort> returns name type", () => {
    const testPort = port<UserRepository>()({
      name: "UserRepository",
    });

    type Name = InferPortName<typeof testPort>;
    expectTypeOf<Name>().toEqualTypeOf<"UserRepository">();
  });

  it("directed port assignable to Port<string, unknown>", () => {
    const inbound = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
    });

    // Should compile - directed port is assignable to base Port
    const basePort: Port<string, unknown> = inbound;
    expect(basePort.__portName).toBe("TestPort");
  });

  it("createPort() with object config works", () => {
    const testPort = port<Logger>()({ name: "RegularPort" });

    expect(testPort.__portName).toBe("RegularPort");
    // New API: all ports are directed (default outbound)
    expect(isDirectedPort(testPort)).toBe(true);
    expect(getPortDirection(testPort)).toBe("outbound");
    expect(getPortMetadata(testPort)).toBeDefined();
  });
});

// =============================================================================
// Type-level utilities
// =============================================================================

describe("Type-level utilities", () => {
  it("IsDirectedPort<InboundPort> is true", () => {
    type Result = IsDirectedPort<InboundPort<"Logger", Logger>>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("IsDirectedPort<OutboundPort> is true", () => {
    type Result = IsDirectedPort<OutboundPort<"UserRepo", UserRepository>>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("IsDirectedPort<Port> is false", () => {
    type Result = IsDirectedPort<Port<"Logger", Logger>>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("InferPortDirection extracts direction for inbound", () => {
    type Direction = InferPortDirection<InboundPort<"Logger", Logger>>;
    expectTypeOf<Direction>().toEqualTypeOf<"inbound">();
  });

  it("InferPortDirection extracts direction for outbound", () => {
    type Direction = InferPortDirection<OutboundPort<"UserRepo", UserRepository>>;
    expectTypeOf<Direction>().toEqualTypeOf<"outbound">();
  });

  it("InferPortMetadata extracts metadata type", () => {
    type Meta = InferPortMetadata<InboundPort<"Logger", Logger>>;
    expectTypeOf<Meta>().toEqualTypeOf<PortMetadata>();
  });

  it("InferPortDirection returns never for regular Port", () => {
    type Direction = InferPortDirection<Port<"Logger", Logger>>;
    expectTypeOf<Direction>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Accessor functions
// =============================================================================

describe("Accessor functions", () => {
  it("getPortDirection() returns direction for inbound directed ports", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
    });

    expect(getPortDirection(testPort)).toBe("inbound");
  });

  it("getPortDirection() returns direction for outbound directed ports", () => {
    const testPort = port<UserRepository>()({ name: "TestPort" });

    expect(getPortDirection(testPort)).toBe("outbound");
  });

  it("getPortDirection() returns outbound by default", () => {
    const testPort = port<Logger>()({ name: "TestPort" });

    // New API: defaults to outbound
    expect(getPortDirection(testPort)).toBe("outbound");
  });

  it("getPortMetadata() returns metadata for directed ports", () => {
    const testPort = port<Logger>()({
      name: "TestPort",
      direction: "inbound",
      description: "Test description",
    });

    const metadata = getPortMetadata(testPort);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("Test description");
  });

  it("getPortMetadata() returns metadata with defaults for ports without explicit metadata", () => {
    const testPort = port<Logger>()({ name: "TestPort" });

    const metadata = getPortMetadata(testPort);
    // New API: always has metadata, tags default to []
    expect(metadata).toBeDefined();
    expect(metadata?.tags).toEqual([]);
  });
});

// =============================================================================
// Integration with adapters
// =============================================================================

describe("integration with adapters", () => {
  it("directed ports work as provides target", () => {
    const UserServicePort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
      description: "User operations",
    });

    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        getUser: (id: string) => ({ id, name: "Test User" }),
      }),
    });

    expect(adapter.provides).toBe(UserServicePort);
    expect(adapter.lifetime).toBe("singleton");

    // Type inference works
    expectTypeOf(adapter.provides).toMatchTypeOf<InboundPort<"UserService", UserService>>();
  });

  it("directed ports work in requires array", () => {
    const LoggerPort = port<Logger>()({
      name: "Logger",
      category: "infrastructure",
    });

    const UserServicePort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: deps => ({
        getUser: (id: string) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: "Test User" };
        },
      }),
    });

    expect(adapter.requires).toContain(LoggerPort);
    expect(adapter.requires.length).toBe(1);
  });

  it("type inference flows correctly through the adapter", () => {
    const RepoPort = port<UserRepository>()({
      name: "Repo",
    });

    const ServicePort = port<UserService>()({
      name: "Service",
      direction: "inbound",
    });

    const adapter = createAdapter({
      provides: ServicePort,
      requires: [RepoPort],
      lifetime: "scoped",
      factory: deps => {
        // deps.Repo should be typed as UserRepository
        expectTypeOf(deps.Repo).toMatchTypeOf<UserRepository>();

        return {
          getUser: (id: string) => ({ id, name: "From Repo" }),
        };
      },
    });

    // Verify return type
    type ProvidedService = InferService<typeof adapter.provides>;
    expectTypeOf<ProvidedService>().toEqualTypeOf<UserService>();
  });

  it("multiple directed ports work together", () => {
    const ConfigPort = port<{ appName: string }>()({ name: "Config" });
    const LoggerPort = port<Logger>()({
      name: "Logger",
    });
    const ServicePort = port<UserService>()({
      name: "AppService",
      direction: "inbound",
    });

    const adapter = createAdapter({
      provides: ServicePort,
      requires: [ConfigPort, LoggerPort],
      lifetime: "singleton",
      factory: deps => {
        // Both dependencies typed correctly
        expectTypeOf(deps.Config).toMatchTypeOf<{ appName: string }>();
        expectTypeOf(deps.Logger).toMatchTypeOf<Logger>();

        return {
          getUser: (id: string) => ({ id, name: deps.Config.appName }),
        };
      },
    });

    expect(adapter.requires.length).toBe(2);
  });
});

// =============================================================================
// Unified createPort() API Tests
// =============================================================================

describe("Unified createPort() with object config", () => {
  describe("Direction defaults to outbound", () => {
    it("returns outbound direction when not specified (full inference)", () => {
      // Full inference - TService is unknown, but name is literal
      const LoggerPort = createPort({ name: "Logger" });

      expect(getPortDirection(LoggerPort)).toBe("outbound");
      expectTypeOf<InferPortDirection<typeof LoggerPort>>().toEqualTypeOf<"outbound">();
      expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
    });

    it("returns outbound direction when not specified (with service type)", () => {
      // With service type - TName becomes string (TypeScript limitation)
      const LoggerPort = port<Logger>()({ name: "Logger" });

      expect(getPortDirection(LoggerPort)).toBe("outbound");
      expect(LoggerPort.__portName).toBe("Logger");
      // Note: When providing single type param, name type is widened to string
      // This is a TypeScript limitation with partial type argument inference
    });

    it("preserves inbound literal type when specified (full inference)", () => {
      const ServicePort = createPort({
        name: "UserService",
        direction: "inbound",
      });

      expect(getPortDirection(ServicePort)).toBe("inbound");
      expectTypeOf<InferPortDirection<typeof ServicePort>>().toEqualTypeOf<"inbound">();
      expectTypeOf(ServicePort.__portName).toEqualTypeOf<"UserService">();
    });

    it("preserves outbound literal type when explicitly specified (full inference)", () => {
      const RepoPort = createPort({
        name: "UserRepository",
        direction: "outbound",
      });

      expect(getPortDirection(RepoPort)).toBe("outbound");
      expectTypeOf<InferPortDirection<typeof RepoPort>>().toEqualTypeOf<"outbound">();
    });
  });

  describe("Name literal type preserved with full inference", () => {
    it("infers name as literal type when no type params provided", () => {
      const LoggerPort = createPort({ name: "Logger" });

      expect(LoggerPort.__portName).toBe("Logger");
      // Full inference preserves literal type
      expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
    });

    it("works with InferPortName (full inference)", () => {
      const LoggerPort = createPort({ name: "MyLogger" });

      expectTypeOf<InferPortName<typeof LoggerPort>>().toEqualTypeOf<"MyLogger">();
    });
  });

  describe("Metadata handling", () => {
    it("returns empty array for tags when not specified", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });
      const metadata = getPortMetadata(LoggerPort);

      expect(metadata).toBeDefined();
      expect(metadata?.tags).toEqual([]);
    });

    it("returns undefined for description when not specified", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });
      const metadata = getPortMetadata(LoggerPort);

      expect(metadata?.description).toBeUndefined();
    });

    it("returns undefined for category when not specified", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });
      const metadata = getPortMetadata(LoggerPort);

      expect(metadata?.category).toBeUndefined();
    });

    it("preserves full metadata when provided", () => {
      const LoggerPort = port<Logger>()({
        name: "Logger",
        description: "Application logging",
        category: "infrastructure",
        tags: ["logging", "core"],
      });

      const metadata = getPortMetadata(LoggerPort);
      expect(metadata?.description).toBe("Application logging");
      expect(metadata?.category).toBe("infrastructure");
      expect(metadata?.tags).toEqual(["logging", "core"]);
    });
  });

  describe("Type compatibility", () => {
    it("is assignable to DirectedPort (full inference)", () => {
      const LoggerPort = createPort({ name: "Logger" });

      // With full inference, TService is unknown but name literal is preserved
      expectTypeOf(LoggerPort).toMatchTypeOf<DirectedPort<"Logger", unknown, "outbound">>();
    });

    it("is assignable to base Port (full inference)", () => {
      const LoggerPort = createPort({ name: "Logger" });

      // DirectedPort extends Port, so this should work
      expectTypeOf(LoggerPort).toMatchTypeOf<Port<"Logger", unknown>>();
    });

    it("works with InferService when service type provided", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });

      expectTypeOf<InferService<typeof LoggerPort>>().toEqualTypeOf<Logger>();
    });
  });

  describe("All createPort() calls return DirectedPort", () => {
    it("object config creates DirectedPort", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });

      expect(LoggerPort.__portName).toBe("Logger");
      expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
    });

    it("all ports are DirectedPort with default outbound direction", () => {
      const LoggerPort = port<Logger>()({ name: "Logger" });

      // All ports created with createPort are now DirectedPort
      expect(isDirectedPort(LoggerPort)).toBe(true);
      expect(getPortDirection(LoggerPort)).toBe("outbound");
    });
  });
});

// =============================================================================
// port() Builder - Service-typed ports with full name inference
// =============================================================================

describe("port() builder for service-typed ports", () => {
  it("infers literal name when service type is provided", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });

    // TName should be "Logger" (literal), not string
    expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
    expect(LoggerPort.__portName).toBe("Logger");
  });

  it("preserves service type", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });

    expectTypeOf<InferService<typeof LoggerPort>>().toEqualTypeOf<Logger>();
  });

  it("defaults direction to outbound", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });

    expectTypeOf<InferPortDirection<typeof LoggerPort>>().toEqualTypeOf<"outbound">();
    expect(getPortDirection(LoggerPort)).toBe("outbound");
  });

  it("infers literal direction when provided", () => {
    const RequestPort = port<UserService>()({ name: "Request", direction: "inbound" });

    expectTypeOf<InferPortDirection<typeof RequestPort>>().toEqualTypeOf<"inbound">();
    expect(getPortDirection(RequestPort)).toBe("inbound");
  });

  it("supports metadata", () => {
    const LoggerPort = port<Logger>()({
      name: "Logger",
      description: "Application logging",
      category: "infrastructure",
      tags: ["logging"],
    });

    const metadata = getPortMetadata(LoggerPort);
    expect(metadata?.description).toBe("Application logging");
    expect(metadata?.category).toBe("infrastructure");
    expect(metadata?.tags).toEqual(["logging"]);
  });

  it("returns DirectedPort with correct type parameters", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });

    // Full type check
    expectTypeOf(LoggerPort).toEqualTypeOf<DirectedPort<"Logger", Logger, "outbound">>();
  });

  it("allows different port names with same service", () => {
    const ConsoleLogger = port<Logger>()({ name: "ConsoleLogger" });
    const FileLogger = port<Logger>()({ name: "FileLogger" });

    expectTypeOf(ConsoleLogger.__portName).toEqualTypeOf<"ConsoleLogger">();
    expectTypeOf(FileLogger.__portName).toEqualTypeOf<"FileLogger">();
  });
});

// =============================================================================
// InboundPorts and OutboundPorts Filter Utilities
// =============================================================================

describe("InboundPorts and OutboundPorts filter utilities", () => {
  it("InboundPorts filters to only inbound ports", () => {
    const InboundPort1 = port<{ a: string }>()({ name: "Inbound1", direction: "inbound" });
    const OutboundPort1 = port<{ b: string }>()({ name: "Outbound1" });
    const InboundPort2 = port<{ c: string }>()({ name: "Inbound2", direction: "inbound" });

    type AllPorts = typeof InboundPort1 | typeof OutboundPort1 | typeof InboundPort2;
    type Filtered = InboundPorts<AllPorts>;

    // Should only include inbound ports
    expectTypeOf<Filtered>().toEqualTypeOf<typeof InboundPort1 | typeof InboundPort2>();
  });

  it("OutboundPorts filters to only outbound ports", () => {
    const InboundPort1 = port<{ a: string }>()({ name: "Inbound1", direction: "inbound" });
    const OutboundPort1 = port<{ b: string }>()({ name: "Outbound1" });
    const OutboundPort2 = port<{ c: string }>()({ name: "Outbound2" });

    type AllPorts = typeof InboundPort1 | typeof OutboundPort1 | typeof OutboundPort2;
    type Filtered = OutboundPorts<AllPorts>;

    // Should only include outbound ports
    expectTypeOf<Filtered>().toEqualTypeOf<typeof OutboundPort1 | typeof OutboundPort2>();
  });

  it("InboundPorts returns never for outbound-only union", () => {
    const OutboundOnly = port<{ a: string }>()({ name: "OutboundOnly" });

    type Filtered = InboundPorts<typeof OutboundOnly>;

    expectTypeOf<Filtered>().toEqualTypeOf<never>();
  });

  it("OutboundPorts returns never for inbound-only union", () => {
    const InboundOnly = port<{ a: string }>()({ name: "InboundOnly", direction: "inbound" });

    type Filtered = OutboundPorts<typeof InboundOnly>;

    expectTypeOf<Filtered>().toEqualTypeOf<never>();
  });

  it("preserves full DirectedPort type including service and name", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });
    const RequestPort = port<UserService>()({ name: "Request", direction: "inbound" });

    type AllPorts = typeof LoggerPort | typeof RequestPort;
    type FilteredInbound = InboundPorts<AllPorts>;
    type FilteredOutbound = OutboundPorts<AllPorts>;

    // Verify filtered types maintain full type information
    expectTypeOf<FilteredInbound>().toEqualTypeOf<typeof RequestPort>();
    expectTypeOf<FilteredOutbound>().toEqualTypeOf<typeof LoggerPort>();
  });
});
