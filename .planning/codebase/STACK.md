# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**

- TypeScript 5.6 - All source code, strict mode enabled
- JavaScript - Configuration files and tooling

**Secondary:**

- None

## Runtime

**Environment:**

- Node.js 18.0.0 or higher
- ESM (ES modules) - All packages configured as `"type": "module"`

**Package Manager:**

- pnpm 9.15.0 (required)
- pnpm workspaces for monorepo structure
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core:**

- TypeScript 5.6+ - Language and type system
- HexDI (internal) - Dependency injection framework across all packages

**Framework Integrations:**

- React 19.2+ - React integration (`@hex-di/react`, `@hex-di/flow-react`, `@hex-di/graph-viz`)
- Hono 4.11+ - Web framework integration (`@hex-di/hono`)

**Testing:**

- Vitest 4.0.16 - Unit and type checking tests
- Testing Library React 16.0 - React component testing (`@testing-library/react`)
- Testing Library DOM 10.0 - DOM testing utilities
- jsdom 24.0+ - DOM implementation for Node.js tests

**Build/Dev:**

- TypeScript Compiler (tsc) - Builds all packages
- Prettier 3.7.4 - Code formatting
- ESLint 9.39.2 - Linting with typescript-eslint 8.50.1
- Turborepo - Monorepo task orchestration (implied by scripts)
- Vite 7.3.0 - Bundler for React showcase example
- tsx 4.19.2 - TypeScript executor for examples

**Code Quality:**

- Stryker Mutator 8.7.1 - Mutation testing (`@hex-di/graph` package)
- fast-check 4.5.3 - Property-based testing (`@hex-di/graph` package)

## Key Dependencies

**Critical (Internal Workspace):**

- `@hex-di/core` - Core port/adapter abstractions, inspection, and tracing primitives
- `@hex-di/graph` - Dependency graph construction and compile-time validation
- `@hex-di/runtime` - Immutable containers, scope hierarchy, service resolution
- `@hex-di/react` - React hooks and Provider components
- `@hex-di/flow` - Typed state machine runtime
- `@hex-di/flow-react` - React hooks for state machines
- `@hex-di/testing` - Testing utilities with Vitest integration
- `@hex-di/hono` - Hono web framework integration
- `@hex-di/visualization` - Graph visualization (DOT and Mermaid export)
- `@hex-di/graph-viz` - React graph visualization with zoom/pan

**External (Dev/Runtime):**

- `hono` 4.11+ - Fast web framework for HTTP applications
- `react` 19.2+ - UI library (peer dependency for React integration packages)
- `react-dom` 19.2+ - React DOM renderer
- `zod` 3.23.8 - Schema validation (examples)
- `dagre` 0.8.5 - Graph layout library for visualization
- `@tanstack/react-query` 5.0+ - Server state management (examples)
- `zustand` 5.0+ - State management (examples)
- `react-router-dom` 7.11+ - Client-side routing (examples)
- `@hono/node-server` 1.19+ - Node.js server adapter for Hono
- `@hono/zod-openapi` 0.18+ - OpenAPI integration for Hono
- `@scalar/hono-api-reference` 0.5+ - API documentation UI

## Configuration

**Environment:**

- TypeScript strict mode enabled
- Node.js minimum version: 18.0.0
- No environment variables required for core library usage (framework agnostic)
- Examples may use NODE_ENV for production/development switching

**Build:**

- `tsconfig.json` (root) - Base TypeScript configuration targeting ES2020, ESNext modules
- Each package has `tsconfig.build.json` extending root config
- Type declarations generated: `*.d.ts` and `*.d.cts` (ESM and CommonJS)
- Source maps included in builds
- Declaration maps included for better IDE support

**Monorepo:**

- `pnpm-workspace.yaml` - Workspace configuration
- `package.json` (root) - Workspace-level scripts and build orchestration
- Each package has independent `package.json` with scoped name (`@hex-di/*`)
- Turborepo for task caching and parallel execution

**Package Distribution:**

- Dual format exports: ES modules (`.js`, `.d.ts`) and CommonJS (`.cjs`, `.d.cts`)
- Conditional exports for import/require branching
- Entry point exports specified in each package's `package.json`
- Side effects marked as `false` for tree-shaking optimization

## Platform Requirements

**Development:**

- Node.js 18.0.0 or higher
- pnpm 9.0.0 or higher
- TypeScript 5.6.0 installed locally
- Git (for repository operations)
- Husky 9.1+ - Git hooks for pre-commit linting

**Production:**

- Node.js 18.0.0 or higher for runtime packages
- React 19.0+ required for React-integrated packages (peer dependency)
- Hono 4.0+ required for Hono integration (peer dependency)
- Vitest 4.0+ for testing utilities package (optional peer dependency)

**CI/CD:**

- Repository: GitHub (github.com/hex-di/hex-di)
- Pre-commit hooks with lint-staged via Husky
- ESLint and Prettier enforced on staged TypeScript/JSON files

---

_Stack analysis: 2026-02-01_
