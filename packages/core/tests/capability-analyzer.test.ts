/**
 * Tests for Capability Analyzer (BEH-CO-11).
 *
 * Tests verify:
 * 1. detectAmbientAuthority detects all ambient authority patterns
 * 2. detectAmbientAuthority returns frozen results
 * 3. Clean factories produce empty detection arrays
 * 4. auditGraph produces correct reports for graphs
 * 5. Summary strings follow the spec format
 */

import { describe, it, expect } from "vitest";
import {
  detectAmbientAuthority,
  auditGraph,
  createAdapter,
  port,
  SINGLETON,
  SCOPED,
} from "../src/index.js";
import type { InspectableGraph } from "../src/index.js";

// =============================================================================
// Test Ports and Adapters
// =============================================================================

interface ConfigService {
  get(key: string): string | undefined;
}

interface Logger {
  log(message: string): void;
}

interface DbService {
  query(sql: string): unknown;
}

const ConfigPort = port<ConfigService>()({
  name: "Config",
  direction: "outbound",
});

const LoggerPort = port<Logger>()({
  name: "Logger",
  direction: "outbound",
});

const DbPort = port<DbService>()({
  name: "Database",
  direction: "outbound",
});

// =============================================================================
// Helper: create a factory function from a string body.
// This produces a real function whose toString() includes the body text,
// enabling regex-based detection without requiring actual Node.js globals.
// =============================================================================

/**
 * Creates a typed factory function from a string body for testing detection.
 * The returned function's toString() contains the body text, which is what
 * detectAmbientAuthority inspects.
 */
function factoryFromBody(body: string): (...args: never[]) => unknown {
  return new Function(`return (${body})`) as (...args: never[]) => unknown;
}

// =============================================================================
// 11.1: detectAmbientAuthority — Pattern Detection
// =============================================================================

describe("detectAmbientAuthority", () => {
  describe("high confidence: process.env / process.argv", () => {
    it("detects process.env access", () => {
      const factory = factoryFromBody("{ get: (key) => process.env[key] }");
      const detections = detectAmbientAuthority(factory);

      expect(detections.length).toBeGreaterThanOrEqual(1);
      const envDetection = detections.find(d => d.identifier === "process.env");
      expect(envDetection).toBeDefined();
      expect(envDetection?.kind).toBe("process-env");
      expect(envDetection?.confidence).toBe("high");
    });

    it("detects process.argv access", () => {
      const factory = factoryFromBody("{ args: process.argv }");
      const detections = detectAmbientAuthority(factory);

      const argvDetection = detections.find(d => d.identifier === "process.argv");
      expect(argvDetection).toBeDefined();
      expect(argvDetection?.kind).toBe("process-env");
      expect(argvDetection?.confidence).toBe("high");
    });
  });

  describe("high confidence: global variable access", () => {
    it("detects globalThis property access", () => {
      const factory = factoryFromBody("{ config: globalThis.config }");
      const detections = detectAmbientAuthority(factory);

      const globalDetection = detections.find(d => d.kind === "global-variable");
      expect(globalDetection).toBeDefined();
      expect(globalDetection?.confidence).toBe("high");
    });

    it("detects window property access", () => {
      const factory = factoryFromBody("{ loc: window.location }");
      const detections = detectAmbientAuthority(factory);

      const windowDetection = detections.find(d => d.kind === "global-variable");
      expect(windowDetection).toBeDefined();
      expect(windowDetection?.confidence).toBe("high");
    });

    it("detects global property access", () => {
      const factory = factoryFromBody("{ cache: global.cache }");
      const detections = detectAmbientAuthority(factory);

      const globalDetection = detections.find(d => d.kind === "global-variable");
      expect(globalDetection).toBeDefined();
      expect(globalDetection?.confidence).toBe("high");
    });
  });

  describe("medium confidence: module singletons", () => {
    it("detects require() calls", () => {
      const factory = factoryFromBody("{ instance: require('./singleton').instance }");
      const detections = detectAmbientAuthority(factory);

      const requireDetection = detections.find(d => d.kind === "module-singleton");
      expect(requireDetection).toBeDefined();
      expect(requireDetection?.confidence).toBe("medium");
      expect(requireDetection?.identifier).toBe("require(...)");
    });

    it("detects dynamic import() calls", () => {
      const factory = factoryFromBody("import('./module')");
      const detections = detectAmbientAuthority(factory);

      const importDetection = detections.find(d => d.kind === "module-singleton");
      expect(importDetection).toBeDefined();
      expect(importDetection?.confidence).toBe("medium");
      expect(importDetection?.identifier).toBe("import(...)");
    });
  });

  describe("medium confidence: direct I/O", () => {
    it("detects fs access", () => {
      const factory = factoryFromBody("{ read: () => fs.readFileSync('/etc/config') }");
      const detections = detectAmbientAuthority(factory);

      const fsDetection = detections.find(d => d.kind === "direct-io");
      expect(fsDetection).toBeDefined();
      expect(fsDetection?.confidence).toBe("medium");
    });

    it("detects fetch calls", () => {
      const factory = factoryFromBody("fetch('https://api.example.com')");
      const detections = detectAmbientAuthority(factory);

      const fetchDetection = detections.find(d => d.identifier === "fetch(...)");
      expect(fetchDetection).toBeDefined();
      expect(fetchDetection?.kind).toBe("direct-io");
      expect(fetchDetection?.confidence).toBe("medium");
    });

    it("detects http access", () => {
      const factory = factoryFromBody("http.get('https://api.example.com')");
      const detections = detectAmbientAuthority(factory);

      const httpDetection = detections.find(d => d.kind === "direct-io");
      expect(httpDetection).toBeDefined();
      expect(httpDetection?.confidence).toBe("medium");
    });
  });

  describe("low confidence: non-determinism", () => {
    it("detects Date.now()", () => {
      const factory = factoryFromBody("{ timestamp: Date.now() }");
      const detections = detectAmbientAuthority(factory);

      const dateDetection = detections.find(d => d.kind === "date-now");
      expect(dateDetection).toBeDefined();
      expect(dateDetection?.confidence).toBe("low");
      expect(dateDetection?.identifier).toBe("Date.now()");
    });

    it("detects new Date()", () => {
      const factory = factoryFromBody("{ created: new Date() }");
      const detections = detectAmbientAuthority(factory);

      const dateDetection = detections.find(d => d.kind === "date-now");
      expect(dateDetection).toBeDefined();
      expect(dateDetection?.confidence).toBe("low");
    });

    it("detects Math.random()", () => {
      const factory = factoryFromBody("{ id: Math.random().toString(36) }");
      const detections = detectAmbientAuthority(factory);

      const randomDetection = detections.find(d => d.kind === "math-random");
      expect(randomDetection).toBeDefined();
      expect(randomDetection?.confidence).toBe("low");
      expect(randomDetection?.identifier).toBe("Math.random()");
    });
  });

  describe("clean factories", () => {
    it("returns empty array for clean factory with no ambient authority", () => {
      const factory = (deps: { Logger: Logger }) => ({ log: deps.Logger.log });
      const detections = detectAmbientAuthority(factory);

      expect(detections).toEqual([]);
    });

    it("returns empty array for native code", () => {
      // Array.isArray is a native function
      const detections = detectAmbientAuthority(Array.isArray);

      expect(detections).toEqual([]);
    });
  });

  describe("result freezing", () => {
    it("returns a frozen array", () => {
      const factory = factoryFromBody("{ get: (key) => process.env[key] }");
      const detections = detectAmbientAuthority(factory);

      expect(Object.isFrozen(detections)).toBe(true);
    });

    it("returns frozen detection objects", () => {
      const factory = factoryFromBody("{ get: (key) => process.env[key] }");
      const detections = detectAmbientAuthority(factory);

      for (const detection of detections) {
        expect(Object.isFrozen(detection)).toBe(true);
      }
    });

    it("returns frozen empty array for clean factories", () => {
      const factory = (deps: { Logger: Logger }) => deps.Logger;
      const detections = detectAmbientAuthority(factory);

      expect(Object.isFrozen(detections)).toBe(true);
    });
  });

  describe("source snippet extraction", () => {
    it("includes a sourceSnippet for detections", () => {
      const factory = factoryFromBody("{ get: (key) => process.env[key] }");
      const detections = detectAmbientAuthority(factory);

      const envDetection = detections.find(d => d.identifier === "process.env");
      expect(envDetection?.sourceSnippet).toBeDefined();
      expect(typeof envDetection?.sourceSnippet).toBe("string");
      expect(envDetection?.sourceSnippet?.includes("process.env")).toBe(true);
    });
  });

  describe("multiple detections", () => {
    it("detects multiple patterns in the same factory", () => {
      const factory = factoryFromBody(
        "{ env: process.env.NODE_ENV, random: Math.random(), time: Date.now() }"
      );
      const detections = detectAmbientAuthority(factory);

      const kinds = new Set(detections.map(d => d.kind));
      expect(kinds.has("process-env")).toBe(true);
      expect(kinds.has("math-random")).toBe(true);
      expect(kinds.has("date-now")).toBe(true);
    });
  });
});

// =============================================================================
// 11.2: auditGraph — Graph-Level Audit
// =============================================================================

describe("auditGraph", () => {
  it("produces correct report for empty graph", () => {
    const graph: InspectableGraph = {
      adapters: [],
      overridePortNames: new Set<string>(),
    };
    const report = auditGraph(graph);

    expect(report.totalAdapters).toBe(0);
    expect(report.cleanAdapters).toBe(0);
    expect(report.violatingAdapters).toBe(0);
    expect(report.highConfidenceViolations).toBe(0);
    expect(report.summary).toBe("No adapters to audit");
    expect(report.entries).toEqual([]);
  });

  it("reports all clean when no ambient authority", () => {
    const cleanAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: (_msg: string) => {} }),
      lifetime: SINGLETON,
    });

    const dbAdapter = createAdapter({
      provides: DbPort,
      requires: [LoggerPort],
      factory: deps => ({ query: (_sql: string) => deps.Logger.log("query") }),
      lifetime: SCOPED,
    });

    const graph: InspectableGraph = {
      adapters: [cleanAdapter, dbAdapter],
      overridePortNames: new Set(),
    };

    const report = auditGraph(graph);

    expect(report.totalAdapters).toBe(2);
    expect(report.cleanAdapters).toBe(2);
    expect(report.violatingAdapters).toBe(0);
    expect(report.highConfidenceViolations).toBe(0);
    expect(report.summary).toBe("All 2 adapters pass capability audit");
    for (const entry of report.entries) {
      expect(entry.isClean).toBe(true);
      expect(entry.detections).toEqual([]);
    }
  });

  it("detects violations and produces correct counts", () => {
    const cleanAdapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: (_msg: string) => {} }),
      lifetime: SINGLETON,
    });

    // Use factoryFromBody to create a factory that mentions process.env
    // without requiring actual Node.js types. We then build a fake adapter
    // manually since createAdapter requires the factory to return the correct type.
    const violatingFactory = factoryFromBody("{ get: (key) => process.env[key] }");

    const graph: InspectableGraph = {
      adapters: [
        cleanAdapter,
        {
          provides: ConfigPort,
          requires: [],
          lifetime: "singleton",
          factoryKind: "sync",
          clonable: false,
          freeze: true,
          factory: violatingFactory,
        },
      ],
      overridePortNames: new Set(),
    };

    const report = auditGraph(graph);

    expect(report.totalAdapters).toBe(2);
    expect(report.cleanAdapters).toBe(1);
    expect(report.violatingAdapters).toBe(1);
    expect(report.highConfidenceViolations).toBeGreaterThanOrEqual(1);
    expect(report.summary).toMatch(/^1\/2 adapters clean\. 1 violation/);
  });

  it("returns frozen report", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: (_msg: string) => {} }),
      lifetime: SINGLETON,
    });

    const graph: InspectableGraph = {
      adapters: [adapter],
      overridePortNames: new Set(),
    };

    const report = auditGraph(graph);

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.entries)).toBe(true);
    for (const entry of report.entries) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });

  it("includes portName and adapterName in entries", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      factory: () => ({ log: (_msg: string) => {} }),
      lifetime: SINGLETON,
    });

    const graph: InspectableGraph = {
      adapters: [adapter],
      overridePortNames: new Set(),
    };

    const report = auditGraph(graph);

    expect(report.entries[0]?.portName).toBe("Logger");
    expect(report.entries[0]?.adapterName).toBe("Logger");
  });

  describe("summary format", () => {
    it("uses singular 'violation' for single violation", () => {
      const violatingFactory = factoryFromBody("{ get: (key) => process.env[key] }");

      const graph: InspectableGraph = {
        adapters: [
          {
            provides: ConfigPort,
            requires: [],
            lifetime: "singleton",
            factoryKind: "sync",
            clonable: false,
            freeze: true,
            factory: violatingFactory,
          },
        ],
        overridePortNames: new Set(),
      };

      const report = auditGraph(graph);
      expect(report.summary).toMatch(/1 violation \(/);
    });
  });
});
