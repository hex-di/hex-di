import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { createScopeMiddleware, resolvePort, tracingMiddleware } from "@hex-di/hono";
import type { HexHonoEnv } from "@hex-di/hono";
import type { Context } from "hono";
import { createConsoleTracer } from "@hex-di/tracing";
import { UnauthorizedError } from "../../../application/errors.js";
import { AuthServicePort, LoggerPort, TodoServicePort } from "../../../application/ports.js";
import { TodoNotFoundError } from "../../../domain/errors.js";
import type { AppContainer } from "../../../di/container.js";
import type { AppPorts } from "../../../di/ports.js";
import { RequestIdPort } from "../../../infrastructure/ports.js";
import { CreateTodoInput, ErrorSchema, TodoSchema, UserSchema } from "./schemas.js";

type Env = HexHonoEnv<AppPorts>;
type AppContext = Context<Env>;

const bearerAuth: { bearerAuth: [] }[] = [{ bearerAuth: [] }];
const authHeader = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined ? undefined : value.replace(/^Bearer\s+/i, "");

const respondUnauthorized = (c: AppContext) =>
  c.json<{ error: string }, 401>({ error: "Unauthorized" }, 401);
const respondNotFound = (c: AppContext, message: string) =>
  c.json<{ error: string }, 404>({ error: message }, 404);

const requireUser = async (c: AppContext) => {
  const token = authHeader(c.req.header("authorization"));
  const auth = resolvePort(c, AuthServicePort);
  return auth.requireUser(token);
};

export const createHonoApp = (container: AppContainer) => {
  const app = new OpenAPIHono<Env>();

  // Add per-request scope middleware (creates fresh DI scope for each request)
  app.use("*", createScopeMiddleware(container));

  // Add distributed tracing middleware (creates server spans with W3C Trace Context)
  // Console tracer outputs spans to stdout for development visibility
  const tracer = createConsoleTracer({ colorize: true, minDurationMs: 1 });
  app.use(
    "*",
    tracingMiddleware({
      tracer,
      // Customize span names to use route patterns instead of actual paths
      spanName: c => `${c.req.method} ${c.req.routePath || c.req.path}`,
      // Add custom attributes for request correlation
      attributes: c => ({
        "request.id": resolvePort(c, RequestIdPort),
      }),
    })
  );

  app.use("*", async (c, next) => {
    const requestId = resolvePort(c, RequestIdPort);
    const logger = resolvePort(c, LoggerPort);
    logger.info("Incoming request", { path: c.req.path });
    c.header("x-request-id", requestId);
    await next();
  });

  const meRoute = createRoute({
    method: "get",
    path: "/me",
    tags: ["Auth"],
    security: bearerAuth,
    responses: {
      200: {
        description: "Current user",
        content: {
          "application/json": {
            schema: z.object({ user: UserSchema }).openapi("MeResponse"),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  });

  app.openapi(meRoute, async c => {
    const token = authHeader(c.req.header("authorization"));
    const auth = resolvePort(c, AuthServicePort);
    const user = await auth.authenticate(token);
    if (!user) {
      return c.json<{ error: string }, 401>({ error: "Unauthorized" }, 401);
    }
    return c.json<{ user: typeof user }, 200>({ user }, 200);
  });

  const listRoute = createRoute({
    method: "get",
    path: "/todos",
    tags: ["Todos"],
    security: bearerAuth,
    responses: {
      200: {
        description: "List todos",
        content: {
          "application/json": {
            schema: z.object({ todos: z.array(TodoSchema) }).openapi("TodoListResponse"),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  });

  app.openapi(listRoute, async c => {
    try {
      const user = await requireUser(c);
      const todos = await resolvePort(c, TodoServicePort).list(user);
      return c.json<{ todos: typeof todos }, 200>({ todos }, 200);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return respondUnauthorized(c);
      }
      throw error;
    }
  });

  const createRouteDef = createRoute({
    method: "post",
    path: "/todos",
    tags: ["Todos"],
    security: bearerAuth,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: CreateTodoInput,
        },
      },
    },
    responses: {
      201: {
        description: "Created todo",
        content: {
          "application/json": {
            schema: z.object({ todo: TodoSchema }).openapi("CreateTodoResponse"),
          },
        },
      },
      400: { description: "Bad request", content: { "application/json": { schema: ErrorSchema } } },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorSchema } },
      },
    },
  });

  app.openapi(createRouteDef, async c => {
    try {
      const user = await requireUser(c);
      const body = await c.req.json<{ title?: string }>();
      if (!body.title) {
        return c.json<{ error: string }, 400>({ error: "Title required" }, 400);
      }
      const todo = await resolvePort(c, TodoServicePort).add(user, body.title);
      return c.json<{ todo: typeof todo }, 201>({ todo }, 201);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return respondUnauthorized(c);
      }
      throw error;
    }
  });

  const toggleRoute = createRoute({
    method: "patch",
    path: "/todos/{id}/toggle",
    tags: ["Todos"],
    security: bearerAuth,
    request: {
      params: z.object({
        id: z.string().openapi({ example: "todo-id" }),
      }),
    },
    responses: {
      200: {
        description: "Toggled todo",
        content: {
          "application/json": {
            schema: z.object({ todo: TodoSchema }).openapi("ToggleTodoResponse"),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ErrorSchema } },
      },
      404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    },
  });

  app.openapi(toggleRoute, async c => {
    try {
      const user = await requireUser(c);
      const todo = await resolvePort(c, TodoServicePort).toggle(user, c.req.param("id"));
      return c.json<{ todo: typeof todo }, 200>({ todo }, 200);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return respondUnauthorized(c);
      }
      if (error instanceof TodoNotFoundError) {
        return respondNotFound(c, error.message);
      }
      throw error;
    }
  });

  app.doc("/openapi", {
    openapi: "3.1.0",
    info: {
      title: "HexDI Hono Todo API",
      version: "1.0.0",
      description: "Hono + HexDI example with per-request scopes, auth, and todo management.",
    },
  });

  app.get(
    "/reference",
    apiReference({
      spec: { url: "/openapi" },
      pageTitle: "HexDI Hono Todo API",
      theme: "saturn",
    })
  );

  return app;
};
