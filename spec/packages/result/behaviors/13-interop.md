# 13 — Interoperability

Serialization, deserialization, and integration with external standards.

## BEH-13-001: fromJSON(json)

```ts
function fromJSON<T, E>(
  json: { _tag: "Ok"; _schemaVersion?: number; value: T } | { _tag: "Err"; _schemaVersion?: number; error: E }
): Result<T, E>
```

Deserializes a plain JSON object back into a branded, frozen `Result`.

**Behavior**:
1. Checks `json._tag`
2. If `"Ok"` → returns `ok(json.value)` (branded, frozen)
3. If `"Err"` → returns `err(json.error)` (branded, frozen)
4. If neither → throws `TypeError("Invalid Result JSON: expected _tag to be 'Ok' or 'Err'")`

**Round-trip guarantee**:
```ts
const original = ok(42);
const serialized = original.toJSON();     // { _tag: "Ok", _schemaVersion: 1, value: 42 }
const restored = fromJSON(serialized);    // Ok<number, never> (branded, frozen)

isResult(restored); // true
restored.isOk();    // true
restored.value;     // 42
```

**Backward compatibility**: `fromJSON()` accepts both the versioned format (with `_schemaVersion`) and the legacy format (without `_schemaVersion`). The `_schemaVersion` field is optional on input.

`fromJSON(result.toJSON())` produces a genuine `Result` that passes `isResult()` and has all methods available. This is the inverse of `toJSON()`.

**Use cases**:
- Receiving `Result` values from APIs that serialize to JSON
- Deserializing stored `Result` values from databases or caches
- Reconstructing `Result` values after `structuredClone()` (which strips the brand symbol)

**Exported from**: `@hex-di/result` (main entry point)

## BEH-13-002: toSchema(validate)

```ts
function toSchema<T, E>(
  validate: (input: unknown) => Result<T, E>
): StandardSchemaV1<unknown, T>
```

Wraps a `Result`-returning validation function as a `StandardSchemaV1` schema object.

**Parameters**:
- `validate` — A function that takes an unknown input and returns `Result<T, E>` where `T` is the validated output type.

**Returns**: An object implementing the `StandardSchemaV1` interface from `@standard-schema/spec`:

```ts
interface StandardSchemaV1<Input, Output> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "@hex-di/result";
    readonly validate: (value: Input) => StandardSchemaV1.Result<Output>;
  };
}
```

**Behavior**:
1. The returned schema's `~standard.validate` method calls `validate(input)`
2. If the Result is `Ok` → returns `{ value: result.value }`
3. If the Result is `Err` → returns `{ issues: [{ message: String(result.error) }] }`

**Example**:
```ts
import { toSchema } from "@hex-di/result";

const positiveNumber = toSchema((input: unknown) => {
  if (typeof input !== "number") return err("Expected number");
  if (input <= 0) return err("Expected positive number");
  return ok(input);
});

// positiveNumber implements StandardSchemaV1<unknown, number>
// Compatible with any library that accepts Standard Schema validators
```

**Exported from**: `@hex-di/result` (main entry point)

## BEH-13-003: structuredClone Compatibility

> **Warning**: Using `structuredClone()` directly on `Result` values silently strips all safety guarantees (brand, freeze, methods). Always use the `toJSON()` / `fromJSON()` pattern below.

`structuredClone()` (and the related `MessageChannel` / `postMessage` APIs) uses the structured clone algorithm, which does **not** preserve:

- Symbol-keyed properties (`RESULT_BRAND`, `OPTION_BRAND`, `RESULT_ASYNC_BRAND`)
- Method closures (functions are not cloneable)
- `Object.freeze()` semantics (the cloned object is mutable)

**Consequence**: `structuredClone(ok(42))` produces a plain object `{ _tag: "Ok", value: 42 }` that:
- Fails `isResult()` (no brand symbol)
- Has no methods (closures are stripped)
- Is **mutable** (freeze is not preserved by structured clone)

**GxP impact**: In regulated environments, passing a `Result` through `structuredClone()` without re-wrapping violates [INV-1](../invariants.md#inv-1-frozen-result-instances) (immutability) and [INV-3](../invariants.md#inv-3-brand-symbol-prevents-forgery) (brand integrity). See [compliance/gxp.md](../compliance/gxp.md).

**Recommended pattern**: Use `toJSON()` before serializing and `fromJSON()` after deserializing:

```ts
// Sending across boundaries
const json = result.toJSON();           // plain object, structuredClone-safe
const cloned = structuredClone(json);   // survives cloning

// Receiving
const restored = fromJSON(cloned);      // branded, frozen Result with methods
```

## BEH-13-004: Data Retention Guidance

When `Result` values are persisted for regulatory record-keeping (batch records, audit trails, clinical data), the serialization format affects long-term retrievability.

### Recommended serialization format

Use `toJSON()` for all persistent storage. The `{ _tag, value/error }` JSON format is:

- **Self-describing** — the `_tag` discriminant is preserved in plain JSON
- **Schema-stable** — the format is covered by the `ResultJSON<T, E>` type and will not change without a major version bump
- **Round-trip safe** — `fromJSON(result.toJSON())` restores a genuine branded Result

### Retention considerations

| Concern | Guidance |
|---------|----------|
| Format stability | `ResultJSON` format is semver-protected; breaking changes require a major version |
| Deserialization across versions | `fromJSON()` validates `_tag` only; payload shape is the consumer's responsibility |
| Symbol loss | Brand symbols are **not** serialized; always use `fromJSON()` to restore guarantees |
| Nested Results | `toJSON()` does not recursively serialize nested Results; consumers must handle nested structures |
| Binary data | `toJSON()` uses `JSON.stringify` semantics; `Buffer`/`Uint8Array` values require manual encoding |

### Domain-specific retention periods

See [compliance/gxp.md](../compliance/gxp.md#data-retention-guidance) for retention period guidance per regulatory domain (pharmaceutical batch records, clinical trial data, QC laboratory data, pharmacovigilance, medical devices).

## BEH-13-005: RxJS Companion Package

A companion package `@hex-di/result-rxjs` is planned for RxJS integration (future scope — see [roadmap](../roadmap.md#rxjs-companion-package)):

- `mapResult(f)` — operator that maps `Observable<Result<T, E>>` values
- `filterOk()` — filters to only `Ok` values, unwrapping them
- `filterErr()` — filters to only `Err` values, unwrapping them
- `switchMapResult(f)` — flatMap with Result-returning functions
- `catchToResult(mapErr)` — converts Observable errors to `Err` values

This is documented in the [roadmap](../roadmap.md) as a future deliverable.

## BEH-13-006: Option Serialization Interop

The `Option<T>` type provides native serialization via `toJSON()` on `Some` and `None` instances, and deserialization via `fromOptionJSON()`.

### Native serialization

```ts
import { some, none, fromOptionJSON, isOption } from "@hex-di/result/option";

// Serialize
const someJson = some(42).toJSON();     // { _tag: "Some", _schemaVersion: 1, value: 42 }
const noneJson = none().toJSON();        // { _tag: "None", _schemaVersion: 1 }

// Deserialize
const restored = fromOptionJSON(someJson);  // Some<number> (branded, frozen)
isOption(restored); // true
restored.isSome();  // true
restored.value;     // 42
```

### Data retention guidance

For GxP data retention, Option values can now be serialized directly without wrapping in a Result:

```ts
// Direct Option serialization for audit records
const signature: Option<string> = none();
const record = {
  timestamp: new Date().toISOString(),
  userId: session.userId,
  reviewSignature: signature.toJSON(),  // { _tag: "None", _schemaVersion: 1 }
};
await auditStore.write(record);

// Restore from storage
const stored = await auditStore.read(recordId);
const restored = fromOptionJSON(stored.reviewSignature);  // Branded, frozen Option
```

### Alternative pattern: Result wrapping (backward compatibility)

The Result wrapping patterns documented in [compliance/gxp.md](../compliance/gxp.md#option-serialization-for-data-retention) remain valid for backward compatibility with existing data stores that use the `Ok`/`Err` envelope for Option values.

### Round-trip guarantee

`fromOptionJSON(option.toJSON())` produces a genuine `Option` that passes `isOption()` and has all methods available. `fromOptionJSON()` accepts both the versioned format (with `_schemaVersion`) and the legacy format (without `_schemaVersion`).

See [09-option.md](09-option.md#beh-09-009-optiontoJSON) for full specification.
