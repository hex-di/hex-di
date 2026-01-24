# Testing Guide for @hex-di/graph

This document provides guidance on the test suite organization, running tests, and writing new tests.

## Test File Organization

The test suite is split into **runtime tests** (`*.test.ts`) and **type-level tests** (`*.test-d.ts`).

### Runtime Tests (`*.test.ts`)

| File                               | Purpose                                |
| ---------------------------------- | -------------------------------------- |
| `graph-builder.test.ts`            | Core GraphBuilder functionality        |
| `create-adapter.test.ts`           | Adapter creation and validation        |
| `define-service.test.ts`           | Convenience helper tests               |
| `integration.test.ts`              | End-to-end workflow tests              |
| `edge-cases.test.ts`               | Edge cases and boundary conditions     |
| `edge-cases-extended.test.ts`      | Additional edge case coverage          |
| `property-based.test.ts`           | Property-based testing with fast-check |
| `performance.test.ts`              | Performance benchmarks                 |
| `concurrent.test.ts`               | Concurrent operation tests             |
| `stress.test.ts`                   | Large graph stress tests               |
| `async-adapter.test.ts`            | Async adapter behavior                 |
| `parent-child.test.ts`             | Parent-child graph relationships       |
| `merge-options.test.ts`            | Graph merge configuration              |
| `lazy-resolution.test.ts`          | Lazy port resolution                   |
| `inspection-phase3.test.ts`        | Runtime inspection features            |
| `snapshot.test.ts`                 | Snapshot testing for stability         |
| `error-recovery.test.ts`           | Error recovery paths                   |
| `malformed-config.test.ts`         | Invalid configuration handling         |
| `contract.test.ts`                 | API contract verification              |
| `test-builder.test.ts`             | Test utility validation                |
| `test-doubles.test.ts`             | Test double functionality              |
| `test-doubles-integration.test.ts` | Test double integration                |
| `convenience-exports.test.ts`      | Export verification                    |
| `exports.test.ts`                  | Package export structure               |
| `build.test.ts`                    | Build validation                       |

### Type-Level Tests (`*.test-d.ts`)

| File                                        | Purpose                    |
| ------------------------------------------- | -------------------------- |
| `soundness.test-d.ts`                       | Core type soundness        |
| `cast-soundness.test-d.ts`                  | Cast pattern safety        |
| `circular-dependency.test-d.ts`             | Cycle detection types      |
| `captive-dependency.test-d.ts`              | Lifetime validation types  |
| `duplicate-detection.test-d.ts`             | Duplicate detection types  |
| `error-messages.test-d.ts`                  | Error message accuracy     |
| `error-message-consistency.test-d.ts`       | Error format consistency   |
| `multi-error.test-d.ts`                     | Multi-error aggregation    |
| `variance.test-d.ts`                        | Type variance              |
| `provide.test-d.ts`                         | `provide()` method types   |
| `build.test-d.ts`                           | `build()` method types     |
| `for-parent.test-d.ts`                      | `forParent()` method types |
| `batch-duplicates.test-d.ts`                | Batch duplicate types      |
| `lazy-resolution.test-d.ts`                 | Lazy port types            |
| `lifetime-consistency.test-d.ts`            | Lifetime type tracking     |
| `graph-builder.test-d.ts`                   | Builder type inference     |
| `adapter.test-d.ts`                         | Adapter type structure     |
| `create-adapter.test-d.ts`                  | Adapter creation types     |
| `define-service.test-d.ts`                  | Service definition types   |
| `type-utilities.test-d.ts`                  | Utility type tests         |
| `inference-error.test-d.ts`                 | InferenceError type        |
| `simplified-types.test-d.ts`                | Simplified view types      |
| `validation.test-d.ts`                      | Validation type tests      |
| `merge-intent.test-d.ts`                    | Merge type intentions      |
| `orphan-ports.test-d.ts`                    | Orphan port detection      |
| `parameter-constraint-experiment.test-d.ts` | Type parameter experiments |
| `repro.test-d.ts`                           | Issue reproductions        |

## Running Tests

### Basic Commands

```bash
# Run all runtime tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run type-level tests
pnpm test:types

# Run tests with coverage
pnpm test:coverage

# Run mutation testing
pnpm test:mutation
```

### Running Specific Tests

```bash
# Run a specific test file
pnpm test -- graph-builder.test.ts

# Run tests matching a pattern
pnpm test -- -t "should detect cycles"

# Run type tests only
pnpm test:types -- circular-dependency.test-d.ts
```

## Fixture Selection Guide

### Testing Scenario → Recommended Fixtures

| Scenario               | Recommended Fixtures                           |
| ---------------------- | ---------------------------------------------- |
| Basic adapter tests    | `LoggerPort`, `LoggerAdapter`, `ConsoleLogger` |
| Dependency chain tests | `DatabasePort`, `UserServicePort` + adapters   |
| Cycle detection tests  | `PortA/B/C/D` and adapters                     |
| Lifetime tests         | Adapters with different lifetimes              |
| Async adapter tests    | `ConfigAdapter` (async)                        |
| Multi-adapter tests    | Use `createMockAdapter()`                      |

### Pattern → TestBuilder Method

| Pattern             | Method                                           |
| ------------------- | ------------------------------------------------ |
| Empty graph         | `GraphBuilder.create()`                          |
| Pre-populated graph | `createSimpleGraph()`, `createThreeLevelGraph()` |
| Error scenario      | Use type-level tests                             |
| Type-level test     | Use `.test-d.ts` files with `expectTypeOf`       |

### Behavioral Need → Test Double Function

| Need              | Function                                          |
| ----------------- | ------------------------------------------------- |
| Mock adapter      | `createMockAdapter(port, options)`                |
| Custom lifetime   | `createMockAdapter(port, { lifetime: "scoped" })` |
| Async mock        | `createMockAdapter(port, { async: true })`        |
| Override in child | `validateOverride(parent, adapter)`               |

## Writing New Tests

### Runtime Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { createAdapter, GraphBuilder } from "../src/index.js";
import { LoggerPort, LoggerAdapter } from "./fixtures.js";

describe("feature name", () => {
  it("should do something specific", () => {
    // Arrange
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    // Act
    const result = builder.build();

    // Assert
    expect(result.adapters).toHaveLength(1);
  });
});
```

### Type-Level Test Pattern

```typescript
import { describe, it, expectTypeOf } from "vitest";
import { GraphBuilder, createAdapter } from "../src/index.js";
import { LoggerPort, DatabasePort } from "./fixtures.js";

describe("type behavior", () => {
  it("should infer correct types", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    expectTypeOf(builder).toMatchTypeOf<GraphBuilder>();
    expectTypeOf<(typeof builder)["$provides"]>().toEqualTypeOf<typeof LoggerPort>();
  });

  it("should produce error type for invalid input", () => {
    const DuplicateAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const result = builder.provide(DuplicateAdapter);

    // Should be an error string, not a GraphBuilder
    expectTypeOf(result).toBeString();
  });
});
```

### Property-Based Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "../src/index.js";

describe("property: invariant name", () => {
  it("holds for all valid inputs", () => {
    fc.assert(
      fc.property(
        // Arbitraries for input generation
        fc.string().filter(s => s.length > 0 && /^[A-Za-z]/.test(s)),
        fc.constantFrom("singleton", "scoped", "transient"),
        (portName, lifetime) => {
          // Test invariant
          const port = createPort(portName);
          const adapter = createAdapter({
            provides: port,
            requires: [],
            lifetime,
            factory: () => ({}),
          });
          const builder = GraphBuilder.create().provide(adapter);
          const graph = builder.build();

          // Property assertion
          expect(graph.adapters).toHaveLength(1);
          expect(graph.adapters[0].provides.__portName).toBe(portName);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

## Coverage Thresholds

The project maintains the following coverage targets:

| Metric     | Target |
| ---------- | ------ |
| Lines      | 80%    |
| Branches   | 75%    |
| Functions  | 80%    |
| Statements | 80%    |

## Test Categories

### Unit Tests

- Test individual functions/methods in isolation
- Mock dependencies using test doubles
- Fast execution (< 1ms per test)

### Integration Tests

- Test multiple components working together
- Use real GraphBuilder instances
- May take longer (< 100ms per test)

### Type Tests

- Verify type-level behavior
- No runtime execution
- Use `expectTypeOf` assertions

### Property Tests

- Verify invariants across input space
- Use random input generation
- Run multiple iterations (100+ by default)

### Stress Tests

- Test with large inputs
- Verify performance characteristics
- May take longer (< 1s per test)

## Debugging Failed Tests

### Runtime Test Failures

1. Check the error message for specific failure
2. Use `builder.inspect()` to see graph state
3. Use `builder.validate()` for detailed validation
4. Add `console.log` or debugger statements

### Type Test Failures

1. Hover over types in IDE to see actual vs expected
2. Use `DebugProvideValidation` from `@hex-di/graph/internal`
3. Check intermediate types step-by-step
4. Look for `expectTypeOf` hints in error messages

### Property Test Failures

1. fast-check provides counterexamples
2. Use `fc.seed()` to reproduce failures
3. Simplify the failing case manually
4. Check boundary conditions
