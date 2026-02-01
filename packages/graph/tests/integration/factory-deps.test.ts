/**
 * Factory dependency object shape integration tests.
 *
 * Tests that factory functions receive correctly typed dependency objects.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createAdapter, type EmptyDeps } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";
import {
  Logger,
  Database,
  Cache,
  LoggerPort,
  DatabasePort,
  CachePort,
  UserServicePort,
} from "./shared-fixtures.js";

describe("Integration: Factory dependency object shape", () => {
  it("factory receives correctly typed dependency object", () => {
    let capturedDeps: unknown = null;

    const adapterWithDeps = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort, CachePort],
      lifetime: "scoped",
      factory: deps => {
        // Capture deps for verification
        capturedDeps = deps;

        // Type-level verification
        expectTypeOf(deps).toEqualTypeOf<{
          Logger: Logger;
          Database: Database;
          Cache: Cache;
        }>();

        return {
          getUser: () => Promise.resolve(null),
          createUser: () => Promise.resolve({ id: "1" }),
        };
      },
    });
    expect(adapterWithDeps).toBeDefined();

    // Call the factory with mock dependencies
    const mockDeps = {
      Logger: { log: () => {}, error: () => {} },
      Database: { query: () => Promise.resolve([]), execute: () => Promise.resolve() },
      Cache: { get: () => undefined, set: () => {}, invalidate: () => {} },
    };

    adapterWithDeps.factory(mockDeps);

    // Verify the captured deps match what was passed
    expect(capturedDeps).toEqual(mockDeps);
    expect(Object.keys(capturedDeps as object)).toEqual(["Logger", "Database", "Cache"]);
  });

  it("empty requires results in empty dependency object type", () => {
    const noDepsAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: deps => {
        // deps should be EmptyDeps (branded empty type that prevents arbitrary key access)
        expectTypeOf(deps).toEqualTypeOf<EmptyDeps>();
        return { log: () => {}, error: () => {} };
      },
    });
    expect(noDepsAdapter).toBeDefined();

    // Factory can be called with empty object
    const result = noDepsAdapter.factory({});
    expect(result).toBeDefined();
    expect(result.log).toBeInstanceOf(Function);
  });
});
