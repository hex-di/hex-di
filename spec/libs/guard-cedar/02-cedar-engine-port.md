# 02 — Cedar Engine Port

The `CedarEnginePort` is the primary interface for Cedar policy evaluation. It accepts a Cedar authorization request and returns a Cedar authorization response wrapped in a `Result`.

---

## CedarEnginePort Interface

REQUIREMENT (CD-PORT-001): The `CedarEnginePort` MUST define a synchronous `isAuthorized` method that accepts a `CedarAuthorizationRequest` and returns `Result<CedarAuthorizationResponse, CedarEngineError>`.

```ts
interface CedarEnginePort {
  readonly isAuthorized: (
    request: CedarAuthorizationRequest
  ) => Result<CedarAuthorizationResponse, CedarEngineError>;
}
```

REQUIREMENT (CD-PORT-002): The `CedarEnginePort` MUST define a `validate` method that validates a set of Cedar policies against a schema and returns `Result<CedarValidationResult, CedarEngineError>`.

```ts
interface CedarEnginePort {
  readonly validate: (
    policies: string,
    schema: CedarSchema
  ) => Result<CedarValidationResult, CedarEngineError>;
}
```

REQUIREMENT (CD-PORT-003): The `CedarEnginePort` MUST be a pure port interface with no dependency on the WASM implementation. Adapters implement this port.

---

## Authorization Request

REQUIREMENT (CD-PORT-010): The `CedarAuthorizationRequest` MUST contain: principal (entity UID), action (entity UID), resource (entity UID), context (record), entities (entity slice), and policies (policy text).

```ts
interface CedarAuthorizationRequest {
  readonly principal: CedarEntityUid;
  readonly action: CedarEntityUid;
  readonly resource: CedarEntityUid;
  readonly context: Readonly<Record<string, CedarValue>>;
  readonly entities: ReadonlyArray<CedarEntity>;
  readonly policies: string;
  readonly schema?: CedarSchema;
}
```

REQUIREMENT (CD-PORT-011): The `CedarEntityUid` MUST be a pair of entity type and entity ID, both strings.

```ts
interface CedarEntityUid {
  readonly type: string;
  readonly id: string;
}
```

REQUIREMENT (CD-PORT-012): The `CedarEntity` MUST contain an UID, a record of attributes, and an array of parent entity UIDs representing the entity hierarchy.

```ts
interface CedarEntity {
  readonly uid: CedarEntityUid;
  readonly attrs: Readonly<Record<string, CedarValue>>;
  readonly parents: ReadonlyArray<CedarEntityUid>;
}
```

REQUIREMENT (CD-PORT-013): The `CedarValue` type MUST support Cedar's value types: string, number (long), boolean, entity reference, set, record, extension types (ip, decimal).

```ts
type CedarValue =
  | string
  | number
  | boolean
  | CedarEntityUid
  | ReadonlyArray<CedarValue>
  | Readonly<Record<string, CedarValue>>
  | CedarExtensionValue;

interface CedarExtensionValue {
  readonly __extn: {
    readonly fn: "ip" | "decimal";
    readonly arg: string;
  };
}
```

---

## Authorization Response

REQUIREMENT (CD-PORT-020): The `CedarAuthorizationResponse` MUST contain a `decision` field with value `"allow"` or `"deny"`.

REQUIREMENT (CD-PORT-021): The `CedarAuthorizationResponse` MUST contain a `diagnostics` field with the set of policy IDs that contributed to the decision and any errors encountered during evaluation.

```ts
interface CedarAuthorizationResponse {
  readonly decision: "allow" | "deny";
  readonly diagnostics: CedarDiagnostics;
}

interface CedarDiagnostics {
  readonly reason: ReadonlyArray<string>;
  readonly errors: ReadonlyArray<CedarPolicyError>;
}

interface CedarPolicyError {
  readonly policyId: string;
  readonly error: string;
}
```

REQUIREMENT (CD-PORT-022): When the Cedar engine encounters an error in a policy condition, that policy MUST be skipped (not treated as permit or forbid). This follows Cedar's skip-on-error semantics.

---

## Validation Result

REQUIREMENT (CD-PORT-030): The `CedarValidationResult` MUST indicate whether validation passed and include any validation notes (warnings or errors).

```ts
interface CedarValidationResult {
  readonly valid: boolean;
  readonly notes: ReadonlyArray<CedarValidationNote>;
}

interface CedarValidationNote {
  readonly severity: "warning" | "error";
  readonly policyId?: string;
  readonly message: string;
}
```

---

## Port Factory

REQUIREMENT (CD-PORT-040): The `createCedarEngine` factory MUST return `Result<CedarEnginePort, CedarEngineCreationError>`. The factory accepts a `CedarEngineConfig` with optional schema and policy text.

```ts
function createCedarEngine(
  config?: CedarEngineConfig
): Result<CedarEnginePort, CedarEngineCreationError>;

interface CedarEngineConfig {
  readonly schema?: CedarSchema;
  readonly policies?: string;
  readonly validateOnLoad?: boolean; // default: true
}
```

REQUIREMENT (CD-PORT-041): When `validateOnLoad` is `true` (default), the factory MUST validate policies against the schema at creation time. If validation fails, the factory MUST return `Err(CedarEngineCreationError)` with tag `"schema-validation-failed"`.

REQUIREMENT (CD-PORT-042): The factory MUST initialize the Cedar WASM module. If WASM initialization fails, the factory MUST return `Err(CedarEngineCreationError)` with tag `"wasm-init-failed"`.
