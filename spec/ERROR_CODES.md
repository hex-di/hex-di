# Error Code Registry

Ecosystem-wide reference of all error codes, `_tag` variants, and tagged union types across HexDI packages.

---

## Core: Numeric Error Codes (HEX001-HEX025)

Numeric codes are embedded in error messages using the format `ERROR[HEXxxx]:`. They are defined in `packages/core/src/errors/codes.ts`.

### Graph Validation Errors (HEX001-HEX009)

| Code   | Constant                     | Description                                                                      |
| ------ | ---------------------------- | -------------------------------------------------------------------------------- |
| HEX001 | `DUPLICATE_ADAPTER`          | A port has multiple adapters providing it                                        |
| HEX002 | `CIRCULAR_DEPENDENCY`        | Dependencies form a cycle (A -> B -> A)                                          |
| HEX003 | `CAPTIVE_DEPENDENCY`         | A longer-lived service depends on a shorter-lived one                            |
| HEX004 | `REVERSE_CAPTIVE_DEPENDENCY` | A later-registered adapter creates a captive dependency with an existing adapter |
| HEX005 | `LIFETIME_INCONSISTENCY`     | Merging graphs with same port but different lifetimes                            |
| HEX006 | `SELF_DEPENDENCY`            | An adapter requires its own port                                                 |
| HEX007 | `DEPTH_LIMIT_EXCEEDED`       | Type-level depth limit exceeded during validation                                |
| HEX008 | `MISSING_DEPENDENCY`         | Required dependencies are not provided                                           |
| HEX009 | `OVERRIDE_WITHOUT_PARENT`    | `override()` called without `forParent()`                                        |

### Adapter Configuration Errors (HEX010-HEX019)

| Code   | Constant                   | Description                                           |
| ------ | -------------------------- | ----------------------------------------------------- |
| HEX010 | `MISSING_PROVIDES`         | Adapter config missing `provides` field               |
| HEX011 | `INVALID_PROVIDES`         | Adapter config `provides` is not a valid Port         |
| HEX012 | `INVALID_REQUIRES_TYPE`    | Adapter config `requires` is not an array             |
| HEX013 | `INVALID_REQUIRES_ELEMENT` | Adapter config `requires` element is not a valid Port |
| HEX014 | `INVALID_LIFETIME_TYPE`    | Adapter config `lifetime` is not a string             |
| HEX015 | `INVALID_LIFETIME_VALUE`   | Adapter config `lifetime` is not a valid value        |
| HEX016 | `INVALID_FACTORY`          | Adapter config `factory` is not a function            |
| HEX017 | `DUPLICATE_REQUIRES`       | Adapter config `requires` has duplicate ports         |
| HEX018 | `INVALID_FINALIZER`        | Adapter config `finalizer` is not a function          |
| HEX019 | `INVALID_LAZY_PORT`        | Invalid lazy port (missing original port reference)   |

### Runtime/Container Errors (HEX020-HEX025)

| Code   | Constant               | Description                                               |
| ------ | ---------------------- | --------------------------------------------------------- |
| HEX020 | `FACTORY_FAILED`       | Sync factory function threw during instance creation      |
| HEX021 | `ASYNC_FACTORY_FAILED` | Async factory function threw during instance creation     |
| HEX022 | `DISPOSED_SCOPE`       | Attempted to resolve from a disposed scope/container      |
| HEX023 | `SCOPE_REQUIRED`       | Scoped port resolved from root container (requires scope) |
| HEX024 | `ASYNC_INIT_REQUIRED`  | Async port resolved synchronously without initialization  |
| HEX025 | `NON_CLONABLE_FORKED`  | Non-clonable adapter used with forked inheritance mode    |

### Meta Error Codes

| Constant          | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `MULTIPLE_ERRORS` | Wraps multiple validation errors from a single operation |
| `UNKNOWN_ERROR`   | Fallback for unclassifiable errors                       |

---

## Core: ResolutionError `_tag` Variants

The `ResolutionError` tagged union (`packages/core/src/errors/resolution-error.ts`) represents all container resolution failures. Each variant extends `ContainerError` and carries a unique `_tag` literal.

| `_tag`                 | Error Class                        | Description                                              |
| ---------------------- | ---------------------------------- | -------------------------------------------------------- |
| `"CircularDependency"` | `CircularDependencyError`          | Circular dependency detected during resolution           |
| `"FactoryFailed"`      | `FactoryError`                     | Sync factory threw during instance creation              |
| `"DisposedScope"`      | `DisposedScopeError`               | Resolution attempted from a disposed scope               |
| `"ScopeRequired"`      | `ScopeRequiredError`               | Scoped port resolved from root container                 |
| `"AsyncFactoryFailed"` | `AsyncFactoryError`                | Async factory threw during instance creation             |
| `"AsyncInitRequired"`  | `AsyncInitializationRequiredError` | Async port resolved synchronously without initialization |
| `"NonClonableForked"`  | `NonClonableForkedError`           | Non-clonable adapter used with forked inheritance mode   |

---

## Saga: SagaError `_tag` Variants

The `SagaError<TCause>` tagged union represents all saga execution failures. All variants share the `SagaErrorBase` fields (`executionId`, `sagaName`, `stepName`, `stepIndex`, `message`, `completedSteps`, `compensatedSteps`).

| `_tag`                 | Description                                                                |
| ---------------------- | -------------------------------------------------------------------------- |
| `"StepFailed"`         | A forward step failed after retries exhausted; compensation succeeded      |
| `"CompensationFailed"` | A compensation handler itself failed -- system is in an inconsistent state |
| `"Timeout"`            | A step or the entire saga exceeded its configured timeout                  |
| `"Cancelled"`          | The saga was explicitly cancelled via the runtime API                      |
| `"ValidationFailed"`   | Input validation failed before any steps ran                               |
| `"PortNotFound"`       | A step references a port not registered in the container                   |
| `"PersistenceFailed"`  | The persistence layer failed to save or load saga state                    |

### Saga: ManagementError `_tag` Variants

| `_tag`                | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| `"ExecutionNotFound"` | The execution ID does not exist in the persistence store   |
| `"InvalidOperation"`  | The requested operation is not valid for the current state |
| `"PersistenceFailed"` | The persistence layer failed during a management operation |

### Saga: PersistenceError `_tag` Variants

| `_tag`                   | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `"NotFound"`             | The requested execution was not found in storage   |
| `"StorageFailure"`       | The underlying storage operation failed            |
| `"SerializationFailure"` | Serialization/deserialization of saga state failed |

---

## Flow: EffectExecutionError `_tag` Variants

The `EffectExecutionError` tagged union represents all failures during effect execution in the flow state machine runtime.

| `_tag`              | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `"InvokeError"`     | A port method invocation failed                                  |
| `"SpawnError"`      | An activity spawn failed                                         |
| `"StopError"`       | An activity stop failed                                          |
| `"ResolutionError"` | A port could not be resolved from the container                  |
| `"SequenceAborted"` | A sequential effect chain was aborted due to a preceding failure |
| `"ParallelErrors"`  | One or more parallel effects failed                              |

### Flow: TransitionError `_tag` Variants

| `_tag`            | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `"GuardThrew"`    | A transition guard function threw during evaluation              |
| `"ActionThrew"`   | A transition action function threw during execution              |
| `"Disposed"`      | The runner has been disposed; transitions are no longer accepted |
| `"QueueOverflow"` | The event queue exceeded its maximum size                        |

### Flow: FlowAdapterError `_tag` Variants

| `_tag`                    | Description                                                                       |
| ------------------------- | --------------------------------------------------------------------------------- |
| `"MetadataInvalid"`       | Machine definition failed validation (no states, invalid initial state, empty ID) |
| `"DuplicateActivityPort"` | Two activities in the adapter share the same port name                            |
| `"ActivityNotFrozen"`     | An activity was not frozen before adapter creation                                |

### Flow: DisposeError `_tag` Variants

| `_tag`                    | Description                                           |
| ------------------------- | ----------------------------------------------------- |
| `"ActivityCleanupFailed"` | One or more activities failed to clean up on disposal |

### Flow: SerializationError `_tag` Variants

| `_tag`                     | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `"NonSerializableContext"` | Machine context contains a non-serializable value |
| `"CircularReference"`      | Machine context contains a circular reference     |

### Flow: RestoreError `_tag` Variants

| `_tag`                | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `"InvalidState"`      | The snapshot's state does not exist in the machine definition |
| `"MachineIdMismatch"` | The snapshot's machine ID does not match the current machine  |
| `"SnapshotCorrupted"` | The snapshot data is corrupted or structurally invalid        |

### Flow: CleanupError `_tag` Variants

| `_tag`            | Description                               |
| ----------------- | ----------------------------------------- |
| `"CleanupFailed"` | An individual activity failed to clean up |

### Flow: MissingMockError `_tag` Variants

| `_tag`          | Description                                      |
| --------------- | ------------------------------------------------ |
| `"MissingMock"` | A test mock was not provided for a required port |

---

## Query: QueryResolutionError `_tag` Variants

The `QueryResolutionError` tagged union represents all infrastructure-level query failures produced by the QueryClient.

| `_tag`                     | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `"QueryFetchFailed"`       | The fetcher function returned an error after retries                |
| `"QueryCancelled"`         | The query was cancelled (e.g., by component unmount or AbortSignal) |
| `"QueryTimeout"`           | The query exceeded its configured timeout                           |
| `"QueryAdapterMissing"`    | No adapter is registered for the query port                         |
| `"QueryInvalidationCycle"` | Invalidation cascading exceeded the maximum depth                   |
| `"QueryDisposed"`          | The QueryClient has been disposed                                   |

---

## Store: Operational Error `_tag` Variants

These are value-based errors representing operational/IO failures in `@hex-di/store`. Programming errors (`DisposedStateAccessError`, `CircularDerivedDependencyError`) remain thrown exceptions.

| `_tag`                       | Type                      | Description                                                                                  |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `"EffectFailed"`             | `EffectFailedError`       | A state adapter effect returned `Err`; wraps the original error with port and action context |
| `"AsyncDerivedSelectFailed"` | `AsyncDerivedSelectError` | An async derived adapter's `select` returned `Err` after all retries exhausted               |
| `"HydrationFailed"`          | `HydrationError`          | A hydrator adapter failed to load or parse persisted state                                   |

---

## Agent: AgentError `_tag` Variants

The `AgentError` tagged union represents all agent execution failures. All variants share the `AgentErrorBase` fields (`runId`, `agentName`, `message`).

| `_tag`                   | Description                                                            |
| ------------------------ | ---------------------------------------------------------------------- |
| `"ToolExecutionFailed"`  | A tool's `execute` function threw during invocation                    |
| `"ToolValidationFailed"` | Zod schema validation failed on tool call arguments from the LLM       |
| `"ToolNameCollision"`    | Duplicate tool names detected across tool ports in the agent graph     |
| `"LlmGenerationFailed"`  | LLM provider returned an error (network, rate limit, API error)        |
| `"ApprovalTimeout"`      | HITL approval request timed out without a decision                     |
| `"RunAborted"`           | Agent run was cancelled via AbortSignal                                |
| `"MaxTurnsExceeded"`     | Agent exceeded its configured maximum turn count                       |
| `"AgentConfigInvalid"`   | Agent configuration failed validation (missing name, invalid maxTurns) |

---

## Cross-Package Error Summary

| Package         | Error Union Type          | `_tag` Count | Defined In                                     |
| --------------- | ------------------------- | ------------ | ---------------------------------------------- |
| `@hex-di/core`  | `ResolutionError`         | 7            | `packages/core/src/errors/resolution-error.ts` |
| `@hex-di/saga`  | `SagaError<TCause>`       | 7            | `spec/saga/09-error-handling.md`               |
| `@hex-di/saga`  | `ManagementError`         | 3            | `spec/saga/05-ports-and-adapters.md`           |
| `@hex-di/saga`  | `PersistenceError`        | 3            | `spec/saga/08-persistence.md`                  |
| `@hex-di/flow`  | `EffectExecutionError`    | 6            | `spec/flow/14-api-reference.md`                |
| `@hex-di/flow`  | `TransitionError`         | 4            | `spec/flow/14-api-reference.md`                |
| `@hex-di/flow`  | `FlowAdapterError`        | 3            | `spec/flow/14-api-reference.md`                |
| `@hex-di/flow`  | `DisposeError`            | 1            | `spec/flow/14-api-reference.md`                |
| `@hex-di/flow`  | `SerializationError`      | 2            | `spec/flow/14-api-reference.md`                |
| `@hex-di/flow`  | `RestoreError`            | 3            | `spec/flow/14-api-reference.md`                |
| `@hex-di/flow`  | `CleanupError`            | 1            | `spec/flow/14-api-reference.md`                |
| `@hex-di/query` | `QueryResolutionError`    | 6            | `spec/query/09-query-client.md`                |
| `@hex-di/store` | `EffectFailedError`       | 1            | `spec/store/10-api-reference.md`               |
| `@hex-di/store` | `AsyncDerivedSelectError` | 1            | `spec/store/10-api-reference.md`               |
| `@hex-di/store` | `HydrationError`          | 1            | `spec/store/10-api-reference.md`               |
| `@hex-di/agent` | `AgentError`              | 8            | `spec/agent/02-core-concepts.md`               |

All error types follow the tagged union pattern with a `_tag` string literal discriminant, enabling exhaustive `switch` handling without `instanceof` checks.
