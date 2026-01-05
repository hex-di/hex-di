# Spec Requirements: DevTools Deprecated Code Cleanup

## Initial Description

Cleanup deprecated code from the devtools package after the DevTools Runtime Architecture Refactor. The `DevToolsRuntimeWithContainers` now owns container discovery instead of the React layer, which left behind:

1. Deprecated hooks like `useRegisterContainerFlow` that are now no-ops
2. Legacy callbacks (`registerContainer`, `unregisterContainer`) that do nothing
3. Possibly other dead code paths from the old architecture

The refactor was completed successfully with all tests passing (945 devtools tests, 170 react-showcase tests).

## Requirements Discussion

### First Round Questions

**Q1:** I assume we should remove all code marked with `@deprecated` annotations, including `useRegisterContainerFlow`, the deprecated `TabId` type, and deprecated `TabNavigationProps`. Is that correct, or should some deprecated markers remain as migration aids for external consumers?
**Answer:** YES - Remove ALL code marked with `@deprecated` (including `useRegisterContainerFlow`, `TabId`, deprecated `TabNavigationProps`)

**Q2:** I'm thinking we should remove the no-op `registerContainer` and `unregisterContainer` callbacks from `DevToolsFlowContextValue` since they do nothing. However, this changes the context value interface. Should we proceed with removing them, or should we add deprecation warnings first (e.g., console.warn in development)?
**Answer:** YES - Remove the no-op `registerContainer`/`unregisterContainer` callbacks (breaking change is acceptable)

**Q3:** The `container-inspector.tsx` supports both `InspectorAPI` (older) and `RuntimeInspector` (current). I assume we should keep supporting both for now since external consumers might use `InspectorAPI`. Is that correct, or can we remove `InspectorAPI` support?
**Answer:** ONLY RuntimeInspector - Remove `InspectorAPI` support entirely

**Q4:** I notice the `containerDiscoveryMachine.ts` in `/packages/devtools/src/machines/` still defines the full state machine for container discovery. Since container discovery is now handled by `DevToolsRuntimeWithContainers`, should this machine be considered for removal or is it still used elsewhere?
**Answer:** REMOVE IT - The `containerDiscoveryMachine.ts` should be removed. They will migrate to HexDi Flow after this cleanup.

**Q5:** The `ContainerLifecycleEmitter` class in `use-container-lifecycle.ts` has a `registerContainer` method that's actively used in tests. I assume this is a different system from the deprecated React-layer registration. Should this remain untouched?
**Answer:** REMOVE EVERYTHING from the old react-layer

**Q6:** Is there anything explicitly OUT OF SCOPE for this cleanup? For example, should we avoid touching test files that might reference deprecated patterns for historical testing purposes?
**Answer:** FULL FREEDOM to remove old tests

### Existing Code to Reference

No similar existing features identified for reference.

### Follow-up Questions

No follow-up questions needed - user provided comprehensive direction.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A - This is a code cleanup task with no UI changes.

## Requirements Summary

### Functional Requirements

**Code to Remove:**

1. **Deprecated Hooks and Exports:**
   - `useRegisterContainerFlow` hook from `/packages/devtools/src/react/providers/devtools-flow-provider.tsx`
   - Export of `useRegisterContainerFlow` from `/packages/devtools/src/react/providers/index.ts`
   - Export of `useRegisterContainerFlow` from `/packages/devtools/src/react/index.ts`

2. **Deprecated Types and Props:**
   - `TabId` type from `/packages/devtools/src/react/tab-navigation.tsx`
   - Deprecated props from `TabNavigationProps` interface (`activeTab`, `onTabChange`, `showInspector`)
   - Export of `TabId` type from `/packages/devtools/src/react/index.ts`

3. **No-op Callbacks:**
   - `registerContainer` callback from `DevToolsFlowContextValue` interface and implementation
   - `unregisterContainer` callback from `DevToolsFlowContextValue` interface and implementation

4. **Container Discovery Machine:**
   - Entire file `/packages/devtools/src/machines/container-discovery.machine.ts`
   - Exports from `/packages/devtools/src/machines/index.ts`
   - Any imports/usage of `containerDiscoveryMachine` types

5. **InspectorAPI Support:**
   - Remove `InspectorAPI` support from `/packages/devtools/src/react/container-inspector.tsx`
   - Keep only `RuntimeInspector` support
   - Update `ContainerInspectorProps` to only accept `RuntimeInspector`

6. **ContainerLifecycleEmitter (Full Removal):**
   - Entire `ContainerLifecycleEmitter` class from `/packages/devtools/src/react/hooks/use-container-lifecycle.ts`
   - `useContainerLifecycle` hook
   - `getContainerLifecycleEmitter`, `resetContainerLifecycleEmitter` functions
   - All related type exports
   - All exports from `/packages/devtools/src/react/hooks/index.ts`

7. **Legacy Compatibility Code:**
   - `ContainerDiscoveryInstance` interface and mapping logic in `devtools-flow-provider.tsx`
   - Legacy callback signatures and no-op implementations

8. **Related Tests:**
   - Tests that reference removed functionality
   - Tests in `/packages/devtools/tests/react/lifecycle-and-integration.test.tsx` that use deprecated patterns
   - Any other tests that fail after removal

### Reusability Opportunities

None identified - this is a removal/cleanup task.

### Scope Boundaries

**In Scope:**

- Remove all `@deprecated` annotated code
- Remove no-op callbacks and their interface definitions
- Remove `containerDiscoveryMachine.ts` entirely
- Remove `InspectorAPI` support (keep only `RuntimeInspector`)
- Remove `ContainerLifecycleEmitter` and all related exports
- Remove legacy compatibility mapping code
- Remove or update tests that reference removed code
- Update all barrel exports (`index.ts` files)
- Breaking changes to public API are acceptable

**Out of Scope:**

- Adding new functionality
- Refactoring unrelated code
- Documentation updates (beyond removing docs for deleted code)

### Technical Considerations

- This is a **breaking change** - public API surface will change
- The `DevToolsRuntimeWithContainers` now handles all container discovery
- After cleanup, migration to HexDi Flow will proceed separately
- Tests should be removed/updated as needed to maintain passing test suite
- All 945 devtools tests and 170 react-showcase tests should continue passing (minus removed tests)

### Files to Modify/Remove

**Remove Entirely:**

- `/packages/devtools/src/machines/container-discovery.machine.ts`
- `/packages/devtools/src/react/hooks/use-container-lifecycle.ts`

**Modify:**

- `/packages/devtools/src/react/providers/devtools-flow-provider.tsx`
- `/packages/devtools/src/react/providers/index.ts`
- `/packages/devtools/src/react/index.ts`
- `/packages/devtools/src/react/tab-navigation.tsx`
- `/packages/devtools/src/react/container-inspector.tsx`
- `/packages/devtools/src/react/hooks/index.ts`
- `/packages/devtools/src/machines/index.ts`

**Tests to Review/Remove:**

- `/packages/devtools/tests/react/lifecycle-and-integration.test.tsx`
- `/packages/devtools/tests/react/architecture-visualization-e2e.test.tsx`
- Any other tests importing removed code
