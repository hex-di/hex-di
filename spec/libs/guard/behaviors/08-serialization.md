# 09 - Serialization

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-09                                 |
> | Revision         | 1.1                                      |
> | Effective Date   | 2026-02-19                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Functional Specification             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-13): Initial controlled release |

> |                  | 1.1 (2026-02-19): Added BEH-GD-NNN requirement identifiers to section headings (CCR-GUARD-020) |
_Previous: [08 - Port Gate Hook](./07-port-gate-hook.md)_

---

## BEH-GD-032: serializePolicy (§31)

> **Invariant:** [INV-GD-009](../invariants.md) — Policy Serialization Round-Trip
> **DoD:** [DoD 8: Policy Serialization](../16-definition-of-done.md#dod-8-policy-serialization)

Converts a policy tree to a deterministic JSON string. Every Policy variant has a well-defined JSON representation. The output is stable -- the same policy always produces the same JSON string, enabling content-based equality checks and caching.

### Signature

```typescript
/**
 * Serializes a policy tree to a deterministic JSON string.
 *
 * Every Policy variant has a unique JSON representation keyed by the
 * `kind` discriminant. Composite policies (allOf, anyOf, not) serialize
 * their children recursively. Permission names are formatted as
 * `"resource:action"` strings.
 *
 * Round-trip guarantee:
 *   deserializePolicy(serializePolicy(p)) structurally equals p
 *
 * @param policy - The policy to serialize
 * @returns A deterministic JSON string
 */
function serializePolicy(policy: PolicyConstraint): string;
```

### JSON Schema by Policy Kind

| Policy Kind            | JSON Shape                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `hasPermission`        | `{ "kind": "hasPermission", "permission": "resource:action", "fields": ["name", "email"] }`         |
| `hasRole`              | `{ "kind": "hasRole", "roleName": "admin" }`                                                        |
| `hasAttribute`         | `{ "kind": "hasAttribute", "attribute": "isOwner", "matcher": { ... }, "fields": ["salary"] }`      |
| `hasResourceAttribute` | `{ "kind": "hasResourceAttribute", "attribute": "status", "matcher": { ... } }`                     |
| `hasSignature`         | `{ "kind": "hasSignature", "meaning": "approved", "signerRole": "reviewer" }`                       |
| `hasRelationship`      | `{ "kind": "hasRelationship", "relation": "owner", "resourceType": "document", "depth": 2 }`       |
| `allOf`                | `{ "kind": "allOf", "policies": [ ... ], "fieldStrategy": "union" }`                                |
| `anyOf`                | `{ "kind": "anyOf", "policies": [ ... ], "fieldStrategy": "union" }`                                |
| `not`                  | `{ "kind": "not", "policy": { ... } }`                                                              |
| `labeled`              | `{ "kind": "labeled", "label": "ContentPublishPolicy", "policy": { ... } }`                         |

> **Note:** The `fields` property is optional on `hasPermission` and `hasAttribute`. When omitted, no field restriction is applied (all fields visible). When present, it must be a non-empty array of non-empty strings.

> **Note:** The `fieldStrategy` property is optional on `allOf` and `anyOf`. When omitted, the default strategy is used ("intersection" for allOf, "first" for anyOf). When present, it must be one of `"intersection"`, `"union"`, or `"first"`. Omitted from JSON output when using the default value.

### Usage

```typescript
import { serializePolicy, hasPermission, allOf, hasRole } from "@hex-di/guard";

const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);

const policy = allOf(hasPermission(UserPerms.read), hasRole("admin"));

const json = serializePolicy(policy);
// '{"kind":"allOf","policies":[{"kind":"hasPermission","permission":"user:read"},{"kind":"hasRole","roleName":"admin"}]}'
```

### Permission Serialization

Permission tokens are serialized as their `"resource:action"` string representation. The branded phantom types are not present in the JSON output -- they are reconstructed by `deserializePolicy` based on the resource and action strings.

```typescript
const perm = createPermission({ resource: "user", action: "read" });
const json = serializePolicy(hasPermission(perm));
// '{"kind":"hasPermission","permission":"user:read"}'
```

### Composite Policy Serialization

Composite policies serialize their children recursively. The order of children in `allOf` and `anyOf` is preserved to maintain determinism:

```typescript
const complex = anyOf(allOf(hasPermission(UserPerms.read), hasRole("editor")), hasRole("admin"));

const json = serializePolicy(complex);
// Produces deterministic nested JSON:
// {
//   "kind": "anyOf",
//   "policies": [
//     {
//       "kind": "allOf",
//       "policies": [
//         { "kind": "hasPermission", "permission": "user:read" },
//         { "kind": "hasRole", "roleName": "editor" }
//       ]
//     },
//     { "kind": "hasRole", "roleName": "admin" }
//   ]
// }
```

### HasAttribute Serialization

`hasAttribute` policies serialize the attribute name and the matcher DSL. The matcher uses the minimal matcher set defined in the architecture review:

```typescript
const ownerPolicy = hasAttribute("ownerId", eq(subject("id")));
const json = serializePolicy(ownerPolicy);
// {
//   "kind": "hasAttribute",
//   "attribute": "ownerId",
//   "matcher": {
//     "kind": "eq",
//     "ref": { "kind": "subject", "path": "id" }
//   }
// }
```

### HasSignature Serialization

`hasSignature` policies serialize the meaning and the optional signer role:

```typescript
const approvalPolicy = hasSignature("approved", { signerRole: "reviewer" });
const json = serializePolicy(approvalPolicy);
// {
//   "kind": "hasSignature",
//   "meaning": "approved",
//   "signerRole": "reviewer"
// }

const simpleSignature = hasSignature("authored");
const json2 = serializePolicy(simpleSignature);
// {
//   "kind": "hasSignature",
//   "meaning": "authored"
// }
```

Deserialization validates that `meaning` is a non-empty string and `signerRole` (if present) is a string. The `signerRole` field is optional and omitted from JSON output when not specified.

### HasRelationship Serialization

`hasRelationship` policies serialize the relation and optional resourceType, depth, and fields:

```typescript
// Full form with all options
const ownerPolicy = hasRelationship("owner", {
  resourceType: "document",
  depth: 2,
  fields: ["title", "content"],
});
const json = serializePolicy(ownerPolicy);
// {
//   "kind": "hasRelationship",
//   "relation": "owner",
//   "resourceType": "document",
//   "depth": 2,
//   "fields": ["title", "content"]
// }

// Minimal form (direct relationship, no field restriction)
const viewerPolicy = hasRelationship("viewer");
const json2 = serializePolicy(viewerPolicy);
// {
//   "kind": "hasRelationship",
//   "relation": "viewer"
// }
```

Deserialization validates that `relation` is a non-empty string. `resourceType` (if present) must be a non-empty string. `depth` (if present) must be a positive integer. `fields` follows the same validation as other field arrays (non-empty strings). Optional fields are omitted from JSON output when not specified. `depth: 1` is the default and is omitted from serialization.

### HasPermission with Fields Serialization

```typescript
const policy = hasPermission(UserPerms.read, { fields: ["name", "email"] });
const json = serializePolicy(policy);
// {
//   "kind": "hasPermission",
//   "permission": "user:read",
//   "fields": ["name", "email"]
// }
```

When `fields` is undefined or not specified, the `fields` key is omitted from the JSON output entirely.

### HasAttribute with Fields Serialization

```typescript
const policy = hasAttribute("department", eq(subject("department")), { fields: ["salary"] });
const json = serializePolicy(policy);
// {
//   "kind": "hasAttribute",
//   "attribute": "department",
//   "matcher": { "kind": "eq", "ref": { "kind": "subject", "path": "department" } },
//   "fields": ["salary"]
// }
```

### fieldMatch Matcher Serialization

The `fieldMatch` matcher kind serializes its fields array and reference:

```typescript
const policy = hasAttribute("accessLevel", fieldMatch(["name", "dob"], subject("clearanceFields")));
const json = serializePolicy(policy);
// {
//   "kind": "hasAttribute",
//   "attribute": "accessLevel",
//   "matcher": {
//     "kind": "fieldMatch",
//     "fields": ["name", "dob"],
//     "ref": { "kind": "subject", "path": "clearanceFields" }
//   }
// }
```

### Numeric Comparison Matcher Serialization (gte, lt)

The `gte` and `lt` matcher kinds serialize their reference:

```typescript
const policy = allOf(
  hasAttribute("currentHour", gte(literal(8))),
  hasAttribute("currentHour", lt(literal(17)))
);
const json = serializePolicy(policy);
// {
//   "kind": "allOf",
//   "policies": [
//     {
//       "kind": "hasAttribute",
//       "attribute": "currentHour",
//       "matcher": { "kind": "gte", "ref": { "kind": "literal", "value": 8 } }
//     },
//     {
//       "kind": "hasAttribute",
//       "attribute": "currentHour",
//       "matcher": { "kind": "lt", "ref": { "kind": "literal", "value": 17 } }
//     }
//   ]
// }
```

Deserialization validates that `gte` and `lt` matchers have a valid `ref` with a numeric value. Non-numeric references produce `PolicyParseError` with category `"schema_mismatch"` and a message indicating that comparison matchers require numeric references.

### Fields Deserialization Validation

When deserializing, the `fields` property (if present) must be an array of non-empty strings. Invalid entries produce `PolicyParseError` with category `"schema_mismatch"`:

```typescript
// Empty string in fields array
const bad = deserializePolicy('{"kind":"hasPermission","permission":"user:read","fields":["",""]}');
// Err({ code: "ACL007", message: "Invalid fields entry: empty string", category: "schema_mismatch", ... })

// Non-string in fields array
const bad2 = deserializePolicy('{"kind":"hasPermission","permission":"user:read","fields":[42]}');
// Err({ code: "ACL007", message: "Invalid fields entry: expected string, got number", category: "schema_mismatch", ... })
```

### Array Matcher Serialization (someMatch, contains, everyMatch, size)

The array matchers serialize their nested structure as plain JSON. `ObjectMatcher` serializes as `{ [key]: serializedMatcherExpression }`.

```typescript
// someMatch: check if any scope covers country + brand + indication
const policy = hasAttribute('scopes', someMatch({
  country:     eq(resource('country')),
  brand:       eq(resource('brand')),
  indications: contains(resource('indication')),
}))
const json = serializePolicy(policy)
// {
//   "kind": "hasAttribute",
//   "attribute": "scopes",
//   "matcher": {
//     "kind": "someMatch",
//     "matcher": {
//       "country":     { "kind": "eq", "ref": { "kind": "resource", "path": "country" } },
//       "brand":       { "kind": "eq", "ref": { "kind": "resource", "path": "brand" } },
//       "indications": { "kind": "contains", "ref": { "kind": "resource", "path": "indication" } }
//     }
//   }
// }

// everyMatch: all reviewers must be certified
const reviewerPolicy = hasAttribute('reviewers', everyMatch({ certified: eq(literal(true)) }))
// {
//   "kind": "hasAttribute",
//   "attribute": "reviewers",
//   "matcher": {
//     "kind": "everyMatch",
//     "matcher": {
//       "certified": { "kind": "eq", "ref": { "kind": "literal", "value": true } }
//     }
//   }
// }

// size: at least 2 reviewers required
const minReviewers = hasAttribute('reviewers', size(gte(literal(2))))
// {
//   "kind": "hasAttribute",
//   "attribute": "reviewers",
//   "matcher": {
//     "kind": "size",
//     "matcher": { "kind": "gte", "ref": { "kind": "literal", "value": 2 } }
//   }
// }
```

Deserialization validates that `someMatch` and `everyMatch` matchers have a `matcher` object whose values are valid `MatcherExpression` objects. The `contains` matcher must have a valid `ref`. The `size` matcher must have a valid inner `matcher` expression. Unknown keys in `ObjectMatcher` produce `PolicyParseError` with category `"schema_mismatch"`.

### HasResourceAttribute Serialization

`hasResourceAttribute` policies serialize identically to `hasAttribute` but with a different `kind`:

```typescript
const statusPolicy = hasResourceAttribute('status', eq(literal('approved')))
const json = serializePolicy(statusPolicy)
// {
//   "kind": "hasResourceAttribute",
//   "attribute": "status",
//   "matcher": { "kind": "eq", "ref": { "kind": "literal", "value": "approved" } }
// }

// With fields restriction
const withFields = hasResourceAttribute('status', eq(literal('approved')), { fields: ['title'] })
// { "kind": "hasResourceAttribute", "attribute": "status", "matcher": { ... }, "fields": ["title"] }
```

Deserialization validates `attribute` (non-empty string) and `matcher` (valid MatcherExpression) identically to `hasAttribute`. The optional `fields` array follows the same validation.

### LabeledPolicy Serialization

`labeled` policies serialize the label string and the inner policy recursively:

```typescript
const labeled = withLabel('ContentPublishPolicy', allOf(
  hasPermission(ContentPerms.publish),
  scopeGate,
))
const json = serializePolicy(labeled)
// {
//   "kind": "labeled",
//   "label": "ContentPublishPolicy",
//   "policy": {
//     "kind": "allOf",
//     "policies": [ ... ]
//   }
// }
```

Deserialization validates that `label` is a non-empty string (empty string produces `PolicyParseError` with category `"schema_mismatch"`) and `policy` is a valid nested `PolicyConstraint`.

### FieldStrategy Serialization

The `fieldStrategy` property on `allOf` and `anyOf` is serialized as a plain string. When the value is the default for that combinator, it is omitted from the JSON output to minimize payload size:

```typescript
// allOf with non-default fieldStrategy
const unionAllOf = allOf(
  hasPermission(UserPerms.read, { fields: ["name"] }),
  hasAttribute("department", eq(subject("department")), { fields: ["salary"] }),
  { fieldStrategy: "union" }
);
const json = serializePolicy(unionAllOf);
// {
//   "kind": "allOf",
//   "policies": [
//     { "kind": "hasPermission", "permission": "user:read", "fields": ["name"] },
//     { "kind": "hasAttribute", "attribute": "department",
//       "matcher": { "kind": "eq", "ref": { "kind": "subject", "path": "department" } },
//       "fields": ["salary"] }
//   ],
//   "fieldStrategy": "union"
// }

// allOf with default fieldStrategy (omitted from output)
const defaultAllOf = allOf(hasPermission(UserPerms.read), hasRole("admin"));
const json2 = serializePolicy(defaultAllOf);
// { "kind": "allOf", "policies": [ ... ] }
// (no "fieldStrategy" key — default "intersection" is implied)

// anyOf with non-default fieldStrategy
const unionAnyOf = anyOf(
  hasPermission(UserPerms.read, { fields: ["name", "email"] }),
  hasRole("admin"),
  { fieldStrategy: "union" }
);
const json3 = serializePolicy(unionAnyOf);
// {
//   "kind": "anyOf",
//   "policies": [ ... ],
//   "fieldStrategy": "union"
// }
```

### FieldStrategy Deserialization Validation

When deserializing, the `fieldStrategy` property (if present) must be one of `"intersection"`, `"union"`, or `"first"`. Invalid values produce `PolicyParseError` with category `"schema_mismatch"`:

```typescript
// Invalid fieldStrategy value
const bad = deserializePolicy('{"kind":"allOf","policies":[],"fieldStrategy":"invalid"}');
// Err({ code: "ACL007", message: "Invalid fieldStrategy: 'invalid' (must be 'intersection', 'union', or 'first')", category: "schema_mismatch", ... })

// fieldStrategy on non-composite policy (ignored during deserialization)
const ignored = deserializePolicy('{"kind":"hasPermission","permission":"user:read","fieldStrategy":"union"}');
// Ok(HasPermissionPolicy) — fieldStrategy is silently ignored on leaf policies
```

### Determinism Guarantee

`serializePolicy` produces identical output for structurally identical policies. Object keys are always emitted in the same order (`kind` first, then alphabetical). This enables:

- Content-based policy comparison: `serializePolicy(a) === serializePolicy(b)`
- Cache keys: Use the serialized string as a map key
- Snapshot testing: `expect(serializePolicy(policy)).toMatchInlineSnapshot(...)`

---

## BEH-GD-033: deserializePolicy (§32)

Parses a JSON string back into a Policy data structure. Returns `Result<Policy, PolicyParseError>` to handle malformed input safely.

### Signature

```typescript
/**
 * Deserializes a JSON string into a Policy data structure.
 *
 * Validates the `kind` discriminant against known variants:
 * hasPermission, hasRole, hasAttribute, hasResourceAttribute,
 * hasSignature, hasRelationship, allOf, anyOf, not, labeled.
 * Returns `Err` for:
 * - Unknown `kind` values
 * - Malformed JSON structure
 * - Missing required fields
 * - Invalid permission format (not "resource:action")
 * - Empty label string on labeled policies
 *
 * @param json - The JSON string to parse
 * @returns Result containing the deserialized Policy or a parse error
 */
function deserializePolicy(json: string): Result<Policy, PolicyParseError>;
```

### PolicyParseError

```typescript
/**
 * Error returned when policy deserialization fails.
 */
interface PolicyParseError {
  /** Error code for programmatic handling. */
  readonly code: "ACL007";
  /** Human-readable error description. */
  readonly message: string;
  /** JSON path to the problematic node (e.g., ".policies[0].kind"). */
  readonly path: string;
  /** The value that caused the error. */
  readonly value: unknown;
  /** Error category for programmatic handling. */
  readonly category:
    | "invalid_json"
    | "unknown_kind"
    | "missing_field"
    | "invalid_format"
    | "schema_mismatch"
    | "input_too_large"
    | "max_depth_exceeded";
}
```

### Usage

```typescript
import { deserializePolicy, serializePolicy, hasPermission } from "@hex-di/guard";

const UserPerms = createPermissionGroup("user", ["read", "write"]);

// Round-trip: serialize then deserialize
const original = hasPermission(UserPerms.read);
const json = serializePolicy(original);
const result = deserializePolicy(json);

if (result.isOk()) {
  const restored = result.value;
  // restored is structurally identical to original
  // restored.kind === "hasPermission"
  // restored.permission.resource === "user"
  // restored.permission.action === "read"
}
```

### Error Cases

```typescript
// Unknown kind
const bad1 = deserializePolicy('{"kind":"xor","policies":[]}');
// Err({ message: "Unknown policy kind: 'xor'", path: ".kind", ... })

// Missing field
const bad2 = deserializePolicy('{"kind":"hasPermission"}');
// Err({ message: "Missing required field: 'permission'", path: ".permission", ... })

// Invalid JSON
const bad3 = deserializePolicy("not valid json");
// Err({ message: "Invalid JSON", path: "", category: "invalid_json", ... })

// Invalid permission format
const bad4 = deserializePolicy('{"kind":"hasPermission","permission":"nocolon"}');
// Err({ message: "Invalid permission format: expected 'resource:action'", path: ".permission", ... })
```

### Input Safety Limits

```
REQUIREMENT: deserializePolicy() MUST reject inputs whose byte length exceeds 1 MB
             (1,048,576 bytes) BEFORE attempting JSON parsing. The rejection MUST
             produce a PolicyParseError with category "input_too_large", code "ACL007",
             and a message indicating the input size and the 1 MB limit. This prevents
             denial-of-service via oversized policy payloads.
             Reference: OWASP Input Validation, EU GMP Annex 11 §7.
```

```
REQUIREMENT: deserializePolicy() MUST enforce a maximum recursion depth of 50 levels
             when traversing nested composite policies (allOf, anyOf, not). If the
             input exceeds this depth, deserialization MUST fail with a PolicyParseError
             with category "max_depth_exceeded", code "ACL007", and a message indicating
             the depth at which the limit was hit. This prevents stack exhaustion
             from deeply nested or adversarially crafted policy JSON.
             Reference: OWASP Input Validation.
```

```
RECOMMENDED: Implementations SHOULD apply Unicode NFC normalization to string values
             (permission names, role names, attribute paths) before serialization.
             This ensures that policies containing equivalent Unicode representations
             produce identical serialized forms, preserving the determinism guarantee
             (section 31). Deserialization SHOULD likewise normalize input strings
             to NFC before comparison.
             Reference: Unicode Technical Report #15 (UAX #15).
```

### Schema Versioning

The serialization format includes an optional `version` field at the root level for forward compatibility. If absent, version 1 is assumed:

```typescript
// Future: version 2 might add new policy kinds
const v2Json = '{"version":2,"kind":"rateLimit","maxPerMinute":100}';
const result = deserializePolicy(v2Json);
// Err if current library does not support version 2 kinds
```

### Deserialized Permissions

Deserialized permissions are reconstructed as fresh `Permission` objects via `createPermission`. They are structurally compatible with any permission of the same resource and action, following the structural typing decision from the type system design:

```typescript
const result = deserializePolicy('{"kind":"hasPermission","permission":"user:read"}');
if (result.isOk()) {
  const policy = result.value;
  // policy.permission is a fresh Permission<"user", "read">
  // It is structurally compatible with any other Permission<"user", "read">
}
```

---

## BEH-GD-034: explainPolicy (§33)

Produces a human-readable explanation of why a policy passed or failed for a given subject. Used for audit logs, debugging, and DevTools display.

### Signature

```typescript
/**
 * Produces a human-readable explanation of a policy evaluation.
 *
 * Walks the evaluation trace tree and constructs a multi-line
 * explanation string showing which sub-policies passed or failed
 * and why.
 *
 * @param policy - The policy that was evaluated
 * @param subject - The subject it was evaluated against
 * @returns A human-readable explanation string
 */
function explainPolicy(policy: PolicyConstraint, subject: AuthSubject): string;
```

### Usage

```typescript
import { explainPolicy, allOf, hasPermission, hasRole } from "@hex-di/guard";

const UserPerms = createPermissionGroup("user", ["read", "write", "delete"]);

const policy = allOf(hasPermission(UserPerms.read), hasPermission(UserPerms.delete));

const viewer = createTestSubject({
  id: "viewer-1",
  permissions: [UserPerms.read],
});

const explanation = explainPolicy(policy, viewer);
// "DENY: allOf failed because hasPermission(user:delete) failed
//  -- subject 'viewer-1' does not have permission 'user:delete'"
```

### Output Format

The explanation follows a consistent format:

```
{VERDICT}: {policyKind} {passed|failed} [because {child explanation}]
  -- {detail about subject}
```

For composite policies, child explanations are indented:

```typescript
const complex = allOf(
  hasPermission(UserPerms.read),
  anyOf(hasRole("admin"), hasPermission(UserPerms.delete))
);

const explanation = explainPolicy(complex, viewer);
// "DENY: allOf failed
//   ALLOW: hasPermission(user:read) passed -- subject 'viewer-1' has permission 'user:read'
//   DENY: anyOf failed -- no child policy passed
//     DENY: hasRole('admin') failed -- subject 'viewer-1' does not have role 'admin'
//     DENY: hasPermission(user:delete) failed -- subject 'viewer-1' does not have permission 'user:delete'"
```

### Single Policy Explanation

For leaf policies, the explanation is a single line:

```typescript
explainPolicy(hasPermission(UserPerms.read), viewer);
// "ALLOW: hasPermission(user:read) passed -- subject 'viewer-1' has permission 'user:read'"

explainPolicy(hasRole("admin"), viewer);
// "DENY: hasRole('admin') failed -- subject 'viewer-1' does not have role 'admin'"
```

### HasSignature Policy Explanation

```typescript
const approvalPolicy = hasSignature("approved", { signerRole: "reviewer" });

// When signature is present and valid:
explainPolicy(approvalPolicy, reviewer);
// "ALLOW: hasSignature('approved') passed -- signature with meaning 'approved' validated, signer has role 'reviewer'"

// When no signature provided:
explainPolicy(approvalPolicy, viewer);
// "DENY: hasSignature('approved') failed -- no signature provided for required meaning 'approved'"

// When signature meaning mismatch:
// "DENY: hasSignature('approved') failed -- signature meaning 'authored' does not match required 'approved'"
```

### Not Policy Explanation

The `not` combinator inverts the explanation:

```typescript
const notAdmin = not(hasRole("admin"));

explainPolicy(notAdmin, viewer);
// "ALLOW: not(hasRole('admin')) passed -- inner policy denied, so not() allows"

explainPolicy(notAdmin, admin);
// "DENY: not(hasRole('admin')) failed -- inner policy allowed, so not() denies"
```

### Use Cases

| Use Case       | How `explainPolicy` Helps                                           |
| -------------- | ------------------------------------------------------------------- |
| Audit logs     | Attach the explanation to structured log entries for compliance     |
| Debugging      | Print the explanation when a guard denies unexpectedly              |
| DevTools       | Display the explanation in the Guard panel alongside the trace tree |
| Error messages | Include in `AccessDeniedError.message` for actionable 403 responses |
| Testing        | Snapshot test the explanation for policy regression detection       |

---

## BEH-GD-035: Audit Entry Serialization (§34)

Audit entries require a formalized serialization/deserialization contract for cross-system export, regulatory review, and independent verification.

### serializeAuditEntry

```typescript
/**
 * Serializes an AuditEntry to a deterministic JSON string.
 *
 * Field ordering is deterministic (alphabetical by key name) to ensure
 * identical entries produce identical serialized output. This is critical
 * for hash chain verification after round-tripping through export/import.
 *
 * @param entry - The audit entry to serialize.
 * @returns A deterministic JSON string representation.
 */
function serializeAuditEntry(entry: AuditEntry): string;
```

### deserializeAuditEntry

```typescript
/**
 * Deserializes a JSON string into an AuditEntry with full validation.
 *
 * Validates:
 * - All required fields are present and correctly typed
 * - schemaVersion is recognized (currently: 1)
 * - evaluationId is a valid UUID v4 format
 * - timestamp is a valid ISO 8601 UTC string
 * - decision is exactly "allow" or "deny"
 * - Field lengths conform to the size limits in 07-guard-adapter.md
 * - Optional fields, when present, are correctly typed
 *
 * @param json - The JSON string to deserialize.
 * @returns Ok(AuditEntry) on success, Err(AuditEntryParseError) on failure.
 */
function deserializeAuditEntry(json: string): Result<AuditEntry, AuditEntryParseError>;
```

```typescript
/**
 * Error returned when audit entry deserialization fails.
 */
interface AuditEntryParseError {
  readonly code: "ACL014";
  readonly message: string;
  /** The field that failed validation, or "root" for structural errors. */
  readonly field: string;
  /** Category of the parse failure. */
  readonly category:
    | "missing_field"
    | "invalid_type"
    | "invalid_format"
    | "unknown_version"
    | "field_too_long"
    | "invalid_json";
}
```

```
REQUIREMENT: serializeAuditEntry followed by deserializeAuditEntry MUST produce a
             structurally equal AuditEntry (round-trip guarantee). Formally:
             for any valid AuditEntry e,
             deserializeAuditEntry(serializeAuditEntry(e)) === Ok(e')
             where e' is structurally equal to e (deep equality on all fields).
             This guarantee is essential for audit trail export/import workflows
             where entries are serialized for transfer and deserialized at the
             destination for independent verification.
             Reference: ALCOA+ Complete, 21 CFR 11.10(b).
```

---

## BEH-GD-036: AuditEntry JSON Schema (§35)

The canonical JSON Schema (2020-12) for serialized audit entries. This schema enables runtime validation of audit entry JSON before deserialization, and serves as the authoritative format specification for cross-system interoperability.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://hex-di.dev/schemas/guard/audit-entry/v1",
  "title": "AuditEntry",
  "description": "A single guard evaluation audit record.",
  "type": "object",
  "required": [
    "evaluationId",
    "timestamp",
    "subjectId",
    "authenticationMethod",
    "policy",
    "decision",
    "portName",
    "scopeId",
    "reason",
    "durationMs",
    "schemaVersion"
  ],
  "properties": {
    "evaluationId": {
      "type": "string",
      "format": "uuid",
      "description": "UUID v4 uniquely identifying this evaluation.",
      "maxLength": 36
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of when the decision was recorded.",
      "maxLength": 30
    },
    "subjectId": {
      "type": "string",
      "description": "The subject's unique identifier.",
      "maxLength": 255
    },
    "authenticationMethod": {
      "type": "string",
      "description": "How the subject authenticated.",
      "maxLength": 64
    },
    "policy": {
      "type": "string",
      "description": "The policy label that was evaluated.",
      "maxLength": 512
    },
    "decision": {
      "type": "string",
      "enum": ["allow", "deny"],
      "description": "The authorization decision outcome."
    },
    "portName": {
      "type": "string",
      "description": "The port name that was being resolved.",
      "maxLength": 128
    },
    "scopeId": {
      "type": "string",
      "format": "uuid",
      "description": "The scope ID in which the resolution occurred.",
      "maxLength": 36
    },
    "reason": {
      "type": "string",
      "description": "Human-readable reason. Empty string for Allow decisions.",
      "maxLength": 2048
    },
    "durationMs": {
      "type": "number",
      "minimum": 0,
      "description": "Evaluation duration in milliseconds."
    },
    "schemaVersion": {
      "type": "integer",
      "minimum": 1,
      "description": "Schema version of this AuditEntry structure. Current version: 1."
    },
    "traceDigest": {
      "type": "string",
      "maxLength": 4096,
      "description": "Compact digest of the evaluation trace tree."
    },
    "integrityHash": {
      "type": "string",
      "maxLength": 128,
      "description": "Chained hash for tamper detection."
    },
    "previousHash": {
      "type": "string",
      "maxLength": 128,
      "description": "Hash of the previous audit entry. Empty string for genesis."
    },
    "hashAlgorithm": {
      "type": "string",
      "maxLength": 32,
      "description": "Algorithm used to compute integrityHash."
    },
    "sequenceNumber": {
      "type": "integer",
      "minimum": 0,
      "description": "Monotonically increasing sequence number within a scope."
    },
    "policySnapshot": {
      "type": "string",
      "maxLength": 64,
      "description": "Git SHA or content hash of the policy definition."
    },
    "signature": {
      "type": "object",
      "description": "Electronic signature for 21 CFR Part 11 compliance.",
      "required": ["signerId", "signedAt", "meaning", "value", "algorithm"],
      "properties": {
        "signerId": { "type": "string", "maxLength": 255 },
        "signedAt": { "type": "string", "format": "date-time", "maxLength": 30 },
        "meaning": { "type": "string", "maxLength": 64 },
        "value": { "type": "string", "maxLength": 1024 },
        "algorithm": { "type": "string", "maxLength": 32 },
        "signerName": { "type": "string", "maxLength": 255 }
      }
    }
  },
  "additionalProperties": false
}
```

---

## BEH-GD-037: Export Manifest (§36)

Every audit trail export MUST include an `AuditExportManifest` that summarizes the export for independent verification.

```typescript
/**
 * Metadata manifest included with every audit trail export.
 *
 * Recipients verify the manifest checksum and run verifyAuditChain()
 * on the received data before using the export as compliance evidence.
 */
interface AuditExportManifest {
  /** Schema version of this manifest structure. Current version: 1. */
  readonly schemaVersion: number;
  /** ISO 8601 UTC timestamp of when the export was created. */
  readonly exportedAt: string;
  /** Total number of audit entries in the export. */
  readonly entryCount: number;
  /** ISO 8601 UTC timestamp of the earliest entry in the export. */
  readonly firstTimestamp: string;
  /** ISO 8601 UTC timestamp of the latest entry in the export. */
  readonly lastTimestamp: string;
  /** Distinct scope IDs included in the export. */
  readonly scopeIds: ReadonlyArray<string>;
  /** Hash algorithms used across the exported entries. */
  readonly hashAlgorithms: ReadonlyArray<string>;
  /** True if verifyAuditChain() passed for all scopes at export time. */
  readonly chainIntegrityVerified: boolean;
  /** SHA-256 checksum computed over the entire export file (JSON or CSV). */
  readonly manifestChecksum: string;
  /** Export format identifier. */
  readonly exportFormat: "json" | "csv";
}
```

```typescript
/**
 * Creates an export manifest from a set of audit entries.
 *
 * Computes the SHA-256 checksum over the serialized export content,
 * collects scope IDs and hash algorithms, and verifies chain integrity.
 *
 * @param entries - The audit entries being exported.
 * @param exportContent - The serialized export content (JSON or CSV string).
 * @param format - The export format ("json" or "csv").
 * @param clock - ClockSource for the exportedAt timestamp.
 * @returns The export manifest.
 */
function createAuditExportManifest(
  entries: ReadonlyArray<AuditEntry>,
  exportContent: string,
  format: "json" | "csv",
  clock: ClockSource
): AuditExportManifest;
```

### CSV Export Column Specification

When exporting in CSV format, columns MUST follow this order and naming:

| Column # | Header                 | AuditEntry Field       | Notes                     |
| -------- | ---------------------- | ---------------------- | ------------------------- |
| 1        | `evaluationId`         | `evaluationId`         | UUID v4                   |
| 2        | `timestamp`            | `timestamp`            | ISO 8601 UTC              |
| 3        | `subjectId`            | `subjectId`            |                           |
| 4        | `authenticationMethod` | `authenticationMethod` |                           |
| 5        | `policy`               | `policy`               |                           |
| 6        | `decision`             | `decision`             | `allow` or `deny`         |
| 7        | `portName`             | `portName`             |                           |
| 8        | `scopeId`              | `scopeId`              | UUID v4                   |
| 9        | `reason`               | `reason`               | Empty for allow           |
| 10       | `durationMs`           | `durationMs`           | Numeric                   |
| 11       | `schemaVersion`        | `schemaVersion`        | Integer                   |
| 12       | `traceDigest`          | `traceDigest`          | Optional; empty if absent |
| 13       | `integrityHash`        | `integrityHash`        | Optional; empty if absent |
| 14       | `previousHash`         | `previousHash`         | Optional; empty if absent |
| 15       | `hashAlgorithm`        | `hashAlgorithm`        | Optional; empty if absent |
| 16       | `sequenceNumber`       | `sequenceNumber`       | Optional; empty if absent |
| 17       | `policySnapshot`       | `policySnapshot`       | Optional; empty if absent |
| 18       | `signature.signerId`   | `signature.signerId`   | Optional; empty if absent |
| 19       | `signature.signedAt`   | `signature.signedAt`   | Optional; empty if absent |
| 20       | `signature.meaning`    | `signature.meaning`    | Optional; empty if absent |
| 21       | `signature.value`      | `signature.value`      | Optional; empty if absent |
| 22       | `signature.algorithm`  | `signature.algorithm`  | Optional; empty if absent |
| 23       | `signature.signerName` | `signature.signerName` | Optional; empty if absent |

```
REQUIREMENT: When exporting audit trail data in CSV format, all cell values MUST be
             sanitized to prevent CSV injection (formula injection). Values beginning
             with =, +, -, @, tab (U+0009), or carriage return (U+000D) MUST be
             prefixed with a single quote character ('). This protects compliance
             reviewers who open exports in spreadsheet applications from malicious
             or accidental formula execution. The sanitization applies to all
             AuditEntry fields without exception. JSON exports are not affected
             (JSON escaping per RFC 8259 is sufficient). See also the normative
             REQUIREMENT in ../compliance/gxp.md section 64e.
             Reference: OWASP CSV Injection Prevention, 21 CFR 11.10(a).
```

```
REQUIREMENT: Every audit trail export MUST include an AuditExportManifest as the
             first object in JSON exports (before the entries array) or as a
             separate manifest file alongside CSV exports. The manifest MUST be
             verified by recipients before using the export as compliance evidence:
             (1) Recompute the SHA-256 checksum over the export content and compare
                 to manifestChecksum.
             (2) Verify entryCount matches the actual number of entries.
             (3) Run verifyAuditChain() on the deserialized entries per scope.
             An export without a manifest or with a mismatched checksum MUST be
             rejected as potentially tampered.
             Reference: 21 CFR 11.10(b), 21 CFR 11.10(c).
```

```
REQUIREMENT: Audit trail export implementations MUST include a round-trip verification
             capability: (1) export entries to the target format (JSON or CSV),
             (2) re-import the exported data using deserializeAuditEntry() (for JSON)
             or the CSV parser with the column specification above, (3) compare each
             re-imported entry field-by-field against the source entry. All fields
             including integrityHash, previousHash, sequenceNumber, and signature
             sub-fields MUST match exactly. Round-trip verification MUST be executed
             as part of OQ (section 67b) for every supported export format. A round-trip
             failure MUST block the export from being used as compliance evidence.
             Reference: 21 CFR 11.10(b) (accurate and complete copies of records).
```

```
REQUIREMENT: Audit trail exports MUST include entries ordered by (scopeId ascending,
             sequenceNumber ascending) within each scope. This canonical ordering
             ensures that verifyAuditChain() can validate hash chain integrity without
             requiring consumers to re-sort. The manifest's firstTimestamp and
             lastTimestamp fields reflect the chronological range of the ordered entries.
             Implementations that export multiple scopes MUST group entries by scopeId
             with a stable sort (e.g., lexicographic scopeId order).
             Reference: 21 CFR 11.10(b) (accurate and complete copies),
             ALCOA+ Consistent.
```

```
REQUIREMENT: For open systems (as defined by 21 CFR 11.3(b)(9) and 11.30), the
             AuditExportManifest MUST include a digital signature over the
             manifestChecksum computed via the SignatureServicePort infrastructure
             defined in section 65. The signature MUST use an asymmetric algorithm
             (RSA-SHA256 or ECDSA P-256) to provide non-repudiation. Recipients
             MUST verify the signature before trusting the manifest checksum.
             Unsigned exports from open systems MUST be rejected by the import
             pipeline — an unsigned manifest in an open system context indicates
             either a configuration error or a potential integrity compromise.
             Reference: 21 CFR 11.30 (controls for open systems).

RECOMMENDED: For closed systems (as defined by 21 CFR 11.3(b)(4)), where the export
             never leaves the organization's trust boundary, the SHA-256 checksum
             alone is sufficient for integrity verification. Digital signatures
             remain RECOMMENDED for defense-in-depth.
             Reference: 21 CFR 11.3(b)(4), 21 CFR 11.10(c).
```

---

_Previous: [08 - Port Gate Hook](./07-port-gate-hook.md) | Next: [10 - Guard Integration Contracts](./09-cross-library.md)_
