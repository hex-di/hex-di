# Phase 29: Lint Cleanup - Research

**Researched:** 2026-02-07
**Domain:** ESLint configuration and TypeScript type safety
**Confidence:** HIGH

## Summary

Phase 29 addresses remaining lint warnings in tracing and integration packages post-v7.0 milestone. The current state shows 52 total lint warnings across tracing packages, with specific patterns: Hono middleware Headers API typing (7 warnings), tracing type-guards unsafe assignments (2 warnings), cross-container test warnings (5 prefer-const), and inherited warnings from non-tracing packages (38 warnings in @hex-di/core, @hex-di/runtime, libs/flow/react).

Current ESLint config enforces strict type safety rules: `no-explicit-any` as error, `no-unsafe-*` as warnings, and standard code quality rules. Test files have relaxed rules for mocking flexibility, but production code maintains zero tolerance for `any` types and type casts per project rules (CLAUDE.md).

**Primary recommendation:** Fix each category with targeted solutions - narrow Hono Headers type through proper type guards, refactor type-guards to avoid any assignments, fix cross-container test declarations, and clean inherited warnings only if blocking tracing package shipment.

## Lint Warning Inventory

### Tracing Packages (v7.0 scope)

**@hex-di/hono (9 warnings):**

- `src/tracing-middleware.ts` lines 105-107, 153: 7 `@typescript-eslint/no-unsafe-*` warnings from Headers API
- Pattern: `context.req.raw.headers` typed as `error` by Hono, causing unsafe member access

**@hex-di/tracing (7 warnings):**

- `src/utils/type-guards.ts` lines 62, 77: 2 `@typescript-eslint/no-unsafe-assignment` warnings
- `tests/integration/instrumentation/cross-container.test.ts` lines 98, 164-165, 238, 286: 5 `prefer-const` warnings
- Pattern: Type-guards assign `value[0]` to check array element types; test files use `let` for container refs

**@hex-di/tracing-otel (2 warnings):**

- `src/utils/globals.ts` lines 62, 82: 2 `@typescript-eslint/no-unsafe-call` warnings
- Pattern: Dynamic access to `globalThis.setTimeout`/`clearTimeout` narrowed through type guards but still flagged

**@hex-di/tracing-datadog (2 warnings):**

- `src/bridge.ts` line 80: 1 `@typescript-eslint/require-await` warning (async with no await)
- `tests/unit/datadog-bridge.test.ts` line 58: 1 `@typescript-eslint/no-unused-vars` warning
- Pattern: Export method signature requires async for SpanExporter port; test mock factory unused param

### Inherited Warnings (pre-existing tech debt)

**@hex-di/core (31 warnings):**

- All `@typescript-eslint/no-unused-vars` in test files
- Pattern: Type-level test variables used only with `typeof` extraction

**@hex-di/runtime (35 warnings):**

- All `@typescript-eslint/no-unused-vars` in test files for hook parameters
- Pattern: Mock hook functions with intentionally ignored parameters

**libs/flow/react (1 warning):**

- Single `@typescript-eslint/no-unused-vars` for `createPort` import

**Note:** Phase 29 scope is tracing packages only (18 warnings). Inherited warnings (38) are out of scope per v7.0-MILESTONE-AUDIT.md ("pre-existing tech debt").

## ESLint Configuration Architecture

### Base Config (`eslint.config.js`)

```javascript
{
  // Type safety (errors)
  "@typescript-eslint/no-explicit-any": "error",

  // Type safety (warnings) - no-unsafe-* rules
  "@typescript-eslint/no-unsafe-assignment": "warn",
  "@typescript-eslint/no-unsafe-call": "warn",
  "@typescript-eslint/no-unsafe-member-access": "warn",
  "@typescript-eslint/no-unsafe-return": "warn",

  // Code quality
  "prefer-const": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
  ],

  // Async safety
  "@typescript-eslint/require-await": "warn",
}
```

### Test Config Override

Test files (`**/*.test.ts`, `**/tests/**/*.ts`) have relaxed rules:

- `no-explicit-any`: off
- `no-unsafe-*`: off (all variants)
- `no-unused-vars`: warn (downgraded from error)
- `prefer-const`: warn (downgraded from error)

This explains why some warnings appear in test files despite test config - **warnings still emit, just not errors**.

### Project Rules (CLAUDE.md)

Critical constraints from project documentation:

- **Never use `any` type** (test files exempt)
- **Never use type casting** (`as X`)
- **Never use eslint-disable comments** - fix code to comply
- **Never use non-null assertions** (`!`)
- **Maximum type inference** - explicit types only when necessary

## Architecture Patterns

### Pattern 1: Type Guard Narrowing for Dynamic APIs

**What:** Use proper type guard functions to narrow `unknown` types from dynamic APIs (globalThis, Headers, etc.)

**When to use:** When accessing platform APIs that aren't in TypeScript's DOM/Node type definitions

**Example from tracing-otel:**

```typescript
// Current pattern (generates warning)
const g: Record<string, unknown> = globalThis;
const fn: unknown = g.setTimeout;
if (typeof fn === "function") {
  return fn(callback, ms); // ← warns no-unsafe-call
}

// Recommended pattern
type SetTimeoutFn = (callback: () => void, ms: number) => unknown;

function getSetTimeout(): SetTimeoutFn | undefined {
  if (typeof globalThis === "undefined" || !("setTimeout" in globalThis)) {
    return undefined;
  }
  const g: Record<string, unknown> = globalThis;
  const fn: unknown = g.setTimeout;
  // Type guard that narrows to the specific function signature
  if (typeof fn === "function") {
    return fn as SetTimeoutFn; // ← Safe cast with guard
  }
  return undefined;
}

// Usage site has proper types
const setTimeout = getSetTimeout();
if (setTimeout) {
  setTimeout(callback, ms); // ← No warning
}
```

**Why this pattern:** Encapsulates the single unavoidable cast inside a type guard, exports properly typed function.

### Pattern 2: Hono Headers Type Guard

**What:** Create a type guard to safely access Hono's Headers object

**When to use:** When extracting headers from `context.req.raw.headers` in Hono middleware

**Example:**

```typescript
interface HeadersLike {
  forEach(callback: (value: string, key: string) => void): void;
}

function isHeadersLike(value: unknown): value is HeadersLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "forEach" in value &&
    typeof (value as any).forEach === "function"
  );
}

// Usage in middleware
const rawHeaders = context.req.raw.headers;
if (isHeadersLike(rawHeaders)) {
  rawHeaders.forEach((value, key) => {
    headers[key] = value; // ← No warnings
  });
}
```

**Why this pattern:** Hono's `raw.headers` type is intentionally broad (works in multiple environments). Type guard narrows to the specific interface we need.

### Pattern 3: Test Variable Prefixing

**What:** Prefix intentionally unused variables with `_` to satisfy `no-unused-vars` rule

**When to use:** When test setup requires variable declaration but usage isn't relevant to test

**Example:**

```typescript
// Current (generates warning)
let container2Ref: any;
const adapter1 = createAdapter({
  factory: () => {
    container2Ref = container2; // ← assigned but never read
    return "value";
  },
});

// Recommended
let _container2Ref: any; // ← underscore prefix
const adapter1 = createAdapter({
  factory: () => {
    _container2Ref = container2; // ← assignment clear it's intentional capture
    return "value";
  },
});
```

**Why this pattern:** ESLint config allows `varsIgnorePattern: "^_"` for intentional unused variables. Makes intent explicit.

### Pattern 4: Const vs Let in Tests

**What:** Use `const` for container references unless reassignment is needed

**When to use:** Cross-container test setup where containers are created once

**Example:**

```typescript
// Current (generates warning)
let containerBRef: any;
let containerCRef: any;

// Later...
containerBRef = containerB;
containerCRef = containerC;

// Recommended - if only assigned once
const containerBRef = await (async () => {
  const adapter = createAdapter({...});
  return createContainer().provide(adapter).build();
})();
```

**Why this pattern:** `prefer-const` enforces immutability where possible. If reassignment isn't needed, use `const`.

## Don't Hand-Roll

### Type Guard Utilities

**Problem:** Custom type guards for platform APIs
**Don't Build:** Manual type checking with casts scattered throughout codebase
**Use Instead:** Centralized type guard functions (already done in `tracing-otel/src/utils/globals.ts`)
**Why:** Single point of unavoidable casts, rest of codebase uses properly typed APIs

### ESLint Rule Disabling

**Problem:** Lint warnings in production code
**Don't Build:** `// eslint-disable` comments or config overrides
**Use Instead:** Fix underlying type/code issues
**Why:** Project rule (CLAUDE.md) explicitly forbids eslint-disable in production code

## Common Pitfalls

### Pitfall 1: Over-relaxing Test Rules

**What goes wrong:** Making test config too permissive causes warnings to proliferate in test files
**Why it happens:** "Tests are just mocks, warnings don't matter"
**How to avoid:** Keep `prefer-const` and `no-unused-vars` as warnings even in tests. They catch real issues.
**Warning signs:** Test files accumulating dozens of warnings, making it hard to spot real issues

### Pitfall 2: Fighting the Type System with Casts

**What goes wrong:** Adding `as X` casts to silence warnings without understanding root cause
**Why it happens:** Type errors feel like obstacles, casts are quick fixes
**How to avoid:** Project rule explicitly forbids ALL casts. Investigate why TypeScript complains.
**Warning signs:** Multiple `as unknown as X` chains, complaints about "overly strict" TypeScript

### Pitfall 3: Incorrect Unused Variable Patterns

**What goes wrong:** Using `_` prefix for variables that ARE actually used
**Why it happens:** Misunderstanding the underscore convention (for unused, not "private")
**How to avoid:** `_` prefix means "I know this isn't used, that's intentional." If it IS used, no underscore.
**Warning signs:** Variables like `_result` that are then used in assertions

### Pitfall 4: Async/Await Hygiene

**What goes wrong:** `async` function signature without any `await` inside
**Why it happens:** Port interface requires `async`, but implementation doesn't need it
**How to avoid:** Two options: (1) make non-async if port allows, (2) wrap in `Promise.resolve()` if port requires async
**Warning signs:** `@typescript-eslint/require-await` warning on public API methods

## Code Examples

### Example 1: Fix Hono Headers Warnings

```typescript
// Source: integrations/hono/src/tracing-middleware.ts lines 102-113
// Current (7 warnings)
const extractedContext = extractContext
  ? (() => {
      const headers: Record<string, string | undefined> = {};
      const rawHeaders = context.req.raw.headers; // ← typed as error
      if (rawHeaders && typeof rawHeaders.forEach === "function") {
        rawHeaders.forEach((value: string, key: string) => {
          // ← unsafe
          headers[key] = value;
        });
      }
      return extractTraceContext(headers);
    })()
  : undefined;

// Fixed (0 warnings)
interface HeadersLike {
  forEach(callback: (value: string, key: string) => void): void;
}

function isHeadersLike(value: unknown): value is HeadersLike {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "forEach" in value &&
    typeof (value as { forEach?: unknown }).forEach === "function"
  );
}

const extractedContext = extractContext
  ? (() => {
      const headers: Record<string, string | undefined> = {};
      const rawHeaders: unknown = context.req.raw.headers;
      if (isHeadersLike(rawHeaders)) {
        rawHeaders.forEach((value: string, key: string) => {
          headers[key] = value;
        });
      }
      return extractTraceContext(headers);
    })()
  : undefined;
```

### Example 2: Fix Type-Guards Unsafe Assignment

```typescript
// Source: packages/tracing/src/utils/type-guards.ts lines 62, 77
// Current (2 warnings)
const firstElement = value[0]; // ← any

if (typeof firstElement === "string") {
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string") {
      // ← value[i] is any
      return false;
    }
  }
  return true;
}

// Fixed (0 warnings) - narrow array type first
if (value.length === 0) {
  return false;
}

// After length check, use type assertion with guard
const arrayCheck = (arr: unknown[]): arr is string[] => {
  return arr.every(item => typeof item === "string");
};

if (arrayCheck(value)) {
  return true; // ← value is string[]
}
```

### Example 3: Fix Cross-Container Test Const Violations

```typescript
// Source: packages/tracing/tests/integration/instrumentation/cross-container.test.ts
// Current (5 warnings)
let container2Ref: any;
let containerBRef: any;
let containerCRef: any;
let containerInnerRef: any;
// ...later assigned once each

// Fixed - use const with immediate initialization
const { container2 } = await (async () => {
  const Port2 = port<string>()({ name: "Inner" });
  const adapter2 = createAdapter({
    provides: Port2,
    requires: [],
    lifetime: "singleton",
    factory: () => "value2",
  });
  const container2 = createContainer().provide(adapter2).build();
  return { container2 };
})();

// Or if truly needs mutation, keep as let but use it
let containerRef: any;
// ...assign AND read later
```

### Example 4: Fix OTel Globals Unsafe Call

```typescript
// Source: packages/tracing-otel/src/utils/globals.ts lines 62, 82
// Current (2 warnings)
const fn: unknown = g.setTimeout;
if (typeof fn === "function") {
  return fn(callback, ms); // ← no-unsafe-call warning
}

// Fixed - type the function signature
type SetTimeoutFn = (callback: () => void, ms: number) => unknown;

export function safeSetTimeout(callback: () => void, ms: number): unknown {
  if (typeof globalThis === "undefined" || !("setTimeout" in globalThis)) {
    return undefined;
  }

  const g: Record<string, unknown> = globalThis;
  const fn: unknown = g.setTimeout;

  // Type guard narrows to specific signature
  if (typeof fn === "function") {
    // Single unavoidable cast after guard
    const typedFn = fn as SetTimeoutFn;
    return typedFn(callback, ms);
  }

  return undefined;
}
```

### Example 5: Fix DataDog Async Warning

```typescript
// Source: packages/tracing-datadog/src/bridge.ts line 80
// Current (1 warning)
async export(spans: ReadonlyArray<SpanData>): Promise<void> {
  try {
    for (const hexSpan of spans) {
      // ...synchronous operations only
    }
  } catch (error) {
    // ...
  }
}

// Fixed Option 1: Make synchronous (if port interface allows)
export(spans: ReadonlyArray<SpanData>): void {
  // ...same implementation without async
}

// Fixed Option 2: Keep async (if port requires Promise<void>)
async export(spans: ReadonlyArray<SpanData>): Promise<void> {
  // Wrap in Promise to satisfy async requirement
  return Promise.resolve().then(() => {
    try {
      for (const hexSpan of spans) {
        // ...
      }
    } catch (error) {
      // ...
    }
  });
}
```

## State of the Art

| Old Approach              | Current Approach                 | When Changed      | Impact                |
| ------------------------- | -------------------------------- | ----------------- | --------------------- |
| `any` types everywhere    | Zero `any` in production code    | Project inception | Strict type safety    |
| Type casts to fix errors  | Fix underlying types             | Project inception | Better type inference |
| `eslint-disable` comments | Fix code to comply               | Project inception | No ignored warnings   |
| Test files with any types | Test files can use any for mocks | Phase 23 (v7.0)   | Flexible mocking      |

**Deprecated/outdated:**

- Type casting (`as X`) - FORBIDDEN in project rules
- `eslint-disable` comments - FORBIDDEN in project rules
- Non-null assertions (`!`) - FORBIDDEN in project rules

## Execution Strategy

### Phase 1: Tracing Package Warnings (18 total)

**Priority 1: Hono Headers (7 warnings)**

1. Create `HeadersLike` interface and `isHeadersLike()` type guard
2. Wrap `context.req.raw.headers` access with guard
3. Test with existing Hono middleware tests

**Priority 2: Type-Guards Array Access (2 warnings)**

1. Refactor array type checking to use explicit type predicates
2. Avoid assigning `value[0]` to untyped variable
3. Test with existing type-guard tests

**Priority 3: Cross-Container Tests (5 warnings)**

1. Change `let` to `const` for single-assignment container refs
2. Restructure test setup if needed (async IIFE pattern)
3. Verify all tests still pass

**Priority 4: OTel Globals (2 warnings)**

1. Add explicit function type signatures for setTimeout/clearTimeout
2. Encapsulate unavoidable cast inside type guard
3. Test with existing OTel tests

**Priority 5: DataDog Async (2 warnings)**

1. Check if SpanExporter port requires async (likely yes)
2. Wrap in `Promise.resolve()` to satisfy interface
3. Test with existing DataDog tests

### Phase 2: Verification

1. Run `pnpm lint` across all tracing packages - expect 0 warnings
2. Run `pnpm test` across all tracing packages - all pass
3. Run `pnpm typecheck` - no new errors
4. Update v7.0-MILESTONE-AUDIT.md to remove lint tech debt items

### Out of Scope

**Inherited warnings (38 total):**

- `@hex-di/core` (31 warnings)
- `@hex-di/runtime` (35 warnings)
- `libs/flow/react` (1 warning)

**Rationale:** Pre-existing tech debt from before v7.0. Phase 29 focuses on v7.0-introduced warnings only. Inherited warnings should be addressed in a separate cleanup phase or milestone.

## Open Questions

1. **DataDog bridge async requirement**
   - What we know: SpanExporter port interface likely requires `async export()`
   - What's unclear: Can we verify port signature requires async?
   - Recommendation: Check `@hex-di/tracing` SpanExporter definition; if async required, use Promise.resolve() wrapper

2. **Test file warning threshold**
   - What we know: Test config downgrades errors to warnings
   - What's unclear: Should test files have ZERO warnings, or is low warning count acceptable?
   - Recommendation: Aim for zero warnings in new test files; existing tests with warnings can be cleaned opportunistically

3. **Cross-container test restructuring impact**
   - What we know: Changing `let` to `const` may require test restructuring
   - What's unclear: Will restructuring make tests less readable?
   - Recommendation: Use async IIFE pattern for complex setup; if it harms readability, use `_containerRef` prefix pattern instead

## Sources

### Primary (HIGH confidence)

- Project ESLint config: `/Users/u1070457/Projects/Perso/hex-di/eslint.config.js`
- Project rules: `/Users/u1070457/Projects/Perso/hex-di/CLAUDE.md`
- Current lint output: `pnpm lint` executed 2026-02-07
- v7.0 Milestone Audit: `.planning/v7.0-MILESTONE-AUDIT.md`

### Secondary (MEDIUM confidence)

- TypeScript ESLint documentation (standard rules)
- Hono framework Headers API patterns (inferred from usage)

### Tertiary (LOW confidence)

- None - all findings verified against codebase

## Metadata

**Confidence breakdown:**

- Lint warning inventory: HIGH - directly observed via pnpm lint
- ESLint configuration: HIGH - read from actual config files
- Fix patterns: HIGH - standard TypeScript patterns for narrowing unknown types
- Project constraints: HIGH - explicit in CLAUDE.md

**Research date:** 2026-02-07
**Valid until:** Stable (config and rules unlikely to change during Phase 29)

---

## RESEARCH COMPLETE

Phase 29 focuses on eliminating 18 lint warnings introduced in v7.0 tracing work. The fixes follow established patterns: type guards for dynamic APIs, const declarations where appropriate, and proper async handling. All fixes comply with project rules (no casts, no eslint-disable, no any types in production code). Inherited warnings (38 total) are explicitly out of scope.
