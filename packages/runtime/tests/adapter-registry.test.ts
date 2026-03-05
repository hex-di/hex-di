/**
 * Tests for src/container/internal/adapter-registry.ts
 * Covers registration, lookup, local vs parent, override tracking,
 * shouldResolveLocally logic, and iteration.
 */
import { describe, it, expect, vi } from "vitest";
import { port } from "@hex-di/core";
import { AdapterRegistry } from "../src/container/internal/adapter-registry.js";
import { ADAPTER_ACCESS } from "../src/inspection/symbols.js";

interface Logger {
  log(msg: string): void;
}
interface Database {
  query(sql: string): unknown;
}
interface Cache {
  get(key: string): unknown;
}

const LoggerPort = port<Logger>()({ name: "Logger" });
const DatabasePort = port<Database>()({ name: "Database" });
const _CachePort = port<Cache>()({ name: "Cache" });

function createRuntimeAdapter(
  portObj: any,
  lifetime: "singleton" | "transient" | "scoped" = "singleton"
) {
  return {
    provides: portObj,
    requires: [] as any[],
    lifetime,
    factory: vi.fn(),
    factoryKind: "sync" as const,
    clonable: false,
    freeze: true,
  };
}

describe("AdapterRegistry", () => {
  describe("register and get", () => {
    it("registers and retrieves an adapter", () => {
      const registry = new AdapterRegistry(null);
      const adapter = createRuntimeAdapter(LoggerPort);
      registry.register(LoggerPort, adapter);

      expect(registry.get(LoggerPort)).toBe(adapter);
    });

    it("returns undefined for unregistered port", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.get(LoggerPort)).toBeUndefined();
    });

    it("overwrites adapter on re-registration", () => {
      const registry = new AdapterRegistry(null);
      const adapter1 = createRuntimeAdapter(LoggerPort);
      const adapter2 = createRuntimeAdapter(LoggerPort);

      registry.register(LoggerPort, adapter1);
      registry.register(LoggerPort, adapter2);

      expect(registry.get(LoggerPort)).toBe(adapter2);
    });
  });

  describe("has", () => {
    it("returns true for registered port", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort));
      expect(registry.has(LoggerPort)).toBe(true);
    });

    it("returns false for unregistered port", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.has(LoggerPort)).toBe(false);
    });

    it("returns true when port is in parent", () => {
      const parentAdapter = createRuntimeAdapter(LoggerPort);
      const parent = {
        resolveInternal: vi.fn(),
        resolveAsyncInternal: vi.fn(),
        has: vi.fn(),
        hasAdapter: vi.fn(),
        [ADAPTER_ACCESS]: vi.fn().mockReturnValue(parentAdapter),
        registerChildContainer: vi.fn(),
        unregisterChildContainer: vi.fn(),
        originalParent: null,
      } as any;

      const registry = new AdapterRegistry(parent);
      expect(registry.has(LoggerPort)).toBe(true);
    });

    it("returns false when port not in parent", () => {
      const parent = {
        resolveInternal: vi.fn(),
        resolveAsyncInternal: vi.fn(),
        has: vi.fn(),
        hasAdapter: vi.fn(),
        [ADAPTER_ACCESS]: vi.fn().mockReturnValue(undefined),
        registerChildContainer: vi.fn(),
        unregisterChildContainer: vi.fn(),
        originalParent: null,
      } as any;

      const registry = new AdapterRegistry(parent);
      expect(registry.has(LoggerPort)).toBe(false);
    });
  });

  describe("isLocal", () => {
    it("returns true when markLocal is true (default)", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort));
      expect(registry.isLocal(LoggerPort)).toBe(true);
    });

    it("returns false when markLocal is false", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort), false);
      expect(registry.isLocal(LoggerPort)).toBe(false);
    });

    it("returns false for unregistered port", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.isLocal(LoggerPort)).toBe(false);
    });
  });

  describe("markOverride / isOverride / overridePorts", () => {
    it("marks a port as override", () => {
      const registry = new AdapterRegistry(null);
      registry.markOverride("Logger");
      expect(registry.isOverride("Logger")).toBe(true);
    });

    it("isOverride returns false for non-override ports", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.isOverride("Logger")).toBe(false);
    });

    it("overridePorts returns readonly set of overridden names", () => {
      const registry = new AdapterRegistry(null);
      registry.markOverride("Logger");
      registry.markOverride("Database");

      const ports = registry.overridePorts;
      expect(ports.has("Logger")).toBe(true);
      expect(ports.has("Database")).toBe(true);
      expect(ports.size).toBe(2);
    });
  });

  describe("shouldResolveLocally", () => {
    it("returns true for root container when adapter is registered", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort), false);
      // Root: checks adapters map directly
      expect(registry.shouldResolveLocally(LoggerPort, true)).toBe(true);
    });

    it("returns false for root container when adapter not registered", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.shouldResolveLocally(LoggerPort, true)).toBe(false);
    });

    it("returns true for child container when port is local", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort), true);
      // Child: checks localPorts set
      expect(registry.shouldResolveLocally(LoggerPort, false)).toBe(true);
    });

    it("returns false for child container when port is not local", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort), false);
      // Even though it's registered, it's not local
      expect(registry.shouldResolveLocally(LoggerPort, false)).toBe(false);
    });

    it("returns false for child container when port not registered", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.shouldResolveLocally(LoggerPort, false)).toBe(false);
    });
  });

  describe("getLocal", () => {
    it("returns locally registered adapter", () => {
      const registry = new AdapterRegistry(null);
      const adapter = createRuntimeAdapter(LoggerPort);
      registry.register(LoggerPort, adapter);
      expect(registry.getLocal(LoggerPort)).toBe(adapter);
    });

    it("returns undefined when port not locally registered", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.getLocal(LoggerPort)).toBeUndefined();
    });

    it("does not check parent - only local", () => {
      const parentAdapter = createRuntimeAdapter(LoggerPort);
      const parent = {
        resolveInternal: vi.fn(),
        resolveAsyncInternal: vi.fn(),
        has: vi.fn(),
        hasAdapter: vi.fn(),
        [ADAPTER_ACCESS]: vi.fn().mockReturnValue(parentAdapter),
        registerChildContainer: vi.fn(),
        unregisterChildContainer: vi.fn(),
        originalParent: null,
      } as any;

      const registry = new AdapterRegistry(parent);
      // get() would find it via parent, but getLocal() should not
      expect(registry.getLocal(LoggerPort)).toBeUndefined();
      expect(registry.get(LoggerPort)).toBe(parentAdapter);
    });
  });

  describe("get with parent fallback", () => {
    it("returns local adapter when available (ignores parent)", () => {
      const localAdapter = createRuntimeAdapter(LoggerPort);
      const parentAdapter = createRuntimeAdapter(LoggerPort);
      const parent = {
        resolveInternal: vi.fn(),
        resolveAsyncInternal: vi.fn(),
        has: vi.fn(),
        hasAdapter: vi.fn(),
        [ADAPTER_ACCESS]: vi.fn().mockReturnValue(parentAdapter),
        registerChildContainer: vi.fn(),
        unregisterChildContainer: vi.fn(),
        originalParent: null,
      } as any;

      const registry = new AdapterRegistry(parent);
      registry.register(LoggerPort, localAdapter);

      expect(registry.get(LoggerPort)).toBe(localAdapter);
      // Parent's ADAPTER_ACCESS should not be called when local exists
      expect(parent[ADAPTER_ACCESS]).not.toHaveBeenCalled();
    });

    it("falls back to parent when not locally registered", () => {
      const parentAdapter = createRuntimeAdapter(LoggerPort);
      const parent = {
        resolveInternal: vi.fn(),
        resolveAsyncInternal: vi.fn(),
        has: vi.fn(),
        hasAdapter: vi.fn(),
        [ADAPTER_ACCESS]: vi.fn().mockReturnValue(parentAdapter),
        registerChildContainer: vi.fn(),
        unregisterChildContainer: vi.fn(),
        originalParent: null,
      } as any;

      const registry = new AdapterRegistry(parent);
      expect(registry.get(LoggerPort)).toBe(parentAdapter);
    });

    it("returns undefined when no parent and not local", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.get(LoggerPort)).toBeUndefined();
    });
  });

  describe("entries", () => {
    it("iterates over all local adapters", () => {
      const registry = new AdapterRegistry(null);
      const logAdapter = createRuntimeAdapter(LoggerPort);
      const dbAdapter = createRuntimeAdapter(DatabasePort);

      registry.register(LoggerPort, logAdapter);
      registry.register(DatabasePort, dbAdapter);

      const entries = Array.from(registry.entries());
      expect(entries).toHaveLength(2);

      const portNames = entries.map(([p]) => p.__portName);
      expect(portNames).toContain("Logger");
      expect(portNames).toContain("Database");
    });

    it("returns empty iterator when no adapters", () => {
      const registry = new AdapterRegistry(null);
      const entries = Array.from(registry.entries());
      expect(entries).toHaveLength(0);
    });
  });

  describe("size", () => {
    it("returns 0 for empty registry", () => {
      const registry = new AdapterRegistry(null);
      expect(registry.size).toBe(0);
    });

    it("returns count of locally registered adapters", () => {
      const registry = new AdapterRegistry(null);
      registry.register(LoggerPort, createRuntimeAdapter(LoggerPort));
      expect(registry.size).toBe(1);

      registry.register(DatabasePort, createRuntimeAdapter(DatabasePort));
      expect(registry.size).toBe(2);
    });

    it("does not count parent adapters", () => {
      const parent = {
        resolveInternal: vi.fn(),
        resolveAsyncInternal: vi.fn(),
        has: vi.fn(),
        hasAdapter: vi.fn(),
        [ADAPTER_ACCESS]: vi.fn().mockReturnValue(createRuntimeAdapter(LoggerPort)),
        registerChildContainer: vi.fn(),
        unregisterChildContainer: vi.fn(),
        originalParent: null,
      } as any;

      const registry = new AdapterRegistry(parent);
      expect(registry.size).toBe(0);
    });
  });
});
