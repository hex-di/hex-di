# ADR-GD-001: Permissions are branded nominal tokens, not strings

> **Status:** Accepted
> **ADR Number:** 001 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Authorization libraries commonly represent permissions as plain strings (`"user:read"`). Plain strings are structurally compatible with all other strings, so TypeScript cannot prevent passing an arbitrary string where a specific permission is expected. `Permission<"user", "read">` and `Permission<"user", "write">` would be indistinguishable at compile time. The design question: how to represent permissions such that distinct resource:action pairs are type-incompatible with each other and with arbitrary strings, while remaining ergonomic to create and use?

## Decision

Permissions are branded nominal types using `Symbol.for()` with phantom generics. The type `Permission<R extends string, A extends string>` carries a `_brand` symbol that encodes the resource and action at the type level. Permissions are created via factory functions only — they cannot be constructed from arbitrary strings.

```ts
// The Permission type is a branded string
type Permission<R extends string, A extends string> = string & {
  readonly _brand: typeof _permissionBrand;
  readonly _resource: R;
  readonly _action: A;
};

// Factory creates branded permissions
const readUser = createPermission("user", "read");
// type: Permission<"user", "read">

// Type error: Permission<"user", "write"> is not assignable to Permission<"user", "read">
function checkRead(p: Permission<"user", "read">) { /* ... */ }
checkRead(createPermission("user", "write")); // TS error
checkRead("user:read");                        // TS error
```

## Consequences

**Positive**:
- Compile-time differentiation of `Permission<"user", "read">` from `Permission<"user", "write">` and from plain strings
- Prevents passing arbitrary strings where a permission is expected — type errors catch mistakes at build time
- Runtime brand checks via `Symbol.for()` enable `isPermission()` type guard

**Negative**:
- More ceremony to create permissions — must use factory function instead of plain string literals
- Branded types require explicit factory use, which may be unfamiliar to developers accustomed to string enums

**Trade-off accepted**: The factory ceremony is a small and one-time cost; the compile-time safety guarantees eliminate an entire class of authorization bugs that would otherwise be undetectable until runtime.
