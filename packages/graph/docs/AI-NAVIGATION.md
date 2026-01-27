# AI Navigation Guide for @hex-di/graph

This document helps AI agents efficiently navigate and understand the codebase.

## By Error Message

When a user reports an error, use this table to find the relevant code:

| Error Contains                          | Go To                                         |
| --------------------------------------- | --------------------------------------------- |
| `ERROR[HEX001]: Duplicate adapter`      | `validation/types/batch-duplicates.ts`        |
| `ERROR[HEX002]: Circular dependency`    | `validation/types/cycle/`                     |
| `ERROR[HEX003]: Captive dependency`     | `validation/types/captive/`                   |
| `ERROR[HEX005]: Lifetime inconsistency` | `builder/types/merge-types.ts`                |
| `ERROR[HEX007]: Type-level depth limit` | `validation/types/cycle/depth.ts`             |
| `Missing dependencies:`                 | `validation/types/dependency-satisfaction.ts` |
| `__valid: false`                        | `builder/types/provide-types.ts`              |

## By User Task

| User Wants To                | Start Here                                                     |
| ---------------------------- | -------------------------------------------------------------- |
| Fix a type error             | `builder/types/provide-types.ts` then `provide-sync-result.ts` |
| Understand GraphBuilder      | `builder/builder.ts`                                           |
| Add a new validation         | `validation/types/` (model) then `builder/types/` (use)        |
| Add runtime inspection       | `graph/inspection/`                                            |
| Understand cycle detection   | `validation/types/CONCEPT-cycle-detection.ts`                  |
| Understand captive detection | `validation/types/CONCEPT-captive-detection.ts`                |
| Debug type inference         | `builder/types/debug-types.ts`                                 |
| Understand error messages    | `validation/types/error-messages.ts`                           |
| Add new adapter options      | `adapter/types/adapter-types.ts`                               |
| Modify GraphBuilder methods  | `builder/builder-*.ts` files                                   |

## Module Dependency Order

Read modules in this order to build understanding:

### 1. Foundation Types (read first)

```
types/type-utilities.ts          # IsNever, TupleToUnion, Prettify
symbols/brands.ts                # Type branding symbols
adapter/types/adapter-types.ts   # Adapter, Lifetime, FactoryKind
adapter/types/adapter-inference.ts # InferAdapterProvides, etc.
```

### 2. Validation Type System

```
validation/types/dependency-satisfaction.ts  # UnsatisfiedDependencies
validation/types/cycle/depth.ts              # MaxDepth, Depth utilities
validation/types/cycle/detection.ts          # WouldCreateCycle
validation/types/captive/lifetime-level.ts   # LifetimeLevel
validation/types/captive/detection.ts        # FindAnyCaptiveDependency
validation/types/error-messages.ts           # Error message templates
```

### 3. Builder State Types

```
builder/types/empty-state.ts     # Initial graph state
builder/types/internals.ts       # BuilderInternals, Get*/With* utilities
```

### 4. Builder Result Types

```
builder/types/provide-types.ts      # ProvideResult base
builder/types/provide-sync-result.ts # Sync adapter provide result
builder/types/merge-types.ts        # MergeResult
```

### 5. Builder Implementation

```
builder/builder.ts           # GraphBuilder class
builder/builder-provide.ts   # .provide() method
builder/builder-merge.ts     # .merge() method
```

### 6. Graph Construction

```
graph/types/graph-types.ts   # Graph interface
graph/guards.ts              # isGraphBuilder, isGraph
```

## File Naming Conventions

| Pattern          | Meaning                                 |
| ---------------- | --------------------------------------- |
| `*-types.ts`     | Type definitions only (no runtime code) |
| `*-result.ts`    | Return type for a builder method        |
| `CONCEPT-*.ts`   | Educational documentation file          |
| `*-inference.ts` | Type inference utilities                |
| `*-detection.ts` | Detection algorithm types               |
| `*-errors.ts`    | Error type definitions                  |
| `*-map.ts`       | Map/Record manipulation types           |

## Type Parameter Naming

| Pattern  | Meaning                | Example          |
| -------- | ---------------------- | ---------------- |
| `T*`     | Generic type parameter | `TAdapter`       |
| `*Union` | Distributed union type | `TRequiresUnion` |
| `*Map`   | Record/object type     | `TDepGraphMap`   |
| `*Tuple` | Ordered tuple          | `TAdaptersTuple` |
| `*Name`  | String literal type    | `TPortName`      |

## Quick Debugging Patterns

### Investigating a Type Error

1. Import debug utilities:

   ```typescript
   import type { DebugProvideValidation } from "@hex-di/graph/internal";
   ```

2. Wrap the failing type:

   ```typescript
   type Debug = DebugProvideValidation<typeof builder, typeof adapter>;
   ```

3. Hover over `Debug` in IDE to see:
   - `cycleCheck`: Cycle detection result
   - `captiveCheck`: Captive dependency result
   - `duplicateCheck`: Duplicate detection result

### Finding Where a Type Is Defined

1. For validation types: `src/validation/types/`
2. For builder types: `src/builder/types/`
3. For adapter types: `src/adapter/types/`
4. For graph types: `src/graph/types/`

### Understanding a Complex Type

1. Check if there's a `CONCEPT-*.ts` file explaining it
2. Look for JSDoc comments in the type definition
3. Check the corresponding test file (e.g., `cycle-detection.test-d.ts`)

## Key Architectural Patterns

### 1. Type-State Pattern

The GraphBuilder uses phantom types to track graph state at compile time:

```typescript
GraphBuilder<TInternals extends BuilderInternals>
```

Each operation returns a new type with updated phantom state.

### 2. Error Return Pattern

Invalid operations return branded error strings:

```typescript
type ProvideResult = GraphBuilder<NewInternals> | `ERROR[HEX00X]: ...`;
```

### 3. Validation Pipeline

Each `.provide()` runs multiple validations in order:

1. Duplicate check
2. Cycle check
3. Captive dependency check
4. If all pass, compute new builder state

### 4. Depth-Limited Recursion

Type-level algorithms use depth tracking to prevent infinite recursion:

```typescript
type IsReachable<..., D extends Depth = DefaultMaxDepth>
```

## Common Modification Scenarios

### Adding a New Validation Check

1. Define check type in `validation/types/`
2. Add error message in `validation/types/error-messages.ts`
3. Integrate in `builder/types/provide-sync-result.ts`
4. Add type tests in `tests/*.test-d.ts`

### Modifying Error Messages

1. Edit `validation/types/error-messages.ts`
2. Update `validation/error-parsing.ts` if format changes
3. Update `tests/error-message-consistency.test-d.ts`

### Adding GraphBuilder Method

1. Add runtime implementation in `builder/builder-*.ts`
2. Add return type in `builder/types/`
3. Add type tests in `tests/graph-builder.test-d.ts`
4. Add runtime tests in `tests/graph-builder.test.ts`
