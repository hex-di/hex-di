# Specification: Child Container

## Goal
Enable hierarchical dependency injection with child containers that support adapter overrides, extensions, and configurable singleton inheritance modes (shared, forked, isolated).

## User Stories
- As a developer, I want to create child containers with overridden adapters so that I can configure different implementations for specific parts of my application without affecting the parent container.
- As a developer, I want to create nested hierarchies of child containers so that I can model complex application boundaries like multi-tenant systems or feature modules.

## Specific Requirements

**ChildContainerBuilder API Pattern**
- `container.createChild()` returns an immutable `ChildContainerBuilder<TProvides, TAsyncPorts>` instance
- Builder follows the fluent, immutable pattern established by `GraphBuilder` - each method returns a new builder instance
- Builder tracks `TParentProvides` for type-level validation of override operations
- Builder tracks `TExtends` for newly added ports via `.extend()`
- `.build()` returns a `ChildContainer<TProvides | TExtends, TAsyncPorts>` (frozen, immutable)

**Override Operation**
- `.override(adapter)` replaces a parent adapter with a new adapter for the child's scope
- Compile-time validation: adapter's `provides` port must exist in parent's `TProvides`
- Return type when port not found: `OverridePortNotFoundError<TPort>` (compile-time error type)
- Overridden singletons create their own instances in the child (not shared with parent)
- Async adapter overrides must use `isolated` inheritance mode (enforced at compile-time)

**Extend Operation**
- `.extend(adapter)` adds a new adapter providing a port that does not exist in parent
- Compile-time validation: adapter's `provides` port must NOT exist in parent's `TProvides`
- Return type when port already exists: `DuplicateProviderError<TPort>` (reuse existing error type from graph package)
- Extended ports are available only in the child container and its descendants

**Inheritance Mode Configuration**
- `.withInheritanceMode({ portName: mode })` configures per-port singleton inheritance
- Three modes: `shared` (default), `forked`, `isolated`
- `shared`: Child sees parent's singleton instance (live reference, mutations visible)
- `forked`: Child gets a snapshot copy of parent's singleton at child creation time (immutable reference)
- `isolated`: Child creates its own fresh singleton instance (ignores parent entirely)
- Mode configuration applies only to ports not explicitly overridden (overrides always create new instances)

**Resolution Behavior**
- Unidirectional resolution: child -> parent chain lookup until adapter found or root reached
- For a port, child first checks its own adapter map; if not found, delegates to parent
- Resolution uses child's effective adapter set: overrides + extensions + inherited from parent
- Circular dependency detection spans the full hierarchy via shared `ResolutionContext`

**Child Container's createScope()**
- `childContainer.createScope()` creates a scope that uses child's effective adapter set
- Scope inherits singletons from child's singleton memo (which may differ from parent's)
- Scopes created from child containers are tracked by the child for cascade disposal
- The scope follows the existing `ScopeImpl.createScope()` pattern from container.ts

**Multi-Level Hierarchy Support**
- `childContainer.createChild()` returns a new `ChildContainerBuilder` (enables grandchild containers)
- Resolution walks up the full ancestor chain: grandchild -> child -> parent
- Each level in the hierarchy can have its own overrides and inheritance mode configuration
- Inheritance mode at each level affects only that level's singleton resolution behavior
- Cycle detection prevents circular parent-child relationships

**Disposal Cascade Behavior**
- Disposing a parent container triggers disposal of all child containers first
- Disposal order is LIFO: last-created child disposed first
- Each container disposes its own scopes before its singletons (matching existing pattern)
- Child containers track their children via a `Set<ChildContainer>` (like `childScopes` in ScopeImpl)
- Disposing a child removes it from parent's child tracking set

**React Integration**
- Unified `ContainerProvider` supports nesting with child containers (no separate ChildContainerProvider)
- Unified `AsyncContainerProvider` supports nesting with async child containers
- Inheritance mode is configured at build time via `.withInheritanceMode()` in domain code
- React props do not include inheritance configuration - purely rendering
- Nested `ContainerProvider` components use child container's pre-configured behavior
- Nested `AsyncContainerProvider` components use child container's pre-configured behavior
- `useContainer()` returns the nearest container in the React tree (could be child container)
- Child containers with async adapters (via `.extend()`) require `AsyncContainerProvider` with initialization
- Compound components (`AsyncContainerProvider.Loading`, `.Error`, `.Ready`) work with nested child containers

**Type-Level Validation**
- `override`: Compile-time error if port not in parent's TProvides
- `extend`: Compile-time error if port already in parent's TProvides
- `withInheritanceMode`: Port name must be a valid key from TProvides (template literal type)
- Async adapter restrictions: Async adapters can only be overridden with `isolated` mode
- Error types include descriptive messages visible in IDE tooltips

## Existing Code to Leverage

**ContainerImpl and ScopeImpl (container.ts)**
- `ScopeImpl.createScope()` pattern at line 234 for creating child scopes with proper parent tracking
- `childScopes` Set for tracking children and cascade disposal pattern
- `getSingletonMemo()` method for accessing the memo map to fork from
- Resolution delegation pattern: `resolveInternal()` uses adapter map lookup

**MemoMap (memo-map.ts)**
- `fork()` method creates child MemoMap with parent chain lookup for singleton inheritance
- `getOrElseMemoize()` checks parent cache first before own cache
- This pattern enables `shared` mode naturally; adapt for `forked` and `isolated`

**GraphBuilder Immutable Pattern (graph index.ts)**
- `ProvideResult` and `DuplicateProviderError` patterns for compile-time error types
- `HasOverlap` and `OverlappingPorts` type utilities for duplicate detection
- `MissingDependencyError` pattern for descriptive compile-time errors

**React Context Pattern (context.tsx, create-typed-hooks.tsx, async-container-provider.tsx)**
- `ContainerContext` and `ResolverContext` dual-context pattern
- `ContainerProvider` handles nested provider detection
- `AsyncContainerProvider` handles async initialization with compound components (Loading, Error, Ready)
- `getResolver()` getter pattern for StrictMode compatibility
- `GlobalAsyncContainerContext` and `GlobalResolverContext` for async state management

## Out of Scope
- Runtime adapter swapping (adapters are immutable after container creation)
- Cross-container sharing between siblings (only parent-child relationships)
- Dynamic registration after container creation
- Scoped or transient lifetime for async adapters (remain singleton-only)
- UI/React props for inheritance mode (domain code only)
- Performance optimization for deep hierarchies (v1 focuses on correctness)
- Serialization/deserialization of child container configurations
- Lazy child container creation patterns
- Adapter interception or middleware hooks at child container level
- Graph-level child container composition (only runtime composition supported)
