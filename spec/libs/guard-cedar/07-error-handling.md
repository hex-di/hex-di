# 07 — Error Handling

All errors in `@hex-di/guard-cedar` follow the Rust-style `Result<T, E>` pattern used throughout the HexDI ecosystem. Errors are frozen discriminated unions with unique `_tag` values.

---

## Error Taxonomy

```
CedarError (union)
├── CedarEngineCreationError
│   ├── _tag: "wasm-init-failed"
│   └── _tag: "schema-validation-failed"
├── CedarEngineError
│   ├── _tag: "evaluation-failed"
│   └── _tag: "wasm-runtime-error"
├── CedarPolicyParseError
│   ├── _tag: "parse-failed"
│   └── _tag: "duplicate-policy-id"
├── CedarSchemaError
│   ├── _tag: "parse-failed"
│   └── _tag: "invalid-schema"
├── EntityMappingError
│   ├── _tag: "missing-resource-id"
│   ├── _tag: "missing-resource-type"
│   └── _tag: "unmappable-attribute"
├── SchemaConfigMismatchError
│   └── _tag: "config-schema-mismatch"
└── CedarAdapterError
    ├── _tag: "engine-not-initialized"
    ├── _tag: "policy-store-empty"
    └── _tag: "entity-mapping-failed"
```

---

## Error Types

REQUIREMENT (CD-ERR-001): Every error type MUST be a frozen object with a unique `_tag` string discriminant and a `message` string.

```ts
interface CedarErrorBase {
  readonly _tag: string;
  readonly message: string;
}
```

### CedarEngineCreationError

REQUIREMENT (CD-ERR-010): The `CedarEngineCreationError` MUST be returned by `createCedarEngine` when engine initialization fails.

```ts
type CedarEngineCreationError =
  | { readonly _tag: "wasm-init-failed"; readonly message: string; readonly cause?: unknown }
  | {
      readonly _tag: "schema-validation-failed";
      readonly message: string;
      readonly notes: ReadonlyArray<CedarValidationNote>;
    };
```

### CedarEngineError

REQUIREMENT (CD-ERR-020): The `CedarEngineError` MUST be returned by `CedarEnginePort.isAuthorized` when evaluation fails at the engine level (not a policy-level skip — those are diagnostics, not errors).

```ts
type CedarEngineError =
  | { readonly _tag: "evaluation-failed"; readonly message: string; readonly cause?: unknown }
  | { readonly _tag: "wasm-runtime-error"; readonly message: string; readonly cause?: unknown };
```

### CedarPolicyParseError

REQUIREMENT (CD-ERR-030): The `CedarPolicyParseError` MUST be returned by policy store operations when policy text cannot be parsed.

```ts
type CedarPolicyParseError =
  | {
      readonly _tag: "parse-failed";
      readonly message: string;
      readonly line?: number;
      readonly column?: number;
    }
  | { readonly _tag: "duplicate-policy-id"; readonly message: string; readonly policyId: string };
```

### EntityMappingError

REQUIREMENT (CD-ERR-040): The `EntityMappingError` MUST be returned by entity mapping functions when the input cannot be mapped to Cedar entities.

```ts
type EntityMappingError =
  | { readonly _tag: "missing-resource-id"; readonly message: string }
  | { readonly _tag: "missing-resource-type"; readonly message: string }
  | {
      readonly _tag: "unmappable-attribute";
      readonly message: string;
      readonly key: string;
      readonly value: unknown;
    };
```

### CedarSchemaError

REQUIREMENT (CD-ERR-050): The `CedarSchemaError` MUST be returned by schema loading functions when the schema is invalid.

```ts
type CedarSchemaError =
  | { readonly _tag: "parse-failed"; readonly message: string }
  | {
      readonly _tag: "invalid-schema";
      readonly message: string;
      readonly details: ReadonlyArray<string>;
    };
```

### CedarAdapterError

REQUIREMENT (CD-ERR-060): The `CedarAdapterError` MUST be returned by the top-level adapter when it cannot complete an evaluation due to configuration issues.

```ts
type CedarAdapterError =
  | { readonly _tag: "engine-not-initialized"; readonly message: string }
  | { readonly _tag: "policy-store-empty"; readonly message: string }
  | {
      readonly _tag: "entity-mapping-failed";
      readonly message: string;
      readonly cause: EntityMappingError;
    };
```

---

## Recovery Strategies

REQUIREMENT (CD-ERR-070): All errors MUST be recoverable at the call site via `Result` pattern matching. The adapter MUST NOT throw exceptions.

REQUIREMENT (CD-ERR-071): When the Cedar engine encounters a WASM runtime error, the adapter MUST wrap the WASM error in a `CedarEngineError` with tag `"wasm-runtime-error"` and include the original error as `cause`. The caller can retry or fall back to a native Guard policy.

REQUIREMENT (CD-ERR-072): When entity mapping fails for a non-critical reason (e.g., unmappable attribute), the adapter SHOULD proceed with a partial entity (omitting the unmappable field) rather than failing entirely. The unmappable attribute MUST be recorded in the evaluation trace diagnostics.

REQUIREMENT (CD-ERR-073): All error objects MUST be deeply frozen. `Object.freeze` MUST be applied at construction time, consistent with Guard's error handling conventions.
