# @hex-di/graph API Surface

This document provides a comprehensive reference for all exports from `@hex-di/graph`.

## Package Entry Points

| Entry Point                 | Purpose                 | Stability |
| --------------------------- | ----------------------- | --------- |
| `@hex-di/graph`             | Primary public API      | Stable    |
| `@hex-di/graph/internal`    | Advanced/internal types | Unstable  |
| `@hex-di/graph/convenience` | Ergonomic helpers       | Stable    |

---

## Main Export (`@hex-di/graph`)

### Re-exports from `@hex-di/ports`

```typescript
import type { Port, InferService, InferPortName } from "@hex-di/graph";
```

| Export          | Kind | Purpose                        |
| --------------- | ---- | ------------------------------ |
| `Port`          | Type | Port type definition           |
| `InferService`  | Type | Extract service type from port |
| `InferPortName` | Type | Extract port name from port    |

### Adapter Module

#### Types

```typescript
import type { Adapter, AdapterAny, FactoryKind, Lifetime, ResolvedDeps } from "@hex-di/graph";
```

| Export         | Kind      | Purpose                                  |
| -------------- | --------- | ---------------------------------------- |
| `Adapter`      | Type      | Branded adapter type with full contract  |
| `AdapterAny`   | Interface | Constraint for generic adapter handling  |
| `FactoryKind`  | Type      | `"sync" \| "async"` discriminator        |
| `Lifetime`     | Type      | `"singleton" \| "scoped" \| "transient"` |
| `ResolvedDeps` | Type      | Maps port union to dependency object     |

#### Factory Functions

```typescript
import { createAdapter, createAsyncAdapter, lazyPort } from "@hex-di/graph";
```

| Export               | Kind     | Purpose                                          |
| -------------------- | -------- | ------------------------------------------------ |
| `createAdapter`      | Function | Create sync adapter                              |
| `createAsyncAdapter` | Function | Create async adapter                             |
| `lazyPort`           | Function | Create lazy port token for circular dependencies |

#### Inference Types

```typescript
import type {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
} from "@hex-di/graph";
```

| Export                 | Kind | Purpose                                |
| ---------------------- | ---- | -------------------------------------- |
| `InferAdapterProvides` | Type | Extract provided port from adapter     |
| `InferAdapterRequires` | Type | Extract required ports from adapter    |
| `InferAdapterLifetime` | Type | Extract lifetime from adapter          |
| `InferClonable`        | Type | Extract clonable flag from adapter     |
| `IsClonableAdapter`    | Type | Check if adapter is clonable           |
| `InferManyProvides`    | Type | Extract provides from adapter tuple    |
| `InferManyRequires`    | Type | Extract requires from adapter tuple    |
| `InferManyAsyncPorts`  | Type | Extract async ports from adapter tuple |

### Graph Module

#### Classes and Types

```typescript
import { GraphBuilder } from "@hex-di/graph";
import type { Graph } from "@hex-di/graph";
```

| Export         | Kind  | Purpose                                     |
| -------------- | ----- | ------------------------------------------- |
| `GraphBuilder` | Class | Fluent builder with compile-time validation |
| `Graph`        | Type  | Validated graph ready for runtime           |

#### Inference Types

```typescript
import type { InferProvides, InferRequires, InferAsyncPorts, InferOverrides } from "@hex-di/graph";
```

| Export            | Kind | Purpose                                   |
| ----------------- | ---- | ----------------------------------------- |
| `InferProvides`   | Type | Extract provided ports from graph/builder |
| `InferRequires`   | Type | Extract unsatisfied ports from builder    |
| `InferAsyncPorts` | Type | Extract async ports from graph/builder    |
| `InferOverrides`  | Type | Extract override ports from graph/builder |

#### Inspection Types

```typescript
import type { InspectableGraph, InspectableAdapter, InspectedDependency } from "@hex-di/graph";
```

| Export                | Kind      | Purpose                          |
| --------------------- | --------- | -------------------------------- |
| `InspectableGraph`    | Interface | Graph with inspection methods    |
| `InspectableAdapter`  | Interface | Adapter with inspection metadata |
| `InspectedDependency` | Interface | Dependency relationship details  |

### Validation Module

#### Error Types

```typescript
import type {
  MissingDependencyError,
  CircularDependencyError,
  CaptiveDependencyError,
  BatchDuplicateErrorMessage,
} from "@hex-di/graph";
```

| Export                       | Kind | Purpose                               |
| ---------------------------- | ---- | ------------------------------------- |
| `MissingDependencyError`     | Type | Error for unsatisfied dependencies    |
| `CircularDependencyError`    | Type | Error for dependency cycles           |
| `CaptiveDependencyError`     | Type | Error for lifetime scope violations   |
| `BatchDuplicateErrorMessage` | Type | Error for duplicate adapters in batch |
| `ExtractPortNames`           | Type | Extract port names from port union    |

#### Cycle Detection

```typescript
import type {
  IsReachable,
  WouldCreateCycle,
  FindCyclePath,
  WouldAnyCreateCycle,
  DetectCycleInMergedGraph,
} from "@hex-di/graph";
```

| Export                        | Kind | Purpose                                |
| ----------------------------- | ---- | -------------------------------------- |
| `IsReachable`                 | Type | Check if port is reachable in graph    |
| `WouldCreateCycle`            | Type | Check if adding edge creates cycle     |
| `WouldExceedDepthLimit`       | Type | Check if depth limit would be exceeded |
| `FindCyclePath`               | Type | Extract cycle path for error messages  |
| `BuildCyclePath`              | Type | Build formatted cycle path string      |
| `WouldAnyCreateCycle`         | Type | Check batch for cycles                 |
| `DetectCycleInMergedGraph`    | Type | Check merged graphs for cycles         |
| `FormatLazySuggestion`        | Type | Format lazy port suggestion            |
| `LazySuggestions`             | Type | Generate lazy suggestions for cycle    |
| `FormatLazySuggestionMessage` | Type | Format complete suggestion message     |

#### Depth Utilities

```typescript
import type {
  DefaultMaxDepth,
  ValidateMaxDepth,
  Depth,
  IncrementDepth,
  DepthExceeded,
} from "@hex-di/graph";
```

| Export             | Kind | Purpose                       |
| ------------------ | ---- | ----------------------------- |
| `DefaultMaxDepth`  | Type | Default recursion depth limit |
| `ValidateMaxDepth` | Type | Validate custom depth value   |
| `Depth`            | Type | Depth counter type            |
| `IncrementDepth`   | Type | Increment depth counter       |
| `DepthExceeded`    | Type | Check if depth exceeded       |

#### Dependency Map Operations

```typescript
import type {
  AddEdge,
  GetDirectDeps,
  MergeDependencyMaps,
  AddManyEdges,
  AdapterProvidesName,
  AdapterRequiresNames,
} from "@hex-di/graph";
```

| Export                 | Kind | Purpose                            |
| ---------------------- | ---- | ---------------------------------- |
| `AddEdge`              | Type | Add edge to dependency map         |
| `GetDirectDeps`        | Type | Get direct dependencies            |
| `MergeDependencyMaps`  | Type | Merge two dependency maps          |
| `AddManyEdges`         | Type | Add multiple edges                 |
| `DebugGetDirectDeps`   | Type | Debug version with expanded output |
| `AdapterProvidesName`  | Type | Extract provided port name         |
| `AdapterRequiresNames` | Type | Extract required port names        |

#### Captive Dependency Detection

```typescript
import type {
  IsCaptiveDependency,
  LifetimeLevel,
  CaptiveDependencyError,
  FindAnyCaptiveDependency,
} from "@hex-di/graph";
```

| Export                       | Kind | Purpose                              |
| ---------------------------- | ---- | ------------------------------------ |
| `LifetimeLevel`              | Type | Numeric lifetime level (0, 1, 2)     |
| `AddLifetime`                | Type | Add lifetime to map                  |
| `GetLifetimeLevel`           | Type | Get level for lifetime               |
| `IsCaptiveDependency`        | Type | Check for captive dependency         |
| `LifetimeName`               | Type | Get lifetime name from level         |
| `CaptiveDependencyError`     | Type | Captive dependency error message     |
| `FindAnyCaptiveDependency`   | Type | Find any captive dependency          |
| `MergeLifetimeMaps`          | Type | Merge lifetime maps                  |
| `AddManyLifetimes`           | Type | Add multiple lifetimes               |
| `WouldAnyBeCaptive`          | Type | Check batch for captive deps         |
| `DetectCaptiveInMergedGraph` | Type | Check merged graphs for captive deps |
| `FindLifetimeInconsistency`  | Type | Find lifetime inconsistency in merge |

#### Batch and Lazy Utilities

```typescript
import type {
  HasDuplicatesInBatch,
  FindBatchDuplicate,
  TransformLazyToOriginal,
  ExtractLazyPorts,
  HasLazyPorts,
} from "@hex-di/graph";
```

| Export                    | Kind | Purpose                          |
| ------------------------- | ---- | -------------------------------- |
| `HasDuplicatesInBatch`    | Type | Check for duplicates in batch    |
| `FindBatchDuplicate`      | Type | Find duplicate in batch          |
| `TransformLazyToOriginal` | Type | Transform lazy port to original  |
| `ExtractLazyPorts`        | Type | Extract lazy ports from requires |
| `HasLazyPorts`            | Type | Check if adapter uses lazy ports |

#### Other Validation

```typescript
import type {
  UnsatisfiedDependencies,
  IsSatisfied,
  OverlappingPorts,
  HasOverlap,
  IsAsyncAdapter,
} from "@hex-di/graph";
```

| Export                    | Kind | Purpose                          |
| ------------------------- | ---- | -------------------------------- |
| `UnsatisfiedDependencies` | Type | Compute unsatisfied dependencies |
| `IsSatisfied`             | Type | Check if dependencies satisfied  |
| `OverlappingPorts`        | Type | Find overlapping ports           |
| `HasOverlap`              | Type | Check for port overlap           |
| `IsAsyncAdapter`          | Type | Check if adapter is async        |

### Runtime Type Guards

```typescript
import { isLifetime, isFactoryKind, isAdapter, isGraphBuilder, isGraph } from "@hex-di/graph";
```

| Export           | Kind     | Purpose                                 |
| ---------------- | -------- | --------------------------------------- |
| `isLifetime`     | Function | Check if value is valid Lifetime        |
| `isFactoryKind`  | Function | Check if value is valid FactoryKind     |
| `isAdapter`      | Function | Check if value conforms to AdapterAny   |
| `isGraphBuilder` | Function | Check if value is GraphBuilder instance |
| `isGraph`        | Function | Check if value conforms to Graph        |

### Utility Types

```typescript
import type { IsNever, TupleToUnion, Prettify } from "@hex-di/graph";
```

| Export         | Kind | Purpose                    |
| -------------- | ---- | -------------------------- |
| `IsNever`      | Type | Check if type is `never`   |
| `TupleToUnion` | Type | Convert tuple to union     |
| `Prettify`     | Type | Flatten intersection types |

---

## Internal Export (`@hex-di/graph/internal`)

**Stability Warning:** These types are NOT covered by semver guarantees.

### Common Utilities

```typescript
import type { IsNever, TupleToUnion, Prettify, InferenceError } from "@hex-di/graph/internal";
```

| Export           | Kind | Purpose                                  |
| ---------------- | ---- | ---------------------------------------- |
| `InferenceError` | Type | Descriptive error for inference failures |

### Debug and Inspection

```typescript
import type { DebugProvideValidation, DebugAdapterInference } from "@hex-di/graph/internal";
```

| Export                   | Kind | Purpose                            |
| ------------------------ | ---- | ---------------------------------- |
| `DebugProvideValidation` | Type | Debug view of provide() validation |
| `DebugAdapterInference`  | Type | Debug view of adapter inference    |

### All Cycle Detection Internals

Re-exports all cycle detection types for advanced type-level programming:

- Depth utilities
- Adapter name extraction
- Dependency map operations
- Core reachability algorithm
- Cycle path extraction
- Batch and merge utilities

---

## Convenience Export (`@hex-di/graph/convenience`)

```typescript
import { defineService, defineAsyncService } from "@hex-di/graph/convenience";
```

| Export               | Kind     | Purpose                              |
| -------------------- | -------- | ------------------------------------ |
| `defineService`      | Function | Create port + sync adapter together  |
| `defineAsyncService` | Function | Create port + async adapter together |

These helpers intentionally cross hexagonal architecture boundaries for ergonomics. Use when:

- Prototyping quickly
- Single adapter per port
- Boilerplate reduction is priority

For strict hexagonal architecture, use separate `createPort` + `createAdapter`.

---

## Error Codes Reference

| Code   | Error Type                   | Description                       |
| ------ | ---------------------------- | --------------------------------- |
| HEX001 | `MissingDependencyError`     | Required dependency not satisfied |
| HEX002 | `CircularDependencyError`    | Dependency cycle detected         |
| HEX003 | `CaptiveDependencyError`     | Lifetime scope violation          |
| HEX004 | `BatchDuplicateErrorMessage` | Duplicate adapter in batch        |
| HEX005 | (Reserved)                   | -                                 |
| HEX006 | Override validation          | Cannot override non-existent port |

---

## Import Patterns

### Standard Usage

```typescript
// Most common imports
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import type { Adapter, Graph, Lifetime } from "@hex-di/graph";
```

### With Port Creation

```typescript
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
```

### Convenience Pattern

```typescript
import { defineService } from "@hex-di/graph/convenience";

const [LoggerPort, LoggerAdapter] = defineService<"Logger", Logger>("Logger", {
  factory: () => new ConsoleLogger(),
});
```

### Advanced Type Programming

```typescript
import type { DebugProvideValidation, IsReachable, WouldCreateCycle } from "@hex-di/graph/internal";
```
