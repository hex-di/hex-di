# ADR-CO-003: Disposal State Phantom Types

## Status

Proposed

## Context

The current container API allows calling `resolve()` on a disposed container, which fails at **runtime** with an error. This is a common source of bugs in long-lived applications where containers are disposed during shutdown but stale references still attempt resolution.

Linear and affine type systems (see [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md)) solve this at the type level: a resource consumed (disposed) cannot be used again. TypeScript cannot enforce true linear types, but **phantom type parameters** can encode state transitions that make invalid operations a type error.

### Current behavior

```typescript
const container = buildContainer(graph);
await container.dispose();
container.resolve(LoggerPort); // Runtime error: "Container is disposed"
```

### Desired behavior

```typescript
const container: Container<Ports, "active"> = buildContainer(graph);
const disposed: Container<Ports, "disposed"> = await container.dispose();
disposed.resolve(LoggerPort);
//       ^^^^^^^ Type error: Property 'resolve' does not exist on Container<Ports, "disposed">
```

## Decision

**Add a phantom type parameter `TPhase` to `Container` that tracks lifecycle state.** Methods are conditionally available based on the phase.

### Type definition

```typescript
interface Container<TProvides, TPhase extends ContainerPhase = "active"> {
  // Only available when active
  resolve: TPhase extends "active"
    ? <N extends keyof TProvides>(port: Port<N, TProvides[N]>) => TProvides[N]
    : never;

  // Only available when active
  createScope: TPhase extends "active" ? () => Container<TProvides, "active"> : never;

  // Transitions from active to disposed
  dispose: TPhase extends "active" ? () => Promise<Container<TProvides, "disposed">> : never;

  // Always available — introspection
  readonly phase: TPhase;
  readonly isDisposed: TPhase extends "disposed" ? true : false;
}

type ContainerPhase = "active" | "disposed";
```

### State transition

```typescript
// dispose() returns a new type — the old variable keeps "active" type
// but the runtime container is now disposed
const active: Container<Ports, "active"> = buildContainer(graph);
const disposed: Container<Ports, "disposed"> = await active.dispose();

// TypeScript prevents this:
active.resolve(LoggerPort);
// Technically the runtime object is disposed, but the TYPE still says "active"
// This is a limitation — see "Aliasing caveat" below
```

### Aliasing caveat

TypeScript phantom types cannot prevent aliasing: if a variable typed as `Container<P, "active">` is disposed via another reference, the original variable still has the `"active"` type. This is a fundamental limitation of phantom types in TypeScript.

Mitigation: `dispose()` returns the disposed container as a new type. Coding conventions should use the returned value and avoid using the original reference. ESLint rules can flag continued use of a variable after `.dispose()` is called on it.

### Runtime fallback

The runtime `resolve()` method still checks disposal state and throws on violation. The phantom type is a **compile-time assist**, not a replacement for runtime safety.

## Consequences

### Positive

1. **Compile-time safety**: Most use-after-dispose bugs are caught by TypeScript before runtime
2. **Self-documenting**: The container type communicates its lifecycle state in function signatures
3. **Composable**: Functions can declare `Container<P, "active">` parameters, refusing disposed containers at the type level

### Negative

1. **Aliasing gap**: Phantom types cannot prevent use-after-dispose through aliased references (see caveat above)
2. **API change**: Adding `TPhase` parameter is a breaking change for code that references `Container<TProvides>` explicitly
3. **Type complexity**: Conditional method types may produce less readable type errors

### Neutral

1. **Runtime behavior unchanged**: The runtime disposal check remains as a safety net
2. **Default parameter**: `TPhase = "active"` means existing code that doesn't specify the phase parameter continues to work

## References

- [INV-CO-5](../invariants.md#inv-co-5-phantom-disposal-prevention): Phantom Disposal Prevention
- [BEH-CO-07](../behaviors/07-disposal-state-branding.md): Disposal State Branding behavior
- [RES-03](../../../research/RES-03-linear-affine-types-resource-lifecycle.md): Linear & Affine Types
