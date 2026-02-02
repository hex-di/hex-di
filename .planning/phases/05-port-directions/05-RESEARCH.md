# Phase 5: Port Directions - Research

**Researched:** 2026-02-01
**Domain:** TypeScript branded types, port system extension, type guards
**Confidence:** HIGH

## Summary

This research investigates how to extend HexDI's existing port system to support explicit inbound/outbound direction markers for hexagonal architecture clarity. The codebase already has an established pattern for extending ports (via `lazyPort`), which provides a proven template for implementing directed ports.

The existing `Port<T, TName>` type uses a phantom brand pattern with `Object.freeze()` for runtime immutability. The `lazyPort` implementation demonstrates how to:

1. Create intersection types that extend `Port` with additional branded properties
2. Use runtime symbols alongside type-level brands
3. Implement type guards that properly narrow to extended port types

**Primary recommendation:** Create `DirectedPort` as an intersection type extending `Port`, following the same pattern as `LazyPort`. Use runtime symbols for direction metadata and provide factory functions that accept a metadata object parameter.

## Standard Stack

The established patterns for this domain from the existing codebase:

### Core Patterns

| Pattern                            | Location           | Purpose                         | Why Standard                |
| ---------------------------------- | ------------------ | ------------------------------- | --------------------------- |
| Phantom brand types                | `ports/types.ts`   | Nominal typing                  | Established HexDI pattern   |
| Intersection types for extension   | `adapters/lazy.ts` | Extending Port type             | Proven pattern for LazyPort |
| `Object.freeze()` for immutability | `ports/factory.ts` | Prevent mutation                | All ports are frozen        |
| Runtime + type-level symbols       | `adapters/lazy.ts` | Runtime checks + type narrowing | Needed for type guards      |

### Supporting Types

| Type               | Source           | Purpose                  |
| ------------------ | ---------------- | ------------------------ |
| `Port<T, TName>`   | `ports/types.ts` | Base port type to extend |
| `InferService<P>`  | `ports/types.ts` | Extract service type     |
| `InferPortName<P>` | `ports/types.ts` | Extract port name        |

### Alternatives Considered

| Instead of                 | Could Use                         | Tradeoff                                                                       |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| Intersection type          | Union discriminated type          | Intersection preserves all Port properties, union would require re-declaration |
| Runtime symbols            | String properties                 | Symbols prevent accidental collision, match LazyPort pattern                   |
| Separate factory functions | Single factory with discriminator | Separate functions provide better type inference and clearer API               |

## Architecture Patterns

### Recommended Project Structure

Based on existing codebase organization:

```
packages/core/src/ports/
  types.ts          # Base Port type (existing)
  factory.ts        # createPort, port() (existing)
  directed.ts       # NEW: DirectedPort, createInboundPort, createOutboundPort
  guards.ts         # NEW: isDirectedPort, isInboundPort, isOutboundPort
  index.ts          # Re-exports (if needed)
```

### Pattern 1: Intersection Type Extension (from LazyPort)

**What:** Extend `Port` via intersection type with additional branded properties
**When to use:** Adding metadata/behavior to existing Port type while preserving compatibility
**Example:**

```typescript
// Source: packages/core/src/adapters/lazy.ts (adapted)
declare const __directionBrand: unique symbol;
declare const __metadataKey: unique symbol;

type PortDirection = "inbound" | "outbound";

interface PortMetadata {
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}

type DirectedPort<TPort extends Port<unknown, string>, TDirection extends PortDirection> = TPort & {
  readonly [__directionBrand]: TDirection;
  readonly [__metadataKey]: PortMetadata;
};
```

### Pattern 2: Factory with Metadata Object (from ServiceBuilder)

**What:** Factory function that accepts a metadata object for configuration
**When to use:** When multiple optional parameters need to be provided
**Example:**

```typescript
// Following the pattern from createAdapter
interface CreateInboundPortOptions<TName extends string> {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}

function createInboundPort<const TName extends string, TService>(
  options: CreateInboundPortOptions<TName>
): InboundPort<TService, TName>;
```

### Pattern 3: Runtime Symbol + Type Brand Pairing (from LazyPort)

**What:** Use both runtime symbols and type-level unique symbols
**When to use:** When type guards need to check values at runtime
**Example:**

```typescript
// Type-level (phantom)
declare const __directionBrand: unique symbol;

// Runtime (actual symbol)
const DIRECTION_BRAND = Symbol.for("@hex-di/core/PortDirection");
const METADATA_KEY = Symbol.for("@hex-di/core/PortMetadata");

// Runtime representation
interface DirectedPortRuntime<TName extends string> {
  readonly __portName: TName;
  readonly [DIRECTION_BRAND]: PortDirection;
  readonly [METADATA_KEY]: PortMetadata;
}
```

### Anti-Patterns to Avoid

- **Modifying base Port type:** Don't add optional direction to base Port - keep it simple, use extension types
- **String-based direction property:** Don't use `__direction: string` - use branded symbols for type safety
- **Mutable metadata:** All metadata must be readonly and frozen
- **Breaking existing Port compatibility:** DirectedPort must be assignable to Port for GraphBuilder/Container

## Don't Hand-Roll

Problems that have existing solutions in the codebase:

| Problem                   | Don't Build              | Use Instead                     | Why                                       |
| ------------------------- | ------------------------ | ------------------------------- | ----------------------------------------- |
| Nominal type branding     | Manual property check    | Phantom `unique symbol` pattern | Established in Port, Adapter, Graph       |
| Object immutability       | Manual property freezing | `Object.freeze()` wrapper       | Standard pattern in all factories         |
| Type guard implementation | Inline checks            | Dedicated guard functions       | Matches `isAdapter`, `isLazyPort` pattern |
| Port name inference       | String manipulation      | `InferPortName<P>` utility      | Already exists in types.ts                |

**Key insight:** The LazyPort implementation provides a complete template. Follow it closely for DirectedPort.

## Common Pitfalls

### Pitfall 1: Breaking Port Structural Compatibility

**What goes wrong:** DirectedPort not assignable to `Port<unknown, string>` breaks GraphBuilder
**Why it happens:** Adding required properties to the intersection that Port doesn't have
**How to avoid:** Use intersection type where additional properties use branded symbols (not accessible via normal property access)
**Warning signs:** Type errors when passing DirectedPort to `.provide()` or `.resolve()`

### Pitfall 2: Losing Type Inference in Factory Functions

**What goes wrong:** Service type `T` becomes `unknown` after factory call
**Why it happens:** TypeScript struggles with multiple generic parameters
**How to avoid:** Use `const` modifier for name inference, explicit type parameters for service
**Warning signs:** `InferService<typeof port>` returns `unknown` instead of the service type

### Pitfall 3: Symbol Collision Between Type and Runtime

**What goes wrong:** Type-level symbol doesn't match runtime symbol, type guard fails
**Why it happens:** Using different symbols for compile-time vs runtime
**How to avoid:** Follow LazyPort pattern: `declare const __brand: unique symbol` for types, `Symbol.for()` for runtime
**Warning signs:** `isDirectedPort()` returns wrong result, type narrowing fails

### Pitfall 4: Forgetting to Preserve Port Name Type

**What goes wrong:** Port name becomes `string` instead of literal type
**Why it happens:** Not using `const` modifier or explicit type parameter
**How to avoid:** Use `<const TName extends string>` pattern in factory function
**Warning signs:** `port.__portName` type is `string` not `"MyPortName"`

## Code Examples

Verified patterns from the existing codebase:

### Creating Extended Port Types (from lazy.ts)

```typescript
// Source: packages/core/src/adapters/lazy.ts:76-82
export type LazyPort<TPort extends Port<unknown, string>> = Port<
  () => InferService<TPort>,
  `Lazy${InferPortName<TPort>}`
> & {
  readonly [__lazyPortBrand]: true;
  readonly [__originalPort]: TPort;
};
```

### Factory with Type-Safe Object.freeze (from factory.ts)

```typescript
// Source: packages/core/src/ports/factory.ts:62-65
function unsafeCreatePort<TService, TName extends string>(name: TName): Port<TService, TName>;
function unsafeCreatePort<TName extends string>(name: TName): PortRuntime<TName> {
  return Object.freeze({ __portName: name });
}
```

### Runtime Symbol + Type Guard Pattern (from lazy.ts)

```typescript
// Source: packages/core/src/adapters/lazy.ts:126-132
const LAZY_PORT_BRAND = Symbol.for("@hex-di/core/LazyPort");
const ORIGINAL_PORT = Symbol.for("@hex-di/core/OriginalPort");

interface LazyPortRuntime<TName extends string, TPort extends Port<unknown, string>> {
  readonly __portName: `Lazy${TName}`;
  readonly [LAZY_PORT_BRAND]: true;
  readonly [ORIGINAL_PORT]: TPort;
}
```

### Type Guard Implementation (from lazy.ts)

```typescript
// Source: packages/core/src/adapters/lazy.ts:241-243
export function isLazyPort(port: Port<unknown, string>): port is LazyPort<Port<unknown, string>> {
  return hasLazyBrand(port) && port[LAZY_PORT_BRAND] === true;
}
```

## State of the Art

| Old Approach                     | Current Approach               | When Changed      | Impact                    |
| -------------------------------- | ------------------------------ | ----------------- | ------------------------- |
| String-based type discrimination | Branded unique symbols         | Project inception | True nominal typing       |
| Mutable port objects             | `Object.freeze()` immutable    | Project inception | Prevents runtime mutation |
| Single Port type                 | Extended port types (LazyPort) | Pre-1.0           | Enables specialized ports |

**Current best practice:** Use intersection types with branded symbol properties to extend Port while maintaining backward compatibility.

## Open Questions

Things that couldn't be fully resolved:

1. **Should directed ports have direction in the port name?**
   - What we know: LazyPort prefixes name with "Lazy"
   - What's unclear: Whether to add "Inbound"/"Outbound" prefix
   - Recommendation: Do NOT add prefix - direction is metadata, not identity. Port names should be user-controlled.

2. **How should InspectorAPI expose direction information?**
   - What we know: `AdapterInfo` and `VisualizableAdapter` exist for inspection
   - What's unclear: Whether to add direction to these interfaces
   - Recommendation: Add optional `direction?: 'inbound' | 'outbound'` to AdapterInfo - backward compatible

3. **Should metadata be stored on the port or derived from the adapter?**
   - What we know: Ports are currently minimal (just name), adapters have lifetime/requires
   - What's unclear: Whether metadata belongs with port token or adapter registration
   - Recommendation: Store on port - ports represent the interface contract, metadata describes that contract

## Proposed Type Definitions

Based on research, the recommended implementation:

### DirectedPort Type

```typescript
type PortDirection = "inbound" | "outbound";

interface PortMetadata {
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}

// Base directed port type
type DirectedPort<TService, TName extends string, TDirection extends PortDirection> = Port<
  TService,
  TName
> & {
  readonly [__directionBrand]: TDirection;
  readonly [__metadataKey]: PortMetadata;
};

// Convenience aliases
type InboundPort<TService, TName extends string> = DirectedPort<TService, TName, "inbound">;
type OutboundPort<TService, TName extends string> = DirectedPort<TService, TName, "outbound">;
```

### Factory Functions

```typescript
interface CreateDirectedPortOptions<TName extends string> {
  readonly name: TName;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: readonly string[];
}

function createInboundPort<const TName extends string, TService>(
  options: CreateDirectedPortOptions<TName>
): InboundPort<TService, TName>;

function createOutboundPort<const TName extends string, TService>(
  options: CreateDirectedPortOptions<TName>
): OutboundPort<TService, TName>;
```

### Type Guards

```typescript
function isDirectedPort(
  port: Port<unknown, string>
): port is DirectedPort<unknown, string, PortDirection>;
function isInboundPort(port: Port<unknown, string>): port is InboundPort<unknown, string>;
function isOutboundPort(port: Port<unknown, string>): port is OutboundPort<unknown, string>;

// Metadata accessors
function getPortDirection(port: Port<unknown, string>): PortDirection | undefined;
function getPortMetadata(port: Port<unknown, string>): PortMetadata | undefined;
```

## Sources

### Primary (HIGH confidence)

- `packages/core/src/ports/types.ts` - Base Port type definition
- `packages/core/src/ports/factory.ts` - Port creation patterns
- `packages/core/src/adapters/lazy.ts` - Extended port pattern (LazyPort)
- `packages/core/src/adapters/guards.ts` - Type guard patterns
- `.planning/ROADMAP.md` - Requirements specification

### Secondary (MEDIUM confidence)

- `packages/runtime/src/types.ts` - Container usage of Port type
- `packages/graph/src/builder/builder.ts` - GraphBuilder port handling
- `packages/core/src/inspection/inspector-types.ts` - AdapterInfo structure

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Direct codebase analysis
- Architecture: HIGH - Follows established LazyPort pattern
- Pitfalls: HIGH - Derived from existing implementation patterns

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (stable patterns, low change velocity)
