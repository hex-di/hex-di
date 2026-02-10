import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createQueryAdapter, createQueryPort } from "../src/index.js";

const UsersPort = createQueryPort<string[], { role?: string }>()({ name: "AdUsers" });

describe("createQueryAdapter", () => {
  it("returns a frozen Adapter object", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter).toBeDefined();
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("adapter provides the correct query port", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter.provides).toBe(UsersPort);
  });

  it("adapter has empty requires by default", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter.requires).toEqual([]);
  });

  it("adapter has singleton lifetime by default", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter.lifetime).toBe("singleton");
  });

  it("adapter has a factory function", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(typeof adapter.factory).toBe("function");
  });

  it("adapter has clonable set to false by default", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter.clonable).toBe(false);
  });

  it("adapter has factoryKind property", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter.factoryKind).toBe("sync");
  });

  it("factory produces a working fetcher", async () => {
    const fetcher = (_params: any, _context: any) =>
      ResultAsync.fromPromise(Promise.resolve(["Alice"]), () => new Error("fail"));

    const adapter = createQueryAdapter(UsersPort, {
      factory: () => fetcher,
    });

    // The adapter.factory returns the fetcher when called
    const resolved = (adapter.factory as any)();
    const controller = new AbortController();
    const result = await resolved({ role: "admin" }, { signal: controller.signal });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(["Alice"]);
    }
  });

  it("adapter port name is correct via provides", () => {
    const adapter = createQueryAdapter(UsersPort, {
      factory: () => () =>
        ResultAsync.fromPromise(Promise.resolve(["data"]), () => new Error("fail")),
    });
    expect(adapter.provides.__portName).toBe("AdUsers");
  });
});

describe("createQueryAdapter (inline creation -- mutation testing)", () => {
  it("adapter is frozen and has standard properties", () => {
    const port = createQueryPort<string[], void>()({ name: "InlineAd" });
    const adapter = createQueryAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve(["x"]), () => new Error("e")),
    });
    expect(Object.isFrozen(adapter)).toBe(true);
    expect(adapter.provides).toBe(port);
    expect(adapter.requires).toEqual([]);
    expect(adapter.lifetime).toBe("singleton");
    expect(adapter.clonable).toBe(false);
  });

  it("adapter references the provided port via provides", () => {
    const port = createQueryPort<string[], void>()({ name: "InlineAdPort" });
    const adapter = createQueryAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve(["x"]), () => new Error("e")),
    });
    expect(adapter.provides).toBe(port);
  });

  it("adapter provides.__portName matches the port name", () => {
    const port = createQueryPort<string[], void>()({ name: "InlineNoDef" });
    const adapter = createQueryAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve(["x"]), () => new Error("e")),
    });
    expect(adapter.provides.__portName).toBe("InlineNoDef");
  });

  it("custom lifetime is preserved", () => {
    const port = createQueryPort<string[], void>()({ name: "InlineWithLifetime" });
    const adapter = createQueryAdapter(port, {
      factory: () => () => ResultAsync.fromPromise(Promise.resolve(["x"]), () => new Error("e")),
      lifetime: "transient",
    });
    expect(adapter.lifetime).toBe("transient");
  });
});
