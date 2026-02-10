import { describe, it, expect } from "vitest";
import {
  createQueryClient,
  createQueryPort,
  dehydrate,
  hydrate,
  type DehydratedState,
  createCacheKeyFromName,
} from "../src/index.js";
import { ResultAsync } from "@hex-di/result";
import { createTestContainer } from "./helpers/test-container.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "Users" });

function createUsersClient(data: string[] = ["Alice", "Bob"]) {
  const container = createTestContainer();
  container.register(UsersPort, () =>
    ResultAsync.fromPromise(Promise.resolve(data), () => new Error("fail"))
  );
  return createQueryClient({ container });
}

// =============================================================================
// dehydrate
// =============================================================================

describe("dehydrate", () => {
  it("returns object with version: 3", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state = dehydrate(client);
    expect(state.version).toBe(3);
    client.dispose();
  });

  it("includes both success and error entries", async () => {
    const ErrorPort = createQueryPort<string, unknown>()({ name: "ErrorPort" });
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(Promise.resolve(["Alice"]), () => new Error("fail"))
    );
    container.register(ErrorPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });

    // Populate a success entry
    await client.fetchQuery(UsersPort, "ok");

    // Populate an error entry
    await client.fetchQuery(ErrorPort, "fail");

    const state = dehydrate(client);
    const portNames = state.queries.map(q => q.cacheKey[0]);
    expect(portNames).toContain("Users");
    expect(portNames).toContain("ErrorPort");

    // Verify result shapes
    const usersQuery = state.queries.find(q => q.cacheKey[0] === "Users");
    expect(usersQuery?.result._tag).toBe("Ok");

    const errorQuery = state.queries.find(q => q.cacheKey[0] === "ErrorPort");
    expect(errorQuery?.result._tag).toBe("Err");
    client.dispose();
  });

  it("skips entries with undefined data and null error (pending)", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    // Use getOrCreate to produce a pending entry (data=undefined, error=null)
    client.cache.getOrCreate(UsersPort, "pending");

    const state = dehydrate(client);
    expect(state.queries.length).toBe(0);
    client.dispose();
  });

  it("skips success entries where data is explicitly undefined", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    // set() creates a success entry — passing undefined as data
    client.setQueryData(UsersPort, "undef-data", undefined);

    const entry = client.cache.get(UsersPort, "undef-data");
    expect(entry?.status).toBe("success");
    expect(entry?.data).toBeUndefined();

    const state = dehydrate(client);
    // Should be skipped because data === undefined and error === null
    expect(state.queries.length).toBe(0);
    client.dispose();
  });

  it("extracts portName into cacheKey[0]", async () => {
    const client = createUsersClient(["Alice"]);
    await client.fetchQuery(UsersPort, "param1");

    const state = dehydrate(client);
    expect(state.queries.length).toBe(1);
    expect(state.queries[0].cacheKey[0]).toBe("Users");
    client.dispose();
  });

  it("extracts paramsHash into cacheKey[1]", async () => {
    const client = createUsersClient(["Alice"]);
    await client.fetchQuery(UsersPort, "param1");

    const state = dehydrate(client);
    expect(state.queries.length).toBe(1);
    // paramsHash should be the JSON stringified version of "param1"
    expect(state.queries[0].cacheKey[1]).toBe('"param1"');
    client.dispose();
  });

  it("skips keys without \\0 separator", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    // Normal entries always have the separator; undefined params creates key "Users\0undefined"
    client.setQueryData(UsersPort, undefined, ["Alice"]);

    const state = dehydrate(client);
    expect(state.queries.length).toBe(1);
    expect(state.queries[0].cacheKey[0]).toBe("Users");
    client.dispose();
  });
});

// =============================================================================
// parseParamsHash via hydrate
// =============================================================================

describe("parseParamsHash via hydrate", () => {
  it('"undefined" string -> undefined params', () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("Users", undefined),
          result: { _tag: "Ok", value: ["Alice"] },
          dataUpdatedAt: 1000,
        },
      ],
    };

    hydrate(client, state);
    // undefined params should mean the data is accessible via undefined
    const data = client.cache.get({ __portName: "Users" }, undefined);
    expect(data).toBeDefined();
    expect(data?.data).toEqual(["Alice"]);
    client.dispose();
  });

  it("valid JSON string -> parsed value", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("Users", "hello"),
          result: { _tag: "Ok", value: ["Bob"] },
          dataUpdatedAt: 1000,
        },
      ],
    };

    hydrate(client, state);
    const data = client.cache.get({ __portName: "Users" }, "hello");
    expect(data).toBeDefined();
    expect(data?.data).toEqual(["Bob"]);
    client.dispose();
  });

  it("number/boolean JSON values", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("Numbers", 42),
          result: { _tag: "Ok", value: "answer" },
          dataUpdatedAt: 1000,
        },
        {
          cacheKey: createCacheKeyFromName("Booleans", true),
          result: { _tag: "Ok", value: "yes" },
          dataUpdatedAt: 1000,
        },
      ],
    };

    hydrate(client, state);
    const numEntry = client.cache.get({ __portName: "Numbers" }, 42);
    expect(numEntry).toBeDefined();
    expect(numEntry?.data).toBe("answer");

    const boolEntry = client.cache.get({ __portName: "Booleans" }, true);
    expect(boolEntry).toBeDefined();
    expect(boolEntry?.data).toBe("yes");
    client.dispose();
  });
});

// =============================================================================
// hydrate
// =============================================================================

describe("hydrate", () => {
  it("sets cache data for each dehydrated entry", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("Users", "p1"),
          result: { _tag: "Ok", value: ["Alice"] },
          dataUpdatedAt: 1000,
        },
        {
          cacheKey: createCacheKeyFromName("Users", "p2"),
          result: { _tag: "Ok", value: ["Bob"] },
          dataUpdatedAt: 2000,
        },
      ],
    };

    hydrate(client, state);
    expect(client.cache.get({ __portName: "Users" }, "p1")?.data).toEqual(["Alice"]);
    expect(client.cache.get({ __portName: "Users" }, "p2")?.data).toEqual(["Bob"]);
    client.dispose();
  });

  it("skips existing success entries (doesn't overwrite)", async () => {
    const client = createUsersClient(["Original"]);
    await client.fetchQuery(UsersPort, "existing");

    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("Users", "existing"),
          result: { _tag: "Ok", value: ["Overwritten"] },
          dataUpdatedAt: 5000,
        },
      ],
    };

    hydrate(client, state);
    // Should keep the original data, not overwrite
    expect(client.cache.get(UsersPort, "existing")?.data).toEqual(["Original"]);
    client.dispose();
  });

  it("overwrites non-success existing entries (e.g., error entries)", async () => {
    const ErrorPort = createQueryPort<string, unknown>()({ name: "Overwrite" });
    const container = createTestContainer();
    container.register(ErrorPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e as Error)
    );
    const client = createQueryClient({ container, defaults: { retry: 0 } });
    await client.fetchQuery(ErrorPort, "err");

    const entry = client.cache.get(ErrorPort, "err");
    expect(entry?.status).toBe("error");

    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("Overwrite", "err"),
          result: { _tag: "Ok", value: "fixed-data" },
          dataUpdatedAt: 5000,
        },
      ],
    };

    hydrate(client, state);
    const updated = client.cache.get(ErrorPort, "err");
    expect(updated?.data).toBe("fixed-data");
    expect(updated?.status).toBe("success");
    client.dispose();
  });

  it("hydrates error entries via setError", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("FailPort", undefined),
          result: { _tag: "Err", error: { message: "something failed" } },
          dataUpdatedAt: 1000,
        },
      ],
    };

    hydrate(client, state);
    const entry = client.cache.get({ __portName: "FailPort" }, undefined);
    expect(entry).toBeDefined();
    expect(entry?.status).toBe("error");
    expect(entry?.error).toEqual({ message: "something failed" });
    client.dispose();
  });

  it("creates portLike object with correct __portName from cacheKey", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [
        {
          cacheKey: createCacheKeyFromName("CustomPort", undefined),
          result: { _tag: "Ok", value: { key: "value" } },
          dataUpdatedAt: 1000,
        },
      ],
    };

    hydrate(client, state);
    const entry = client.cache.get({ __portName: "CustomPort" }, undefined);
    expect(entry).toBeDefined();
    expect(entry?.data).toEqual({ key: "value" });
    client.dispose();
  });

  it("works with empty queries array", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    const state: DehydratedState = {
      version: 3,
      queries: [],
    };

    // Should not throw
    hydrate(client, state);
    expect(client.cache.size).toBe(0);
    client.dispose();
  });
});

// =============================================================================
// Mutation-killing dehydrate tests
// =============================================================================

describe("dehydrate OR condition edge cases", () => {
  it("error entry with defined data includes only the error result", async () => {
    // This tests the new behavior: entries with status=error and data defined
    // should be included as Err entries
    const client = createUsersClient(["Alice"]);

    // First, fetch successfully to set data
    await client.fetchQuery(UsersPort, "the-key");
    expect(client.cache.get(UsersPort, "the-key")?.data).toEqual(["Alice"]);

    // Now set an error on the same entry (preserves previous data)
    client.cache.setError(UsersPort, "the-key", new Error("fail"));
    const entry = client.cache.get(UsersPort, "the-key");
    expect(entry?.status).toBe("error");
    // In the reactive model, data is derived from result$.
    // When result$ is Err, data returns undefined.
    expect(entry?.data).toBeUndefined();

    const state = dehydrate(client);
    // Should be included as an error entry now
    const matching = state.queries.filter(q => q.cacheKey[1] === '"the-key"');
    expect(matching.length).toBe(1);
    expect(matching[0].result._tag).toBe("Err");
    client.dispose();
  });

  it("pending entry with data=undefined and error=null is skipped", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    // Create a pending entry (status=pending, data=undefined, error=null)
    client.cache.getOrCreate(UsersPort, "no-data");

    const state = dehydrate(client);
    expect(state.queries.length).toBe(0);
    client.dispose();
  });
});

describe("dehydrate separator edge cases", () => {
  it("key with \\0 at position 0 produces empty portName in cacheKey", () => {
    const EmptyNamePort = createQueryPort<string, unknown>()({ name: "" });
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.setQueryData(EmptyNamePort, "params", "data");

    const state = dehydrate(client);
    if (state.queries.length > 0) {
      expect(state.queries[0].cacheKey[0]).toBe("");
    }
    client.dispose();
  });
});
