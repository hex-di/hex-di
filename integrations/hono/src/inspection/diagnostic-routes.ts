import { Hono } from "hono";
import { DEFAULT_CONTAINER_KEY } from "../constants.js";
import { getInspector } from "./helpers.js";

/**
 * Configuration for diagnostic route creation.
 */
export interface DiagnosticRoutesConfig {
  /** Path prefix for all diagnostic routes. Defaults to "/debug". */
  readonly pathPrefix?: string;
  /** Whether diagnostic routes are enabled. Defaults to true. */
  readonly enabled?: boolean;
  /** Custom container key used by the scope middleware. */
  readonly containerKey?: string;
}

/**
 * Creates a Hono sub-application that exposes diagnostic/inspection routes.
 *
 * The routes provide read-only access to the container's {@link InspectorAPI},
 * returning JSON responses for health, snapshot, ports, scope tree, graph
 * data, and unified snapshot.
 *
 * All routes require the scope middleware (or equivalent) to have stored the
 * container on the Hono context. If the container is not available, routes
 * return a 500 response with an error message.
 *
 * When `enabled` is `false`, an empty Hono app is returned (all routes 404).
 *
 * @param config - Optional configuration
 * @returns A Hono app to mount on a parent application
 *
 * @example
 * ```typescript
 * const app = new Hono();
 * app.use("*", createScopeMiddleware(container));
 * app.route("/", createDiagnosticRoutes());
 * // GET /debug/health, /debug/snapshot, etc.
 * ```
 */
export function createDiagnosticRoutes(config?: DiagnosticRoutesConfig): Hono {
  const prefix = config?.pathPrefix ?? "/debug";
  const enabled = config?.enabled ?? true;
  const containerKey = config?.containerKey ?? DEFAULT_CONTAINER_KEY;

  const app = new Hono();

  if (!enabled) {
    return app;
  }

  app.get(`${prefix}/health`, c => {
    try {
      const inspector = getInspector(c, containerKey);
      return c.json({
        phase: inspector.getPhase(),
        portCount: inspector.listPorts().length,
        disposed: inspector.isDisposed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.get(`${prefix}/snapshot`, c => {
    try {
      const inspector = getInspector(c, containerKey);
      return c.json(inspector.getSnapshot());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.get(`${prefix}/ports`, c => {
    try {
      const inspector = getInspector(c, containerKey);
      return c.json(inspector.listPorts());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.get(`${prefix}/scopes`, c => {
    try {
      const inspector = getInspector(c, containerKey);
      return c.json(inspector.getScopeTree());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.get(`${prefix}/graph`, c => {
    try {
      const inspector = getInspector(c, containerKey);
      return c.json(inspector.getGraphData());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.get(`${prefix}/unified`, c => {
    try {
      const inspector = getInspector(c, containerKey);
      return c.json(inspector.getUnifiedSnapshot());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  return app;
}
