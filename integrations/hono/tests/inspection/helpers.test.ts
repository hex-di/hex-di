import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createScopeMiddleware, getInspector, type HexHonoEnv } from "../../src/index.js";

const DummyPort = port<{ value: string }>()({ name: "Dummy" });

type AppPorts = typeof DummyPort;
type AppEnv = HexHonoEnv<AppPorts>;

function buildContainer() {
  const adapter = createAdapter({
    provides: DummyPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ value: "hello" }),
  });
  const graph = GraphBuilder.create().provide(adapter).build();
  return createContainer({ graph, name: "InspectionTest" });
}

describe("getInspector", () => {
  it("returns the inspector from the container on the context", async () => {
    const container = buildContainer();
    const app = new Hono<AppEnv>();

    app.use("*", createScopeMiddleware(container));

    app.get("/test", c => {
      const inspector = getInspector(c);
      return c.json({
        phase: inspector.getPhase(),
        ports: inspector.listPorts(),
      });
    });

    const res = await app.request("/test");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { phase: string; ports: string[] };
    // Containers without async ports are auto-initialized
    expect(body.phase).toBe("initialized");
    expect(body.ports).toContain("Dummy");
  });

  it("supports a custom container key", async () => {
    const container = buildContainer();
    type CustomEnv = HexHonoEnv<AppPorts, never, never, "uninitialized", "scope", "myContainer">;
    const app = new Hono<CustomEnv>();

    app.use(
      "*",
      createScopeMiddleware(container, { scopeKey: "scope", containerKey: "myContainer" })
    );

    app.get("/test", c => {
      const inspector = getInspector(c, "myContainer");
      return c.json({ disposed: inspector.isDisposed });
    });

    const res = await app.request("/test");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { disposed: boolean };
    expect(body.disposed).toBe(false);
  });

  it("throws when no container is on the context", async () => {
    const app = new Hono();

    app.get("/test", c => {
      // No scope middleware registered - getInspector should throw
      const inspector = getInspector(c);
      return c.json({ phase: inspector.getPhase() });
    });

    const res = await app.request("/test");
    // Hono catches the error and returns 500
    expect(res.status).toBe(500);
  });
});
