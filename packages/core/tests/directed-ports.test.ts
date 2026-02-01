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
  createInboundPort,
  createOutboundPort,
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
// PORT-01: createInboundPort() factory
// =============================================================================

describe("createInboundPort() factory (PORT-01)", () => {
  it("creates port with 'inbound' direction", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
    });

    expect(getPortDirection(port)).toBe("inbound");
  });

  it("preserves port name as literal type", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
    });

    expect(port.__portName).toBe("UserService");
    expectTypeOf(port.__portName).toEqualTypeOf<"UserService">();
  });

  it("preserves service type (InferService works)", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
    });

    type Extracted = InferService<typeof port>;
    expectTypeOf<Extracted>().toEqualTypeOf<UserService>();
  });

  it("includes metadata when provided", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
      description: "User management use cases",
      category: "domain",
      tags: ["user", "crud"],
    });

    const metadata = getPortMetadata(port);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("User management use cases");
    expect(metadata?.category).toBe("domain");
    expect(metadata?.tags).toEqual(["user", "crud"]);
  });

  it("works with empty metadata (only name)", () => {
    const port = createInboundPort<"SimplePort", Logger>({
      name: "SimplePort",
    });

    const metadata = getPortMetadata(port);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBeUndefined();
    expect(metadata?.category).toBeUndefined();
    expect(metadata?.tags).toBeUndefined();
  });

  it("port is frozen (Object.isFrozen)", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
    });

    expect(Object.isFrozen(port)).toBe(true);
  });

  it("returns InboundPort type", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
    });

    expectTypeOf(port).toMatchTypeOf<InboundPort<UserService, "UserService">>();
  });
});

// =============================================================================
// PORT-02: createOutboundPort() factory
// =============================================================================

describe("createOutboundPort() factory (PORT-02)", () => {
  it("creates port with 'outbound' direction", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
    });

    expect(getPortDirection(port)).toBe("outbound");
  });

  it("preserves port name as literal type", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
    });

    expect(port.__portName).toBe("UserRepository");
    expectTypeOf(port.__portName).toEqualTypeOf<"UserRepository">();
  });

  it("preserves service type (InferService works)", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
    });

    type Extracted = InferService<typeof port>;
    expectTypeOf<Extracted>().toEqualTypeOf<UserRepository>();
  });

  it("includes metadata when provided", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
      description: "User persistence operations",
      category: "infrastructure",
      tags: ["user", "database", "storage"],
    });

    const metadata = getPortMetadata(port);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("User persistence operations");
    expect(metadata?.category).toBe("infrastructure");
    expect(metadata?.tags).toEqual(["user", "database", "storage"]);
  });

  it("works with empty metadata (only name)", () => {
    const port = createOutboundPort<"SimpleRepo", UserRepository>({
      name: "SimpleRepo",
    });

    const metadata = getPortMetadata(port);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBeUndefined();
  });

  it("port is frozen (Object.isFrozen)", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
    });

    expect(Object.isFrozen(port)).toBe(true);
  });

  it("returns OutboundPort type", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
    });

    expectTypeOf(port).toMatchTypeOf<OutboundPort<UserRepository, "UserRepository">>();
  });
});

// =============================================================================
// PORT-03: Port metadata
// =============================================================================

describe("Port metadata (PORT-03)", () => {
  it("description field accessible via getPortMetadata()", () => {
    const port = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
      description: "A test port description",
    });

    const metadata = getPortMetadata(port);
    expect(metadata?.description).toBe("A test port description");
  });

  it("category field accessible", () => {
    const port = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
      category: "infrastructure",
    });

    const metadata = getPortMetadata(port);
    expect(metadata?.category).toBe("infrastructure");
  });

  it("tags array accessible and readonly", () => {
    const port = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
      tags: ["logging", "debug"],
    });

    const metadata = getPortMetadata(port);
    expect(metadata?.tags).toEqual(["logging", "debug"]);

    // Type should be readonly
    expectTypeOf(metadata?.tags).toEqualTypeOf<readonly string[] | undefined>();
  });

  it("undefined metadata returns undefined from accessor for regular port", () => {
    const regularPort = createPort<"RegularPort", Logger>("RegularPort");

    const metadata = getPortMetadata(regularPort);
    expect(metadata).toBeUndefined();
  });

  it("metadata object is frozen", () => {
    const port = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
      description: "Frozen metadata",
    });

    const metadata = getPortMetadata(port);
    expect(Object.isFrozen(metadata)).toBe(true);
  });

  it("all metadata fields can be provided together", () => {
    const port = createOutboundPort<"FullMetadataPort", UserRepository>({
      name: "FullMetadataPort",
      description: "Full metadata example",
      category: "domain",
      tags: ["test", "example", "full"],
    });

    const metadata = getPortMetadata(port);
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
    const port = createInboundPort<"TestInbound", Logger>({
      name: "TestInbound",
    });

    expect(isDirectedPort(port)).toBe(true);
  });

  it("returns true for outbound ports", () => {
    const port = createOutboundPort<"TestOutbound", UserRepository>({
      name: "TestOutbound",
    });

    expect(isDirectedPort(port)).toBe(true);
  });

  it("returns false for regular ports (createPort)", () => {
    const port = createPort<"RegularPort", Logger>("RegularPort");

    expect(isDirectedPort(port)).toBe(false);
  });

  it("type narrowing works correctly (expectTypeOf)", () => {
    const port = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
    });

    // Before narrowing - port is InboundPort
    expectTypeOf(port).toMatchTypeOf<InboundPort<Logger, "TestPort">>();

    if (isDirectedPort(port)) {
      // After narrowing - still DirectedPort
      expectTypeOf(port).toMatchTypeOf<DirectedPort<unknown, string, PortDirection>>();
    }
  });
});

// =============================================================================
// isInboundPort() and isOutboundPort() guards
// =============================================================================

describe("isInboundPort() and isOutboundPort() guards", () => {
  it("isInboundPort returns true only for inbound", () => {
    const inbound = createInboundPort<"Inbound", Logger>({ name: "Inbound" });
    const outbound = createOutboundPort<"Outbound", UserRepository>({ name: "Outbound" });

    expect(isInboundPort(inbound)).toBe(true);
    expect(isInboundPort(outbound)).toBe(false);
  });

  it("isOutboundPort returns true only for outbound", () => {
    const inbound = createInboundPort<"Inbound", Logger>({ name: "Inbound" });
    const outbound = createOutboundPort<"Outbound", UserRepository>({ name: "Outbound" });

    expect(isOutboundPort(inbound)).toBe(false);
    expect(isOutboundPort(outbound)).toBe(true);
  });

  it("both return false for regular ports", () => {
    const regular = createPort<"Regular", Logger>("Regular");

    expect(isInboundPort(regular)).toBe(false);
    expect(isOutboundPort(regular)).toBe(false);
  });

  it("type narrowing is specific to direction for isInboundPort", () => {
    const port: Port<Logger, string> = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
    });

    if (isInboundPort(port)) {
      expectTypeOf(port).toMatchTypeOf<InboundPort<unknown, string>>();
    }
  });

  it("type narrowing is specific to direction for isOutboundPort", () => {
    const port: Port<UserRepository, string> = createOutboundPort<"TestPort", UserRepository>({
      name: "TestPort",
    });

    if (isOutboundPort(port)) {
      expectTypeOf(port).toMatchTypeOf<OutboundPort<unknown, string>>();
    }
  });
});

// =============================================================================
// PORT-05: Backward compatibility
// =============================================================================

describe("Backward compatibility (PORT-05)", () => {
  it("directed ports have __portName property", () => {
    const inbound = createInboundPort<"InboundTest", Logger>({ name: "InboundTest" });
    const outbound = createOutboundPort<"OutboundTest", UserRepository>({ name: "OutboundTest" });

    expect(inbound.__portName).toBe("InboundTest");
    expect(outbound.__portName).toBe("OutboundTest");
  });

  it("InferService<DirectedPort> returns service type", () => {
    const port = createInboundPort<"UserService", UserService>({
      name: "UserService",
    });

    type Service = InferService<typeof port>;
    expectTypeOf<Service>().toEqualTypeOf<UserService>();
  });

  it("InferPortName<DirectedPort> returns name type", () => {
    const port = createOutboundPort<"UserRepository", UserRepository>({
      name: "UserRepository",
    });

    type Name = InferPortName<typeof port>;
    expectTypeOf<Name>().toEqualTypeOf<"UserRepository">();
  });

  it("directed port assignable to Port<unknown, string>", () => {
    const inbound = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
    });

    // Should compile - directed port is assignable to base Port
    const basePort: Port<unknown, string> = inbound;
    expect(basePort.__portName).toBe("TestPort");
  });

  it("createPort() still works as before", () => {
    const port = createPort<"RegularPort", Logger>("RegularPort");

    expect(port.__portName).toBe("RegularPort");
    expect(isDirectedPort(port)).toBe(false);
    expect(getPortDirection(port)).toBeUndefined();
    expect(getPortMetadata(port)).toBeUndefined();
  });
});

// =============================================================================
// Type-level utilities
// =============================================================================

describe("Type-level utilities", () => {
  it("IsDirectedPort<InboundPort> is true", () => {
    type Result = IsDirectedPort<InboundPort<Logger, "Logger">>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("IsDirectedPort<OutboundPort> is true", () => {
    type Result = IsDirectedPort<OutboundPort<UserRepository, "UserRepo">>;
    expectTypeOf<Result>().toEqualTypeOf<true>();
  });

  it("IsDirectedPort<Port> is false", () => {
    type Result = IsDirectedPort<Port<Logger, "Logger">>;
    expectTypeOf<Result>().toEqualTypeOf<false>();
  });

  it("InferPortDirection extracts direction for inbound", () => {
    type Direction = InferPortDirection<InboundPort<Logger, "Logger">>;
    expectTypeOf<Direction>().toEqualTypeOf<"inbound">();
  });

  it("InferPortDirection extracts direction for outbound", () => {
    type Direction = InferPortDirection<OutboundPort<UserRepository, "UserRepo">>;
    expectTypeOf<Direction>().toEqualTypeOf<"outbound">();
  });

  it("InferPortMetadata extracts metadata type", () => {
    type Meta = InferPortMetadata<InboundPort<Logger, "Logger">>;
    expectTypeOf<Meta>().toEqualTypeOf<PortMetadata>();
  });

  it("InferPortDirection returns never for regular Port", () => {
    type Direction = InferPortDirection<Port<Logger, "Logger">>;
    expectTypeOf<Direction>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// Accessor functions
// =============================================================================

describe("Accessor functions", () => {
  it("getPortDirection() returns direction for inbound directed ports", () => {
    const port = createInboundPort<"TestPort", Logger>({ name: "TestPort" });

    expect(getPortDirection(port)).toBe("inbound");
  });

  it("getPortDirection() returns direction for outbound directed ports", () => {
    const port = createOutboundPort<"TestPort", UserRepository>({ name: "TestPort" });

    expect(getPortDirection(port)).toBe("outbound");
  });

  it("getPortDirection() returns undefined for regular ports", () => {
    const port = createPort<"TestPort", Logger>("TestPort");

    expect(getPortDirection(port)).toBeUndefined();
  });

  it("getPortMetadata() returns metadata for directed ports", () => {
    const port = createInboundPort<"TestPort", Logger>({
      name: "TestPort",
      description: "Test description",
    });

    const metadata = getPortMetadata(port);
    expect(metadata).toBeDefined();
    expect(metadata?.description).toBe("Test description");
  });

  it("getPortMetadata() returns undefined for regular ports", () => {
    const port = createPort<"TestPort", Logger>("TestPort");

    expect(getPortMetadata(port)).toBeUndefined();
  });
});

// =============================================================================
// Integration with adapters
// =============================================================================

describe("integration with adapters", () => {
  it("directed ports work as provides target", () => {
    const UserServicePort = createInboundPort<"UserService", UserService>({
      name: "UserService",
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
    expectTypeOf(adapter.provides).toMatchTypeOf<InboundPort<UserService, "UserService">>();
  });

  it("directed ports work in requires array", () => {
    const LoggerPort = createOutboundPort<"Logger", Logger>({
      name: "Logger",
      category: "infrastructure",
    });

    const UserServicePort = createInboundPort<"UserService", UserService>({
      name: "UserService",
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
    const RepoPort = createOutboundPort<"Repo", UserRepository>({
      name: "Repo",
    });

    const ServicePort = createInboundPort<"Service", UserService>({
      name: "Service",
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

  it("mixed directed and regular ports work together", () => {
    const ConfigPort = createPort<"Config", { appName: string }>("Config");
    const LoggerPort = createOutboundPort<"Logger", Logger>({
      name: "Logger",
    });
    const ServicePort = createInboundPort<"AppService", UserService>({
      name: "AppService",
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
    it("returns outbound direction when not specified", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });

      expect(getPortDirection(LoggerPort)).toBe("outbound");
    });

    it("infers outbound literal type when not specified", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });

      expectTypeOf<InferPortDirection<typeof LoggerPort>>().toEqualTypeOf<"outbound">();
    });

    it("preserves inbound literal type when specified", () => {
      const ServicePort = createPort<UserService>({
        name: "UserService",
        direction: "inbound",
      });

      expect(getPortDirection(ServicePort)).toBe("inbound");
      expectTypeOf<InferPortDirection<typeof ServicePort>>().toEqualTypeOf<"inbound">();
    });

    it("preserves outbound literal type when explicitly specified", () => {
      const RepoPort = createPort<UserRepository>({
        name: "UserRepository",
        direction: "outbound",
      });

      expect(getPortDirection(RepoPort)).toBe("outbound");
      expectTypeOf<InferPortDirection<typeof RepoPort>>().toEqualTypeOf<"outbound">();
    });
  });

  describe("Name literal type preserved", () => {
    it("infers name as literal type", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });

      expect(LoggerPort.__portName).toBe("Logger");
      expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
    });

    it("works with InferPortName", () => {
      const LoggerPort = createPort<Logger>({ name: "MyLogger" });

      expectTypeOf<InferPortName<typeof LoggerPort>>().toEqualTypeOf<"MyLogger">();
    });
  });

  describe("Metadata handling", () => {
    it("returns empty array for tags when not specified", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });
      const metadata = getPortMetadata(LoggerPort);

      expect(metadata).toBeDefined();
      expect(metadata?.tags).toEqual([]);
    });

    it("returns undefined for description when not specified", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });
      const metadata = getPortMetadata(LoggerPort);

      expect(metadata?.description).toBeUndefined();
    });

    it("returns undefined for category when not specified", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });
      const metadata = getPortMetadata(LoggerPort);

      expect(metadata?.category).toBeUndefined();
    });

    it("preserves full metadata when provided", () => {
      const LoggerPort = createPort<Logger>({
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
    it("is assignable to DirectedPort", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });

      expectTypeOf(LoggerPort).toMatchTypeOf<DirectedPort<Logger, "Logger", "outbound">>();
    });

    it("is assignable to base Port", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });

      // DirectedPort extends Port, so this should work
      expectTypeOf(LoggerPort).toMatchTypeOf<Port<Logger, "Logger">>();
    });

    it("works with InferService", () => {
      const LoggerPort = createPort<Logger>({ name: "Logger" });

      expectTypeOf<InferService<typeof LoggerPort>>().toEqualTypeOf<Logger>();
    });
  });

  describe("Legacy string API still works", () => {
    it("creates port with string argument", () => {
      // This uses the deprecated string-based API
      const LoggerPort = createPort<"Logger", Logger>("Logger");

      expect(LoggerPort.__portName).toBe("Logger");
      expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();
    });

    it("is a regular Port (not DirectedPort)", () => {
      const LoggerPort = createPort<"Logger", Logger>("Logger");

      // String-based API returns plain Port, not DirectedPort
      expect(isDirectedPort(LoggerPort)).toBe(false);
      expect(getPortDirection(LoggerPort)).toBeUndefined();
    });
  });
});
