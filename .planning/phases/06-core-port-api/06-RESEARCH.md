# Phase 6: Core Port API - Research

**Researched:** 2026-02-01
**Domain:** TypeScript API design, branded types, type inference from config objects
**Confidence:** HIGH

## Summary

This research investigates how to unify the three separate port creation functions (`createPort(string)`, `createInboundPort`, `createOutboundPort`) into a single `createPort()` function with an object config and metadata. The Phase 5 implementation has already established the `DirectedPort` type with direction branding, metadata storage via runtime symbols, and type guards. This phase extends that work by:

1. Replacing the old string-based `createPort()` with object config accepting `name`, `direction`, and metadata
2. Making `direction` optional with default of `'outbound'` (inferred at type level)
3. Removing `createInboundPort()` and `createOutboundPort()` entirely
4. Ensuring all ports have direction at the type level (no undirected Port type)

The codebase already has established patterns from `createAdapter()` for using overloads to handle default type parameters, and from Phase 5 for creating directed ports with metadata.

**Primary recommendation:** Implement `createPort()` with function overloads to handle direction defaults. Use the `<TService>({ name, direction? })` API pattern for maximum type inference, following the established `createAdapter()` overload pattern for defaults.

## Standard Stack

This phase uses only existing codebase patterns - no new external dependencies:

### Core Patterns from Codebase

| Pattern                         | Location              | Purpose                  | Why Standard                                    |
| ------------------------------- | --------------------- | ------------------------ | ----------------------------------------------- |
| Function overloads for defaults | `adapters/factory.ts` | Type-safe default values | Established in `createAdapter()` for `clonable` |
| `const` type parameter modifier | `ports/factory.ts`    | Preserve literal types   | Used in all port factories                      |
| Runtime symbols for metadata    | `ports/directed.ts`   | Store direction/metadata | Established in Phase 5                          |
| `Object.freeze()` immutability  | `ports/factory.ts`    | Prevent mutation         | All ports are frozen                            |

### Supporting Types

| Type                                 | Source              | Status                                            |
| ------------------------------------ | ------------------- | ------------------------------------------------- |
| `DirectedPort<T, TName, TDirection>` | `ports/types.ts`    | Already exists from Phase 5                       |
| `PortDirection`                      | `ports/types.ts`    | Already exists: `'inbound' \| 'outbound'`         |
| `PortMetadata`                       | `ports/types.ts`    | Already exists with description, category, tags   |
| Runtime symbols                      | `ports/directed.ts` | Already exists: `DIRECTION_BRAND`, `METADATA_KEY` |

### No External Dependencies

This is purely internal API refactoring using existing TypeScript patterns.

## Architecture Patterns

### Recommended API Design

**Final API (user-facing):**

```typescript
// Basic usage - direction defaults to 'outbound'
const LoggerPort = createPort<Logger>({ name: "Logger" });
// Type: DirectedPort<Logger, 'Logger', 'outbound'>

// Explicit direction
const UserServicePort = createPort<UserService>({
  name: "UserService",
  direction: "inbound",
});
// Type: DirectedPort<UserService, 'UserService', 'inbound'>

// With full metadata
const UserRepoPort = createPort<UserRepository>({
  name: "UserRepository",
  direction: "outbound",
  description: "User persistence operations",
  category: "persistence",
  tags: ["user", "database"],
});
// Type: DirectedPort<UserRepository, 'UserRepository', 'outbound'>
```

### Pattern 1: Overloads for Direction Default

**What:** Use function overloads to provide type-safe default for `direction`
**When to use:** When a property has a default value that should be reflected in the return type
**Rationale:** This matches the established `createAdapter()` pattern for the `clonable` property

```typescript
// Source: adapted from packages/core/src/adapters/factory.ts:203-243

// Overload 1: direction NOT provided - defaults to 'outbound'
export function createPort<TService>(
  config: Omit<CreatePortConfig<string, "outbound">, "direction"> & {
    direction?: undefined;
  }
): DirectedPort<TService, string, "outbound">;

// Overload 2: direction IS provided - uses literal type
export function createPort<TService, const TDirection extends PortDirection>(
  config: CreatePortConfig<string, TDirection> & {
    direction: TDirection;
  }
): DirectedPort<TService, string, TDirection>;

// Implementation
export function createPort<TService>(
  config: CreatePortConfig<string, PortDirection>
): DirectedPort<TService, string, PortDirection>;
```

### Pattern 2: Type Parameter Order for Maximum Inference

**What:** Order type parameters so users only specify `TService`
**Decision:** `<TService>` only - name and direction inferred from config

The user decisions state:

- Name should be inferable from config: `createPort<Logger>({ name: 'Logger' })`
- Direction should be inferred from config: `createPort<Logger>({ name: 'Logger', direction: 'inbound' })`

**Recommendation:** Place `TService` first (only explicit param), infer rest from config:

```typescript
function createPort<
  TService,
  const TName extends string = string,
  const TDirection extends PortDirection = "outbound",
>(config: CreatePortConfig<TName, TDirection>): DirectedPort<TService, TName, TDirection>;
```

However, TypeScript does not infer later type parameters when earlier ones are explicitly provided. Using overloads is more reliable:

```typescript
// This pattern works because const inference happens in the overload selection
export function createPort<TService, const TName extends string>(
  config: CreatePortConfig<TName, "outbound"> & { direction?: undefined }
): DirectedPort<TService, TName, "outbound">;

export function createPort<
  TService,
  const TName extends string,
  const TDirection extends PortDirection,
>(
  config: CreatePortConfig<TName, TDirection> & { direction: TDirection }
): DirectedPort<TService, TName, TDirection>;
```

### Pattern 3: Suggested Union with Escape Hatch for Category

**What:** Provide suggested values while allowing arbitrary strings
**Decision from CONTEXT.md:** `'persistence' | 'messaging' | 'external-api' | ... | string`

```typescript
// Suggested categories with escape hatch
type SuggestedCategory =
  | "persistence"
  | "messaging"
  | "external-api"
  | "logging"
  | "configuration"
  | "domain"
  | "infrastructure"
  | (string & {}); // Escape hatch - any string works

interface CreatePortConfig<TName extends string, TDirection extends PortDirection> {
  readonly name: TName;
  readonly direction?: TDirection;
  readonly description?: string;
  readonly category?: SuggestedCategory;
  readonly tags?: readonly string[];
}
```

The `(string & {})` trick preserves autocomplete for suggested values while accepting any string.

### Pattern 4: Port Type Always Has Direction

**What:** Remove undirected `Port` usage, all ports are `DirectedPort`
**Decision:** The base `Port<T, TName>` type remains for backward compatibility with existing code that accepts ports, but all newly created ports are `DirectedPort`.

The existing `DirectedPort` is already assignable to `Port`:

```typescript
// From types.ts - DirectedPort extends Port via intersection
type DirectedPort<TService, TName extends string, TDirection extends PortDirection> = Port<
  TService,
  TName
> & {
  readonly [__directionBrand]: TDirection;
  readonly [__metadataKey]: PortMetadata;
};
```

This means existing code that accepts `Port<unknown, string>` continues to work.

### Anti-Patterns to Avoid

- **Removing base Port type:** Keep `Port<T, TName>` for library consumers who accept ports generically
- **Breaking structural compatibility:** `DirectedPort` must remain assignable to `Port`
- **Complex type parameter inference:** Use overloads instead of complex conditional type inference
- **Non-const type parameters:** Always use `const` modifier for name inference

## Don't Hand-Roll

| Problem                    | Don't Build               | Use Instead                                          | Why                               |
| -------------------------- | ------------------------- | ---------------------------------------------------- | --------------------------------- |
| Direction default handling | Complex conditional types | Function overloads                                   | Matches `createAdapter()` pattern |
| Runtime symbol storage     | New symbol scheme         | Existing `DIRECTION_BRAND`, `METADATA_KEY`           | Already implemented in Phase 5    |
| Port freezing              | Manual property setup     | Existing `Object.freeze()` pattern                   | Established in all factories      |
| Type guards                | New implementation        | Existing `isDirectedPort()`, `isInboundPort()`, etc. | Already exist from Phase 5        |

**Key insight:** Phase 5 already implemented the runtime infrastructure. This phase is primarily API consolidation - unifying entry points, not reimplementing internals.

## Common Pitfalls

### Pitfall 1: Losing Name Literal Type

**What goes wrong:** Port name becomes `string` instead of literal `'Logger'`
**Why it happens:** Not using `const` modifier in type parameter
**How to avoid:** Use `<const TName extends string>` pattern
**Warning signs:** `port.__portName` type is `string` not `"Logger"`

```typescript
// WRONG - loses literal type
function createPort<TService, TName extends string>(config: {
  name: TName;
}): DirectedPort<TService, TName, "outbound">;

// CORRECT - preserves literal type
function createPort<TService, const TName extends string>(config: {
  name: TName;
}): DirectedPort<TService, TName, "outbound">;
```

### Pitfall 2: Direction Default Not Reflected in Type

**What goes wrong:** Omitting `direction` gives union type `'inbound' | 'outbound'` instead of `'outbound'`
**Why it happens:** Using default parameter instead of overloads
**How to avoid:** Use function overloads for each case
**Warning signs:** `InferPortDirection<typeof port>` returns union instead of literal

```typescript
// WRONG - default doesn't affect type
function createPort<TService, TDirection extends PortDirection = "outbound">(config: {
  name: string;
  direction?: TDirection;
}): DirectedPort<TService, string, TDirection>;

// CORRECT - overload specifies exact type
function createPort<TService, const TName extends string>(config: {
  name: TName;
  direction?: undefined;
}): DirectedPort<TService, TName, "outbound">; // Literal 'outbound', not union
```

### Pitfall 3: Breaking Existing Tests

**What goes wrong:** Tests using old APIs fail to compile
**Why it happens:** Removing `createInboundPort`, `createOutboundPort`, string `createPort`
**How to avoid:** Update all tests as part of this phase (per CONTEXT.md decisions)
**Warning signs:** TypeScript compilation errors in test files

Tests to update:

- `packages/core/tests/directed-ports.test.ts` - Uses old APIs
- `packages/graph/tests/runtime-error-codes.test.ts` - Uses string createPort
- `packages/graph/tests/property-based-helpers.ts` - Uses string createPort

### Pitfall 4: Incorrect IDE Hover Display

**What goes wrong:** IDE shows `Port<Logger, 'Logger'>` instead of `DirectedPort<Logger, 'Logger', 'outbound'>`
**Why it happens:** Return type not specific enough
**How to avoid:** Ensure overload return types are fully specified with direction
**Warning signs:** Hovering over port variable shows direction as parameter not literal

## Code Examples

### Example 1: New createPort() Implementation

```typescript
// Source: Adapted from existing patterns in codebase

// Config interface
interface CreatePortConfig<TName extends string, TDirection extends PortDirection> {
  readonly name: TName;
  readonly direction?: TDirection;
  readonly description?: string;
  readonly category?: SuggestedCategory;
  readonly tags?: readonly string[];
}

// Overload 1: direction omitted - defaults to 'outbound'
export function createPort<TService, const TName extends string>(
  config: CreatePortConfig<TName, "outbound"> & { direction?: undefined }
): DirectedPort<TService, TName, "outbound">;

// Overload 2: direction provided - uses specified direction
export function createPort<
  TService,
  const TName extends string,
  const TDirection extends PortDirection,
>(
  config: CreatePortConfig<TName, TDirection> & { direction: TDirection }
): DirectedPort<TService, TName, TDirection>;

// Implementation
export function createPort<TService, const TName extends string>(
  config: CreatePortConfig<TName, PortDirection>
): DirectedPort<TService, TName, PortDirection> {
  const direction = config.direction ?? "outbound";
  const metadata: PortMetadata = Object.freeze({
    description: config.description,
    category: config.category,
    tags: config.tags,
  });

  const runtime = Object.freeze({
    __portName: config.name,
    [DIRECTION_BRAND]: direction,
    [METADATA_KEY]: metadata,
  });

  return createDirectedPortImpl<TService, TName, PortDirection>(runtime);
}
```

### Example 2: Usage Patterns

```typescript
// Basic - direction defaults to 'outbound'
const LoggerPort = createPort<Logger>({ name: "Logger" });
// Type: DirectedPort<Logger, 'Logger', 'outbound'>

// Explicit inbound
const UserServicePort = createPort<UserService>({
  name: "UserService",
  direction: "inbound",
});
// Type: DirectedPort<UserService, 'UserService', 'inbound'>

// Full metadata
const UserRepoPort = createPort<UserRepository>({
  name: "UserRepository",
  direction: "outbound",
  description: "User persistence",
  category: "persistence",
  tags: ["user", "database"],
});
// Type: DirectedPort<UserRepository, 'UserRepository', 'outbound'>

// Type inference verification
type D1 = InferPortDirection<typeof LoggerPort>; // 'outbound'
type D2 = InferPortDirection<typeof UserServicePort>; // 'inbound'
```

### Example 3: Migration from Old APIs

```typescript
// OLD: createInboundPort
const OldPort = createInboundPort<"UserService", UserService>({
  name: "UserService",
});

// NEW: createPort with direction
const NewPort = createPort<UserService>({
  name: "UserService",
  direction: "inbound",
});

// OLD: createOutboundPort
const OldRepoPort = createOutboundPort<"UserRepo", UserRepository>({
  name: "UserRepo",
});

// NEW: createPort (outbound is default)
const NewRepoPort = createPort<UserRepository>({
  name: "UserRepo",
});
// Or explicit:
const NewRepoPort2 = createPort<UserRepository>({
  name: "UserRepo",
  direction: "outbound",
});

// OLD: string createPort
const OldStringPort = createPort<"Logger", Logger>("Logger");

// NEW: object createPort
const NewObjectPort = createPort<Logger>({ name: "Logger" });
```

## State of the Art

| Old Approach (Phase 5)         | New Approach (Phase 6)                        | Impact                |
| ------------------------------ | --------------------------------------------- | --------------------- |
| `createPort('Name')`           | `createPort({ name: 'Name' })`                | Unified config object |
| `createInboundPort({ name })`  | `createPort({ name, direction: 'inbound' })`  | Single function       |
| `createOutboundPort({ name })` | `createPort({ name })` (default outbound)     | Simpler API           |
| Direction optional             | Direction always present (default 'outbound') | Type clarity          |
| `Port<T, TName>` undirected    | All ports are `DirectedPort`                  | Hexagonal clarity     |

**Deprecated/removed:**

- `createInboundPort()` - Use `createPort({ direction: 'inbound' })`
- `createOutboundPort()` - Use `createPort({ direction: 'outbound' })`
- `createPort(string)` - Use `createPort({ name: string })`
- `port<T>()('Name')` - Use `createPort<T>({ name: 'Name' })`

## Open Questions

None - all decisions locked in CONTEXT.md:

- Direction defaults to 'outbound' when omitted
- Object config only (no string overload)
- All ports have direction at type level
- Name and direction inferred from config object
- Metadata optionality (description, category, tags all optional)

## Sources

### Primary (HIGH confidence)

- `packages/core/src/ports/types.ts` - DirectedPort type, PortDirection, PortMetadata
- `packages/core/src/ports/directed.ts` - Phase 5 implementation with runtime symbols
- `packages/core/src/ports/factory.ts` - Current createPort implementation
- `packages/core/src/adapters/factory.ts` - Overload pattern for createAdapter
- `.planning/phases/05-port-directions/05-RESEARCH.md` - Phase 5 research
- `.planning/phases/06-core-port-api/06-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)

- `packages/core/tests/directed-ports.test.ts` - Test patterns to migrate
- `packages/graph/tests/runtime-error-codes.test.ts` - Tests using old createPort

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Direct codebase analysis, established patterns
- Architecture: HIGH - Follows existing overload patterns from createAdapter
- Pitfalls: HIGH - Derived from Phase 5 research and existing patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable TypeScript patterns, low change velocity)
