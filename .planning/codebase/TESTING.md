# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Runner:**

- Vitest 4.0.16 - Fast unit test runner for TypeScript
- Config: `/Users/u1070457/Projects/Perso/hex-di/vitest.config.ts`
- Includes both runtime tests and type-level tests

**Assertion Library:**

- Vitest's built-in assertions (imported from "vitest")
- `expectTypeOf` from vitest for type-level assertions

**Run Commands:**

```bash
pnpm test                # Run all tests once
pnpm test:watch        # Watch mode for development
pnpm test:types        # Run type-level tests
```

## Test File Organization

**Location:**

- Co-located with source code in `tests/` subdirectories
- Pattern: `packages/*/tests/**/*.test.ts`
- Config in `vitest.config.ts` includes: `packages/**/*.test.ts`

**Naming:**

- Runtime tests: `*.test.ts` (e.g., `immutability.test.ts`, `factory-deps.test.ts`)
- Type-level tests: `*.test-d.ts` (e.g., `graph-builder.test-d.ts`)

**Structure:**

```
packages/graph/tests/
├── fixtures.ts                    # Shared test utilities and ports
├── edge-cases/                    # Grouped by feature/edge case
│   ├── immutability.test.ts
│   ├── finalizers.test.ts
│   ├── deep-chains.test.ts
│   └── stress.test.ts
├── integration/                   # Integration test scenarios
├── graph-builder.test-d.ts       # Type-level tests
└── define-service.test.ts        # Runtime tests
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, expect, it, vi } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";

describe("adapter immutability", () => {
  it("sync adapter is frozen", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("cannot modify adapter properties", () => {
    const adapter = createAdapter({...});

    expect(() => {
      adapter.lifetime = "scoped";
    }).toThrow();
  });
});
```

**Patterns:**

- Use `describe()` for test suites, grouped by feature or component
- Use `it()` for individual test cases with clear, descriptive names
- No setup/teardown hooks needed typically — tests are isolated
- Inline fixture creation for simple tests
- Use `fixtures.ts` for reusable test data

## Mocking

**Framework:** Vitest's `vi` module for mocking and spying

**Patterns:**

```typescript
// Mock function creation
const finalizerFn = vi.fn();
const mockResolvedFn = vi.fn().mockResolvedValue(undefined);
const mockLogger: Logger = { log: () => {} };

// Spy on calls
expect(finalizerFn).toBe(finalizerFn); // Verify same reference
expect(mockResolvedFn).toHaveBeenCalled();

// Mock object creation
const mockDeps = {
  Logger: { log: () => {} },
  Database: { query: async () => ({}) },
};
```

**What to Mock:**

- External services and integrations
- Filesystem operations
- Timer functions
- Fetch/HTTP operations
- Observable/event streams

**What NOT to Mock:**

- Internal modules and functions
- Port and Adapter creation (test real objects)
- Dependency graph building (test real GraphBuilder)
- Error classes and parsing (test real error handling)
- Type inference (always test real types)

## Fixtures and Factories

**Test Data:**
Centralized in `fixtures.ts` with helper functions:

```typescript
// fixtures.ts structure
export interface Logger {
  log(msg: string): void;
}
export interface Database {
  query(sql: string): Promise<unknown>;
}

export const LoggerPort = createPort<"Logger", Logger>("Logger");
export const DatabasePort = createPort<"Database", Database>("Database");

export const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

export const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: () => ({ query: async () => ({}) }),
});

// Helper for custom adapters
export function createTestAdapter(port: Port, deps: Port[], lifetime = "singleton") {
  return createAdapter({
    provides: port,
    requires: deps,
    lifetime,
    factory: () => ({}),
  });
}
```

**Location:**

- `packages/graph/tests/fixtures.ts` - Primary fixture file
- `packages/*/tests/utils/` - Utility helpers
- `packages/*/tests/fixtures/` - Domain-specific fixtures if needed

**Fixture Selection Guide:**
| Scenario | Fixtures |
|----------|----------|
| Basic adapter tests | LoggerPort, LoggerAdapter |
| Dependency chains | DatabasePort, UserServicePort + adapters |
| Cycle detection | CycleA/B/C ports and adapters |
| Lifetime variations | Adapters with different lifetimes |
| Async operations | AsyncDbAdapter, AsyncConfigAdapter |
| Custom scenarios | Use `createTestAdapter()` helper |

## Coverage

**Requirements:** Not explicitly enforced by CI/CD

**View Coverage:**

```bash
# Using vitest coverage (if configured)
vitest run --coverage
```

**Target:**

- Core business logic: High coverage (>80%)
- Type utilities: Full coverage (type-level tests verify correctness)
- Error cases: Comprehensive coverage
- Edge cases: Dedicated test files

## Test Types

**Unit Tests:**

- Scope: Single function or module
- Examples: `adapters/factory.test.ts`, `ports/types.test.ts`
- Test core logic, edge cases, error conditions
- Verify runtime behavior and type constraints
- Located in `tests/` directories next to source

**Integration Tests:**

- Scope: Multiple components working together
- Examples: `graph-builder.test.ts`, `container resolution tests`
- Verify adapters work with GraphBuilder and runtime
- Test real dependency resolution chains
- Located in `tests/integration/` directories

**Type-Level Tests:**

- Scope: TypeScript type inference and constraints
- Using Vitest's `expectTypeOf()` with TSD-style assertions
- Examples: `graph-builder.test-d.ts`, `adapter-provides-name-inference-error.test-d.ts`
- Verify generic type parameters, conditional types, inference
- Verify compilation errors happen at correct points
- Located as `.test-d.ts` files

**E2E Tests:**

- Not used in this codebase
- Library is consumed by applications, not tested end-to-end internally

## Common Patterns

**Async Testing:**

```typescript
describe("async operations", () => {
  it("handles async factory", async () => {
    const adapter = createAsyncAdapter({
      provides: LoggerPort,
      requires: [],
      factory: async () => ({ log: () => {} }),
    });

    const result = await adapter.factory({});
    expect(result).toBeDefined();
  });

  it("resolves async dependencies", async () => {
    const mockResolvedFn = vi.fn().mockResolvedValue(undefined);
    await expect(mockResolvedFn()).resolves.toBeUndefined();
  });
});
```

**Error Testing:**

```typescript
describe("error handling", () => {
  it("throws on invalid adapter config", () => {
    expect(() => {
      createAdapter({
        provides: null as any,
        requires: [],
        lifetime: "singleton",
        factory: () => ({}),
      });
    }).toThrow("ERROR[HEX010]");
  });

  it("detects circular dependencies", async () => {
    const graph = GraphBuilder.create()
      .provide(adapterA) // depends on B
      .provide(adapterB) // depends on A
      .build();

    expect(() => graph.build()).toThrow(CircularDependencyError);
  });

  it("parses error codes", () => {
    const error = new CircularDependencyError("...", "HEX001");
    expect(isHexError(error)).toBe(true);
    const parsed = parseError(error.message);
    expect(parsed?.code).toBe("HEX001");
  });
});
```

**Snapshot Testing:**

```typescript
describe("visualization", () => {
  it("generates correct DOT format", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter).build();

    const dot = toDotGraph(inspectGraph(graph));

    expect(dot).toMatchInlineSnapshot(`
      "digraph G {
        rankdir=TB;
        node [shape=box, style=rounded];
        "Logger" [label="Logger\\n(singleton)"];
        "Database" [label="Database\\n(scoped)"];
        "Database" -> "Logger";
      }"
    `);
  });
});
```

**Type-Level Assertions:**

```typescript
import { describe, expectTypeOf, it, expect } from "vitest";

describe("GraphBuilder type inference", () => {
  it("returns builder with TProvides = never", () => {
    const builder = GraphBuilder.create();
    expect(builder).toBeDefined();

    type Provides = InferGraphProvides<typeof builder>;
    expectTypeOf<Provides>().toBeNever();
  });

  it("supports union types for type parameters", () => {
    type BuilderType = GraphBuilder<LoggerPortType | DatabasePortType, UserServicePortType>;

    type ExtractedProvides = InferGraphProvides<BuilderType>;
    type ExtractedRequires = InferGraphRequires<BuilderType>;

    expectTypeOf<ExtractedProvides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
    expectTypeOf<ExtractedRequires>().toEqualTypeOf<UserServicePortType>();
  });

  it("verifies type error at compile time", () => {
    // This uses @ts-expect-error to verify type errors occur
    const invalid = GraphBuilder.create().provide(invalidAdapter); // @ts-expect-error - wrong type
  });
});
```

**Verifying Expected Type Errors:**

```typescript
// Use @ts-expect-error comment for intentional type failures
it("prevents circular dependencies at type level", () => {
  const builder = GraphBuilder.create()
    // @ts-expect-error - TRequires contains TProvides
    .provide(circularAdapter);
});
```

## Test Configuration

**ESLint in Tests:**

- Relaxed rules in test files for mocking flexibility
- `@typescript-eslint/no-explicit-any`: "off" — allows `any` types in mocks
- `@typescript-eslint/no-non-null-assertion`: "off" — allows `!` in tests
- `@typescript-eslint/no-unsafe-*`: "off" — allows unsafe ops for mocking
- `prefer-const`: "warn" — not enforced
- `no-console`: "off" — all console methods allowed

**Patterns to Use in Tests (files matching `**/_.test.ts`, `**/**tests**/**/_.ts`):\*\*

- Use `any` freely in mock objects
- Use non-null assertions `!` when testing edge cases
- Use `console` methods for debugging output
- Unused variables don't need `_` prefix (warning only)

---

_Testing analysis: 2026-02-01_
