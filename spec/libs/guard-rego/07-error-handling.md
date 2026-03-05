# 07 — Error Handling

All errors in `@hex-di/guard-rego` follow the Rust-style `Result<T, E>` pattern. Errors are frozen discriminated unions with unique `_tag` values.

---

## Error Taxonomy

```
RegoError (union)
├── RegoEngineCreationError
│   ├── _tag: "opa-unreachable"
│   └── _tag: "invalid-config"
├── RegoEngineError
│   ├── _tag: "http-error"
│   ├── _tag: "timeout"
│   ├── _tag: "opa-error"
│   └── _tag: "network-error"
├── RegoDecisionParseError
│   ├── _tag: "missing-allow-field"
│   ├── _tag: "invalid-result-type"
│   └── _tag: "invalid-visible-fields"
├── RegoInputMappingError
│   ├── _tag: "non-serializable-value"
│   └── _tag: "reserved-key-conflict"
└── RegoAdapterError
    ├── _tag: "engine-not-initialized"
    ├── _tag: "input-mapping-failed"
    ├── _tag: "decision-parse-failed"
    └── _tag: "evaluation-denied-on-error"
```

---

## Error Types

REQUIREMENT (RG-ERR-001): Every error type MUST be a frozen object with a unique `_tag` string discriminant and a `message` string.

```ts
interface RegoErrorBase {
  readonly _tag: string;
  readonly message: string;
}
```

### RegoEngineCreationError

REQUIREMENT (RG-ERR-010): The `RegoEngineCreationError` MUST be returned by `createRegoEngine` when engine initialization fails.

```ts
type RegoEngineCreationError =
  | {
      readonly _tag: "opa-unreachable";
      readonly message: string;
      readonly baseUrl: string;
      readonly cause?: unknown;
    }
  | { readonly _tag: "invalid-config"; readonly message: string; readonly field: string };
```

### RegoEngineError

REQUIREMENT (RG-ERR-020): The `RegoEngineError` MUST be returned by `RegoEnginePort.query` when the OPA query fails at the transport or OPA level.

```ts
type RegoEngineError =
  | {
      readonly _tag: "http-error";
      readonly message: string;
      readonly status: number;
      readonly body?: string;
    }
  | { readonly _tag: "timeout"; readonly message: string; readonly timeoutMs: number }
  | {
      readonly _tag: "opa-error";
      readonly message: string;
      readonly code: string;
      readonly errors?: ReadonlyArray<{
        readonly message: string;
        readonly location?: { readonly file: string; readonly row: number; readonly col: number };
      }>;
    }
  | { readonly _tag: "network-error"; readonly message: string; readonly cause?: unknown };
```

REQUIREMENT (RG-ERR-021): The `opa-error` tag MUST be used when OPA returns HTTP 400-499 with an error response body. OPA error responses include a `code` field (e.g., `"internal_error"`, `"invalid_parameter"`) and an `errors` array with source location information.

REQUIREMENT (RG-ERR-022): The `timeout` tag MUST be used when the HTTP request exceeds the configured timeout. The `timeoutMs` field records the timeout threshold.

### RegoDecisionParseError

REQUIREMENT (RG-ERR-030): The `RegoDecisionParseError` MUST be returned by the decision mapper when the OPA result cannot be parsed into a Guard `Decision`.

```ts
type RegoDecisionParseError =
  | { readonly _tag: "missing-allow-field"; readonly message: string; readonly rawResult: unknown }
  | {
      readonly _tag: "invalid-result-type";
      readonly message: string;
      readonly resultType: string;
      readonly rawResult: unknown;
    }
  | {
      readonly _tag: "invalid-visible-fields";
      readonly message: string;
      readonly rawResult: unknown;
    };
```

### RegoInputMappingError

REQUIREMENT (RG-ERR-040): The `RegoInputMappingError` MUST be returned by the input mapper when the evaluation context cannot be serialized to a valid OPA input document.

```ts
type RegoInputMappingError =
  | { readonly _tag: "non-serializable-value"; readonly message: string; readonly key: string }
  | { readonly _tag: "reserved-key-conflict"; readonly message: string; readonly key: string };
```

### RegoAdapterError

REQUIREMENT (RG-ERR-050): The `RegoAdapterError` MUST be returned by the top-level adapter when it cannot complete an evaluation.

```ts
type RegoAdapterError =
  | { readonly _tag: "engine-not-initialized"; readonly message: string }
  | {
      readonly _tag: "input-mapping-failed";
      readonly message: string;
      readonly cause: RegoInputMappingError;
    }
  | {
      readonly _tag: "decision-parse-failed";
      readonly message: string;
      readonly cause: RegoDecisionParseError;
    }
  | {
      readonly _tag: "evaluation-denied-on-error";
      readonly message: string;
      readonly cause: RegoEngineError;
    };
```

---

## Recovery Strategies

REQUIREMENT (RG-ERR-060): All errors MUST be recoverable at the call site via `Result` pattern matching. The adapter MUST NOT throw exceptions.

REQUIREMENT (RG-ERR-061): When OPA is unreachable (`network-error` or `timeout`), the adapter MUST produce a `Deny` decision with reason `"OPA unreachable: <error message>"` wrapped in `RegoAdapterError` with tag `"evaluation-denied-on-error"`. This is the fail-closed behavior described in [01-overview.md](01-overview.md).

REQUIREMENT (RG-ERR-062): The caller MAY configure fallback behavior by composing the `regoPolicy` with an `anyOf` combinator that includes a native Guard policy as an alternative:

```ts
// Fallback: if OPA is down, allow if user has admin role
const policy = anyOf([
  regoPolicy("authz/documents/allow"),
  allOf([hasRole("admin"), labeled("opa-fallback", hasPermission("documents:read"))]),
]);
```

REQUIREMENT (RG-ERR-063): All error objects MUST be deeply frozen. `Object.freeze` MUST be applied at construction time.

REQUIREMENT (RG-ERR-064): For `opa-error` responses that include Rego compilation or evaluation errors with source locations, the error MUST preserve the file, row, and column information. This enables debugging Rego policy errors from the adapter's error output.
