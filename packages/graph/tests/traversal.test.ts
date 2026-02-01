import { describe, it, expect } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  buildDependencyMap,
  topologicalSort,
  getTransitiveDependencies,
  getTransitiveDependents,
  findDependencyPath,
  findCommonDependencies,
  computeDependencyLayers,
  getPortsByLayer,
} from "../src/advanced.js";

// Test fixtures
const ConfigPort = createPort<{ dbUrl: string }>({ name: "Config" });
const LoggerPort = createPort<{ log: (msg: string) => void }, "Logger">({ name: "Logger" });
const DatabasePort = createPort<{ query: (sql: string) => void }, "Database">({ name: "Database" });
const CachePort = createPort<{ get: (key: string) => unknown }, "Cache">({ name: "Cache" });
const UserRepoPort = createPort<{ find: (id: string) => unknown }, "UserRepo">({
  name: "UserRepo",
});
const UserServicePort = createPort<{ getUser: (id: string) => unknown }, "UserService">({
  name: "UserService",
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ dbUrl: "postgres://localhost" }),
});

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: ({ Config }) => ({
    query: () => {
      void Config;
    },
  }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: ({ Config }) => ({
    get: () => {
      void Config;
      return null;
    },
  }),
});

const UserRepoAdapter = createAdapter({
  provides: UserRepoPort,
  requires: [DatabasePort, CachePort],
  lifetime: "scoped",
  factory: ({ Database, Cache }) => ({
    find: () => {
      void Database;
      void Cache;
      return null;
    },
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [UserRepoPort, LoggerPort],
  lifetime: "scoped",
  factory: ({ UserRepo, Logger }) => ({
    getUser: (id: string) => {
      Logger.log(`Getting user ${id}`);
      return UserRepo.find(id);
    },
  }),
});

describe("Graph Traversal Utilities", () => {
  const graph = GraphBuilder.create()
    .provide(ConfigAdapter)
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(CacheAdapter)
    .provide(UserRepoAdapter)
    .provide(UserServiceAdapter)
    .build();

  describe("buildDependencyMap", () => {
    it("builds adjacency map from adapters", () => {
      const depMap = buildDependencyMap(graph.adapters);

      expect(depMap["Config"]).toEqual([]);
      expect(depMap["Logger"]).toEqual([]);
      expect(depMap["Database"]).toEqual(["Config"]);
      expect(depMap["Cache"]).toEqual(["Config"]);
      expect(depMap["UserRepo"]).toEqual(["Database", "Cache"]);
      expect(depMap["UserService"]).toEqual(["UserRepo", "Logger"]);
    });

    it("returns frozen object", () => {
      const depMap = buildDependencyMap(graph.adapters);
      expect(Object.isFrozen(depMap)).toBe(true);
    });
  });

  describe("topologicalSort", () => {
    it("returns valid initialization order", () => {
      const order = topologicalSort(graph.adapters);
      expect(order).not.toBeNull();

      if (order) {
        // Config and Logger should come before Database and Cache
        expect(order.indexOf("Config")).toBeLessThan(order.indexOf("Database"));
        expect(order.indexOf("Config")).toBeLessThan(order.indexOf("Cache"));

        // Database and Cache should come before UserRepo
        expect(order.indexOf("Database")).toBeLessThan(order.indexOf("UserRepo"));
        expect(order.indexOf("Cache")).toBeLessThan(order.indexOf("UserRepo"));

        // UserRepo should come before UserService
        expect(order.indexOf("UserRepo")).toBeLessThan(order.indexOf("UserService"));

        // Logger should come before UserService
        expect(order.indexOf("Logger")).toBeLessThan(order.indexOf("UserService"));
      }
    });

    it("returns null for cyclic graphs", () => {
      // Create circular dependency for testing
      const APort = createPort<{ a: true }>({ name: "A" });
      const BPort = createPort<{ b: true }>({ name: "B" });

      // These would normally fail at compile time, but we test runtime behavior
      const adapters = [
        {
          provides: APort,
          requires: [BPort],
          lifetime: "singleton" as const,
          factoryKind: "sync" as const,
          factory: () => ({ a: true }),
          clonable: false,
        },
        {
          provides: BPort,
          requires: [APort],
          lifetime: "singleton" as const,
          factoryKind: "sync" as const,
          factory: () => ({ b: true }),
          clonable: false,
        },
      ];

      const order = topologicalSort(adapters);
      expect(order).toBeNull();
    });
  });

  describe("getTransitiveDependencies", () => {
    it("returns all dependencies of UserService", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const deps = getTransitiveDependencies("UserService", depMap);

      expect(deps.has("UserRepo")).toBe(true);
      expect(deps.has("Logger")).toBe(true);
      expect(deps.has("Database")).toBe(true);
      expect(deps.has("Cache")).toBe(true);
      expect(deps.has("Config")).toBe(true);

      // Should not include itself
      expect(deps.has("UserService")).toBe(false);
    });

    it("returns empty set for leaf nodes", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const deps = getTransitiveDependencies("Config", depMap);
      expect(deps.size).toBe(0);
    });
  });

  describe("getTransitiveDependents", () => {
    it("returns all dependents of Config", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const dependents = getTransitiveDependents("Config", depMap);

      expect(dependents.has("Database")).toBe(true);
      expect(dependents.has("Cache")).toBe(true);
      expect(dependents.has("UserRepo")).toBe(true);
      expect(dependents.has("UserService")).toBe(true);

      // Logger doesn't depend on Config
      expect(dependents.has("Logger")).toBe(false);
    });
  });

  describe("findDependencyPath", () => {
    it("finds path from UserService to Config", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const path = findDependencyPath("UserService", "Config", depMap);

      expect(path).not.toBeNull();
      if (path) {
        expect(path[0]).toBe("UserService");
        expect(path[path.length - 1]).toBe("Config");
        // Valid path: UserService -> UserRepo -> (Database|Cache) -> Config
        expect(path.length).toBeGreaterThanOrEqual(4);
      }
    });

    it("returns null for non-existent paths", () => {
      const depMap = buildDependencyMap(graph.adapters);
      // Logger doesn't depend on Database
      const path = findDependencyPath("Logger", "Database", depMap);
      expect(path).toBeNull();
    });

    it("returns single element for same source and target", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const path = findDependencyPath("Config", "Config", depMap);
      expect(path).toEqual(["Config"]);
    });
  });

  describe("findCommonDependencies", () => {
    it("finds common dependencies of Database and Cache", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const common = findCommonDependencies(["Database", "Cache"], depMap);

      expect(common.has("Config")).toBe(true);
    });

    it("returns empty set for ports with no common dependencies", () => {
      const depMap = buildDependencyMap(graph.adapters);
      const common = findCommonDependencies(["Config", "Logger"], depMap);
      expect(common.size).toBe(0);
    });
  });

  describe("computeDependencyLayers", () => {
    it("computes correct levels for all ports", () => {
      const layers = computeDependencyLayers(graph.adapters);
      expect(layers).not.toBeNull();

      if (layers) {
        // Config and Logger have no dependencies - level 0
        expect(layers.get("Config")).toBe(0);
        expect(layers.get("Logger")).toBe(0);

        // Database and Cache depend on Config - level 1
        expect(layers.get("Database")).toBe(1);
        expect(layers.get("Cache")).toBe(1);

        // UserRepo depends on Database and Cache - level 2
        expect(layers.get("UserRepo")).toBe(2);

        // UserService depends on UserRepo (level 2) and Logger (level 0) - level 3
        expect(layers.get("UserService")).toBe(3);
      }
    });
  });

  describe("getPortsByLayer", () => {
    it("groups ports by initialization level", () => {
      const layers = getPortsByLayer(graph.adapters);
      expect(layers).not.toBeNull();

      if (layers) {
        expect(layers.length).toBe(4);

        // Level 0: Config, Logger (order may vary)
        expect(new Set(layers[0])).toEqual(new Set(["Config", "Logger"]));

        // Level 1: Database, Cache (order may vary)
        expect(new Set(layers[1])).toEqual(new Set(["Database", "Cache"]));

        // Level 2: UserRepo
        expect(layers[2]).toContain("UserRepo");

        // Level 3: UserService
        expect(layers[3]).toContain("UserService");
      }
    });
  });
});
