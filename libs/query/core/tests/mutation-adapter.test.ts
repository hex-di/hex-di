import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createMutationAdapter, createMutationPort } from "../src/index.js";

const CreateUserPort = createMutationPort<string, { name: string }>()({
  name: "AdCreateUser",
});

describe("createMutationAdapter", () => {
  it("returns a frozen Adapter object", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => (input: any) =>
        ResultAsync.fromPromise(Promise.resolve(`created: ${input.name}`), () => new Error("fail")),
    });
    expect(adapter).toBeDefined();
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("adapter provides the correct mutation port", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(adapter.provides).toBe(CreateUserPort);
  });

  it("adapter has empty requires by default", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(adapter.requires).toEqual([]);
  });

  it("adapter has singleton lifetime by default", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(adapter.lifetime).toBe("singleton");
  });

  it("adapter has a factory function", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(typeof adapter.factory).toBe("function");
  });

  it("adapter has clonable set to false by default", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(adapter.clonable).toBe(false);
  });

  it("adapter has factoryKind property", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(adapter.factoryKind).toBe("sync");
  });

  it("factory produces a working executor", async () => {
    const executor = (input: any, _context: any) =>
      ResultAsync.fromPromise(Promise.resolve(`ok: ${input.name}`), () => new Error("fail"));

    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => executor,
    });

    const resolved = (adapter.factory as any)();
    const controller = new AbortController();
    const result = await resolved({ name: "Alice" }, { signal: controller.signal });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe("ok: Alice");
    }
  });

  it("adapter port name is correct via provides", () => {
    const adapter = createMutationAdapter(CreateUserPort, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("fail")),
    });
    expect(adapter.provides.__portName).toBe("AdCreateUser");
  });
});

describe("createMutationAdapter (inline creation -- mutation testing)", () => {
  it("adapter is frozen and has standard properties", () => {
    const port = createMutationPort<string, void>()({ name: "InlineMut" });
    const adapter = createMutationAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("e")),
    });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.provides).toBe(port);
    expect(adapter.requires).toEqual([]);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.clonable).toBe(false);
  });

  it("adapter references the provided port via provides", () => {
    const port = createMutationPort<string, void>()({ name: "InlineMutPort" });
    const adapter = createMutationAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("e")),
    });
    expect(adapter.provides).toBe(port);
  });

  it("adapter provides.__portName matches the port name", () => {
    const port = createMutationPort<string, void>()({ name: "InlineMutNoDef" });
    const adapter = createMutationAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("e")),
    });
    expect(adapter.provides.__portName).toBe("InlineMutNoDef");
  });

  it("custom lifetime is preserved", () => {
    const port = createMutationPort<string, void>()({ name: "InlineMutLifetime" });
    const adapter = createMutationAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve("ok"), () => new Error("e")),
      lifetime: "transient",
    });
    expect(adapter.lifetime).toBe("transient");
  });
});
