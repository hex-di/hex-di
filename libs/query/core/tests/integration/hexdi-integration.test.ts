/**
 * Integration tests for @hex-di/query with HexDI patterns.
 *
 * Tests QueryClient lifecycle, scoped adapter resolution, child client
 * isolation, disposal semantics, and event instrumentation — the patterns
 * needed when query adapters are resolved from a HexDI container.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createMutationPort,
  createQueryClient,
  type QueryClient,
  type QueryClientEvent,
} from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

const UsersPort = createQueryPort<string[], void, Error>()({ name: "users" });
const PostsPort = createQueryPort<string[], void, Error>()({ name: "posts" });
const UserByIdPort = createQueryPort<string, { id: string }, Error>()({
  name: "userById",
  dependsOn: [UsersPort],
});

const CreateUserPort = createMutationPort<{ id: string }, { name: string }, Error, undefined>()({
  name: "createUser",
  effects: { invalidates: [UsersPort] },
});

// =============================================================================
// Fetcher/Executor Factories
// =============================================================================

function createUsersFetcher(data: string[] = ["Alice", "Bob"]) {
  return () => ResultAsync.ok(data);
}

function createPostsFetcher(data: string[] = ["Post 1", "Post 2"]) {
  return () => ResultAsync.ok(data);
}

function createUserByIdFetcher() {
  return (params: { id: string }) => ResultAsync.ok(`User-${params.id}`);
}

function createCreateUserExecutor() {
  return (input: { name: string }) => ResultAsync.ok({ id: `new-${input.name}` });
}

// =============================================================================
// Tests
// =============================================================================

describe("HexDI Integration", () => {
  let client: QueryClient;
  let container: ReturnType<typeof createTestContainer>;

  beforeEach(() => {
    container = createTestContainer();
    client = createQueryClient({ container });
  });

  afterEach(() => {
    client.dispose();
  });

  // ---------------------------------------------------------------------------
  // 1. Graph resolution with query adapters
  // ---------------------------------------------------------------------------

  it("should register and resolve query adapters", async () => {
    container.register(UsersPort, createUsersFetcher());

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Alice", "Bob"]);
    }
  });

  it("should register and resolve mutation adapters", async () => {
    container.register(CreateUserPort, createCreateUserExecutor());

    const result = await client.mutate(CreateUserPort, { name: "Charlie" });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ id: "new-Charlie" });
    }
  });

  it("should return error when adapter is missing", async () => {
    const result = await client.fetchQuery(PostsPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryAdapterMissing");
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Multiple adapters registration (simulating graph resolution)
  // ---------------------------------------------------------------------------

  it("should resolve multiple registered adapters independently", async () => {
    container.register(UsersPort, createUsersFetcher(["Alice"]));
    container.register(PostsPort, createPostsFetcher(["My Post"]));

    const usersResult = await client.fetchQuery(UsersPort, undefined);
    const postsResult = await client.fetchQuery(PostsPort, undefined);

    expect(usersResult.isOk()).toBe(true);
    expect(postsResult.isOk()).toBe(true);
    if (usersResult.isOk()) expect(usersResult.value).toEqual(["Alice"]);
    if (postsResult.isOk()) expect(postsResult.value).toEqual(["My Post"]);
  });

  // ---------------------------------------------------------------------------
  // 3. Child QueryClient cache isolation
  // ---------------------------------------------------------------------------

  it("should isolate child client cache from parent", async () => {
    container.register(UsersPort, createUsersFetcher(["Shared"]));

    const child = client.createChild();

    // Fetch in parent
    await client.fetchQuery(UsersPort, undefined);

    // Child has its own cache — shouldn't have parent's fetched data
    const childData = child.getQueryData(UsersPort, undefined);
    expect(childData).toBeUndefined();

    child.dispose();
  });

  // ---------------------------------------------------------------------------
  // 4. Scope disposal lifecycle
  // ---------------------------------------------------------------------------

  it("should prevent operations after disposal", async () => {
    container.register(UsersPort, createUsersFetcher());

    const child = client.createChild();
    child.dispose();

    expect(child.isDisposed).toBe(true);

    const result = await child.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });

  it("should clean up observers on disposal", async () => {
    container.register(UsersPort, createUsersFetcher());

    const observer = client.observe(UsersPort, undefined);
    const state = observer.getState();
    expect(state.status).toBe("pending");

    // Dispose triggers cleanup
    client.dispose();
    expect(client.isDisposed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Event instrumentation (resolution hooks / tracing spans)
  // ---------------------------------------------------------------------------

  it("should emit events during query lifecycle", async () => {
    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(event => events.push(event));
    container.register(UsersPort, createUsersFetcher());

    await client.fetchQuery(UsersPort, undefined);

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("fetch-started");
    expect(eventTypes).toContain("fetch-completed");
  });

  it("should emit events during mutation lifecycle", async () => {
    const events: QueryClientEvent[] = [];
    client.subscribeToEvents(event => events.push(event));
    container.register(CreateUserPort, createCreateUserExecutor());

    await client.mutate(CreateUserPort, { name: "Test" });

    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain("mutation-started");
    expect(eventTypes).toContain("mutation-completed");
  });
});
