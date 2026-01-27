# @hex-di/graph Module Structure

Machine-readable documentation of the internal module architecture.

## Entry Points

| Path             | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `index.ts`       | Public API - validation, adapters, graph builder          |
| `internal.ts`    | Internal types for advanced users (no semver guarantees)  |
| `convenience.ts` | `defineService()` helpers (intentional boundary crossing) |

## Module Dependency Graph

```
                         ┌─────────────────────┐
                         │    index.ts         │
                         │   (Public API)      │
                         └──────────┬──────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
   ┌────────────────┐     ┌────────────────┐      ┌────────────────┐
   │  validation/   │     │   adapter/     │      │    graph/      │
   │    index.ts    │     │    index.ts    │      │    index.ts    │
   └───────┬────────┘     └───────┬────────┘      └───────┬────────┘
           │                      │                       │
           │                      │              ┌────────┴────────┐
           │                      │              │                 │
           ▼                      ▼              ▼                 ▼
   ┌──────────────┐      ┌──────────────┐  ┌─────────┐    ┌───────────────┐
   │   types/     │      │   types/     │  │builder/ │    │  inspection/  │
   │   index.ts   │      │  index.ts    │  │builder.ts│   │   index.ts    │
   │              │      │              │  │         │    └───────┬───────┘
   │ errors.ts    │      │adapter-types │  │types/   │            │
   │ cycle/       │      │adapter-      │  │index.ts │            ▼
   │ captive/     │      │inference.ts  │  └─────────┘   ┌─────────────────┐
   │ batch-*      │      └──────────────┘                │ traversal.ts    │
   │ lazy-*       │                                      │ inspector.ts    │
   └──────────────┘                                      │ error-format.ts │
                                                         └─────────────────┘
```

## Source File Inventory

### Root (`src/`)

| File             | Exports                               | Dependencies                                              |
| ---------------- | ------------------------------------- | --------------------------------------------------------- |
| `index.ts`       | Public API barrel                     | adapter/, builder/, graph/, validation/, types/, symbols/ |
| `internal.ts`    | Internal types                        | adapter/, validation/, builder/types/                     |
| `convenience.ts` | `defineService`, `defineAsyncService` | adapter/service.ts                                        |
| `adapters.ts`    | Re-export barrel                      | adapter/                                                  |
| `builder.ts`     | Re-export barrel                      | builder/                                                  |
| `inspection.ts`  | Re-export barrel                      | graph/inspection/                                         |
| `validation.ts`  | Re-export barrel                      | validation/                                               |
| `types.ts`       | Re-export barrel                      | types/                                                    |

### Adapter Module (`src/adapter/`)

| File           | Exports                                                           | Dependencies              |
| -------------- | ----------------------------------------------------------------- | ------------------------- |
| `index.ts`     | Barrel export                                                     | All adapter module files  |
| `factory.ts`   | `createAdapter()`, `createAsyncAdapter()`                         | types/, constants.ts      |
| `service.ts`   | `defineService()`, `defineAsyncService()`, `createClassAdapter()` | factory.ts, @hex-di/ports |
| `lazy.ts`      | `lazyPort()`, `isLazyPort()`, `LazyPort<>`                        | @hex-di/ports             |
| `guards.ts`    | `isLifetime()`, `isFactoryKind()`, `isAdapter()`                  | types/                    |
| `constants.ts` | `DEFAULT_LIFETIME`, `DEFAULT_FACTORY_KIND`                        | -                         |

### Adapter Types (`src/adapter/types/`)

| File                   | Exports                                                                      | Dependencies            |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------- |
| `index.ts`             | Barrel export                                                                | All adapter types files |
| `adapter-types.ts`     | `Adapter`, `AdapterConstraint`, `Lifetime`, `FactoryKind`, `ResolvedDeps`    | @hex-di/ports           |
| `adapter-inference.ts` | `InferAdapterProvides`, `InferAdapterRequires`, `InferAdapterLifetime`, etc. | adapter-types.ts        |

### Builder Module (`src/builder/`)

| File                 | Exports                                     | Dependencies                  |
| -------------------- | ------------------------------------------- | ----------------------------- |
| `builder.ts`         | `GraphBuilder` class, `GRAPH_BUILDER_BRAND` | types/, adapter/, validation/ |
| `builder-build.ts`   | Build-related builder methods               | builder.ts                    |
| `builder-provide.ts` | Provide-related builder methods             | builder.ts, types/            |
| `builder-merge.ts`   | Merge-related builder methods               | builder.ts, types/            |
| `builder-types.ts`   | Common builder type utilities               | types/                        |

### Builder Types (`src/builder/types/`)

| File                      | Exports                                                                             | Dependencies            |
| ------------------------- | ----------------------------------------------------------------------------------- | ----------------------- |
| `index.ts`                | Barrel export                                                                       | All builder types files |
| `empty-state.ts`          | `EmptyDependencyGraph`, `EmptyLifetimeMap`, `DirectAdapterLifetime`                 | -                       |
| `internals.ts`            | `BuilderInternals`, `DefaultInternals`, `AnyBuilderInternals`, Get*/With* utilities | validation/             |
| `provide-types.ts`        | `ProvideResult` base types                                                          | validation/, adapter/   |
| `provide-sync-result.ts`  | `ProvideResult` for sync adapters                                                   | validation/, adapter/   |
| `provide-async-result.ts` | `ProvideAsyncResult` for async adapters                                             | validation/, adapter/   |
| `provide-many-result.ts`  | `ProvideManyResult` for batched provides                                            | validation/, adapter/   |
| `provide-multi-error.ts`  | `ProvideResultAllErrors` for multi-error types                                      | validation/, adapter/   |
| `merge-types.ts`          | `MergeResult`, `MergeWithResult`, `MergeCheck*` types                               | validation/, adapter/   |
| `override-types.ts`       | `OverrideResult`, `IsValidOverride`, `OverridablePorts`                             | validation/, adapter/   |
| `inspection-types.ts`     | `ValidationState`, `InspectValidation`, `SimplifiedView`                            | adapter/                |
| `summary-types.ts`        | `BuilderSummary`, `BuilderStatus`, `IsBuilderComplete`                              | validation/             |
| `debug-types.ts`          | `DebugProvideValidation`, `DebugMergeValidation`, debug utilities                   | validation/             |
| `init-order-types.ts`     | `ComputeInitOrder`, initialization order calculation                                | validation/             |

### Graph Module (`src/graph/`)

| File                     | Exports                            | Dependencies           |
| ------------------------ | ---------------------------------- | ---------------------- |
| `index.ts`               | Barrel export                      | All graph module files |
| `guards.ts`              | `isGraphBuilder()`, `isGraph()`    | builder/, types/       |
| `graph-visualization.ts` | `toDotGraph()`, `toMermaidGraph()` | adapter/               |

### Graph Types (`src/graph/types/`)

| File                 | Exports                                                            | Dependencies          |
| -------------------- | ------------------------------------------------------------------ | --------------------- |
| `index.ts`           | Barrel export                                                      | All graph types files |
| `graph-types.ts`     | `Graph` interface                                                  | adapter/              |
| `graph-inference.ts` | `InferGraphProvides`, `InferGraphRequires`, `InferGraphAsyncPorts` | graph-types.ts        |
| `inspection.ts`      | `GraphInspection`, `ValidationResult`, `GraphSuggestion`           | -                     |

### Inspection Module (`src/graph/inspection/`)

| File                         | Exports                                                  | Dependencies         |
| ---------------------------- | -------------------------------------------------------- | -------------------- |
| `index.ts`                   | Barrel export                                            | All inspection files |
| `inspector.ts`               | `inspectGraph()`, `InspectOptions`                       | types/, adapter/     |
| `traversal.ts`               | `topologicalSort()`, `getTransitiveDependencies()`, etc. | adapter/             |
| `runtime-cycle-detection.ts` | `detectCycleAtRuntime()`                                 | adapter/             |
| `serialization.ts`           | `inspectionToJSON()`                                     | types/               |
| `error-formatting.ts`        | `formatCycleError()`, `formatDuplicateError()`, etc.     | -                    |
| `structured-logging.ts`      | `toStructuredLogs()`, `LogLevel`, `StructuredLogEntry`   | types/               |
| `complexity.ts`              | `INSPECTION_CONFIG`, complexity calculation              | -                    |
| `correlation.ts`             | Correlation ID utilities                                 | -                    |
| `depth-analysis.ts`          | Dependency depth analysis                                | adapter/             |
| `disposal.ts`                | Disposal order calculation                               | adapter/             |
| `lazy-analysis.ts`           | Lazy port analysis                                       | adapter/             |
| `suggestions.ts`             | Graph improvement suggestions                            | -                    |

### Symbols Module (`src/symbols/`)

| File        | Exports                             | Dependencies     |
| ----------- | ----------------------------------- | ---------------- |
| `index.ts`  | Barrel export                       | All symbol files |
| `brands.ts` | `__prettyViewSymbol`, brand symbols | -                |

### Types Module (`src/types/`)

| File                | Exports                                                 | Dependencies           |
| ------------------- | ------------------------------------------------------- | ---------------------- |
| `index.ts`          | Barrel export                                           | All type utility files |
| `type-utilities.ts` | `IsNever`, `TupleToUnion`, `Prettify`, `InferenceError` | -                      |

### Validation Module (`src/validation/`)

| File               | Exports                                                 | Dependencies             |
| ------------------ | ------------------------------------------------------- | ------------------------ |
| `index.ts`         | Barrel export                                           | types/, error-parsing.ts |
| `error-parsing.ts` | `GraphErrorCode`, `parseGraphError()`, `isGraphError()` | -                        |

### Validation Types (`src/validation/types/`)

| File                           | Exports                                                                | Dependencies                        |
| ------------------------------ | ---------------------------------------------------------------------- | ----------------------------------- |
| `index.ts`                     | Barrel export                                                          | All validation type files           |
| `errors.ts`                    | Error type re-exports                                                  | error-messages.ts, cycle/, captive/ |
| `error-messages.ts`            | `DuplicateErrorMessage`, `CircularErrorMessage`, `CaptiveErrorMessage` | @hex-di/ports                       |
| `dependency-satisfaction.ts`   | `UnsatisfiedDependencies`, `IsSatisfied`, `OrphanPorts`                | -                                   |
| `batch-duplicates.ts`          | `HasDuplicatesInBatch`, `FindBatchDuplicate`                           | adapter/                            |
| `init-priority.ts`             | `IsAsyncAdapter`, init priority                                        | adapter/                            |
| `lazy-transforms.ts`           | `TransformLazyToOriginal`, `ExtractLazyPorts`, `HasLazyPorts`          | adapter/                            |
| `error-aggregation.ts`         | Error aggregation utilities                                            | -                                   |
| `CONCEPT-cycle-detection.ts`   | Documentation file                                                     | -                                   |
| `CONCEPT-captive-detection.ts` | Documentation file                                                     | -                                   |

### Cycle Detection (`src/validation/types/cycle/`)

| File           | Exports                                                          | Dependencies              |
| -------------- | ---------------------------------------------------------------- | ------------------------- |
| `index.ts`     | Barrel export                                                    | All cycle detection files |
| `depth.ts`     | `DefaultMaxDepth`, `ValidateMaxDepth`, `Depth`, `IncrementDepth` | -                         |
| `detection.ts` | `WouldCreateCycle`, `IsReachable`, `AddEdge`, `GetDirectDeps`    | depth.ts                  |
| `errors.ts`    | `CircularDependencyError`, `FindCyclePath`, `BuildCyclePath`     | detection.ts              |
| `batch.ts`     | `WouldAnyCreateCycle`, `DetectCycleInMergedGraph`                | detection.ts              |

### Captive Detection (`src/validation/types/captive/`)

| File                | Exports                                                   | Dependencies                |
| ------------------- | --------------------------------------------------------- | --------------------------- |
| `index.ts`          | Barrel export                                             | All captive detection files |
| `lifetime-level.ts` | `LifetimeLevel`, `LifetimeName`                           | -                           |
| `lifetime-map.ts`   | `AddLifetime`, `GetLifetimeLevel`, `MergeLifetimeMaps`    | lifetime-level.ts           |
| `comparison.ts`     | `IsCaptiveDependency`                                     | lifetime-level.ts           |
| `detection.ts`      | `FindAnyCaptiveDependency`, `WouldAnyBeCaptive`           | comparison.ts               |
| `errors.ts`         | `CaptiveDependencyError`                                  | -                           |
| `merge.ts`          | `DetectCaptiveInMergedGraph`, `FindLifetimeInconsistency` | detection.ts                |

## External Dependencies

| Package         | Purpose                                                         |
| --------------- | --------------------------------------------------------------- |
| `@hex-di/ports` | Port token definitions (`createPort`, `Port<>`, `InferService`) |

## File Count Summary

| Directory                       | Files  |
| ------------------------------- | ------ |
| `src/`                          | 8      |
| `src/adapter/`                  | 6      |
| `src/adapter/types/`            | 3      |
| `src/builder/`                  | 5      |
| `src/builder/types/`            | 14     |
| `src/graph/`                    | 3      |
| `src/graph/types/`              | 4      |
| `src/graph/inspection/`         | 13     |
| `src/symbols/`                  | 2      |
| `src/types/`                    | 2      |
| `src/validation/`               | 2      |
| `src/validation/types/`         | 10     |
| `src/validation/types/cycle/`   | 5      |
| `src/validation/types/captive/` | 7      |
| **Total**                       | **84** |
