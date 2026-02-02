# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**Not detected** - This codebase is a library framework with no built-in integrations to external APIs or services. Each package is agnostic and framework integrations are provided separately.

Framework integration packages that _enable_ external service usage:

- `@hex-di/hono` (packages/hono) - Enables HTTP API development with Hono web framework
- `@hex-di/react` (packages/react) - Enables React application development with HexDI DI
- `@hex-di/flow` (packages/flow) - Provides state machine runtime for activity-based patterns

The examples demonstrate external service consumption:

**hono-todo example:**

- Uses Hono + Zod for REST API with request scoping
- Scalar integration for OpenAPI documentation UI
- Per-request dependency injection pattern

**react-showcase example:**

- TanStack Query (React Query) - Server state management
- Zustand - Client state management
- React Router - Client-side routing

## Data Storage

**Databases:**

- Not detected - Library provides no built-in database integration
- Applications using HexDI can integrate any database driver via port/adapter pattern

**File Storage:**

- Local filesystem only
- Generated output: `dist/` directories for built packages
- Cache: `.vite-temp/` for Vite build cache

**Caching:**

- Not detected at library level
- Examples can use TanStack Query for HTTP caching (react-showcase)

## Authentication & Identity

**Auth Provider:**

- Custom implementation pattern - Library provides no built-in auth
- Applications implement via `@hex-di/core` port/adapter pattern
- Example: hono-todo includes auth adapter pattern (per-request scope example)

**Implementation approach:**

- Ports define auth interfaces
- Adapters implement authentication logic
- Container provides auth service to application code
- Per-request scopes isolate auth context

## Monitoring & Observability

**Error Tracking:**

- Not detected - Library provides no built-in error tracking integration

**Logs:**

- `console.*` methods used in documentation examples
- Library provides tracing infrastructure:
  - `TraceCollector` interface in `@hex-di/core` for custom collectors
  - `@hex-di/core` exports memory and composite trace collectors
  - Inspection utilities for analyzing resolution paths and circular dependencies
  - No external observability platform integration

**Tracing:**

- Internal tracing: `@hex-di/core` provides trace collection primitives
- Path: `packages/core/src/collectors/` - Memory, composite, and no-op collectors
- Exported via `@hex-di/core` main entry point
- Tracing types available from `packages/core/src/inspection/tracing-types.ts`

## CI/CD & Deployment

**Hosting:**

- Repository: GitHub (github.com/hex-di/hex-di)
- Package registry: NPM (published as `@hex-di/*` scoped packages)
- Website: Docusaurus 3.9.2 (documentation site via website package)

**CI Pipeline:**

- Pre-commit hooks via Husky 9.1.7
- lint-staged 16.2.7 - Runs ESLint and Prettier on staged files
- Local enforcement of linting rules

**Build System:**

- Turborepo - Monorepo task orchestration
- pnpm workspaces - Workspace linking

## Environment Configuration

**Required env vars:**

- Not detected - Library requires no environment variables
- Optional: `NODE_ENV` in examples for dev/production switching

**Secrets location:**

- Not applicable - Library requires no secrets

## Webhooks & Callbacks

**Incoming:**

- Not detected - Library is not a service

**Outgoing:**

- Not detected - Library provides no built-in webhook capabilities
- Applications can implement webhook patterns via port/adapter architecture

## Package Publishing

**NPM Registry:**

- Packages published under `@hex-di` scope
- License: MIT
- Package names:
  - `@hex-di/core`
  - `@hex-di/graph`
  - `@hex-di/runtime`
  - `@hex-di/react`
  - `@hex-di/flow`
  - `@hex-di/flow-react`
  - `@hex-di/testing`
  - `@hex-di/hono`
  - `@hex-di/visualization`
  - `@hex-di/graph-viz`

**Publishing Config:**

- Dual ESM/CommonJS exports
- TypeScript declaration files included
- Source maps included
- Side effects marked as `false`
- Engines: Node.js >=18.0.0

## Documentation & Examples

**Documentation:**

- Path: `website/` - Docusaurus 3.9.2 site
- Deployed via Docusaurus deploy command
- Local search via `@easyops-cn/docusaurus-search-local` 0.52.2

**Examples:**

- `examples/hono-todo/` - REST API with per-request scopes
- `examples/react-showcase/` - Full React application demonstrating all features

---

_Integration audit: 2026-02-01_
