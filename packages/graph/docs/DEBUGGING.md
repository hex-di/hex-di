# Type-Level Debugging Guide

> **Mastering IDE Tooltips and Type Inspection for @hex-di/graph**

This guide explains how to debug complex GraphBuilder configurations using TypeScript's type system and the inspection utilities provided by `@hex-di/graph`.

## Table of Contents

1. [Introduction](#introduction)
2. [Phantom Type Property Shortcuts](#phantom-type-property-shortcuts)
3. [InspectValidation for Deep Inspection](#inspectvalidation-for-deep-inspection)
4. [SimplifiedBuilder for Cleaner Tooltips](#simplifiedbuilder-for-cleaner-tooltips)
5. [ValidationState for Pre-Build Checks](#validationstate-for-pre-build-checks)
6. [Template Literal Error Anatomy](#template-literal-error-anatomy)
7. [Common Debugging Scenarios](#common-debugging-scenarios)
8. [Advanced Techniques](#advanced-techniques)

---

## Introduction

`@hex-di/graph` performs all validation at **compile time** using TypeScript's type system. While this catches errors before runtime, it can make debugging challenging because the "state" is encoded in complex type parameters.

This guide shows you how to:

- Access type-level state for debugging
- Understand what each type parameter means
- Interpret error messages effectively
- Use inspection utilities to simplify complex types

### The Challenge: 5 Type Parameters

When you hover over a `GraphBuilder` in your IDE, you see something like:

```typescript
GraphBuilder<
  LoggerPort | DatabasePort,   // TProvides
  CachePort | QueuePort,       // TRequires
  DatabasePort,                // TAsyncPorts
  never,                       // TOverrides
  BuilderInternals<{...}, {...}, unknown, 30>  // TInternalState
>
```

The `TInternalState` parameter groups internal validation data (dependency graph, lifetime map, parent info, max depth). Most of the time, you only care about:

- **What ports are provided** (`TProvides`)
- **What's still missing** (`TRequires` minus `TProvides`)
- **Which ports are async** (`TAsyncPorts`)

---

## Phantom Type Property Shortcuts

The easiest way to inspect a builder's state is through **phantom properties** - type-only properties that expose internal state.

### `$provides` - What ports are available

```typescript
const builder = GraphBuilder.create().provide(LoggerAdapter).provide(DatabaseAdapter);

// Hover over this to see provided ports:
type Provided = typeof builder.$provides;
// Result: LoggerPort | DatabasePort
```

### `$unsatisfied` - What's still missing

```typescript
const builder = GraphBuilder.create().provide(UserServiceAdapter); // Requires Logger, Database

// Hover to see missing dependencies:
type Missing = typeof builder.$unsatisfied;
// Result: LoggerPort | DatabasePort
```

### `[__prettyView]` - Full summary

```typescript
import { __prettyViewSymbol } from "@hex-di/graph";

const builder = GraphBuilder.create().provide(LoggerAdapter).provide(UserServiceAdapter);

// Hover for a clean summary:
type View = (typeof builder)[typeof __prettyViewSymbol];
// Result: {
//   provides: LoggerPort | UserServicePort;
//   unsatisfied: DatabasePort;
//   asyncPorts: never;
//   overrides: never;
// }
```

---

## InspectValidation for Deep Inspection

When you need to see the internal validation state (dependency graph, lifetime map), use `InspectValidation`:

```typescript
import { InspectValidation } from "@hex-di/graph";

const builder = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter);

type State = InspectValidation<typeof builder>;
// {
//   hasDuplicates: false;          // Already validated at provide()
//   hasCycles: false;              // Already validated at provide()
//   hasCaptiveDeps: false;         // Already validated at provide()
//   unsatisfiedDeps: never;        // All satisfied!
//   depGraph: {
//     Logger: never;
//     Database: "Logger";
//     UserService: "Logger" | "Database";
//   };
//   lifetimeMap: {
//     Logger: 1;      // 1 = Singleton
//     Database: 2;    // 2 = Scoped
//     UserService: 3; // 3 = Transient
//   };
// }
```

### Understanding the Dependency Graph

The `depGraph` type shows the adjacency list:

- Keys are port names
- Values are unions of dependencies
- `never` means no dependencies

```typescript
type DepGraph = {
  Logger: never; // Logger has no deps
  Database: "Logger"; // Database needs Logger
  UserService: "Logger" | "Database"; // UserService needs both
};
```

### Understanding the Lifetime Map

The `lifetimeMap` uses numeric levels:

- `1` = Singleton (longest lived)
- `2` = Scoped
- `3` = Transient (shortest lived)

Captive dependency validation ensures shorter-lived services don't get "captured" by longer-lived ones.

---

## SimplifiedBuilder for Cleaner Tooltips

When writing functions that accept builders, use `SimplifiedBuilder` for cleaner type signatures:

```typescript
import { SimplifiedBuilder } from "@hex-di/graph";

// Instead of this verbose signature:
function processBuilder<
  TProvides,
  TRequires,
  TAsync,
  TOverrides,
  TInternals extends AnyBuilderInternals
>(
  builder: GraphBuilder<TProvides, TRequires, TAsync, TOverrides, TInternals>
): void { ... }

// Use this:
function processBuilder<T extends SimplifiedBuilder>(builder: T): void {
  const graph = builder.build();
  // ...
}
```

### Variable Annotations

```typescript
import { SimplifiedBuilder } from "@hex-di/graph";

// Cleaner than full type parameters
const builder: SimplifiedBuilder<LoggerPort | DatabasePort> = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter);
```

---

## ValidationState for Pre-Build Checks

Check the validation state without calling `.build()`:

```typescript
import { ValidationState, InspectValidation } from "@hex-di/graph";

const builder = GraphBuilder.create().provide(UserServiceAdapter); // Requires Logger

type State = InspectValidation<typeof builder>;
// State.unsatisfiedDeps = LoggerPort  <- Missing!

// Fix it:
const complete = builder.provide(LoggerAdapter);
type CompleteState = InspectValidation<typeof complete>;
// CompleteState.unsatisfiedDeps = never  <- All good!
```

---

## Template Literal Error Anatomy

Error messages are template literal strings that appear in IDE tooltips:

### Structure

```
ERROR: <Problem Description>. <Port/Adapter Info>. <Suggested Fix>.
```

### Examples

**Duplicate Adapter:**

```
ERROR: Duplicate adapter for 'Logger'. You are trying to provide an adapter for a port that already has one. Remove the duplicate or use .override() if intentional.
```

**Circular Dependency:**

```
ERROR: Circular dependency detected: UserService -> NotificationService -> UserService. Use lazyPort() to break the cycle.
```

**Captive Dependency:**

```
ERROR: Captive dependency: 'UserService' (singleton) depends on 'SessionStore' (scoped). A singleton would capture a reference to a scoped instance, causing stale data. Fix: Make 'UserService' scoped or 'SessionStore' singleton, or use lazyPort().
```

**Missing Dependencies:**

```
ERROR: Missing adapters for Logger, Database. Call .provide() first.
```

### Interpreting Error Locations

The error becomes the **return type** of the method that failed:

```typescript
const builder = GraphBuilder.create().provide(LoggerAdapter).provide(LoggerAdapter); // <- Error here!
//       ^^^^^^^^^^^^^^
// Type: "ERROR: Duplicate adapter for 'Logger'..."
```

Your IDE shows the error when you try to **use** the result:

```typescript
const badBuilder = GraphBuilder.create().provide(LoggerAdapter).provide(LoggerAdapter);

// Later, when you try to build:
const graph = badBuilder.build();
//            ^^^^^^^^^^
// Error: Type '"ERROR: Duplicate..."' has no property 'build'
```

---

## Common Debugging Scenarios

### Scenario 1: "Why won't this build?"

**Symptom:** `.build()` shows a type error about missing adapters.

**Debug Steps:**

1. Check `$unsatisfied`:
   ```typescript
   type Missing = typeof builder.$unsatisfied;
   ```
2. Look for the port names in the error message
3. Add the missing adapters

### Scenario 2: "Circular Dependency"

**Symptom:** Error mentions cycle path like `A -> B -> A`.

**Debug Steps:**

1. Identify the cycle path in the error
2. Decide which dependency can be lazy
3. Use `lazyPort()` to break the cycle:

   ```typescript
   import { lazyPort } from "@hex-di/graph";

   // Before: Direct dependency creates cycle
   requires: [UserServicePort] as const,

   // After: Lazy dependency breaks cycle
   requires: [lazyPort(UserServicePort)] as const,
   factory: ({ LazyUserService }) => ({
     doSomething: () => {
       const userService = LazyUserService(); // Thunk
       return userService.getUser(id);
     },
   }),
   ```

### Scenario 3: "Captive Dependency"

**Symptom:** Error about singleton capturing scoped/transient.

**Debug Steps:**

1. Check the lifetimes mentioned in the error
2. Options to fix:
   - Make the consumer scoped/transient
   - Make the dependency singleton
   - Use `lazyPort()` for deferred resolution

### Scenario 4: "Duplicate Adapter"

**Symptom:** Error about providing the same port twice.

**Debug Steps:**

1. Search for the port name in your code
2. Remove one of the `.provide()` calls
3. If intentional (child container), use `.override()` instead

### Scenario 5: "Type is too complex to represent"

**Symptom:** TypeScript gives up on deep type evaluation.

**Debug Steps:**

1. Check `builder.inspect().maxChainDepth`
2. If approaching 30, use higher MaxDepth:
   ```typescript
   const builder = GraphBuilder.withMaxDepth<50>().create();
   ```
3. Consider splitting into smaller sub-graphs

---

## Advanced Techniques

### Extracting Type Information Programmatically

```typescript
import { InferBuilderProvides, InferBuilderUnsatisfied } from "@hex-di/graph";

type MyBuilder = typeof myBuilder;
type Provided = InferBuilderProvides<MyBuilder>;
type Missing = InferBuilderUnsatisfied<MyBuilder>;
```

### Creating Type-Level Assertions

```typescript
// Compile-time assertion that builder is complete
type AssertComplete<B> =
  InferBuilderUnsatisfied<B> extends never
    ? B
    : ["ERROR: Builder has unsatisfied dependencies:", InferBuilderUnsatisfied<B>];

// Usage - fails at compile time if incomplete
type Validated = AssertComplete<typeof myBuilder>;
```

### Using InspectableBuilder for Clean Debugging

```typescript
import { InspectableBuilder } from "@hex-di/graph";

// Create a type alias for inspection
type Debug = InspectableBuilder<typeof builder>;
// {
//   provides: LoggerPort | DatabasePort;
//   requires: CachePort;
//   asyncPorts: never;
//   overrides: never;
// }
```

### Runtime Inspection

For runtime debugging, use `.inspect()`:

```typescript
const info = builder.inspect();

console.log("Adapter count:", info.adapterCount);
console.log("Provides:", info.provides);
console.log("Missing:", info.unsatisfiedRequirements);
console.log("Max depth:", info.maxChainDepth);
console.log("Complete:", info.isComplete);

// Structured suggestions
for (const suggestion of info.suggestions) {
  console.log(`[${suggestion.type}] ${suggestion.portName}: ${suggestion.message}`);
}
```

### Visualization for Complex Graphs

```typescript
const inspection = builder.inspect();

// DOT format (for Graphviz)
const dot = inspection.toDotGraph();
console.log(dot);
// digraph G {
//   "Logger" -> "Database";
//   "Database" -> "UserService";
// }

// Mermaid format (for markdown/diagrams)
const mermaid = inspection.toMermaidGraph();
console.log(mermaid);
// graph LR
//   Logger --> Database
//   Database --> UserService
```

---

## Quick Reference

| Need                 | Solution                                    |
| -------------------- | ------------------------------------------- |
| See provided ports   | `typeof builder.$provides`                  |
| See missing deps     | `typeof builder.$unsatisfied`               |
| Full summary         | `typeof builder[typeof __prettyViewSymbol]` |
| Deep inspection      | `InspectValidation<typeof builder>`         |
| Clean function param | `SimplifiedBuilder<TProvides>`              |
| Runtime debugging    | `builder.inspect()`                         |
| Visualize graph      | `builder.inspect().toDotGraph()`            |

---

## Performance Debugging

When type-checking becomes slow on large graphs, try these strategies.

### When Type-Checking is Slow

1. **Measure the problem**: Check if graph validation is the bottleneck

   ```bash
   # TypeScript's extended diagnostics
   tsc --extendedDiagnostics
   ```

2. **Reduce validation complexity**:
   - Use `provideFirstError()` instead of `provide()` (single error vs all errors)
   - Use `provideUnchecked()` for rapid prototyping (no compile-time validation)
   - Split large graphs into smaller subgraphs, then merge

3. **Configure MaxDepth**:

   ```typescript
   // Default is 30 - lower values are faster but may miss deep cycles
   const builder = GraphBuilder.withMaxDepth<15>().create();

   // For very deep graphs, increase it
   const builder = GraphBuilder.withMaxDepth<50>().create();
   ```

### Choosing the Right provide() Variant

| Method                | Validation         | Speed   | Use Case          |
| --------------------- | ------------------ | ------- | ----------------- |
| `provide()`           | Full (all errors)  | Slowest | Default - best DX |
| `provideFirstError()` | Full (first error) | Medium  | Large graphs      |
| `provideUnchecked()`  | None               | Fastest | Prototyping       |

```typescript
// Prototyping - fastest compile time
const proto = GraphBuilder.create().provideUnchecked(A).provideUnchecked(B).provideUnchecked(C);

// Once working, switch back to provide() for safety
const safe = GraphBuilder.create().provide(A).provide(B).provide(C);
```

---

## IDE-Specific Tips

### VS Code

**Expanding Type Tooltips:**

1. Hover over a GraphBuilder variable
2. Press `Ctrl+K, Ctrl+I` (or `Cmd+K, Cmd+I` on Mac) to pin the tooltip
3. Click on type names in the tooltip to expand them

**Quick Type Info:**

```typescript
// Create a type alias and hover over it for full expansion
type Debug = typeof builder.$provides;
type State = DebugBuilderState<typeof builder>;
```

**Settings for Better Type Display:**

```json
{
  "typescript.inlayHints.parameterNames.enabled": "all",
  "typescript.inlayHints.variableTypes.enabled": true
}
```

### WebStorm/IntelliJ IDEA

**Type Inspection:**

- `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac): Quick type info
- `Ctrl+Q` (Windows/Linux) or `F1` (Mac): Quick documentation

**Navigate to Type Definition:**

- `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac)

### Using Watch Expressions

In your debugger, add these watch expressions:

```typescript
typeof builder.$provides; // See provided ports
typeof builder.$unsatisfied; // See missing deps
```

---

## DebugBuilderState Deep Dive

`DebugBuilderState` is the most comprehensive inspection type, exposing ALL internal state.

### Full Field Reference

```typescript
import { DebugBuilderState } from "@hex-di/graph";

const builder = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter);

type Debug = DebugBuilderState<typeof builder>;
// {
//   // User-facing state
//   provides: LoggerPort | DatabasePort | UserServicePort;
//   unsatisfied: never;
//   asyncPorts: never;
//   overrides: never;
//
//   // Internal validation state
//   depGraph: {
//     Logger: never;
//     Database: "Logger";
//     UserService: "Logger" | "Database";
//   };
//   lifetimeMap: {
//     Logger: 1;      // 1 = singleton
//     Database: 2;    // 2 = scoped
//     UserService: 3; // 3 = transient
//   };
//   parentProvides: unknown;  // Set by forParent()
//   maxDepth: 30;             // Default, or custom via withMaxDepth()
//
//   // Computed diagnostics
//   isComplete: true;
// }
```

### Using InspectValidation

For a focused view on validation state:

```typescript
import { InspectValidation } from "@hex-di/graph";

type Validation = InspectValidation<typeof builder>;
// {
//   hasDuplicates: false;    // Validated at provide()
//   hasCycles: false;        // Validated at provide()
//   hasCaptiveDeps: false;   // Validated at provide()
//   unsatisfiedDeps: never;  // All deps satisfied
//   depGraph: {...};         // For debugging
//   lifetimeMap: {...};      // For debugging
// }
```

### Extracting depGraph for Analysis

```typescript
import { GetDepGraph, GetLifetimeMap } from "@hex-di/graph";

// Extract just the dependency graph type
type Graph = GetDepGraph<typeof builder.__depGraph>;

// Extract just the lifetime map
type Lifetimes = GetLifetimeMap<typeof builder.__lifetimeMap>;
```

---

## Type Error Flowchart

### Decision Tree: "What error am I seeing?"

```
Is the error on .provide() or .build()?
│
├── On .provide() ─────────────────────────────────────────────────────────────
│   │
│   ├── Contains "Duplicate adapter for"?
│   │   └── HEX001: You're providing the same port twice
│   │       FIX: Remove duplicate, or use .override() for child containers
│   │
│   ├── Contains "Circular dependency"?
│   │   └── HEX002: A -> B -> ... -> A cycle detected
│   │       FIX: Use lazyPort() to break the cycle
│   │
│   ├── Contains "Captive dependency"?
│   │   └── HEX003: Singleton depending on scoped/transient
│   │       FIX: Change lifetime, or use lazyPort()
│   │
│   ├── Contains "Lifetime inconsistency"?
│   │   └── HEX005: Same port with different lifetimes in merge
│   │       FIX: Ensure consistent lifetimes across merged graphs
│   │
│   └── Contains "Cannot override"?
│       └── HEX006: Port not in parent (when using forParent)
│           FIX: Use .provide() for new ports, or check parent provides
│
└── On .build() ───────────────────────────────────────────────────────────────
    │
    └── Contains "Missing adapters for"?
        └── HEX004: Required ports not provided
            FIX: Call .provide() with the missing adapters
```

### Quick Fixes by Error Code

| Code   | Error                      | Quick Fix                                       |
| ------ | -------------------------- | ----------------------------------------------- |
| HEX001 | Duplicate adapter          | Remove duplicate or use `.override()`           |
| HEX002 | Circular dependency        | Wrap one requirement in `lazyPort()`            |
| HEX003 | Captive dependency         | Align lifetimes or use `lazyPort()`             |
| HEX004 | Reverse captive dependency | Align lifetimes or reorder adapter registration |
| HEX005 | Lifetime inconsistency     | Ensure same lifetime for same port              |
| HEX006 | Invalid override           | Port must exist in parent                       |
| HEX008 | Missing adapters           | Add missing `.provide()` calls                  |

### When to Use Runtime vs Type Inspection

| Situation                     | Use                                 |
| ----------------------------- | ----------------------------------- |
| IDE tooltip is too complex    | `DebugBuilderState<typeof builder>` |
| Need runtime debugging output | `builder.inspect()`                 |
| Want visual dependency graph  | `builder.inspect().toDotGraph()`    |
| Checking MaxDepth warning     | `builder.inspect().depthWarning`    |
| CI/CD validation              | `builder.validate()`                |

---

## See Also

- [DESIGN.md](./DESIGN.md) - Architecture and patterns
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Copy-paste snippets
- [RUNTIME_INTEGRATION.md](./RUNTIME_INTEGRATION.md) - Container integration
