# Roadmap to 10/10: @hex-di/graph

Based on analysis from 5 expert agents, here are the improvements needed to achieve a perfect score.

---

## 1. Architecture (Current: 7.5/10 → Target: 10/10)

### 1.1 Split the Package (HIGH PRIORITY)

The package handles too many concerns. Split into focused packages:

```
@hex-di/graph          → Core graph building only
@hex-di/validation     → Cycle, captive, duplicate detection
@hex-di/inspection     → Graph analysis, structured logging
```

**Benefits:**

- Smaller, focused APIs per package
- Reduced internal coupling
- Better tree-shaking
- Clearer mental model

### 1.2 Tiered API Exports (HIGH PRIORITY)

Current: 200+ exports from main entry point

**Solution:** Create explicit tiers:

```typescript
// Primary API (< 20 exports) - what 90% of users need
import { createAdapter, GraphBuilder, createPort } from "@hex-di/graph";

// Advanced API - for power users
import { ... } from "@hex-di/graph/advanced";

// Internal API - for library authors only
import { ... } from "@hex-di/graph/internal";
```

### 1.3 Decouple Internal Modules (MEDIUM PRIORITY)

Introduce internal interfaces between builder, validation, and inspection:

```typescript
// validation/ports.ts
interface ValidationEngine {
  validateCycles<G>(graph: G): CycleValidationResult<G>;
  validateCaptives<G>(graph: G): CaptiveValidationResult<G>;
}

// builder uses port, not concrete implementation
```

---

## 2. Type System (Current: 9.4/10 → Target: 10/10)

### 2.1 Type-Level Arithmetic (LOW PRIORITY)

Add complexity measurement at the type level:

```typescript
type CountAdapters<G> = /* recursive count */;
type GraphComplexity<G> = {
  adapters: CountAdapters<G>;
  maxDepth: ComputeMaxDepth<G>;
  cyclomaticComplexity: ComputeCyclomaticComplexity<G>;
};
```

### 2.2 Structured Error Hierarchies (MEDIUM PRIORITY)

Create discriminated union error types:

```typescript
type GraphError =
  | { kind: "cycle"; path: string[]; suggestion: string }
  | { kind: "captive"; singleton: string; scoped: string }
  | { kind: "unsatisfied"; missing: string[] }
  | { kind: "duplicate"; port: string; adapters: string[] };

// Enable:
// if (error.kind === "cycle") { /* type-safe access to path */ }
```

### 2.3 Intermediate Type Aliases (LOW PRIORITY)

Break complex inference chains into named steps:

```typescript
// Before: Single complex type
type Result = ComplexOperation<A, B, C, D, E>;

// After: Named pipeline stages
type Stage1 = NormalizeDependencies<A>;
type Stage2 = ComputeTransitiveDeps<Stage1, B>;
type Stage3 = ValidateCycles<Stage2, C>;
type Result = FinalizeGraph<Stage3, D, E>;
```

---

## 3. Dependency Graph (Current: 8.5/10 → Target: 10/10)

### 3.1 Progressive Depth Strategy (MEDIUM PRIORITY)

Replace hard 50-level limit with progressive deepening:

```typescript
// Try shallow first, deepen only if needed
type SmartCycleCheck<G, Depth = 10> =
  CycleCheck<G, Depth> extends DepthExceeded
    ? CycleCheck<G, Depth * 2>  // Double and retry
    : CycleCheck<G, Depth>;

// Configurable per-graph
const builder = GraphBuilder.create({ maxCycleDepth: 100 });
```

### 3.2 Compile-Time Override Validation (HIGH PRIORITY)

Track parent provides at type level:

```typescript
interface GraphBuilder<TProvides, TRequires, TParentProvides = never> {
  // Override only accepts ports that parent provides
  override<A extends Adapter>(
    adapter: A
  ): InferAdapterProvides<A> extends TParentProvides
    ? GraphBuilder<...>
    : InvalidOverrideError<InferAdapterProvides<A>, TParentProvides>;
}
```

### 3.3 Eliminate Merge Type Duplication (LOW PRIORITY)

Use type-level HKT workaround:

```typescript
// Single generic merge type with mode parameter
type MergeOperation<G1, G2, Mode extends "replace" | "keep"> = {
  provides: /* unified computation */;
  requires: /* unified computation */;
  conflicts: Mode extends "replace" ? never : DetectConflicts<G1, G2>;
};

type MergeResult<G1, G2> = MergeOperation<G1, G2, "replace">;
type MergeWithResult<G1, G2> = MergeOperation<G1, G2, "keep">;
```

---

## 4. AI Optimization (Current: 9.2/10 → Target: 10/10)

### 4.1 Step-by-Step Type Transformations (MEDIUM PRIORITY)

Add documentation showing type-level computation flow:

```typescript
/**
 * ## Type Computation Pipeline
 *
 * Input: GraphBuilder with adapters [A, B, C]
 *
 * Step 1: Extract dependencies
 *   A.requires = [Logger]
 *   B.requires = [Database, Logger]
 *   C.requires = []
 *
 * Step 2: Build dependency graph
 *   { A: [Logger], B: [Database, Logger], C: [] }
 *
 * Step 3: Compute transitive closure
 *   { A: [Logger], B: [Database, Logger, ...transitive], C: [] }
 *
 * Step 4: Detect cycles
 *   Check: A → Logger → ? → A
 */
```

### 4.2 Edge Case Examples (LOW PRIORITY)

Add comprehensive examples for unusual scenarios:

````typescript
/**
 * @example Self-dependency (caught at compile time)
 * ```typescript
 * const Bad = createAdapter({
 *   provides: LoggerPort,
 *   requires: [LoggerPort], // ERROR: Self-dependency
 *   factory: ({ Logger }) => Logger
 * });
 * // Error: "ERROR[HEX002]: Adapter 'Logger' cannot depend on itself"
 * ```
 *
 * @example Diamond dependency (valid, no error)
 * ```typescript
 * //     A
 * //    / \
 * //   B   C
 * //    \ /
 * //     D
 * // This is valid - D is shared, not duplicated
 * ```
 */
````

---

## 5. Testing (Current: 8.0/10 → Target: 10/10)

### 5.1 Factory Functions for All Adapters (HIGH PRIORITY)

Replace module-scoped adapters with factories:

```typescript
// Before: Module-scoped (can leak state)
const LoggerAdapter = createAdapter({ ... });

// After: Factory function (fresh each test)
function createLoggerAdapter(options?: LoggerOptions) {
  return createAdapter({
    provides: LoggerPort,
    factory: () => createMockLogger(options).implementation
  });
}

// Usage in test
it("should log messages", () => {
  const adapter = createLoggerAdapter({ captureMessages: true });
  // Fresh adapter per test
});
```

### 5.2 Deterministic Timestamps (HIGH PRIORITY)

Replace `Date.now()` with deterministic counter:

```typescript
// testing/utils/sequence.ts
let globalSequence = 0;

export function resetSequence() {
  globalSequence = 0;
}

export function nextSequence(): number {
  return ++globalSequence;
}

// In mocks
const mock = {
  calls: [] as Array<{ seq: number; args: unknown[] }>,
  invoke(...args: unknown[]) {
    this.calls.push({ seq: nextSequence(), args });
  },
};

// In test setup
beforeEach(() => resetSequence());
```

### 5.3 Immutable Mock State (MEDIUM PRIORITY)

Return frozen copies from mock getters:

```typescript
// Before: Mutable array exposed
getMessages(): string[] {
  return this.messages;  // Can be modified!
}

// After: Frozen copy
getMessages(): readonly string[] {
  return Object.freeze([...this.messages]);
}

// Or use getter with spread
get messages(): readonly string[] {
  return [...this._messages];
}
```

### 5.4 Cleanup Verification (MEDIUM PRIORITY)

Add explicit cleanup tracking:

```typescript
interface MockWithCleanup<T> {
  implementation: T;
  verify: {
    wasDisposed(): boolean;
    disposeOrder(): number | undefined;
  };
  [Symbol.dispose](): void;
}

// In test
it("should dispose in correct order", () => {
  const db = createMockDatabase();
  const logger = createMockLogger();

  // ... use mocks ...

  container[Symbol.dispose]();

  expect(db.verify.wasDisposed()).toBe(true);
  expect(logger.verify.wasDisposed()).toBe(true);
  expect(db.verify.disposeOrder()).toBeLessThan(logger.verify.disposeOrder()!);
});
```

### 5.5 Mock Call Ordering (LOW PRIORITY)

Add ordering constraints:

```typescript
const mock = createMockLogger({ trackOrder: true });

// Verify call sequence
expect(
  mock.verifyOrder([
    { method: "log", args: ["Starting"] },
    { method: "log", args: ["Processing"] },
    { method: "log", args: ["Done"] },
  ])
).toBe(true);

// Or with matchers
expect(
  mock.verifyOrder([
    { method: "log", args: [expect.stringContaining("Start")] },
    { method: "log" }, // Any log call
    { method: "error" }, // Error after logs
  ])
).toBe(true);
```

---

## Implementation Priority Matrix

| Improvement                      | Impact | Effort | Priority |
| -------------------------------- | ------ | ------ | -------- |
| Split package                    | High   | High   | P1       |
| Tiered API exports               | High   | Medium | P1       |
| Factory functions in tests       | Medium | Low    | P1       |
| Deterministic timestamps         | Medium | Low    | P1       |
| Compile-time override validation | High   | High   | P2       |
| Decouple internal modules        | Medium | Medium | P2       |
| Immutable mock state             | Medium | Low    | P2       |
| Structured error hierarchies     | Medium | Medium | P2       |
| Cleanup verification             | Medium | Medium | P2       |
| Progressive depth strategy       | Low    | Medium | P3       |
| Type-level arithmetic            | Low    | High   | P3       |
| Intermediate type aliases        | Low    | Low    | P3       |
| Step-by-step documentation       | Low    | Low    | P3       |
| Mock call ordering               | Low    | Medium | P3       |

---

## Quick Wins (Can Do Today)

1. **Add subpath exports** in `package.json`:

   ```json
   {
     "exports": {
       ".": "./dist/index.js",
       "./advanced": "./dist/advanced.js",
       "./internal": "./dist/internal.js"
     }
   }
   ```

2. **Replace Date.now()** in test mocks with counter

3. **Freeze mock return arrays**

4. **Convert module-scoped test adapters** to factory functions

---

## Expected Scores After Implementation

| Expert           | Current | After Quick Wins | After Full Implementation |
| ---------------- | ------- | ---------------- | ------------------------- |
| Architecture     | 7.5     | 8.5              | 10.0                      |
| Type System      | 9.4     | 9.4              | 10.0                      |
| Dependency Graph | 8.5     | 8.5              | 10.0                      |
| AI Optimization  | 9.2     | 9.5              | 10.0                      |
| Testing          | 8.0     | 9.0              | 10.0                      |
| **Overall**      | **8.5** | **9.0**          | **10.0**                  |
