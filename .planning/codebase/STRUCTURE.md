# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
hex-di/
├── packages/                    # Core monorepo packages
│   ├── core/                    # Zero-dependency foundation (ports, adapters, errors, inspection)
│   ├── runtime/                 # Container creation and service resolution
│   └── graph/                   # Compile-time validation and dependency graph building
├── integrations/                # Framework integrations
│   ├── react/                   # React integration (hooks, providers)
│   └── hono/                    # Hono web framework integration
├── tooling/                     # Developer tooling packages
│   ├── testing/                 # Testing utilities (mocks, test adapters, assertions)
│   ├── visualization/           # Graph visualization (Mermaid, Dot output)
│   └── graph-viz/               # Generic React graph visualization component
├── libs/                        # Domain libraries
│   └── flow/                    # State machine domain
│       ├── core/                # State machine runtime with effects and activities
│       └── react/               # React integration for flow state machines
├── examples/                    # Example applications
│   ├── react-showcase/          # React integration showcase with containers and scopes
│   └── hono-todo/               # Hono backend example with DI
├── website/                     # Docusaurus documentation website
├── docs/                        # Source documentation
├── analysis/                    # Analysis and design docs
├── .planning/                   # GSD planning directory
│   └── codebase/                # Generated codebase analysis (this file's location)
├── eslint.config.js             # Root ESLint configuration
├── tsconfig.json                # Root TypeScript configuration
├── vitest.config.ts             # Root Vitest configuration
├── pnpm-workspace.yaml          # pnpm workspaces configuration
└── package.json                 # Root package manifest
```

## Directory Purposes

**packages/core/src:**

- Purpose: Zero-dependency foundation package
- Contains:
  - `ports/` - Port token factory (`factory.ts`), types, index
  - `adapters/` - Adapter factory/types (`factory.ts`, `service.ts`), inference, lazy support, guards
  - `errors/` - Error codes/classes (`codes.ts`, `classes.ts`, `parsing.ts`), types, base class
  - `inspection/` - Container/graph inspection types (containers-types.ts, graph-types.ts, tracing-types.ts)
  - `collectors/` - TraceCollector interface and implementations (memory.ts, noop.ts, composite.ts)
  - `span/` - ResolutionSpan builder, metrics, types
  - `utils/` - Type utilities, correlation ID generation
- Key files: `index.ts` (main export)

**packages/runtime/src:**

- Purpose: Container creation and immutable service resolution
- Contains:
  - `container/` - Container factory and implementations:
    - `factory.ts` - createContainer entry point
    - `base-impl.ts` - Base container logic
    - `root-impl.ts` - Root container specialized implementation
    - `child-impl.ts` - Child container inheritance
    - `lazy-impl.ts` - Lazy (deferred) container
    - `wrappers.ts` - Container wrapper utilities
  - `resolution/` - Resolution engine:
    - `engine.ts` - Sync resolution core
    - `async-engine.ts` - Async resolution
    - `hooks.ts` - Resolution hooks system
    - `hooks-runner.ts` - Hook execution
    - `core.ts` - Resolution entry point
  - `scope/` - Scope management:
    - Multiple files for scope state and lifecycle
  - `tracing/` - Trace integration during resolution
  - `inspection/` - Container state inspection API
  - `types/` - Container/scope type definitions and branded types
  - `captive-dependency.ts` - Runtime captive dependency validation
- Key files: `index.ts` (main export), `types.ts`

**packages/graph/src:**

- Purpose: Compile-time dependency validation with type-state machine
- Contains:
  - `builder/` - GraphBuilder implementation:
    - `builder.ts` - Main GraphBuilder class
    - `types/` - Builder type state (state.ts, index inference.ts)
    - `builder-provide.ts` - Adapter registration
    - `builder-merge.ts` - Graph merging
    - `builder-build.ts` - Build finalization
  - `graph/` - Graph data structure:
    - `types/` - Graph types (graph-types.ts, graph-inference.ts)
    - `guards.ts` - Type guards
    - `inspection/` - Graph inspection utilities
  - `validation/` - Type-level validation:
    - `cycle-detection.ts` - DFS cycle detection
    - `captive-dependency.ts` - Lifetime hierarchy validation
  - `symbols/` - Brand symbols for nominal typing
  - `types/` - Inference and validation types
- Key files: `index.ts` (primary), `advanced.ts` (inspection/validation)

**integrations/react/src:**

- Purpose: React integration without global state
- Contains:
  - `factories/` - Factory functions:
    - `index.ts` - createTypedHooks, createComponent
  - `providers/` - Provider components:
    - HexDiContainerProvider - Root container access
    - HexDiScopeProvider - Manual scope management
    - HexDiAutoScopeProvider - Automatic scope lifecycle
    - ReactiveScopeProvider - External scope lifecycle triggering
    - HexDiAsyncContainerProvider - Async container loading
    - HexDiLazyContainerProvider - Lazy graph loading
  - `hooks/` - React hooks:
    - usePort - Resolve single port
    - useContainer - Access container
    - useScope - Access current scope
    - useDeps - Resolve multiple ports
  - `types/` - Type definitions and utilities
  - `internal/` - Internal utilities
- Key files: `index.ts` (main export)

**libs/flow/core/src:**

- Purpose: State machine runtime with type-safe effects and activities
- Contains:
  - `machine/` - Machine definition:
    - State and event types with branded symbols
    - createMachine factory
  - `effects/` - Effect system:
    - Effect descriptors (InvokeEffect, SpawnEffect, EmitEffect, DelayEffect)
    - Effect namespace and constructors
  - `activities/` - Long-running processes:
    - Activity interface
    - ActivityManager
    - activity factory
    - Testing utilities (createTestEventSink, testActivity)
  - `runner/` - Machine execution:
    - MachineRunner - State machine interpreter
    - EffectExecutor - Effect execution interface
    - transition function - pure transition logic
  - `integration/` - HexDI container integration:
    - createFlowPort - Port factory for machines
    - createDIEffectExecutor - Resolves ports from container
    - createFlowAdapter - Adapter factory for machines
  - `tracing/` - DevTools integration:
    - FlowCollector - Transition tracing
    - createTracingRunner - Runner with tracing
  - `devtools/` - Activity metadata extraction
  - `errors/` - Flow-specific error classes
- Key files: `index.ts` (main export)

**libs/flow/react/src:**

- Purpose: React components and hooks for flow state machines
- Contains:
  - `context/` - React context management
  - `hooks/` - React hooks for machine state
  - `providers/` - Provider components
  - `internal/` - Internal utilities
- Key files: `index.ts` (main export)

**integrations/hono/src:**

- Purpose: Hono web framework integration
- Contains:
  - `types.ts` - Hono-specific types
  - `middleware.ts` - Hono middleware for scope management
  - `helpers.ts` - Utility helpers
  - `index.ts` - Main export
- Key files: `index.ts` (main export)

**tooling/testing/src:**

- Purpose: Testing utilities and mocks
- Contains:
  - `mock-adapter.ts` - Create mock adapters
  - `adapter-test-harness.ts` - Test adapter in isolation
  - `test-graph-builder.ts` - Graph building for tests
  - `graph-assertions.ts` - Assert graph structure
  - `graph-snapshot.ts` - Snapshot graph for testing
  - `render-with-container.tsx` - React test utility
  - `vitest/` - Vitest-specific utilities
  - `index.ts` - Main export (no vitest deps)
- Key files: `index.ts` (main), `vitest/index.ts` (vitest integration)

**tooling/graph-viz/src:**

- Purpose: Generic React graph visualization component
- Contains:
  - `graph-renderer.tsx` - Main renderer component
  - `graph-layout.ts` - Dagre layout algorithm
  - `graph-node.tsx` - Node rendering
  - `graph-edge.tsx` - Edge rendering
  - `graph-controls.tsx` - Zoom/pan controls
  - `styles.ts` - Styling utilities
  - `types.ts` - Component types
- Key files: `index.ts` (main export)

**tooling/visualization/src:**

- Purpose: Graph visualization (Mermaid/Dot output)
- Contains:
  - `visualization.ts` - Main visualization functions
  - `helpers.ts` - Helper utilities
  - `types.ts` - Visualization types
  - `constants.ts` - Constants
  - `errors.ts` - Visualization errors
- Key files: `index.ts` (main export)

## Key File Locations

**Entry Points:**

- `packages/core/src/index.ts`: Zero-dependency primitives (ports, adapters, errors)
- `packages/graph/src/index.ts`: GraphBuilder and graph types
- `packages/runtime/src/index.ts`: Container factory and types
- `packages/react/src/index.ts`: React integration factory
- `packages/flow/src/index.ts`: State machine runtime

**Configuration:**

- `tsconfig.json`: Root TypeScript configuration (ES2020, strict, bundler resolution)
- `eslint.config.js`: Root ESLint configuration with antfu plugin
- `vitest.config.ts`: Root Vitest configuration
- `pnpm-workspace.yaml`: pnpm workspace paths
- Each package has:
  - `tsconfig.json` - Extends root config
  - `tsconfig.build.json` - Build-specific config (excludes tests)
  - `eslint.config.js` - Package-specific linting rules
  - `package.json` - Package metadata and scripts

**Core Logic:**

- `packages/core/src/adapters/factory.ts`: Adapter creation logic
- `packages/core/src/ports/factory.ts`: Port token creation
- `packages/runtime/src/container/factory.ts`: Container creation
- `packages/runtime/src/resolution/engine.ts`: Sync resolution logic
- `packages/runtime/src/resolution/async-engine.ts`: Async resolution logic
- `packages/graph/src/builder/builder.ts`: GraphBuilder implementation

**Testing:**

- `packages/*/tests/` - Vitest test files co-located with each package
- Test pattern: `*.test.ts` or `*.spec.ts` files
- Each package runs tests via `pnpm test` or `pnpm --filter @hex-di/<package> test`

## Naming Conventions

**Files:**

- `factory.ts` - Factory functions (createPort, createAdapter, createContainer)
- `types.ts` - Type definitions
- `index.ts` - Package entry point/barrel export
- `*.test.ts` - Test files (Vitest)
- `*.impl.ts` - Implementation files (concrete classes)
- `guards.ts` - Type guard functions
- `inference.ts` - Type inference utilities
- `constants.ts` - Constant values
- `errors.ts` - Error definitions specific to module

**Directories:**

- `src/` - Source code
- `tests/` - Test files
- `dist/` - Compiled output
- `types/` - Type definition files (nested in source)
- `internal/` - Internal/private implementations

**Type Files:**

- `*-types.ts` - Type definitions for a module (e.g., graph-types.ts, container-types.ts)
- `inference.ts` - Type-level inference functions
- Brand symbols live in `symbols/` directories

## Where to Add New Code

**New Feature in Core Package:**

- Primary code: `packages/core/src/[feature]/index.ts` with barrel export
- Tests: `packages/core/tests/[feature].test.ts`
- Types: Define in feature module, export from index.ts
- Example: New inspection type → `packages/core/src/inspection/new-type.ts`

**New Component/Module in Runtime:**

- Implementation: `packages/runtime/src/[module]/index.ts`
- Tests: `packages/runtime/tests/[module].test.ts`
- Internal types: `packages/runtime/src/[module]/types.ts`
- Pattern: Factory function exports from index, types in types.ts

**New React Hook:**

- Implementation: `packages/react/src/hooks/use-[name].ts`
- Tests: `packages/react/tests/use-[name].test.tsx`
- Export from: `packages/react/src/hooks/index.ts`
- Re-export from: `packages/react/src/index.ts` if public API

**New Visualization Component:**

- Component: `packages/graph-viz/src/[component].tsx`
- Tests: `packages/graph-viz/tests/[component].test.tsx`
- Types: Define in component or in `types.ts`
- Export from: `packages/graph-viz/src/index.ts`

**Utilities/Helpers:**

- Shared helpers: `packages/[package]/src/util/` or `packages/[package]/src/utils/`
- Internal utilities: Nest in feature module with no barrel export
- Pattern: Utility functions don't need separate files unless 100+ lines or multiple use sites

**New Package (Advanced):**

- Create: `packages/[name]/` with full structure (src/, tests/, package.json, tsconfig.json, tsconfig.build.json)
- Entry: `packages/[name]/src/index.ts`
- Manifest: `packages/[name]/package.json` with name `@hex-di/[name]`
- Update: `pnpm-workspace.yaml` automatically detected

## Special Directories

**dist/ (Compiled Output):**

- Purpose: Built JavaScript and TypeScript declaration files
- Generated: Yes (by `pnpm build` or `pnpm run tsc -p tsconfig.build.json`)
- Committed: No (.gitignored)
- Contains: ESM (.js), CommonJS (.cjs), TypeScript declarations (.d.ts, .d.cts)

**node_modules/ (Dependencies):**

- Purpose: Installed npm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (.gitignored)
- Monorepo: Uses pnpm workspaces with shared node_modules at root

**tests/ (Test Files):**

- Purpose: Vitest test files co-located with source code in each package
- Generated: No (hand-written)
- Committed: Yes
- Pattern: Tests import from source, run via `pnpm test` in package or root

**.planning/codebase/ (GSD Analysis):**

- Purpose: Generated codebase analysis documents
- Generated: Yes (by GSD mapping commands)
- Committed: Yes (for team reference)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**docs/ (Documentation):**

- Purpose: Source markdown documentation
- Generated: No
- Committed: Yes
- Built by: Docusaurus in website/

**website/ (Docusaurus Site):**

- Purpose: Documentation website
- Generated: Partially (build/ is generated)
- Committed: Source only (.gitignored: build/, node_modules/)
- Command: `pnpm --filter website build`

---

_Structure analysis: 2026-02-01_
