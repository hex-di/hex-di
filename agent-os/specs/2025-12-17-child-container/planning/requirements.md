# Spec Requirements: Child Container

## Initial Description
Implementation of child container functionality for the hex-di runtime, enabling hierarchical dependency injection with scoped overrides and configurable inheritance behaviors.

## Requirements Discussion

### First Round Questions

**Q1:** API design approach for creating child containers?
**Answer:** Option C - Both Approaches. `container.createChild()` returns an immutable `ChildContainerBuilder`. Simple case: `container.createChild().build()`. Override: `container.createChild().override(Adapter).build()`. Full config: `container.createChild().override(A).extend(B).withInheritanceMode({...}).build()`.

**Q2:** How should singletons be inherited from parent to child?
**Answer:** Support all 3 modes with **shared as the default**:
- **shared** (default): Child sees parent's singleton (live reference)
- **forked**: Child gets snapshot of parent's singleton at creation time
- **isolated**: Child creates own fresh singleton (ignores parent)

**Q3:** When overriding a singleton in a child container, what happens to the parent's singleton?
**Answer:** When overriding a singleton in child, the child creates its own singleton instance (not shared with parent).

**Q4:** How should React integration work with child containers?
**Answer:** Unified ContainerProvider with nesting support. Inheritance mode is set at build time via `.withInheritanceMode()` in domain code - not in React props. React layer purely renders nested `ContainerProvider` components with no inheritance configuration. Clean separation: all DI decisions in domain code, React only renders providers.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: Container Runtime - Path: `packages/runtime/`
- Feature: React Integration - Path: `packages/react/`
- Components to potentially reuse: Container builder patterns, provider components
- Backend logic to reference: Existing container lifecycle, disposal patterns, resolution logic

### Follow-up Questions

No follow-up questions were required - requirements were clearly specified.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - This is a programmatic API feature without UI components.

## Requirements Summary

### Functional Requirements
- `container.createChild()` returns an immutable `ChildContainerBuilder`
- `childContainer.createChild()` also returns a builder (enables multi-level hierarchies)
- `childContainer.createScope()` creates a scope that uses child's adapters (overrides/extensions)
- Builder supports `.override(Adapter)` to replace parent adapter for child scope
- Builder supports `.extend(Adapter)` to add new port not in parent
- Builder supports `.withInheritanceMode({...})` for per-port inheritance configuration
- Builder finalizes with `.build()` returning the child container
- Three singleton inheritance modes: shared (default), forked, isolated
- Child container overrides create their own singleton instances
- Unidirectional resolution: child -> parent chain lookup (supports unlimited depth)
- Disposal cascade: parent dispose triggers all descendants to dispose first (LIFO order)
- Cycle detection: prevent circular parent-child relationships
- Multi-level inheritance: grandchild resolves from child, which resolves from parent if needed
- Scopes from child containers are tracked by the child for cascade disposal

### React Integration Requirements
- Unified `ContainerProvider` that allows nesting (no separate ChildContainerProvider needed)
- Unified `AsyncContainerProvider` that allows nesting with async child containers
- Inheritance mode is set at build time via `.withInheritanceMode()` in domain code
- React layer has no inheritance configuration props - purely rendering
- Nested `ContainerProvider` components automatically use child container's configured behavior
- Nested `AsyncContainerProvider` components work with async child containers (those with async adapters via `.extend()`)
- Compound components (`AsyncContainerProvider.Loading`, `.Error`, `.Ready`) work with nested child containers
- Per-port inheritance mode configuration supported via builder API
- Clean separation: all DI decisions in domain code, React only renders providers

### Reusability Opportunities
- Existing container builder patterns in runtime package
- Provider component patterns in react package
- Disposal and lifecycle management from current container implementation
- Resolution logic patterns for dependency lookup

### Scope Boundaries

**In Scope (v1):**
- Multi-level child container hierarchies (parent -> child -> grandchild, etc.)
- Child containers can create their own child containers via `childContainer.createChild()`
- Child containers can create scopes via `childContainer.createScope()`
- Scopes created from child containers use the child's adapter overrides/extensions
- 3 inheritance modes: shared (default), forked, isolated
- Override operation (replace parent adapter for child scope)
- Extend operation (add new port not in parent)
- Unidirectional resolution (child -> parent chain lookup)
- Builder API pattern (immutable, fluent)
- Disposal cascade (parent dispose -> all descendants dispose first, LIFO order)
- Cycle detection (prevent circular relationships in hierarchy)
- Inheritance mode composition: grandchild inherits from child's effective configuration

**Out of Scope (v1):**
- Runtime adapter swapping - Not planned
- Cross-container sharing (siblings) - Not planned
- Dynamic registration after creation - Not planned

### Technical Considerations
- Async adapters: Override allowed, must use `isolated` mode
- Type validation: Compile-time validation for override (port exists) / extend (port doesn't exist)
- Immutable builder pattern ensures thread-safe configuration
- Child containers must maintain reference to parent for resolution fallback
- Parent containers must track children for disposal cascade
- Multi-level hierarchy implementation follows existing `ScopeImpl.createScope()` pattern (see `container.ts:234`)
- Each child container tracks its own children via a Set (like `childScopes` in ScopeImpl)
- Resolution walks up the parent chain until adapter is found or root is reached
- Inheritance mode at each level affects only that level's singleton resolution behavior
- Scopes created from child containers resolve using the child's effective adapter set (overrides + extensions + inherited)
- Child container's singleton memo is used as the base for scope's singleton sharing
