import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { port, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createScopeMiddleware, createDiagnosticRoutes, type HexHonoEnv } from "../../src/index.js";

const AlphaPort = port<{ a: number }>()({ name: "Alpha" });
const BetaPort = port<{ b: string }>()({ name: "Beta" });

type AppPorts = typeof AlphaPort | typeof BetaPort;
type AppEnv = HexHonoEnv<AppPorts>;

function buildContainer() {
  const alphaAdapter = createAdapter({
    provides: AlphaPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ a: 1 }),
  });
  const betaAdapter = createAdapter({
    provides: BetaPort,
    requires: [],
    lifetime: "scoped",
    factory: () => ({ b: "hello" }),
  });
  const graph = GraphBuilder.create().provide(alphaAdapter).provide(betaAdapter).build();
  return createContainer({ graph, name: "DiagnosticTest" });
}

function buildApp() {
  const container = buildContainer();
  const app = new Hono<AppEnv>();

  app.use("*", createScopeMiddleware(container));
  app.route("/", createDiagnosticRoutes());

  return app;
}

describe("createDiagnosticRoutes", () => {
  it("GET /debug/health returns phase, portCount, and disposed", async () => {
    const app = buildApp();
    const res = await app.request("/debug/health");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      phase: string;
      portCount: number;
      disposed: boolean;
    };
    // Containers without async ports are auto-initialized
    expect(body.phase).toBe("initialized");
    expect(body.portCount).toBe(2);
    expect(body.disposed).toBe(false);
  });

  it("GET /debug/snapshot returns the container snapshot", async () => {
    const app = buildApp();
    const res = await app.request("/debug/snapshot");

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("containerName");
    expect(body).toHaveProperty("phase");
  });

  it("GET /debug/ports returns the list of port names", async () => {
    const app = buildApp();
    const res = await app.request("/debug/ports");

    expect(res.status).toBe(200);

    const body = (await res.json()) as string[];
    expect(body).toContain("Alpha");
    expect(body).toContain("Beta");
    expect(body).toHaveLength(2);
  });

  it("GET /debug/scopes returns the scope tree", async () => {
    const app = buildApp();
    const res = await app.request("/debug/scopes");

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    // ScopeTree has id, status, resolvedCount, totalCount, children
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("status");
    expect(body).toHaveProperty("children");
  });

  it("GET /debug/graph returns graph data", async () => {
    const app = buildApp();
    const res = await app.request("/debug/graph");

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("adapters");
    expect(body).toHaveProperty("containerName");
    expect(body).toHaveProperty("kind");
  });

  it("GET /debug/unified returns the unified snapshot", async () => {
    const app = buildApp();
    const res = await app.request("/debug/unified");

    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("container");
    expect(body).toHaveProperty("timestamp");
  });

  it("returns 404 for all routes when disabled", async () => {
    const container = buildContainer();
    const app = new Hono<AppEnv>();

    app.use("*", createScopeMiddleware(container));
    app.route("/", createDiagnosticRoutes({ enabled: false }));

    const healthRes = await app.request("/debug/health");
    expect(healthRes.status).toBe(404);

    const snapshotRes = await app.request("/debug/snapshot");
    expect(snapshotRes.status).toBe(404);
  });

  it("supports a custom path prefix", async () => {
    const container = buildContainer();
    const app = new Hono<AppEnv>();

    app.use("*", createScopeMiddleware(container));
    app.route("/", createDiagnosticRoutes({ pathPrefix: "/_internal" }));

    const res = await app.request("/_internal/health");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { phase: string };
    // Containers without async ports are auto-initialized
    expect(body.phase).toBe("initialized");

    // Old prefix should not work
    const oldRes = await app.request("/debug/health");
    expect(oldRes.status).toBe(404);
  });
});
