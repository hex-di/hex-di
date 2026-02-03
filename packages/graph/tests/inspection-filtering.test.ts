/**
 * Tests for graph inspection port filtering.
 */

import { describe, it, expect } from "vitest";
import { port, createAdapter, SINGLETON, SCOPED } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  inspectGraph,
  filterPorts,
  getInboundPorts,
  getOutboundPorts,
  getPortsByCategory,
  getPortsByTags,
} from "./test-types.js";

// Test service interfaces
interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface UserService {
  getUser(id: string): unknown;
}

describe("GraphInspection port metadata", () => {
  it("includes direction for each port", () => {
    const LoggerPort = port<Logger>()({ name: "Logger" });
    const UserServicePort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: UserServicePort,
          requires: [LoggerPort],
          lifetime: SCOPED,
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    expect(info.ports).toHaveLength(2);
    expect(info.ports[0].direction).toBe("outbound");
    expect(info.ports[1].direction).toBe("inbound");
  });

  it("includes category and tags for each port", () => {
    const LoggerPort = port<Logger>()({
      name: "Logger",
      category: "infrastructure",
      tags: ["logging", "observability"],
    });
    const DatabasePort = port<Database>()({
      name: "Database",
      category: "persistence",
      tags: ["storage", "sql"],
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: DatabasePort,
          requires: [],
          lifetime: SCOPED,
          factory: () => ({ query: () => ({}) }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    expect(info.ports[0].category).toBe("infrastructure");
    expect(info.ports[0].tags).toEqual(["logging", "observability"]);
    expect(info.ports[1].category).toBe("persistence");
    expect(info.ports[1].tags).toEqual(["storage", "sql"]);
  });

  it("includes direction summary", () => {
    const InboundPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
    });
    const OutboundPort1 = port<Logger>()({ name: "Logger" });
    const OutboundPort2 = port<Database>()({ name: "Database" });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: InboundPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .provide(
        createAdapter({
          provides: OutboundPort1,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: OutboundPort2,
          requires: [],
          lifetime: SCOPED,
          factory: () => ({ query: () => ({}) }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    expect(info.directionSummary.inbound).toBe(1);
    expect(info.directionSummary.outbound).toBe(2);
  });

  it("preserves port name and lifetime", () => {
    const LoggerPort = port<Logger>()({
      name: "Logger",
      direction: "outbound",
      category: "infrastructure",
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    expect(info.ports[0].name).toBe("Logger");
    expect(info.ports[0].lifetime).toBe("singleton");
  });

  it("defaults to empty tags array when none specified", () => {
    const LoggerPort = port<Logger>()({
      name: "Logger",
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    expect(info.ports[0].tags).toEqual([]);
  });
});

describe("filterPorts", () => {
  const createTestPorts = () => [
    {
      name: "UserService",
      lifetime: "scoped",
      direction: "inbound" as const,
      category: "domain",
      tags: ["user", "core"],
    },
    {
      name: "AuthService",
      lifetime: "singleton",
      direction: "inbound" as const,
      category: "domain",
      tags: ["auth", "security"],
    },
    {
      name: "Logger",
      lifetime: "singleton",
      direction: "outbound" as const,
      category: "infrastructure",
      tags: ["logging", "observability"],
    },
    {
      name: "Database",
      lifetime: "scoped",
      direction: "outbound" as const,
      category: "persistence",
      tags: ["storage", "sql"],
    },
    {
      name: "Cache",
      lifetime: "singleton",
      direction: "outbound" as const,
      category: "infrastructure",
      tags: ["caching", "performance"],
    },
  ];

  describe("filter by direction", () => {
    it("filters to inbound only", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { direction: "inbound" });

      expect(result.matchedCount).toBe(2);
      expect(result.ports.map(p => p.name)).toEqual(["UserService", "AuthService"]);
    });

    it("filters to outbound only", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { direction: "outbound" });

      expect(result.matchedCount).toBe(3);
      expect(result.ports.map(p => p.name)).toEqual(["Logger", "Database", "Cache"]);
    });
  });

  describe("filter by category (partial match)", () => {
    it("matches category prefix", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { category: "infra" });

      expect(result.matchedCount).toBe(2);
      expect(result.ports.map(p => p.name)).toEqual(["Logger", "Cache"]);
    });

    it("matches exact category", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { category: "persistence" });

      expect(result.matchedCount).toBe(1);
      expect(result.ports[0].name).toBe("Database");
    });

    it("is case-insensitive", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { category: "DOMAIN" });

      expect(result.matchedCount).toBe(2);
    });
  });

  describe("filter by tags (partial match)", () => {
    it("matches tag prefix (any mode)", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { tags: ["log"], tagMode: "any" });

      expect(result.matchedCount).toBe(1);
      expect(result.ports[0].name).toBe("Logger");
    });

    it("matches multiple tag prefixes with any mode", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { tags: ["user", "auth"], tagMode: "any" });

      expect(result.matchedCount).toBe(2);
      expect(result.ports.map(p => p.name)).toEqual(["UserService", "AuthService"]);
    });

    it("matches multiple tag prefixes with all mode", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { tags: ["stor", "sql"], tagMode: "all" });

      expect(result.matchedCount).toBe(1);
      expect(result.ports[0].name).toBe("Database");
    });

    it("uses any mode by default", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { tags: ["user", "auth"] });

      expect(result.matchedCount).toBe(2);
    });
  });

  describe("combined filters", () => {
    it("combines with AND logic (default)", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, {
        direction: "outbound",
        category: "infra",
      });

      expect(result.matchedCount).toBe(2);
      expect(result.ports.map(p => p.name)).toEqual(["Logger", "Cache"]);
    });

    it("combines with OR logic", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, {
        direction: "inbound",
        category: "persistence",
        filterMode: "or",
      });

      // Inbound: UserService, AuthService
      // Persistence: Database
      expect(result.matchedCount).toBe(3);
    });

    it("combines direction, category, and tags with AND", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, {
        direction: "outbound",
        category: "infra",
        tags: ["log"],
        filterMode: "and",
      });

      expect(result.matchedCount).toBe(1);
      expect(result.ports[0].name).toBe("Logger");
    });

    it("includes applied filter in result", () => {
      const ports = createTestPorts();
      const filter = { direction: "inbound" as const, category: "domain" };
      const result = filterPorts(ports, filter);

      expect(result.appliedFilter).toEqual(filter);
    });

    it("includes total count in result", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { direction: "inbound" });

      expect(result.totalCount).toBe(5);
    });
  });

  describe("edge cases", () => {
    it("returns all ports when no filter specified", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, {});

      expect(result.matchedCount).toBe(5);
    });

    it("returns empty when no matches", () => {
      const ports = createTestPorts();
      const result = filterPorts(ports, { category: "nonexistent" });

      expect(result.matchedCount).toBe(0);
      expect(result.ports).toEqual([]);
    });

    it("handles ports without category", () => {
      const ports = [
        { name: "NoCategory", lifetime: "singleton", direction: "outbound" as const, tags: [] },
      ];
      const result = filterPorts(ports, { category: "any" });

      expect(result.matchedCount).toBe(0);
    });

    it("handles ports without tags", () => {
      const ports = [
        {
          name: "NoTags",
          lifetime: "singleton",
          direction: "outbound" as const,
          category: "test",
          tags: [],
        },
      ];
      const result = filterPorts(ports, { tags: ["any"] });

      expect(result.matchedCount).toBe(0);
    });

    it("handles empty ports array", () => {
      const result = filterPorts([], { direction: "inbound" });

      expect(result.matchedCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });
});

describe("convenience functions", () => {
  const ports = [
    {
      name: "A",
      lifetime: "singleton",
      direction: "inbound" as const,
      category: "domain",
      tags: ["core"],
    },
    {
      name: "B",
      lifetime: "scoped",
      direction: "outbound" as const,
      category: "infra",
      tags: ["logging"],
    },
    {
      name: "C",
      lifetime: "transient",
      direction: "inbound" as const,
      category: "domain",
      tags: ["user"],
    },
  ];

  it("getInboundPorts returns only inbound", () => {
    expect(getInboundPorts(ports).map(p => p.name)).toEqual(["A", "C"]);
  });

  it("getOutboundPorts returns only outbound", () => {
    expect(getOutboundPorts(ports).map(p => p.name)).toEqual(["B"]);
  });

  it("getPortsByCategory filters by category prefix", () => {
    expect(getPortsByCategory(ports, "dom").map(p => p.name)).toEqual(["A", "C"]);
  });

  it("getPortsByTags filters by tag prefixes", () => {
    expect(getPortsByTags(ports, ["log"]).map(p => p.name)).toEqual(["B"]);
  });

  it("getPortsByTags matches any prefix in list", () => {
    expect(getPortsByTags(ports, ["core", "user"]).map(p => p.name)).toEqual(["A", "C"]);
  });
});

describe("integration with real graph", () => {
  it("filters real inspection result by direction", () => {
    const InboundPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
      category: "domain",
      tags: ["user", "core"],
    });
    const OutboundPort = port<Logger>()({
      name: "Logger",
      category: "infrastructure",
      tags: ["logging"],
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: InboundPort,
          requires: [OutboundPort],
          lifetime: SCOPED,
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .provide(
        createAdapter({
          provides: OutboundPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    const inbound = filterPorts(info.ports, { direction: "inbound" });
    expect(inbound.matchedCount).toBe(1);
    expect(inbound.ports[0].name).toBe("UserService");

    const outbound = filterPorts(info.ports, { direction: "outbound" });
    expect(outbound.matchedCount).toBe(1);
    expect(outbound.ports[0].name).toBe("Logger");
  });

  it("filters real inspection result by category", () => {
    const DomainPort = port<UserService>()({
      name: "UserService",
      direction: "inbound",
      category: "domain",
    });
    const InfraPort = port<Logger>()({
      name: "Logger",
      category: "infrastructure",
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: DomainPort,
          requires: [],
          lifetime: SCOPED,
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .provide(
        createAdapter({
          provides: InfraPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    const domain = getPortsByCategory(info.ports, "domain");
    expect(domain.length).toBe(1);
    expect(domain[0].name).toBe("UserService");

    const infra = getPortsByCategory(info.ports, "infra");
    expect(infra.length).toBe(1);
    expect(infra[0].name).toBe("Logger");
  });

  it("filters real inspection result by tags", () => {
    const CorePort = port<UserService>()({
      name: "UserService",
      tags: ["core", "user"],
    });
    const LogPort = port<Logger>()({
      name: "Logger",
      tags: ["logging", "observability"],
    });

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: CorePort,
          requires: [],
          lifetime: SCOPED,
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .provide(
        createAdapter({
          provides: LogPort,
          requires: [],
          lifetime: SINGLETON,
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const info = inspectGraph(graph);

    const core = getPortsByTags(info.ports, ["core"]);
    expect(core.length).toBe(1);
    expect(core[0].name).toBe("UserService");

    const logging = getPortsByTags(info.ports, ["log"]);
    expect(logging.length).toBe(1);
    expect(logging[0].name).toBe("Logger");
  });
});
