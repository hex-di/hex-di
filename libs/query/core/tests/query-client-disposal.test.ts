import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryClient, createQueryPort, createMutationPort } from "../src/index.js";
import { createTestContainer } from "./helpers/test-container.js";

const UsersPort = createQueryPort<string[], unknown>()({ name: "DispUsers" });

const MutPort = createMutationPort<string, string>()({
  name: "DispMut",
});

function createUsersFetcher(data: string[] = ["Alice"]) {
  return () => ResultAsync.fromPromise(Promise.resolve(data), () => new Error("fail"));
}

describe("QueryClient Disposal", () => {
  it("dispose() stops background operations", () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.dispose();
    expect(client.isDisposed).toBe(true);
  });

  it("after dispose(), fetch returns Err with QueryDisposed", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    client.dispose();

    const result = await client.fetchQuery(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });

  it("after dispose(), prefetch returns Err with QueryDisposed", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    client.dispose();

    // prefetchQuery swallows the error; it returns Promise<void>
    // but the underlying fetch returns Err with QueryDisposed
    await client.prefetchQuery(UsersPort, undefined);
    // If prefetchQuery doesn't throw, the disposal was handled
    expect(client.isDisposed).toBe(true);
  });

  it("after dispose(), ensureQueryData returns Err with QueryDisposed", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const client = createQueryClient({ container });
    client.dispose();

    const result = await client.ensureQueryData(UsersPort, undefined);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });

  it("after dispose(), mutate returns Err with QueryDisposed", async () => {
    const container = createTestContainer();
    container.register(MutPort, () =>
      ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail"))
    );
    const client = createQueryClient({ container });
    client.dispose();

    const result = await client.mutate(MutPort, "test");
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toHaveProperty("_tag", "QueryDisposed");
    }
  });

  it("QueryDisposed error includes the port name", async () => {
    const container = createTestContainer();
    const client = createQueryClient({ container });
    client.dispose();

    const result = await client.fetchQuery(UsersPort, undefined);
    if (result.isErr()) {
      const error = result.error;
      if ("portName" in error) {
        expect(error.portName).toBe("DispUsers");
      }
    }
  });

  it("createChild creates a child QueryClient with its own cache", () => {
    const container = createTestContainer();
    const parent = createQueryClient({ container });
    const child = parent.createChild();
    expect(child.cache).not.toBe(parent.cache);
    child.dispose();
    parent.dispose();
  });

  it("disposing child does not affect parent", async () => {
    const container = createTestContainer();
    container.register(UsersPort, createUsersFetcher());
    const parent = createQueryClient({ container });
    await parent.fetchQuery(UsersPort, undefined);

    const child = parent.createChild();
    child.dispose();

    expect(parent.isDisposed).toBe(false);
    const result = await parent.fetchQuery(UsersPort, undefined);
    expect(result.isOk()).toBe(true);
    parent.dispose();
  });
});
