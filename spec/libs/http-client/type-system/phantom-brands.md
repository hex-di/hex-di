# @hex-di/http-client — Phantom-Branded Types

Compile-time safety patterns using unique symbol phantom brands in `@hex-di/http-client`. These brands make it structurally impossible to substitute a plain `Record` or array where a typed collection is expected, catching misuse at compile time rather than at runtime.

---

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-TYP-002 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/type-system/phantom-brands.md` |
| Status | Effective |

---

## The Unique Symbol Brand Pattern

Both branded types in this library use the same pattern: a `declare const` unique symbol that is used as a computed property key on the interface:

```typescript
declare const SYMBOL_NAME: unique symbol;

interface BrandedType {
  readonly [SYMBOL_NAME]: true;
  // ... payload fields
}
```

Because `unique symbol` is a distinct type per declaration (each `unique symbol` is incompatible with every other `unique symbol`), no two types can accidentally satisfy each other's brand constraints. A plain `Record<string, string>` will never satisfy `Headers` because `Record<string, string>` has no `[HEADERS_SYMBOL]: true` property. TypeScript catches this at the assignment site — no runtime check required.

---

## Branded Type 1: `Headers`

### Declaration

```typescript
declare const HEADERS_SYMBOL: unique symbol;

interface Headers {
  readonly [HEADERS_SYMBOL]: true;
  readonly entries: Readonly<Record<string, string>>;
}
```

### Brand Symbol

`HEADERS_SYMBOL` — declared in `src/types/headers.ts`. The symbol is never exported; only the `Headers` interface is exported. This prevents external code from constructing a brand-satisfying object outside the controlled factory.

### What It Prevents

```typescript
// COMPILE ERROR — plain Record is not assignable to Headers
function setRequestHeader(key: string, value: string, headers: Headers): Headers { ... }
const plain: Record<string, string> = { "content-type": "application/json" };
setRequestHeader("accept", "text/plain", plain); // TS2345: Argument of type 'Record<string, string>'
                                                  //         is not assignable to parameter of type 'Headers'

// CORRECT — only factory-created Headers satisfy the brand
const h = createHeaders({ "content-type": "application/json" });
setRequestHeader("accept", "text/plain", h); // OK
```

### Why `entries` Is a Nested Record

`Headers` stores header values in `entries: Readonly<Record<string, string>>` rather than hoisting them as top-level properties. This ensures:

1. The brand symbol cannot be confused with a header key (brand is a symbol, header keys are strings)
2. `Object.freeze()` on the `Headers` object also freezes the brand property, making the brand tamper-resistant
3. Structural widening (`headers.entries` returns a plain record) is a deliberate escape hatch for transport adapters that need a plain object

### Case-Insensitive Semantics

The brand does not encode case normalization — that is a runtime behavior enforced by `createHeaders()`. All keys are lowercased during construction. The branded type guarantees the shape has been through this normalization, but TypeScript cannot verify the lowercasing at the type level.

### Related

- [§6](../02-core-types.md#6-headers) — full `Headers` specification
- [INV-HC-10](../invariants.md#inv-hc-10-header-case-normalization) — header case-normalization invariant
- [type-system/structural-safety.md](./structural-safety.md) — readonly field immutability patterns

---

## Branded Type 2: `UrlParams`

### Declaration

```typescript
declare const URL_PARAMS_SYMBOL: unique symbol;

interface UrlParams {
  readonly [URL_PARAMS_SYMBOL]: true;
  readonly entries: ReadonlyArray<readonly [string, string]>;
}
```

### Brand Symbol

`URL_PARAMS_SYMBOL` — declared in `src/types/url-params.ts`. Not exported.

### What It Prevents

```typescript
// COMPILE ERROR — plain Record is not assignable to UrlParams
function setParam(key: string, value: string, params: UrlParams): UrlParams { ... }
const plain = { page: "1" };
setParam("limit", "20", plain as unknown as UrlParams); // type cast required — brand is enforced

// CORRECT
const params = createUrlParams({ page: 1 });
setParam("limit", "20", params); // OK
```

### Why a Tuple Array Instead of a Record

`UrlParams.entries` is `ReadonlyArray<readonly [string, string]>` rather than a record because:

1. URL parameters can repeat the same key (`?role=admin&role=user`), which a record cannot represent
2. Parameter order matters for cache keys and deterministic serialization
3. A flat `[key, value][]` maps directly to the `URLSearchParams` Web API without transformation

The brand prevents callers from accidentally passing a plain `[string, string][]` array, which would lack the phantom property and thus fail structural type checking.

### Input vs Storage Type

```typescript
type UrlParamsInput =
  | Readonly<Record<string, string | number | boolean | ReadonlyArray<string>>>
  | ReadonlyArray<readonly [string, string]>;
```

`UrlParamsInput` is the factory's permissive input type. `UrlParams` is the normalized, branded output. The brand guarantees that `entries` has been through `createUrlParams()` (which stringifies numbers/booleans and flattens arrays into repeated tuples).

### Related

- [§7](../02-core-types.md#7-urlparams) — full `UrlParams` specification
- [type-system/structural-safety.md](./structural-safety.md) — readonly field immutability patterns

---

## Branded Type Comparison Table

| Type | Symbol | `entries` shape | Primary prevention | Escape hatch for adapters |
|------|---------|-----------------|--------------------|--------------------------|
| `Headers` | `HEADERS_SYMBOL` | `Readonly<Record<string, string>>` | Passing plain `Record` as header map | `headersToRecord(headers)` |
| `UrlParams` | `URL_PARAMS_SYMBOL` | `ReadonlyArray<readonly [string, string]>` | Passing plain array/object as params | `toQueryString(params)` |

---

## Covariant Widening

Both branded types widen safely to their payload type via their `entries` accessor:

```typescript
// UrlParams widens to its tuple array — no cast required
const params: UrlParams = createUrlParams({ page: 1 });
const raw: ReadonlyArray<readonly [string, string]> = params.entries; // OK, covariant

// Headers widens to its record — no cast required
const headers: Headers = createHeaders({ accept: "application/json" });
const raw2: Readonly<Record<string, string>> = headers.entries; // OK, covariant
```

Transport adapters use these escape hatches to convert branded types to the plain types required by the underlying fetch/axios/etc. API.

---

## Non-Branded Types for Comparison

`HttpBody` and `HttpMethod` are NOT branded:

- `HttpMethod` is a plain string union — no phantom brand needed because a string literal union is already discriminated by value
- `HttpBody` is a tagged discriminated union using `_tag` string literals — no phantom brand needed because the `_tag` field discriminates at the type level

The phantom brand pattern is reserved for collection types (`Headers`, `UrlParams`) where:
1. The underlying storage type (`Record`, `Array`) would be structurally compatible with raw user input
2. The factory performs normalization (lowercasing, stringification, ordering) that the type system cannot verify
3. Structural incompatibility is necessary to prevent passing un-normalized collections to combinators
