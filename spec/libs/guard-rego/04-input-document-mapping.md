# 04 — Input Document Mapping

This chapter specifies how Guard's `EvaluationContext` is translated into an OPA input document. The input document is the primary data channel between the adapter and Rego policies.

---

## Guard Subject to OPA Input

REQUIREMENT (RG-INP-001): The `mapSubjectToInput` function MUST convert a Guard `AuthSubject` into an OPA input `subject` object with the following fields:

```ts
interface OpaInputSubject {
  readonly id: string;
  readonly roles: ReadonlyArray<string>;
  readonly permissions: ReadonlyArray<string>; // Set converted to sorted array
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly authenticationMethod: string;
  readonly authenticatedAt: string;
  readonly identityProvider?: string;
  readonly sessionId?: string;
}
```

REQUIREMENT (RG-INP-002): The `AuthSubject.permissions` Set MUST be converted to a sorted string array for JSON serialization determinism. Sorting ensures that the same permission set always produces the same JSON, enabling OPA decision caching.

REQUIREMENT (RG-INP-003): All `AuthSubject` fields MUST be mapped directly to the input subject. No fields are omitted or renamed by default. The one-to-one mapping ensures Rego policies can access any subject property via `input.subject.<field>`.

---

## Guard Resource to OPA Input

REQUIREMENT (RG-INP-010): The `mapResourceToInput` function MUST pass the Guard resource record directly as the OPA input `resource` object.

```ts
function mapResourceToInput(
  resource: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> | undefined;
```

REQUIREMENT (RG-INP-011): If the resource is `undefined`, the OPA input MUST NOT include a `resource` field. Rego policies can check for resource existence via `input.resource`.

REQUIREMENT (RG-INP-012): Resource values MUST be JSON-serializable. If a resource value is not JSON-serializable (e.g., contains functions, symbols, or circular references), the adapter MUST omit that field and record a warning.

---

## Action Mapping

REQUIREMENT (RG-INP-020): The `action` string from `regoPolicy()` MUST be included in the OPA input as `input.action`.

REQUIREMENT (RG-INP-021): The action string is opaque to the adapter — it is not parsed, validated, or transformed. Rego policies interpret the action string according to their own conventions.

---

## Input Document Construction

REQUIREMENT (RG-INP-030): The `buildInputDocument` function MUST construct the complete OPA input document from the Guard evaluation context.

```ts
function buildInputDocument(
  subject: AuthSubject,
  resource: Readonly<Record<string, unknown>> | undefined,
  action: string,
  additionalInput?: Readonly<Record<string, unknown>>
): OpaInputDocument;

interface OpaInputDocument {
  readonly subject: OpaInputSubject;
  readonly resource?: Readonly<Record<string, unknown>>;
  readonly action: string;
  readonly [key: string]: unknown; // additional input fields
}
```

REQUIREMENT (RG-INP-031): The input document MUST follow this exact top-level shape:

- `input.subject` — the mapped subject
- `input.resource` — the mapped resource (if present)
- `input.action` — the action string
- Additional fields from `additionalInput` are spread at the top level

REQUIREMENT (RG-INP-032): The `additionalInput` fields MUST NOT override the `subject`, `resource`, or `action` fields. If `additionalInput` contains a key that conflicts with these reserved names, the adapter MUST ignore the conflicting key and record a warning.

REQUIREMENT (RG-INP-033): The input document MUST be deeply frozen after construction. This prevents accidental mutation between construction and serialization.

REQUIREMENT (RG-INP-034): The input document MUST be deterministically serializable. Given the same `AuthSubject`, resource, and action, the adapter MUST produce identical JSON bytes. This is achieved by:

1. Sorting `permissions` arrays (RG-INP-002)
2. Using stable key ordering for objects (insertion order is stable in ES2015+)
3. Omitting `undefined` values

---

## Input Document Examples

### Minimal (no resource, no additional input)

```json
{
  "subject": {
    "id": "alice",
    "roles": ["admin"],
    "permissions": ["documents:read", "documents:write"],
    "attributes": {},
    "authenticationMethod": "oidc",
    "authenticatedAt": "2026-02-23T10:00:00Z"
  },
  "action": "read"
}
```

### Full (resource + additional context)

```json
{
  "subject": {
    "id": "bob",
    "roles": ["viewer"],
    "permissions": ["documents:read"],
    "attributes": {
      "department": "engineering",
      "clearanceLevel": 2
    },
    "authenticationMethod": "oidc",
    "authenticatedAt": "2026-02-23T10:00:00Z",
    "identityProvider": "okta",
    "sessionId": "sess-abc123"
  },
  "resource": {
    "id": "doc-42",
    "__type": "Document",
    "classification": "confidential",
    "ownerId": "alice"
  },
  "action": "read",
  "environment": {
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0"
  }
}
```
