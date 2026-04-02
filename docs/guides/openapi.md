---
title: Schema-First OpenAPI
description: Build type-safe HTTP APIs with Zod schemas that double as runtime validators and OpenAPI documentation.
sidebar_position: 7
---

# Schema-First OpenAPI

HexDI HTTP examples use [`@hono/zod-openapi`](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) for schema-first API development. Zod schemas serve as both runtime validators and OpenAPI documentation sources — no hand-written OpenAPI YAML.

## Why Schema-First?

| Concern            | Traditional approach                     | Schema-first approach                        |
| ------------------ | ---------------------------------------- | -------------------------------------------- |
| Runtime validation | Manual `if` checks or middleware         | Zod `.parse()` / `.safeParse()`              |
| API documentation  | Separate OpenAPI YAML maintained by hand | Generated from Zod schemas                   |
| Type inference     | Hand-written TypeScript interfaces       | `z.infer<typeof Schema>`                     |
| Drift risk         | Docs and code diverge silently           | Single source of truth — impossible to drift |

## Defining Schemas

Co-locate Zod schemas with route definitions. Each schema gets an `.openapi()` call to attach metadata for the generated OpenAPI document:

```typescript
import { z } from "@hono/zod-openapi";

const TodoSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    done: z.boolean(),
  })
  .openapi("Todo");

const CreateTodoInput = z
  .object({
    title: z.string().min(1, "Title required").openapi({ example: "Write docs" }),
  })
  .openapi("CreateTodoInput");
```

See [`examples/hono-todo/src/adapters/inbound/hono/schemas.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/hono-todo/src/adapters/inbound/hono/schemas.ts) for the full reference.

## Creating Typed Routes

Use `createRoute()` from `@hono/zod-openapi` to define routes with request/response schemas:

```typescript
import { createRoute } from "@hono/zod-openapi";

const listTodosRoute = createRoute({
  method: "get",
  path: "/todos",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(TodoSchema) } },
      description: "List of todos",
    },
  },
});
```

## Serving the OpenAPI Document

Register the generated OpenAPI document and an interactive UI:

```typescript
import { apiReference } from "@scalar/hono-api-reference";

app.doc("/openapi", {
  openapi: "3.1.0",
  info: {
    title: "My API",
    version: "1.0.0",
  },
});

app.get(
  "/reference",
  apiReference({
    spec: { url: "/openapi" },
    theme: "saturn",
  })
);
```

This exposes:

- `GET /openapi` — JSON OpenAPI 3.1 document
- `GET /reference` — interactive Scalar API reference UI

## CI Drift Detection

The CI pipeline includes an `openapi-check` job that detects accidental OpenAPI spec drift. It works by:

1. Building the example app
2. Starting the server and fetching `/openapi`
3. Diffing against a committed `openapi-snapshot.json`

To update the snapshot after intentional schema changes:

```bash
cd examples/hono-todo
pnpm build
node dist/server.js &
sleep 2
curl -s http://localhost:4000/openapi | jq . > openapi-snapshot.json
kill %1
```

If no snapshot exists, CI emits a warning. Commit the snapshot to enable drift checks.

## Reference Implementations

| Example                                                                                | Schemas                                                                                                               | OpenAPI endpoint   |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [hono-todo](https://github.com/leaderiop/hex-di/blob/main/examples/hono-todo/)         | [`schemas.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/hono-todo/src/adapters/inbound/hono/schemas.ts) | `GET /openapi`     |
| [pokenerve API](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/) | [`schemas/pokemon.ts`](https://github.com/leaderiop/hex-di/blob/main/examples/pokenerve/api/src/schemas/pokemon.ts)   | `GET /api/openapi` |

## Applying Schema-First to Integration HTTP Surfaces

The `@hex-di/hono` integration itself does not mandate Zod schemas — it provides middleware for DI scoping and diagnostic routes. When building HTTP-facing adapters that expose or consume external APIs, apply the schema-first pattern:

### When to use runtime schemas

| Boundary                           | Use schemas? | Rationale                                             |
| ---------------------------------- | ------------ | ----------------------------------------------------- |
| HTTP request/response bodies       | **Yes**      | Untrusted external data crossing the network boundary |
| Environment variables              | **Yes**      | String-typed, may be missing or malformed             |
| File/queue payloads                | **Yes**      | External data with no compile-time guarantees         |
| Service-to-service within DI graph | **No**       | Already validated by TypeScript port contracts        |

### Pattern for custom integration adapters

If you create a new integration package that exposes HTTP routes (similar to `@hex-di/hono`), follow this structure:

```
integrations/my-framework/
├── src/
│   ├── middleware/          # DI scoping middleware
│   ├── schemas/             # Zod schemas for any HTTP payloads
│   └── routes/              # Route definitions using schemas
└── package.json
```

Co-locate schemas with routes and use `z.infer<typeof Schema>` for type inference rather than hand-written interfaces.

See [Architecture: Runtime Schemas vs Port Contracts](../architecture.md#runtime-schemas-vs-port-contracts) for the decision framework.

## Common Schema Patterns

When building new HTTP boundaries, consider these reusable patterns:

### Pagination

```typescript
import { z } from "zod";

const PaginationParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional(),
});

const PaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
  });
```

### Error Response

```typescript
const ErrorResponse = z.object({
  error: z.object({
    _tag: z.string(),
    message: z.string(),
    code: z.string().optional(),
  }),
});
```

### Environment Variable Parsing

See the [Runtime Validation guide](./runtime-validation.md) for the `Result`-returning env parser pattern used in `examples/pokenerve/api/src/env.ts`.

## Related

- [Runtime Validation](./runtime-validation.md) — Zod + Result patterns at untyped boundaries
- [Architecture: Schema-First HTTP Convention](../architecture.md#schema-first-http-convention) — architectural rationale
- [`@hono/zod-openapi` docs](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)
