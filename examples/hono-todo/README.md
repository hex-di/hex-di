# @hex-di/hono todo API

A small Hono server that demonstrates HexDI + `@hex-di/hono` with DDD/Hexagonal layering:

- Domain layer defines entities + ports (`src/domain`)
- Application layer exposes use cases + app ports (`src/application`)
- Infrastructure layer provides adapters and technical ports (`src/infrastructure`)
- Inbound HTTP adapter lives in `src/adapters/inbound/hono`
- Composition root in `src/di/container.ts` and `src/di/ports.ts`
- Per-request scopes via `@hex-di/hono` middleware

## Quick start

```bash
pnpm install          # from repo root
pnpm --filter @hex-di/hono-todo dev
```

The server runs on `http://localhost:3000`.
The OpenAPI spec is served at `http://localhost:3000/openapi` and the live Scalar UI is available at `http://localhost:3000/reference`.

## Auth tokens

- `Bearer user-token` → regular user
- `Bearer admin-token` → admin user
- Missing/unknown tokens return 401

## Example calls

```bash
# List todos (empty)
curl -H "Authorization: Bearer user-token" http://localhost:3000/todos

# Create a todo
curl -X POST -H "Authorization: Bearer user-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"Write docs"}' \
  http://localhost:3000/todos

# Toggle completion
curl -X PATCH -H "Authorization: Bearer user-token" \
  http://localhost:3000/todos/<id>/toggle

# Who am I?
curl -H "Authorization: Bearer user-token" http://localhost:3000/me
```

## Notes

- `RequestIdPort` is scoped, so each request gets a unique id and logger prefix.
- `createScopeMiddleware` adds both container and scope to the Hono context.
- All business logic (auth, todos, logging) flows through HexDI ports/adapters.
- OpenAPI is generated via `@hono/zod-openapi`; view the JSON at `/openapi` and the Scalar reference UI at `/reference`.
- DDD mapping:
  - Domain: entities + ports in `src/domain`
  - Application: use cases + app ports in `src/application`
  - Infrastructure: adapters + technical ports in `src/infrastructure`
  - Inbound adapter: Hono routes in `src/adapters/inbound/hono`
  - Composition root: `src/di/container.ts` builds the HexDI graph
