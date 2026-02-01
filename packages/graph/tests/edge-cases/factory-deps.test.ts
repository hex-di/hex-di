/**
 * Factory dependency edge case tests.
 *
 * Tests behavior when factory functions receive dependency objects.
 */

import { describe, expect, it } from "vitest";
import { createPort, createAdapter, createAsyncAdapter } from "@hex-di/core";
import { LoggerPort, DatabasePort } from "../fixtures.js";

interface Service {
  name: string;
}

describe("factory deps edge cases", () => {
  it("factory receives empty object when no dependencies", () => {
    let receivedDeps: unknown;

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: deps => {
        receivedDeps = deps;
        return { log: () => {} };
      },
    });

    // Invoke the factory to capture deps
    adapter.factory({});

    expect(receivedDeps).toEqual({});
    expect(Object.keys(receivedDeps as object)).toHaveLength(0);
  });

  it("async factory receives empty object when no dependencies", async () => {
    let receivedDeps: unknown;

    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async deps => {
        receivedDeps = deps;
        return { log: () => {} };
      },
    });

    // Invoke the factory to capture deps
    await adapter.factory({});

    expect(receivedDeps).toEqual({});
    expect(Object.keys(receivedDeps as object)).toHaveLength(0);
  });

  it("factory receives correctly keyed deps", () => {
    const ServicePort = createPort<"Service", Service>("Service");

    let receivedDeps: unknown;

    const adapter = createAdapter({
      provides: ServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: deps => {
        receivedDeps = deps;
        return { name: "test" };
      },
    });

    const mockDeps = {
      Logger: { log: () => {} },
      Database: { query: async () => ({}) },
    };

    adapter.factory(mockDeps);

    expect(receivedDeps).toBe(mockDeps);
    expect(Object.keys(receivedDeps as object).sort()).toEqual(["Database", "Logger"]);
  });
});
