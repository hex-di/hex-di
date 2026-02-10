/**
 * Integration tests for parallel query execution patterns.
 *
 * Tests ResultAsync.combine and parallel prefetch via the QueryClient.
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const PostsPort = createQueryPort<string[], void, Error>()({ name: "posts" });

// =============================================================================
// Tests
// =============================================================================

describe("Parallel queries", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
  });

  it("should execute multiple queries in parallel using Promise.all", async () => {
    const fetchOrder: string[] = [];

    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchOrder.push("users-start");
      return ResultAsync.ok(["Alice", "Bob"]);
    });
    container.register(PostsPort, () => {
      fetchOrder.push("posts-start");
      return ResultAsync.ok(["Post 1", "Post 2"]);
    });
    client = createQueryClient({ container });

    // Execute both queries in parallel
    const [usersResult, postsResult] = await Promise.all([
      client.fetchQuery(UsersPort, undefined),
      client.fetchQuery(PostsPort, undefined),
    ]);

    expect(usersResult.isOk()).toBe(true);
    expect(postsResult.isOk()).toBe(true);
    if (usersResult.isOk()) expect(usersResult.value).toEqual(["Alice", "Bob"]);
    if (postsResult.isOk()) expect(postsResult.value).toEqual(["Post 1", "Post 2"]);

    // Both fetches were initiated
    expect(fetchOrder).toContain("users-start");
    expect(fetchOrder).toContain("posts-start");
  });

  it("should parallel prefetch multiple queries", async () => {
    let usersFetched = false;
    let postsFetched = false;

    const container = createTestContainer();
    container.register(UsersPort, () => {
      usersFetched = true;
      return ResultAsync.ok(["Alice"]);
    });
    container.register(PostsPort, () => {
      postsFetched = true;
      return ResultAsync.ok(["Post 1"]);
    });
    client = createQueryClient({ container });

    // Prefetch in parallel — fire-and-forget
    await Promise.all([
      client.prefetchQuery(UsersPort, undefined),
      client.prefetchQuery(PostsPort, undefined),
    ]);

    expect(usersFetched).toBe(true);
    expect(postsFetched).toBe(true);

    // Data should now be cached
    expect(client.getQueryData(UsersPort, undefined)).toEqual(["Alice"]);
    expect(client.getQueryData(PostsPort, undefined)).toEqual(["Post 1"]);
  });
});
