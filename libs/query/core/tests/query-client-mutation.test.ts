import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryClient, createQueryPort, createMutationPort } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

interface User {
  id: string;
  name: string;
}

const UsersPort = createQueryPort<User[], unknown>()({ name: "MutUsers" });
const UserByIdPort = createQueryPort<User, unknown>()({ name: "MutUserById" });

const CreateUserPort = createMutationPort<User, { name: string }>()({
  name: "MutCreateUser",
  effects: { invalidates: [UsersPort] },
});

const DeleteUserPort = createMutationPort<void, string>()({
  name: "MutDeleteUser",
  effects: { removes: [UserByIdPort] },
});

const SimplePort = createMutationPort<string, string>()({
  name: "SimpleMutation",
});

const FailPort = createMutationPort<string, string>()({
  name: "FailMutation",
});

describe("QueryClient Mutations", () => {
  it("mutate returns ResultAsync<TData, TError | QueryResolutionError>", async () => {
    const container = createTestContainer();
    container.register(SimplePort, (input: any) =>
      ResultAsync.fromPromise(Promise.resolve(`created: ${input}`), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    const result = await client.mutate(SimplePort, "hello");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("created: hello");
    }
    client.dispose();
  });

  it("mutate returns Ok with data on successful mutation", async () => {
    const container = createTestContainer();
    container.register(SimplePort, (input: any) =>
      ResultAsync.fromPromise(Promise.resolve(`ok: ${input}`), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    const result = await client.mutate(SimplePort, "test");
    expect(result.isOk()).toBe(true);
    client.dispose();
  });

  it("mutate returns Err on mutation failure", async () => {
    const container = createTestContainer();
    container.register(FailPort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("mutation failed")), e => e as Error)
    );
    const client = createQueryClient({ container });

    const result = await client.mutate(FailPort, "test");
    expect(result.isErr()).toBe(true);
    client.dispose();
  });

  it("mutation effects: invalidates marks target ports as stale", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        Promise.resolve([{ id: "1", name: "Alice" }]),
        () => new Error("fail")
      )
    );
    container.register(CreateUserPort, (input: any) =>
      ResultAsync.fromPromise(
        Promise.resolve({ id: "2", name: input.name }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    // Fetch to populate cache
    await client.fetchQuery(UsersPort, undefined);
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(false);

    await client.mutate(CreateUserPort, { name: "Bob" });

    // UsersPort should be invalidated
    const entry = client.cache.get(UsersPort, undefined);
    expect(entry?.isInvalidated).toBe(true);
    client.dispose();
  });

  it("mutation effects: removes removes target ports from cache", async () => {
    const container = createTestContainer();
    container.register(UserByIdPort, () =>
      ResultAsync.fromPromise(Promise.resolve({ id: "1", name: "Alice" }), () => new Error("fail"))
    );
    container.register(DeleteUserPort, () =>
      ResultAsync.fromPromise(Promise.resolve(undefined), () => new Error("fail"))
    );
    const client = createQueryClient({ container });

    await client.fetchQuery(UserByIdPort, undefined);
    expect(client.cache.has(UserByIdPort, undefined)).toBe(true);

    await client.mutate(DeleteUserPort, "1");

    // UserByIdPort should be removed from cache
    expect(client.cache.has(UserByIdPort, undefined)).toBe(false);
    client.dispose();
  });

  it("mutation effects only fire on Ok result", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        Promise.resolve([{ id: "1", name: "Alice" }]),
        () => new Error("fail")
      )
    );
    container.register(CreateUserPort, (input: any) =>
      ResultAsync.fromPromise(
        Promise.resolve({ id: "2", name: input.name }),
        () => new Error("fail")
      )
    );
    const client = createQueryClient({ container });

    await client.fetchQuery(UsersPort, undefined);

    await client.mutate(CreateUserPort, { name: "Bob" });
    // Effects should have fired -- UsersPort invalidated
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(true);
    client.dispose();
  });

  it("mutation effects do NOT fire on Err result", async () => {
    const container = createTestContainer();
    container.register(UsersPort, () =>
      ResultAsync.fromPromise(
        Promise.resolve([{ id: "1", name: "Alice" }]),
        () => new Error("fail")
      )
    );

    // Register mutation that fails
    const FailCreatePort = createMutationPort<User, { name: string }>()({
      name: "FailCreate",
      effects: { invalidates: [UsersPort] },
    });

    container.register(FailCreatePort, () =>
      ResultAsync.fromPromise(Promise.reject(new Error("mutation failed")), e => e as Error)
    );
    const client = createQueryClient({ container });

    await client.fetchQuery(UsersPort, undefined);

    await client.mutate(FailCreatePort, { name: "Bob" });
    // Effects should NOT have fired -- UsersPort should NOT be invalidated
    expect(client.cache.get(UsersPort, undefined)?.isInvalidated).toBe(false);
    client.dispose();
  });
});
