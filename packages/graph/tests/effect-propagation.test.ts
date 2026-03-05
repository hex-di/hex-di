import { describe, it, expect } from "vitest";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";
import {
  computeErrorProfile,
  computeEffectSummaries,
  detectUnhandledErrors,
  inspectGraph,
} from "./test-types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log: (msg: string) => void;
}

interface Database {
  query: (sql: string) => unknown;
}

interface UserService {
  getUser: (id: string) => unknown;
}

interface Config {
  dbUrl: string;
}

const ConfigPort = port<Config>()({ name: "Config" });
const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const UserServicePort = port<UserService>()({ name: "UserService" });

// =============================================================================
// Infallible adapters (no error tags)
// =============================================================================

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  factory: () => ({ dbUrl: "postgres://localhost" }),
});

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  factory: () => ({ log: () => {} }),
});

// =============================================================================
// Fallible adapters (with error tags)
// =============================================================================

const DatabaseAdapterWithErrors = createAdapter({
  provides: DatabasePort,
  requires: [ConfigPort] as const,
  factory: ({ Config: _config }: { Config: Config }) => ({
    query: () => null,
  }),
  errorTags: ["ConnectionError", "TimeoutError"],
});

const UserServiceAdapterWithErrors = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort] as const,
  factory: ({ Database: _db, Logger: _logger }: { Database: Database; Logger: Logger }) => ({
    getUser: () => null,
  }),
  errorTags: ["UserNotFoundError"],
});

// =============================================================================
// Tests: 17.1 - Compute transitive error profile per port
// =============================================================================

describe("Effect Propagation Analysis", () => {
  describe("computeErrorProfile", () => {
    it("returns empty arrays for infallible adapters", () => {
      const graph = GraphBuilder.create().provide(ConfigAdapter).provide(LoggerAdapter).build();

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Logger: [],
      };

      const profile = computeErrorProfile(graph.adapters, depMap);

      expect(profile.Config).toEqual([]);
      expect(profile.Logger).toEqual([]);
    });

    it("includes direct error tags for a port", () => {
      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(DatabaseAdapterWithErrors)
        .build();

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Database: ["Config"],
      };

      const profile = computeErrorProfile(graph.adapters, depMap);

      expect(profile.Config).toEqual([]);
      expect(profile.Database).toEqual(["ConnectionError", "TimeoutError"]);
    });

    it("includes transitive error tags from dependencies", () => {
      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(LoggerAdapter)
        .provide(DatabaseAdapterWithErrors)
        .provide(UserServiceAdapterWithErrors)
        .build();

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Logger: [],
        Database: ["Config"],
        UserService: ["Database", "Logger"],
      };

      const profile = computeErrorProfile(graph.adapters, depMap);

      // UserService inherits Database's errors plus its own
      expect(profile.UserService).toEqual(["ConnectionError", "TimeoutError", "UserNotFoundError"]);

      // Database has its own errors only
      expect(profile.Database).toEqual(["ConnectionError", "TimeoutError"]);

      // Infallible ports have no errors
      expect(profile.Config).toEqual([]);
      expect(profile.Logger).toEqual([]);
    });

    it("deduplicates error tags from diamond dependencies", () => {
      // A diamond: Service -> [DbA, DbB] -> Config
      // where both DbA and DbB have "ConnectionError"
      const DbAPort = port<Database>()({ name: "DbA" });
      const DbBPort = port<Database>()({ name: "DbB" });
      const ServicePort = port<UserService>()({ name: "Service" });

      const DbAAdapter = createAdapter({
        provides: DbAPort,
        requires: [ConfigPort] as const,
        factory: () => ({ query: () => null }),
        errorTags: ["ConnectionError"],
      });

      const DbBAdapter = createAdapter({
        provides: DbBPort,
        requires: [ConfigPort] as const,
        factory: () => ({ query: () => null }),
        errorTags: ["ConnectionError"],
      });

      const ServiceAdapter = createAdapter({
        provides: ServicePort,
        requires: [DbAPort, DbBPort] as const,
        factory: () => ({ getUser: () => null }),
      });

      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(DbAAdapter)
        .provide(DbBAdapter)
        .provide(ServiceAdapter)
        .build();

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        DbA: ["Config"],
        DbB: ["Config"],
        Service: ["DbA", "DbB"],
      };

      const profile = computeErrorProfile(graph.adapters, depMap);

      // "ConnectionError" appears once even though it comes from two deps
      expect(profile.Service).toEqual(["ConnectionError"]);
    });

    it("handles cycles gracefully", () => {
      // Simulated cycle via dependency map (even though real graph wouldn't allow it)
      const depMap: Record<string, readonly string[]> = {
        A: ["B"],
        B: ["A"],
      };

      const APort = port<Logger>()({ name: "A" });
      const BPort = port<Logger>()({ name: "B" });

      const AAdapter = createAdapter({
        provides: APort,
        factory: () => ({ log: () => {} }),
        errorTags: ["ErrorA"],
      });

      const BAdapter = createAdapter({
        provides: BPort,
        factory: () => ({ log: () => {} }),
        errorTags: ["ErrorB"],
      });

      const adapters = [AAdapter, BAdapter] as any[];
      const profile = computeErrorProfile(adapters, depMap);

      // Should not hang; both should include their own errors at minimum
      expect(profile.A).toContain("ErrorA");
      expect(profile.B).toContain("ErrorB");
    });

    it("returns sorted error tags for deterministic output", () => {
      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Database: ["Config"],
      };

      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(DatabaseAdapterWithErrors)
        .build();

      const profile = computeErrorProfile(graph.adapters, depMap);

      // Tags should be sorted alphabetically
      const tags = [...profile.Database];
      const sorted = [...tags].sort();
      expect(tags).toEqual(sorted);
    });
  });

  // =============================================================================
  // Tests: 17.2 - Expose via graph inspection
  // =============================================================================

  describe("inspectGraph exposes errorProfile", () => {
    it("includes errorProfile in inspection result", () => {
      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(LoggerAdapter)
        .provide(DatabaseAdapterWithErrors)
        .provide(UserServiceAdapterWithErrors)
        .build();

      const inspection = inspectGraph(graph);

      expect(inspection.errorProfile).toBeDefined();
      expect(typeof inspection.errorProfile).toBe("object");
    });

    it("maps port names to transitive error tags", () => {
      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(LoggerAdapter)
        .provide(DatabaseAdapterWithErrors)
        .provide(UserServiceAdapterWithErrors)
        .build();

      const inspection = inspectGraph(graph);

      expect(inspection.errorProfile.Config).toEqual([]);
      expect(inspection.errorProfile.Logger).toEqual([]);
      expect(inspection.errorProfile.Database).toEqual(["ConnectionError", "TimeoutError"]);
      expect(inspection.errorProfile.UserService).toEqual([
        "ConnectionError",
        "TimeoutError",
        "UserNotFoundError",
      ]);
    });

    it("returns empty profile for fully infallible graph", () => {
      const graph = GraphBuilder.create().provide(ConfigAdapter).provide(LoggerAdapter).build();

      const inspection = inspectGraph(graph);

      expect(inspection.errorProfile.Config).toEqual([]);
      expect(inspection.errorProfile.Logger).toEqual([]);
    });

    it("includes effectWarnings in inspection result", () => {
      const graph = GraphBuilder.create()
        .provide(ConfigAdapter)
        .provide(LoggerAdapter)
        .provide(DatabaseAdapterWithErrors)
        .provide(UserServiceAdapterWithErrors)
        .build();

      const inspection = inspectGraph(graph);

      expect(inspection.effectWarnings).toBeDefined();
      expect(Array.isArray(inspection.effectWarnings)).toBe(true);
      expect(inspection.effectWarnings.length).toBeGreaterThan(0);
    });

    it("has no effectWarnings for fully infallible graph", () => {
      const graph = GraphBuilder.create().provide(ConfigAdapter).provide(LoggerAdapter).build();

      const inspection = inspectGraph(graph);

      expect(inspection.effectWarnings).toEqual([]);
    });
  });

  // =============================================================================
  // Tests: 17.3 - Detect unhandled errors at graph boundaries
  // =============================================================================

  describe("detectUnhandledErrors", () => {
    it("returns empty array for infallible graph", () => {
      const adapters = [ConfigAdapter, LoggerAdapter] as any[];
      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Logger: [],
      };

      const warnings = detectUnhandledErrors(adapters, depMap);

      expect(warnings).toEqual([]);
    });

    it("returns warnings for ports with unhandled error tags", () => {
      const adapters = [
        ConfigAdapter,
        LoggerAdapter,
        DatabaseAdapterWithErrors,
        UserServiceAdapterWithErrors,
      ] as any[];

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Logger: [],
        Database: ["Config"],
        UserService: ["Database", "Logger"],
      };

      const warnings = detectUnhandledErrors(adapters, depMap);

      expect(warnings.length).toBeGreaterThan(0);

      // Should mention Database and UserService
      const warningText = warnings.join("\n");
      expect(warningText).toContain("Database");
      expect(warningText).toContain("UserService");
      expect(warningText).toContain("ConnectionError");
      expect(warningText).toContain("adapterOrDie()");
    });

    it("warnings mention the specific error tags", () => {
      const adapters = [ConfigAdapter, DatabaseAdapterWithErrors] as any[];
      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Database: ["Config"],
      };

      const warnings = detectUnhandledErrors(adapters, depMap);

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain("Database");
      expect(warnings[0]).toContain("ConnectionError");
      expect(warnings[0]).toContain("TimeoutError");
    });

    it("returns sorted warnings for deterministic output", () => {
      const adapters = [
        ConfigAdapter,
        DatabaseAdapterWithErrors,
        UserServiceAdapterWithErrors,
        LoggerAdapter,
      ] as any[];

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Database: ["Config"],
        UserService: ["Database", "Logger"],
        Logger: [],
      };

      const warnings = detectUnhandledErrors(adapters, depMap);

      const sorted = [...warnings].sort();
      expect(warnings).toEqual(sorted);
    });
  });

  // =============================================================================
  // Tests: computeEffectSummaries
  // =============================================================================

  describe("computeEffectSummaries", () => {
    it("separates direct vs inherited errors", () => {
      const adapters = [
        ConfigAdapter,
        LoggerAdapter,
        DatabaseAdapterWithErrors,
        UserServiceAdapterWithErrors,
      ] as any[];

      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Logger: [],
        Database: ["Config"],
        UserService: ["Database", "Logger"],
      };

      const summaries = computeEffectSummaries(adapters, depMap);

      const userServiceSummary = summaries.find(s => s.portName === "UserService");
      expect(userServiceSummary).toBeDefined();

      // Direct errors: UserNotFoundError
      expect(userServiceSummary?.directErrors.map(e => e.tag)).toEqual(["UserNotFoundError"]);

      // Inherited errors: ConnectionError, TimeoutError (from Database)
      const inheritedTags = userServiceSummary?.inheritedErrors.map(e => e.tag) ?? [];
      expect(inheritedTags).toContain("ConnectionError");
      expect(inheritedTags).toContain("TimeoutError");

      // Inherited errors should cite Database as source
      const connectionEntry = userServiceSummary?.inheritedErrors.find(
        e => e.tag === "ConnectionError"
      );
      expect(connectionEntry?.sourcePort).toBe("Database");
    });

    it("marks infallible ports correctly", () => {
      const adapters = [ConfigAdapter, LoggerAdapter] as any[];
      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Logger: [],
      };

      const summaries = computeEffectSummaries(adapters, depMap);

      for (const summary of summaries) {
        expect(summary.isInfallible).toBe(true);
        expect(summary.directErrors).toEqual([]);
        expect(summary.inheritedErrors).toEqual([]);
        expect(summary.totalErrors).toEqual([]);
      }
    });

    it("marks fallible ports correctly", () => {
      const adapters = [ConfigAdapter, DatabaseAdapterWithErrors] as any[];
      const depMap: Record<string, readonly string[]> = {
        Config: [],
        Database: ["Config"],
      };

      const summaries = computeEffectSummaries(adapters, depMap);

      const dbSummary = summaries.find(s => s.portName === "Database");
      expect(dbSummary?.isInfallible).toBe(false);
      expect(dbSummary?.totalErrors.length).toBe(2);
    });
  });

  // =============================================================================
  // Tests: errorTags on adapter
  // =============================================================================

  describe("adapter __errorTags metadata", () => {
    it("is set when errorTags config is provided", () => {
      const adapter = createAdapter({
        provides: ConfigPort,
        factory: () => ({ dbUrl: "test" }),
        errorTags: ["SomeError"],
      });

      expect((adapter as any).__errorTags).toEqual(["SomeError"]);
    });

    it("is frozen", () => {
      const adapter = createAdapter({
        provides: ConfigPort,
        factory: () => ({ dbUrl: "test" }),
        errorTags: ["SomeError"],
      });

      expect(Object.isFrozen((adapter as any).__errorTags)).toBe(true);
    });

    it("is undefined when errorTags is not provided", () => {
      const adapter = createAdapter({
        provides: ConfigPort,
        factory: () => ({ dbUrl: "test" }),
      });

      expect((adapter as any).__errorTags).toBeUndefined();
    });

    it("is undefined when errorTags is empty array", () => {
      const adapter = createAdapter({
        provides: ConfigPort,
        factory: () => ({ dbUrl: "test" }),
        errorTags: [],
      });

      expect((adapter as any).__errorTags).toBeUndefined();
    });
  });
});
