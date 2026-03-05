# 05 — Schema Management

Cedar schemas define the type system for entities, actions, and their attributes. The adapter manages schema loading, validation, and enforcement.

---

## Cedar Schema Format

REQUIREMENT (CD-SCH-001): The adapter MUST support Cedar schemas in JSON format as defined by the Cedar specification.

```ts
interface CedarSchema {
  readonly [namespace: string]: CedarNamespaceSchema;
}

interface CedarNamespaceSchema {
  readonly entityTypes?: Readonly<Record<string, CedarEntityTypeSchema>>;
  readonly actions?: Readonly<Record<string, CedarActionSchema>>;
  readonly commonTypes?: Readonly<Record<string, CedarTypeSchema>>;
}

interface CedarEntityTypeSchema {
  readonly memberOfTypes?: ReadonlyArray<string>;
  readonly shape?: CedarRecordTypeSchema;
}

interface CedarActionSchema {
  readonly appliesTo?: {
    readonly principalTypes?: ReadonlyArray<string>;
    readonly resourceTypes?: ReadonlyArray<string>;
    readonly context?: CedarRecordTypeSchema;
  };
  readonly memberOf?: ReadonlyArray<{
    readonly id: string;
    readonly type?: string;
  }>;
}
```

REQUIREMENT (CD-SCH-002): The adapter MUST support the Cedar type schema for entity attributes:

```ts
type CedarTypeSchema =
  | { readonly type: "String" }
  | { readonly type: "Long" }
  | { readonly type: "Boolean" }
  | { readonly type: "Set"; readonly element: CedarTypeSchema }
  | { readonly type: "Record"; readonly attributes: Readonly<Record<string, CedarAttributeSchema>> }
  | { readonly type: "Entity"; readonly name: string }
  | { readonly type: "Extension"; readonly name: "ipaddr" | "decimal" };

interface CedarRecordTypeSchema {
  readonly type: "Record";
  readonly attributes: Readonly<Record<string, CedarAttributeSchema>>;
}

interface CedarAttributeSchema {
  readonly type: CedarTypeSchema;
  readonly required?: boolean; // default: true
}
```

---

## Schema Loading

REQUIREMENT (CD-SCH-010): The `loadSchema` function MUST accept a Cedar schema as a JSON object or a JSON string and return `Result<CedarSchema, CedarSchemaError>`.

```ts
function loadSchema(input: string | CedarSchema): Result<CedarSchema, CedarSchemaError>;
```

REQUIREMENT (CD-SCH-011): When the input is a string, the function MUST parse it as JSON. If parsing fails, it MUST return `Err(CedarSchemaError)` with tag `"parse-failed"`.

REQUIREMENT (CD-SCH-012): The loaded schema MUST be frozen (`Object.freeze` deep). Schema objects are immutable after loading.

---

## Schema Validation

REQUIREMENT (CD-SCH-020): The `validatePoliciesAgainstSchema` function MUST validate a set of Cedar policies against a schema, checking that:

1. All entity types referenced in policies are defined in the schema
2. All attributes accessed in policy conditions are defined for the referenced entity type
3. All actions referenced in policies are defined in the schema
4. Principal and resource types in policy scopes match the action's `appliesTo` constraints

```ts
function validatePoliciesAgainstSchema(
  policies: string,
  schema: CedarSchema
): Result<CedarValidationResult, CedarEngineError>;
```

REQUIREMENT (CD-SCH-021): Validation MUST be delegated to the Cedar WASM engine's built-in validator. The adapter MUST NOT implement its own validation logic — Cedar's validator is authoritative.

REQUIREMENT (CD-SCH-022): Validation warnings MUST be surfaced in the `CedarValidationResult.notes` array but MUST NOT cause validation failure. Only validation errors cause failure.

---

## Schema-Entity Compatibility

REQUIREMENT (CD-SCH-030): When a schema is loaded, the entity mapper MUST verify that the `EntityMappingConfig` is compatible with the schema:

- `principalType` must be defined as an entity type in the schema
- `roleType` must be defined as an entity type in the schema
- `actionType` must have corresponding actions defined in the schema
- `defaultResourceType` (if set) must be defined as an entity type in the schema

```ts
function validateMappingConfig(
  config: EntityMappingConfig,
  schema: CedarSchema
): Result<void, SchemaConfigMismatchError>;
```

REQUIREMENT (CD-SCH-031): If the mapping config is incompatible with the schema, `validateMappingConfig` MUST return `Err(SchemaConfigMismatchError)` listing all incompatibilities. This is a fail-fast check at adapter creation time, not at each evaluation.
