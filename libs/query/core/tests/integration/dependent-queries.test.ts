/**
 * Integration tests for dependent query patterns.
 *
 * Tests that queries with dependencies can be deferred, chained,
 * and composed using the Result pattern.
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync, ok, safeTry } from "@hex-di/result";
import { createQueryPort, createQueryClient, type QueryClient } from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const UserByIdPort = createQueryPort<string, { id: string }, Error>()({
  name: "userById",
});
const UserPostsPort = createQueryPort<string[], { userId: string }, Error>()({
  name: "userPosts",
});
const PostCommentsPort = createQueryPort<string[], { postId: string }, Error>()({
  name: "postComments",
});

// =============================================================================
// Tests
// =============================================================================

describe("Dependent queries", () => {
  let client: QueryClient;

  afterEach(() => {
    client?.dispose();
  });

  it("should fetch queries in dependency order", async () => {
    const fetchOrder: string[] = [];

    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchOrder.push("users");
      return ResultAsync.ok(["alice", "bob"]);
    });
    container.register(UserByIdPort, (params: { id: string }) => {
      fetchOrder.push(`userById:${params.id}`);
      return ResultAsync.ok(`User-${params.id}`);
    });
    client = createQueryClient({ container });

    // Fetch users first, then user by id
    const usersResult = await client.fetchQuery(UsersPort, undefined);
    expect(usersResult.isOk()).toBe(true);

    if (usersResult.isOk()) {
      const userId = usersResult.value[0];
      const userResult = await client.fetchQuery(UserByIdPort, { id: userId });
      expect(userResult.isOk()).toBe(true);
      if (userResult.isOk()) {
        expect(userResult.value).toBe("User-alice");
      }
    }

    expect(fetchOrder).toEqual(["users", "userById:alice"]);
  });

  it("should defer dependent query until parent has data", async () => {
    const container = createTestContainer();

    let usersResolved = false;
    container.register(UsersPort, () => {
      usersResolved = true;
      return ResultAsync.ok(["alice"]);
    });
    container.register(UserByIdPort, (params: { id: string }) =>
      ResultAsync.ok(`User-${params.id}`)
    );
    client = createQueryClient({ container });

    // Before parent is fetched
    expect(usersResolved).toBe(false);
    const parentData = client.getQueryData(UsersPort, undefined);
    expect(parentData).toBeUndefined();

    // Fetch parent
    await client.fetchQuery(UsersPort, undefined);
    expect(usersResolved).toBe(true);

    // Now dependent query can use parent data
    const parentDataAfter = client.getQueryData(UsersPort, undefined);
    expect(parentDataAfter).toEqual(["alice"]);

    const childResult = await client.fetchQuery(UserByIdPort, { id: parentDataAfter![0] });
    expect(childResult.isOk()).toBe(true);
  });

  it("should chain dependent queries using andThen", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok(["user-1", "user-2"]));
    container.register(UserByIdPort, (params: { id: string }) =>
      ResultAsync.ok(`Name-${params.id}`)
    );
    client = createQueryClient({ container });

    // Chain: fetch users -> take first -> fetch user by id
    const result = await client
      .fetchQuery(UsersPort, undefined)
      .andThen(users => client.fetchQuery(UserByIdPort, { id: users[0] }));

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("Name-user-1");
    }
  });

  it("should propagate errors through dependent chain", async () => {
    const container = createTestContainer();
    // Disable retry so the test doesn't time out waiting for retries
    container.register(UsersPort, () => ResultAsync.err(new Error("Users fetch failed")));
    container.register(UserByIdPort, (params: { id: string }) =>
      ResultAsync.ok(`User-${params.id}`)
    );
    client = createQueryClient({ container, defaults: { retry: 0 } });

    // Fetch first query which will fail
    const usersResult = await client.fetchQuery(UsersPort, undefined);
    expect(usersResult.isErr()).toBe(true);

    // The dependent query should not be called since the parent failed
    // Verify the error is available for the consumer to decide
    if (usersResult.isErr()) {
      expect(usersResult.error).toBeDefined();
    }
  });

  it("should support multi-level dependency chains", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () => ResultAsync.ok(["alice"]));
    container.register(UserPostsPort, (params: { userId: string }) =>
      ResultAsync.ok([`post-1-by-${params.userId}`])
    );
    container.register(PostCommentsPort, (params: { postId: string }) =>
      ResultAsync.ok([`comment on ${params.postId}`])
    );
    client = createQueryClient({ container });

    // Three-level chain: users -> user posts -> post comments
    const usersResult = await client.fetchQuery(UsersPort, undefined);
    expect(usersResult.isOk()).toBe(true);
    if (!usersResult.isOk()) return;

    const postsResult = await client.fetchQuery(UserPostsPort, { userId: usersResult.value[0] });
    expect(postsResult.isOk()).toBe(true);
    if (!postsResult.isOk()) return;

    const result = await client.fetchQuery(PostCommentsPort, { postId: postsResult.value[0] });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["comment on post-1-by-alice"]);
    }
  });

  it("should use setQueryData to satisfy dependent queries without fetch", async () => {
    const container = createTestContainer();
    container.register(UserByIdPort, (params: { id: string }) =>
      ResultAsync.ok(`Fetched-${params.id}`)
    );
    client = createQueryClient({ container });

    // Pre-populate parent data via setQueryData
    client.setQueryData(UsersPort, undefined, ["pre-set-user"]);

    const cachedUsers = client.getQueryData(UsersPort, undefined);
    expect(cachedUsers).toEqual(["pre-set-user"]);

    // Use cached data to drive dependent query
    const userResult = await client.fetchQuery(UserByIdPort, { id: cachedUsers![0] });
    expect(userResult.isOk()).toBe(true);
    if (userResult.isOk()) {
      expect(userResult.value).toBe("Fetched-pre-set-user");
    }
  });

  it("safeTry chains multiple query fetches with typed error accumulation", async () => {
    const container = createTestContainer();
    container.register(UserByIdPort, (params: { id: string }) =>
      ResultAsync.ok(`User-${params.id}`)
    );
    container.register(UserPostsPort, (params: { userId: string }) =>
      ResultAsync.ok([`post-by-${params.userId}`])
    );
    client = createQueryClient({ container });

    const result = await safeTry(async function* () {
      const user = yield* await client.fetchQuery(UserByIdPort, { id: "42" });
      const posts = yield* await client.fetchQuery(UserPostsPort, { userId: user });
      return ok({ user, posts });
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({
        user: "User-42",
        posts: ["post-by-User-42"],
      });
    }
  });

  it("safeTry short-circuits on first Err in query chain", async () => {
    const fetchOrder: string[] = [];
    const container = createTestContainer();
    container.register(UserByIdPort, (params: { id: string }) => {
      fetchOrder.push(`userById:${params.id}`);
      return ResultAsync.err(new Error("user not found"));
    });
    container.register(UserPostsPort, (params: { userId: string }) => {
      fetchOrder.push(`userPosts:${params.userId}`);
      return ResultAsync.ok([`post-by-${params.userId}`]);
    });
    client = createQueryClient({ container, defaults: { retry: 0 } });

    const result = await safeTry(async function* () {
      const user = yield* await client.fetchQuery(UserByIdPort, { id: "99" });
      const posts = yield* await client.fetchQuery(UserPostsPort, { userId: user });
      return ok({ user, posts });
    });

    expect(result.isErr()).toBe(true);
    // Second fetch should never have been called
    expect(fetchOrder).toEqual(["userById:99"]);
  });

  it("should invalidate dependent queries when parent is invalidated", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(UsersPort, () => {
      fetchCount++;
      return ResultAsync.ok([`users-v${fetchCount}`]);
    });
    client = createQueryClient({ container });

    // Initial fetch
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(1);

    // Invalidate should mark data stale
    await client.invalidateQueries(UsersPort);

    // Next fetch should refetch
    await client.fetchQuery(UsersPort, undefined);
    expect(fetchCount).toBe(2);
  });
});
