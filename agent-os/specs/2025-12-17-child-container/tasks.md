# Task Breakdown: Child Container

## Overview
Total Tasks: 42 (across 7 task groups)

This feature implements hierarchical dependency injection with child containers that support adapter overrides, extensions, and configurable singleton inheritance modes (shared, forked, isolated).

## Task List

### Runtime Package - Core Infrastructure

#### Task Group 1: ChildContainerBuilder Foundation
**Dependencies:** None
**Package:** `packages/runtime`

- [x] 1.0 Complete ChildContainerBuilder with immutable fluent API
  - [x] 1.1 Write 6-8 focused tests for ChildContainerBuilder core functionality
    - Test `container.createChild()` returns a builder instance
    - Test builder immutability (each method returns new instance)
    - Test `.build()` creates a frozen ChildContainer
    - Test empty child container (no overrides/extends) inherits parent adapters
    - Test basic adapter resolution from child delegates to parent
    - Test child container `isDisposed` property
  - [x] 1.2 Create `child-container-builder.ts` with ChildContainerBuilder class
    - Type parameters: `TParentProvides`, `TProvides`, `TExtends`, `TAsyncPorts`
    - Private constructor enforcing factory method pattern
    - Immutable internal state (adapters array, inheritance modes map)
    - Follow GraphBuilder immutable pattern from `packages/graph/src/index.ts`
  - [x] 1.3 Implement `container.createChild()` method on ContainerImpl
    - Returns `ChildContainerBuilder<TProvides, TAsyncPorts>`
    - Pass parent reference to builder
    - Add method to Container type in `types.ts`
  - [x] 1.4 Implement `.build()` method on ChildContainerBuilder
    - Returns frozen `ChildContainer<TProvides | TExtends, TAsyncPorts>`
    - Creates child's adapter map merging parent + overrides + extends
    - Implements unidirectional resolution (child -> parent lookup)
  - [x] 1.5 Add ChildContainer type to `types.ts`
    - Similar structure to Container type
    - Include `parent` reference (readonly)
    - Include `createChild()` for multi-level hierarchy support
    - Include `createScope()` for scope creation from child
  - [x] 1.6 Ensure Task Group 1 tests pass
    - Run ONLY the 6-8 tests written in 1.1
    - Verify builder immutability and basic functionality

**Acceptance Criteria:**
- `container.createChild()` returns ChildContainerBuilder
- Builder methods return new instances (immutable pattern)
- `.build()` creates frozen ChildContainer
- Child container resolves from parent when adapter not overridden
- All 6-8 tests from 1.1 pass

---

#### Task Group 2: Override and Extend Operations
**Dependencies:** Task Group 1
**Package:** `packages/runtime`

- [x] 2.0 Complete override and extend operations with type-level validation
  - [x] 2.1 Write 6-8 focused tests for override and extend operations
    - Test `.override(adapter)` replaces parent adapter in child scope
    - Test override creates new singleton instance (not shared with parent)
    - Test `.extend(adapter)` adds new port not in parent
    - Test extended port resolves only in child (not visible to parent)
    - Test compile-time error for override of non-existent port (type test)
    - Test compile-time error for extend of existing port (type test)
  - [x] 2.2 Implement `.override(adapter)` method
    - Type constraint: adapter's `provides` must exist in `TParentProvides`
    - Return type includes `OverridePortNotFoundError<TPort>` when port not found
    - Overridden adapters stored in child's override map
    - Follow ProvideResult pattern from GraphBuilder
  - [x] 2.3 Implement `.extend(adapter)` method
    - Type constraint: adapter's `provides` must NOT exist in `TParentProvides`
    - Return type includes `DuplicateProviderError<TPort>` when port exists
    - Extended adapters tracked separately, accumulate to `TExtends`
    - Reuse HasOverlap and DuplicateProviderError from graph package
  - [x] 2.4 Create type-level error types for override validation
    - Create `OverridePortNotFoundError<TPort>` type in graph package
    - Pattern matches MissingDependencyError structure
    - Include readable message: `'Port not found in parent: ${PortName}'`
  - [x] 2.5 Update child resolution logic for overrides
    - Check child's override map first
    - Then check child's extend map
    - Finally delegate to parent container
  - [x] 2.6 Ensure Task Group 2 tests pass
    - Run ONLY the 6-8 tests written in 2.1
    - Verify type-level tests compile correctly

**Acceptance Criteria:**
- `.override()` replaces parent adapter for child scope
- Override creates separate singleton instance in child
- `.extend()` adds ports not available in parent
- Compile-time errors for invalid override/extend operations
- All 6-8 tests from 2.1 pass

---

#### Task Group 3: Inheritance Mode Configuration
**Dependencies:** Task Group 2
**Package:** `packages/runtime`

- [x] 3.0 Complete inheritance mode configuration with three modes
  - [x] 3.1 Write 6-8 focused tests for inheritance modes
    - Test `shared` mode (default): child sees parent's singleton instance
    - Test `shared` mode: mutations in child visible in parent
    - Test `forked` mode: child gets snapshot copy at creation time
    - Test `forked` mode: mutations in child NOT visible in parent
    - Test `isolated` mode: child creates fresh singleton instance
    - Test mode configuration applies only to non-overridden ports
  - [x] 3.2 Create `InheritanceMode` type and constants
    - Type: `'shared' | 'forked' | 'isolated'`
    - Default mode: `'shared'`
    - Export from runtime package
  - [x] 3.3 Implement `.withInheritanceMode()` method on builder
    - Signature: `.withInheritanceMode({ [portName]: mode })`
    - Type-level validation: port name must be valid key from TProvides
    - Uses template literal type for port name validation
    - Returns new builder with updated mode map
  - [x] 3.4 Implement `shared` mode in child resolution
    - Default behavior - delegate to parent's singleton memo
    - Child sees live reference to parent's instance
    - Reuse existing MemoMap parent chain lookup
  - [x] 3.5 Implement `forked` mode in child resolution
    - At child creation: snapshot parent's singleton instances
    - Use MemoMap.fork() as base, copy specific instances
    - Child modifications don't affect parent's memo
  - [x] 3.6 Implement `isolated` mode in child resolution
    - Child ignores parent's singleton entirely
    - Creates fresh instance using child's factory
    - Store in child's own singleton memo
  - [x] 3.7 Add async adapter restriction for override
    - Async adapters can only be overridden with `isolated` mode
    - Compile-time type constraint on `.override()` for async adapters
    - Runtime validation as backup
  - [x] 3.8 Ensure Task Group 3 tests pass
    - Run ONLY the 6-8 tests written in 3.1
    - Verify all three modes work correctly

**Acceptance Criteria:**
- Three inheritance modes: shared, forked, isolated
- Shared mode allows live reference sharing (default)
- Forked mode creates snapshot at child creation
- Isolated mode creates fresh instances
- Async adapter overrides enforce isolated mode
- All 6-8 tests from 3.1 pass

---

#### Task Group 4: Multi-Level Hierarchy and Disposal
**Dependencies:** Task Group 3
**Package:** `packages/runtime`

- [x] 4.0 Complete multi-level hierarchy and disposal cascade
  - [x] 4.1 Write 6-8 focused tests for hierarchy and disposal
    - Test `childContainer.createChild()` creates grandchild builder
    - Test resolution walks up full ancestor chain
    - Test disposal cascade: parent dispose triggers children first
    - Test disposal order is LIFO (last-created child first)
    - Test child removes itself from parent's tracking on dispose
    - Test `childContainer.createScope()` creates scope with child's adapters
  - [x] 4.2 Implement `createChild()` on ChildContainer
    - Returns new `ChildContainerBuilder` with child as parent
    - Enables grandchild containers (unlimited depth)
    - Pass reference to child container (not root)
  - [x] 4.3 Implement ancestor chain resolution
    - Resolution walks up: grandchild -> child -> parent
    - Each level checks its own overrides/extends first
    - Stops when adapter found or root reached
    - Share ResolutionContext across hierarchy for cycle detection
  - [x] 4.4 Implement child container tracking on parent
    - Add `childContainers: Set<ChildContainer>` to ContainerImpl
    - Track children created via `createChild().build()`
    - Remove child from set on child disposal
    - Follow existing `childScopes` pattern
  - [x] 4.5 Implement disposal cascade behavior
    - Disposing parent triggers disposal of all child containers
    - Disposal order: LIFO (last-created child disposed first)
    - Each container disposes its scopes before singletons
    - Match existing ScopeImpl disposal pattern
  - [x] 4.6 Implement `createScope()` on ChildContainer
    - Creates scope using child's effective adapter set
    - Scope inherits from child's singleton memo
    - Scope tracked by child container for cascade disposal
    - Follow existing `ScopeImpl.createScope()` pattern (line 234)
  - [x] 4.7 Implement cycle detection for parent-child relationships
    - Prevent circular parent-child chains
    - Check on `createChild()` that ancestor chain is acyclic
    - Throw descriptive error if cycle detected
    - NOTE: Cycle detection is implicitly prevented by the immutable design (containers are frozen, parents set at build time only)
  - [x] 4.8 Ensure Task Group 4 tests pass
    - Run ONLY the 6-8 tests written in 4.1
    - Verify multi-level hierarchy works correctly

**Acceptance Criteria:**
- `childContainer.createChild()` enables grandchild containers
- Resolution walks up ancestor chain correctly
- Disposal cascades from parent to children (LIFO order)
- `childContainer.createScope()` uses child's adapters
- Cycle detection prevents circular hierarchies
- All 6-8 tests from 4.1 pass

---

### React Package - Integration

#### Task Group 5: React Provider Nesting Support
**Dependencies:** Task Group 4
**Package:** `packages/react`

- [x] 5.0 Complete React provider nesting with child containers
  - [x] 5.1 Write 6-8 focused tests for React provider nesting
    - Test nested `ContainerProvider` with child container works
    - Test `useContainer()` returns nearest container in tree
    - Test `usePort()` resolves from nested child container
    - Test nested `AsyncContainerProvider` with async child container
    - Test compound components work with nested providers
    - Test disposal on unmount for nested providers
  - [x] 5.2 Update `ContainerProvider` to support nesting with child containers
    - Detect if receiving a ChildContainer vs root Container
    - Allow nesting when providing a child container
    - Prevent nesting when providing another root container
    - Update ResolverContext with child container's resolver
  - [x] 5.3 Update `AsyncContainerProvider` to support async child containers
    - Child containers with async adapters (via `.extend()`) need initialization
    - Handle async initialization for nested child containers
    - Compound components (Loading, Error, Ready) work with nested children
    - Follow existing AsyncContainerProvider pattern
  - [x] 5.4 Update `useContainer()` hook
    - Returns nearest Container or ChildContainer in tree
    - Type correctly reflects the container at that level
    - Works with both root containers and child containers
  - [x] 5.5 Update `usePort()` hook for child container resolution
    - Resolution uses nearest resolver context (may be child container)
    - Type safety maintained across nested providers
    - Scoped ports work correctly with child container's scopes
  - [x] 5.6 Ensure Task Group 5 tests pass
    - Run ONLY the 6-8 tests written in 5.1
    - Verify React integration works correctly

**Acceptance Criteria:**
- Nested `ContainerProvider` works with child containers
- `AsyncContainerProvider` handles async child containers
- `useContainer()` returns nearest container
- `usePort()` resolves from child container when nested
- All 6-8 tests from 5.1 pass

---

### Type Tests

#### Task Group 6: Type-Level Tests
**Dependencies:** Task Groups 2, 3
**Package:** `packages/runtime`, `packages/graph`

- [x] 6.0 Complete type-level tests for compile-time validation
  - [x] 6.1 Write type tests for ChildContainerBuilder API
    - Test `createChild()` returns correctly typed builder
    - Test builder type accumulates extends correctly
    - Test `.build()` return type includes extended ports
    - Test type narrowing through builder chain
  - [x] 6.2 Write type tests for override validation
    - Test override of valid port compiles
    - Test override of non-existent port produces OverridePortNotFoundError
    - Test error message visible in IDE tooltips
    - Test async adapter override requires isolated mode
  - [x] 6.3 Write type tests for extend validation
    - Test extend of new port compiles
    - Test extend of existing port produces DuplicateProviderError
    - Test extended ports visible in child's TProvides
    - Test extended ports NOT visible in parent
  - [x] 6.4 Write type tests for inheritance mode
    - Test `.withInheritanceMode()` accepts valid port names
    - Test invalid port names produce compile error
    - Test mode values restricted to valid literals
  - [x] 6.5 Write type tests for child container resolution
    - Test `resolve()` accepts ports from parent
    - Test `resolve()` accepts extended ports
    - Test `resolve()` rejects unknown ports
    - Test async port constraints respected
  - [x] 6.6 Ensure Task Group 6 type tests pass
    - Run `tsc --noEmit` on type test files
    - Verify all expectType assertions pass

**Acceptance Criteria:**
- Override type validation catches invalid overrides at compile-time
- Extend type validation catches duplicates at compile-time
- Inheritance mode type validation enforces valid port names
- Resolution types correctly reflect available ports
- All type tests pass

---

### Integration and Gap Analysis

#### Task Group 7: Test Review and Integration
**Dependencies:** Task Groups 1-6

- [x] 7.0 Review existing tests and fill critical gaps
  - [x] 7.1 Review tests from Task Groups 1-6
    - Review 6-8 tests from ChildContainerBuilder (Task 1.1) - 8 tests reviewed
    - Review 6-8 tests from override/extend (Task 2.1) - 7 tests reviewed
    - Review 6-8 tests from inheritance modes (Task 3.1) - 8 tests reviewed
    - Review 6-8 tests from hierarchy/disposal (Task 4.1) - 13 tests reviewed
    - Review 6-8 tests from React integration (Task 5.1) - 11 tests reviewed
    - Review type tests from Task Group 6 - 36 type tests reviewed
    - Total existing tests: 83 tests (36 runtime + 36 type + 11 React)
  - [x] 7.2 Analyze test coverage gaps for child container feature
    - Identified minor gaps: end-to-end workflow, error handling, mixed modes across hierarchy
    - End-to-end scenarios adequately covered in existing tests
    - Error handling edge cases identified for disposed container resolution
    - Async adapter scenarios covered in React tests
  - [x] 7.3 Write up to 10 additional integration tests (if needed)
    - Added 6 integration tests to child-container.test.ts:
      1. End-to-end: complete child container workflow
      2. Error handling: resolving from disposed child container throws
      3. Multi-level hierarchy with mixed inheritance modes
      4. Transient adapters in child container
      5. Extended adapter depending on overridden adapter
      6. Sibling child containers are independent
  - [x] 7.4 Run complete child container test suite
    - Runtime tests: 42 tests passing (child-container.test.ts)
    - Type tests: 36 tests passing (child-container.test-d.ts)
    - React tests: 11 tests passing (child-container-provider.test.tsx)
    - Total: 89 child container tests passing
    - All critical workflows verified

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 40-50 tests)
- Critical user workflows for child containers are covered
- No more than 10 additional tests added when filling gaps
- Testing focused exclusively on child container feature

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: ChildContainerBuilder Foundation** - Establishes core builder pattern
2. **Task Group 2: Override and Extend Operations** - Adds key configuration methods
3. **Task Group 3: Inheritance Mode Configuration** - Implements the three modes
4. **Task Group 4: Multi-Level Hierarchy and Disposal** - Completes runtime feature
5. **Task Group 6: Type-Level Tests** - Can run in parallel with Task Group 5
6. **Task Group 5: React Provider Nesting** - Depends on runtime being complete
7. **Task Group 7: Test Review and Integration** - Final verification

## Key Files to Create/Modify

### New Files
- `packages/runtime/src/child-container-builder.ts` - ChildContainerBuilder class
- `packages/runtime/src/child-container.ts` - ChildContainerImpl class
- `packages/runtime/tests/child-container.test.ts` - Runtime tests
- `packages/runtime/tests/child-container.test-d.ts` - Type tests
- `packages/graph/src/child-container-types.ts` - Type utilities (OverridePortNotFoundError, etc.)
- `packages/react/tests/child-container-provider.test.tsx` - React tests

### Files to Modify
- `packages/runtime/src/container.ts` - Add `createChild()` method to ContainerImpl
- `packages/runtime/src/types.ts` - Add ChildContainer type, update Container type
- `packages/runtime/src/index.ts` - Export new types and utilities
- `packages/graph/src/index.ts` - Export OverridePortNotFoundError type
- `packages/react/src/context.tsx` - Update ContainerProvider for nesting
- `packages/react/src/async-container-provider.tsx` - Update for async child containers
- `packages/react/src/use-container.ts` - Update return type
- `packages/react/src/use-port.ts` - Verify works with child containers
- `packages/react/src/index.ts` - Export any new utilities

## Existing Patterns to Reuse

1. **GraphBuilder Immutable Pattern** (`packages/graph/src/index.ts`)
   - ProvideResult and DuplicateProviderError for compile-time errors
   - Immutable builder with method chaining

2. **ScopeImpl.createScope()** (`packages/runtime/src/container.ts:234`)
   - Child scope creation with parent tracking
   - Cascade disposal pattern

3. **MemoMap.fork()** (`packages/runtime/src/memo-map.ts`)
   - Parent chain lookup for singleton inheritance
   - Basis for `shared` mode implementation

4. **React Context Pattern** (`packages/react/src/context.tsx`)
   - Dual-context pattern (ContainerContext + ResolverContext)
   - Nested provider detection

5. **AsyncContainerProvider** (`packages/react/src/async-container-provider.tsx`)
   - Compound components (Loading, Error, Ready)
   - Async initialization handling
