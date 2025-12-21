import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import type { Context } from "hono";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, createAsyncAdapter } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createScopeMiddleware,
  getContainer,
  getScope,
  resolvePort,
  resolvePortAsync,
  type HexHonoEnv,
} from "../src/index.js";

interface RequestId {
  id: number;
}

interface AsyncValue {
  value: string;
}

interface ScopedResource {
  disposed: boolean;
}

const RequestIdPort = createPort<"RequestId", RequestId>("RequestId");
const AsyncValuePort = createPort<"AsyncValue", AsyncValue>("AsyncValue");
const ScopedResourcePort = createPort<"ScopedResource", ScopedResource>("ScopedResource");

type AppPorts = typeof RequestIdPort | typeof AsyncValuePort | typeof ScopedResourcePort;
type DefaultEnv = HexHonoEnv<AppPorts>;

function buildContainer(disposalLog: string[]) {
  let counter = 0;

  const requestIdAdapter = createAdapter({
    provides: RequestIdPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ id: ++counter }),
  });

  const scopedResourceAdapter = createAdapter({
    provides: ScopedResourcePort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ disposed: false }),
    finalizer: (resource) => {
      resource.disposed = true;
      disposalLog.push("disposed");
    },
  });

  const asyncValueAdapter = createAsyncAdapter({
    provides: AsyncValuePort,
    requires: [],
    factory: async () => ({ value: "async-value" }),
  });

  const graph = GraphBuilder.create()
    .provide(requestIdAdapter)
    .provide(scopedResourceAdapter)
    .provide(asyncValueAdapter)
    .build();

  return createContainer(graph);
}

describe("@hex-di/hono", () => {
  it("creates a fresh scope per request and resolves ports through helpers", async () => {
    const disposalLog: string[] = [];
    const container = buildContainer(disposalLog);
    const app = new Hono<DefaultEnv>();

    app.use("*", createScopeMiddleware(container));

    app.get("/id", (context: Context<DefaultEnv>) => {
      const requestId = resolvePort(context, RequestIdPort);
      resolvePort(context, ScopedResourcePort); // ensure a scoped instance exists for disposal
      return context.json({ id: requestId.id });
    });

    app.get("/async", async (context: Context<DefaultEnv>) => {
      const asyncValue = await resolvePortAsync(context, AsyncValuePort);
      return context.json({ value: asyncValue.value });
    });

    const first = await app.request("/id");
    const second = await app.request("/id");
    const { id: firstId } = (await first.json()) as { id: number };
    const { id: secondId } = (await second.json()) as { id: number };

    expect(firstId).toBe(1);
    expect(secondId).toBe(2);
    expect(disposalLog).toEqual(["disposed", "disposed"]);

    const asyncResponse = await app.request("/async");
    const { value } = (await asyncResponse.json()) as { value: string };
    expect(value).toBe("async-value");
  });

  it("disposes the scope even when the handler throws", async () => {
    const disposalLog: string[] = [];
    const container = buildContainer(disposalLog);
    const app = new Hono<DefaultEnv>();

    app.use("*", createScopeMiddleware(container));

    app.get("/error", (context: Context<DefaultEnv>) => {
      resolvePort(context, ScopedResourcePort);
      throw new Error("boom");
    });

    const response = await app.request("/error");
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(disposalLog).toEqual(["disposed"]);
  });

  it("supports custom context keys for scope and container access", async () => {
    const disposalLog: string[] = [];
    const container = buildContainer(disposalLog);
    type CustomEnv = HexHonoEnv<AppPorts, never, "uninitialized", "scope", "container">;
    const app = new Hono<CustomEnv>();

    app.use("*", createScopeMiddleware(container, { scopeKey: "scope", containerKey: "container" }));

    app.get("/", (context: Context<CustomEnv>) => {
      const scope = getScope(context, "scope");
      const rootContainer = getContainer(context, "container");
      expect(rootContainer).toBe(container);
      const requestId = scope.resolve(RequestIdPort);
      scope.resolve(ScopedResourcePort);
      return context.json({ id: requestId.id });
    });

    const response = await app.request("/");
    expect(response.status).toBe(200);
    const { id } = (await response.json()) as { id: number };
    expect(id).toBe(1);
    expect(disposalLog).toEqual(["disposed"]);
  });
});
