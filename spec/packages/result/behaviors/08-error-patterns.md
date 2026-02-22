# 08 — Error Patterns

Utilities for creating structured errors and enforcing exhaustiveness.

## BEH-08-001: createError(tag)

Type-safe factory for creating tagged error constructors.

```ts
function createError<const Tag extends string>(
  tag: Tag
): <const Fields extends Record<string, unknown>>(
  fields: Fields
) => Readonly<{ _tag: Tag } & Fields>
```

**Behavior**:
1. Accepts a `tag` string (the error type discriminant)
2. Returns a factory function that accepts `fields` (arbitrary record)
3. The factory merges `{ _tag: tag }` with `fields`
4. The result is `Object.freeze()`d (immutable)
5. The return type preserves the literal `Tag` type and the exact shape of `Fields`
6. The `const` type parameters ensure field values are inferred as literal types and readonly — no `as const` assertion needed at call sites

**Example**:

```ts
const NotFound = createError("NotFound");

const error = NotFound({ resource: "User", id: "123" });
// Type: Readonly<{ _tag: "NotFound"; readonly resource: "User"; readonly id: "123" }>
// Value: { _tag: "NotFound", resource: "User", id: "123" }

Object.isFrozen(error); // true
```

**Design notes**:
- The `_tag` field aligns with the `Result` discriminant convention
- Frozen output ensures error values are immutable, consistent with [INV-7](../invariants.md#inv-7-createerror-output-is-frozen)
- The factory pattern enables reusable error constructors with consistent shapes
- The `const` generic parameter (TypeScript 5.0+) makes field inference behave as if `as const` was applied, producing readonly properties with literal types by default

## BEH-08-002: assertNever(value, message?)

Exhaustiveness check helper for discriminated unions.

```ts
function assertNever(value: never, message?: string): never
```

**Behavior**:
- Always throws an `Error`
- If `message` is provided, uses it as the error message
- If `message` is omitted, uses `"Unexpected value: ${JSON.stringify(value)}"`

**Purpose**: Place in the `default` branch of a `switch` statement (or final `else`) on a discriminated union. If all variants are handled, `value` is narrowed to `never` and the call is unreachable. If a new variant is added and not handled, TypeScript reports:

```
Argument of type 'NewVariant' is not assignable to parameter of type 'never'.
```

**Example**:

```ts
function handle(result: Result<number, string>): string {
  switch (result._tag) {
    case "Ok":
      return `Value: ${result.value}`;
    case "Err":
      return `Error: ${result.error}`;
    default:
      return assertNever(result);
      // If a new variant were added, TypeScript would error here
  }
}
```

**Runtime guarantee**: If `assertNever` is ever reached at runtime (indicating a type system bypass or data corruption), it throws with a descriptive message including the unexpected value.

## BEH-08-003: createErrorGroup(namespace)

Factory for creating families of related discriminated error types with a two-level discriminant.

```ts
function createErrorGroup<const NS extends string>(
  namespace: NS
): {
  create: <const Tag extends string>(tag: Tag) => <const Fields extends Record<string, unknown>>(
    fields: Fields
  ) => Readonly<{ _namespace: NS; _tag: Tag } & Fields>;

  is: (value: unknown) => value is Readonly<{ _namespace: NS; _tag: string }>;

  isTag: <const Tag extends string>(tag: Tag) => (
    value: unknown
  ) => value is Readonly<{ _namespace: NS; _tag: Tag }>;
}
```

**Returns** an object with three methods:

### .create(tag)

Creates a tagged error constructor within the namespace. Returns a factory function that accepts fields and produces a frozen error object with both `_namespace` and `_tag` discriminants.

```ts
const Http = createErrorGroup("HttpError");

const NotFound = Http.create("NotFound");
const Timeout = Http.create("Timeout");

const error = NotFound({ url: "/api/users", status: 404 });
// Type: Readonly<{ _namespace: "HttpError"; _tag: "NotFound"; readonly url: "/api/users"; readonly status: 404 }>
// Value: { _namespace: "HttpError", _tag: "NotFound", url: "/api/users", status: 404 }

Object.isFrozen(error); // true
```

### .is(value)

Type guard that checks if a value belongs to this error group (matches `_namespace`).

```ts
Http.is(error);               // true (matches namespace "HttpError")
Http.is({ _tag: "NotFound" }); // false (no _namespace)
```

### .isTag(tag)(value)

Curried type guard that checks if a value belongs to this error group **and** has a specific tag.

```ts
Http.isTag("NotFound")(error);  // true
Http.isTag("Timeout")(error);   // false
```

### Two-level discrimination

The `_namespace` + `_tag` combination enables error pattern matching across multiple error groups:

```ts
const Http = createErrorGroup("HttpError");
const Db = createErrorGroup("DbError");

type AppError =
  | ReturnType<ReturnType<typeof Http.create<"NotFound">>>
  | ReturnType<ReturnType<typeof Http.create<"Timeout">>>
  | ReturnType<ReturnType<typeof Db.create<"ConnectionLost">>>
  | ReturnType<ReturnType<typeof Db.create<"QueryFailed">>>;

function handleError(error: AppError) {
  if (Http.is(error)) {
    // TypeScript knows: error._namespace === "HttpError"
    switch (error._tag) {
      case "NotFound": return retry(error.url);
      case "Timeout": return fallback();
    }
  }
  if (Db.is(error)) {
    // TypeScript knows: error._namespace === "DbError"
    switch (error._tag) {
      case "ConnectionLost": return reconnect();
      case "QueryFailed": return logAndAlert(error);
    }
  }
}
```

### Relationship to createError

`createErrorGroup(ns).create(tag)` is a superset of `createError(tag)`:

| Feature | `createError(tag)` | `createErrorGroup(ns).create(tag)` |
|---------|-------------------|--------------------------------------|
| Discriminant | `_tag` only | `_namespace` + `_tag` |
| Namespace guard | N/A | `.is(value)` |
| Tag guard | Manual | `.isTag(tag)(value)` |
| Frozen output | Yes | Yes |
| `const` inference | Yes (literal types, readonly fields) | Yes (literal types, readonly fields) |

Use `createError` for standalone errors. Use `createErrorGroup` when you have families of related errors that need namespace-level discrimination.

**Exported from**: `errors/create-error-group.ts`

## BEH-08-004: Error Severity Classification

For GxP-regulated environments, errors should be classified by severity to support ICH Q9 risk management. The `createError` and `createErrorGroup` factories support a `severity` field by convention.

### Severity levels

| Severity | ICH Q9 Risk | Description | Example |
|----------|-------------|-------------|---------|
| `"critical"` | High | Patient safety impact, data integrity breach, regulatory violation | Brand validation failure, audit trail write failure |
| `"major"` | Medium | Significant functional impact, potential data quality issue | Database connection lost, validation rule failure |
| `"minor"` | Low | Limited impact, workaround available | Non-critical cache miss, formatting error |

### Recommended pattern

```ts
const GxpError = createErrorGroup("GxpError");

const AuditFailure = GxpError.create("AuditFailure");
const ValidationFailure = GxpError.create("ValidationFailure");
const CacheMiss = GxpError.create("CacheMiss");

// severity is inferred as literal type thanks to const type parameters — no `as const` needed
const auditErr = AuditFailure({ severity: "critical", detail: "Audit log write failed" });
// Type: Readonly<{ _namespace: "GxpError"; _tag: "AuditFailure"; readonly severity: "critical"; readonly detail: "Audit log write failed" }>

const validErr = ValidationFailure({ severity: "major", field: "batchId" });
// Type: Readonly<{ _namespace: "GxpError"; _tag: "ValidationFailure"; readonly severity: "major"; readonly field: "batchId" }>

const cacheErr = CacheMiss({ severity: "minor", key: "user:123" });
// Type: Readonly<{ _namespace: "GxpError"; _tag: "CacheMiss"; readonly severity: "minor"; readonly key: "user:123" }>
```

### Filtering by severity

```ts
type Severity = "critical" | "major" | "minor";

function isCritical(error: { severity?: Severity }): boolean {
  return error.severity === "critical";
}

// In a Result pipeline
result.mapErr(error => {
  if (isCritical(error)) {
    // Escalate: page on-call, halt batch processing
  }
  return error;
});
```

**Design note**: Severity is a convention, not enforced at the type level. The `createError` and `createErrorGroup` factories are generic — they accept any field shape. Because both use `const` type parameters, severity values like `"critical"` are inferred as literal types and readonly by default, enabling precise discrimination in `switch`/`if` blocks without requiring `as const` at call sites. This keeps the core library free of domain-specific opinions while enabling GxP patterns. See [compliance/gxp.md](../compliance/gxp.md#error-severity-classification) for full regulatory guidance.
