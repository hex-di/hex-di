# Glossary

Terminology used throughout the `@hex-di/core` specification.

## Port

A typed contract declaring what a service looks like without specifying how it works. Created by `port<T>()({ name, direction?, category?, tags? })` or `createPort(config)`. Ports are `Object.freeze()`d at creation and carry metadata (name, direction, category, tags, description). The port name is a literal type used as the key in dependency graphs. See [BEH-CO-01](behaviors/01-port-definition.md).

## Adapter

An implementation binding that connects a factory function or class constructor to one or more ports. Created by `createAdapter({ provides, requires?, factory?, class?, lifetime? })`. Adapters declare what they provide (ports they implement) and what they require (ports they depend on). See [BEH-CO-02](behaviors/02-adapter-creation.md).

## Container

The runtime resolution engine that resolves port references to adapter instances. Manages instance lifetimes (singleton caching, scope boundaries, transient creation) and disposal ordering. See [BEH-CO-04](behaviors/04-container-lifecycle.md).

## Scope

A bounded lifetime context within a container. Scoped adapters share a single instance within one scope but get fresh instances in different scopes. Child containers create new scopes. See [BEH-CO-04](behaviors/04-container-lifecycle.md).

## Lifetime

The instance management strategy for an adapter: `SINGLETON` (one instance for the container's lifetime), `SCOPED` (one instance per scope), or `TRANSIENT` (new instance per resolution). See [BEH-CO-02](behaviors/02-adapter-creation.md).

## Frozen Port Reference

A port object that has been `Object.freeze()`d, preventing property modification after creation. Ensures that port contracts cannot be tampered with at runtime. When extended to resolved services, prevents capability mutation after injection. See [BEH-CO-05](behaviors/05-frozen-port-references.md) and [ADR-CO-001](decisions/001-frozen-port-references.md).

## Blame Context

A structured error annotation identifying which adapter violated which contract, including: `adapterFactory` (the adapter that failed), `portContract` (the port whose contract was violated), `violationType` (what went wrong), and `resolutionPath` (the dependency chain leading to the failure). Derived from contract blame theory (RES-06). See [BEH-CO-06](behaviors/06-blame-aware-errors.md) and [ADR-CO-002](decisions/002-blame-context-model.md).

## Phantom State

A type parameter that exists only at compile time with no runtime representation, used to encode state information. In `@hex-di/core`, phantom state types track container and adapter lifecycle phases (e.g., `"active" | "disposed"`) to prevent invalid operations at compile time. Derived from linear type theory (RES-03). See [BEH-CO-07](behaviors/07-disposal-state-branding.md) and [ADR-CO-003](decisions/003-disposal-state-phantom-types.md).

## Capability

A reference to a service obtained through port injection. In capability-based security theory, possessing a reference IS the authorization to use it. `@hex-di/core` models port injection as capability granting — a component can only use services for which it holds port references. See [BEH-CO-11](behaviors/11-capability-analyzer.md).

## Ambient Authority

A dependency accessed through global state, module-level singletons, or environment variables rather than through explicit port injection. Ambient authority bypasses the capability model and cannot be analyzed or restricted by the DI framework. See [BEH-CO-11](behaviors/11-capability-analyzer.md).

## Chaperone

A proxy wrapper around a resolved service that enforces contracts (pre/postconditions, invariants) at runtime without modifying the underlying implementation. Derived from Racket's chaperone contracts (RES-06). See [ADR-CO-004](decisions/004-chaperone-contract-enforcement.md).

## Scoped Reference

A branded reference type `ScopedRef<T, ScopeId>` that encodes scope identity at the type level. Prevents scope escape — a reference obtained in one scope cannot be used in a different scope without explicit transfer. Derived from linear type scope tracking (RES-03). See [BEH-CO-09](behaviors/09-scoped-reference-tracking.md).

## AdapterHandle

A typed handle `AdapterHandle<T, State>` that tracks adapter lifecycle state via phantom type parameters. `State` is `"active"` after construction and `"disposed"` after cleanup. Methods are conditionally available based on state, preventing use-after-dispose at compile time. See [BEH-CO-08](behaviors/08-adapter-lifecycle-states.md).

## Behavioral Specification

A machine-readable pre/postcondition annotation on port methods that can be verified at runtime or compile time. Enables contract-based programming where adapters declare and verify their behavioral obligations. See [BEH-CO-13](behaviors/13-behavioral-port-specs.md).

## Protocol State Machine

A state machine encoding on a port type that constrains the valid ordering of method calls. Uses phantom state parameters to make invalid call sequences a type error. Derived from session type theory (RES-02). See [BEH-CO-12](behaviors/12-protocol-state-machines.md).
