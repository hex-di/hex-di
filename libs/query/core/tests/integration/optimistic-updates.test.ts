/**
 * Integration tests for optimistic update patterns.
 *
 * Tests setQueryData for optimistic updates and rollback on error.
 */

import { describe, it, expect, afterEach } from "vitest";
import { ResultAsync } from "@hex-di/result";
import {
  createQueryPort,
  createMutationPort,
  createQueryClient,
  type QueryClient,
} from "../../src/index.js";
import { createTestContainer } from "../helpers/test-container.js";

// =============================================================================
// Test Ports
// =============================================================================

interface Todo {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
}

const TodosPort = createQueryPort<readonly Todo[], void, Error>()({ name: "todos" });
const ToggleTodoPort = createMutationPort<
  Todo,
  { id: string; done: boolean },
  Error,
  { previousTodos: readonly Todo[] | undefined }
>()({
  name: "toggleTodo",
  effects: { invalidates: [TodosPort] },
});

// =============================================================================
// Tests
// =============================================================================

describe("Optimistic updates", () => {
  let client: QueryClient;

  const initialTodos: readonly Todo[] = [
    { id: "1", title: "Buy milk", done: false },
    { id: "2", title: "Walk dog", done: true },
  ];

  afterEach(() => {
    client?.dispose();
  });

  it("should optimistically update cache before mutation completes", async () => {
    const container = createTestContainer();
    container.register(TodosPort, () => ResultAsync.ok(initialTodos));
    client = createQueryClient({ container });

    // Fetch initial data
    await client.fetchQuery(TodosPort, undefined);
    expect(client.getQueryData(TodosPort, undefined)).toEqual(initialTodos);

    // Optimistically toggle todo 1
    const optimisticTodos = initialTodos.map(t => (t.id === "1" ? { ...t, done: true } : t));
    client.setQueryData(TodosPort, undefined, optimisticTodos);

    // Verify optimistic data is immediately visible
    expect(client.getQueryData(TodosPort, undefined)).toEqual(optimisticTodos);
    expect(client.getQueryData(TodosPort, undefined)![0].done).toBe(true);
  });

  it("should allow rollback on mutation error via setQueryData", async () => {
    const container = createTestContainer();
    container.register(TodosPort, () => ResultAsync.ok(initialTodos));
    container.register(ToggleTodoPort, () => ResultAsync.err(new Error("Network error")));
    client = createQueryClient({ container });

    // Fetch initial data
    await client.fetchQuery(TodosPort, undefined);

    // Save snapshot for rollback
    const snapshot = client.getQueryData(TodosPort, undefined);

    // Optimistically update
    const optimisticTodos = initialTodos.map(t => (t.id === "1" ? { ...t, done: true } : t));
    client.setQueryData(TodosPort, undefined, optimisticTodos);

    // Execute mutation (fails)
    const result = await client.mutate(ToggleTodoPort, { id: "1", done: true });
    expect(result.isErr()).toBe(true);

    // Rollback to snapshot
    if (snapshot !== undefined) {
      client.setQueryData(TodosPort, undefined, snapshot);
    }

    // Verify rollback
    expect(client.getQueryData(TodosPort, undefined)).toEqual(initialTodos);
  });

  it("should support mutation onSettled invalidation pattern", async () => {
    let fetchCount = 0;
    const container = createTestContainer();
    container.register(TodosPort, () => {
      fetchCount++;
      return ResultAsync.ok(initialTodos);
    });
    container.register(ToggleTodoPort, (input: { id: string; done: boolean }) =>
      ResultAsync.ok({ id: input.id, title: "Updated", done: input.done })
    );
    client = createQueryClient({ container });

    // Initial fetch
    await client.fetchQuery(TodosPort, undefined);
    expect(fetchCount).toBe(1);

    // Mutate — the mutation has effects.invalidates: [TodosPort]
    await client.mutate(ToggleTodoPort, { id: "1", done: true });

    // Re-fetch after invalidation
    await client.fetchQuery(TodosPort, undefined);
    expect(fetchCount).toBe(2);
  });

  it("should support optimistic update with immediate cache read", () => {
    const container = createTestContainer();
    client = createQueryClient({ container });

    // Set data without fetching — simulate pre-populated cache
    client.setQueryData(TodosPort, undefined, initialTodos);

    // Verify immediate availability
    const data = client.getQueryData(TodosPort, undefined);
    expect(data).toEqual(initialTodos);

    // Optimistic update
    const updated = data!.map(t => (t.id === "2" ? { ...t, done: false } : t));
    client.setQueryData(TodosPort, undefined, updated);

    expect(client.getQueryData(TodosPort, undefined)![1].done).toBe(false);
  });
});
