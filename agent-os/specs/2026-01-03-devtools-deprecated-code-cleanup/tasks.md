# Task Breakdown: DevTools Deprecated Code Cleanup

## Overview

Total Tasks: 27

This is a code cleanup task to remove deprecated code from the devtools package after the DevTools Runtime Architecture Refactor. The `DevToolsRuntimeWithContainers` now owns container discovery, making the React-layer discovery code obsolete.

**Strategic Ordering**: Delete files first, then fix imports/exports, then run tests. This minimizes compilation errors during implementation.

## Task List

### File Deletion Layer

#### Task Group 1: Delete Deprecated Files

**Dependencies:** None

- [x] 1.0 Complete file deletion
  - [x] 1.1 Verify files exist before deletion
    - Check `/packages/devtools/src/machines/container-discovery.machine.ts` exists
    - Check `/packages/devtools/src/react/hooks/use-container-lifecycle.ts` exists
    - Document line counts for removal confirmation
  - [x] 1.2 Delete container-discovery.machine.ts
    - Remove `/packages/devtools/src/machines/container-discovery.machine.ts` entirely
    - This file contains the legacy FSM for container discovery
  - [x] 1.3 Delete use-container-lifecycle.ts
    - Remove `/packages/devtools/src/react/hooks/use-container-lifecycle.ts` entirely (468 lines)
    - This removes `ContainerLifecycleEmitter`, `useContainerLifecycle`, `getContainerLifecycleEmitter`, `resetContainerLifecycleEmitter`
  - [x] 1.4 Verify files are deleted
    - Confirm both files no longer exist in the filesystem

**Acceptance Criteria:**

- Both deprecated files are completely removed
- No backup copies or renamed versions remain

### Export Cleanup Layer

#### Task Group 2: Update Barrel Exports

**Dependencies:** Task Group 1

- [x] 2.0 Complete barrel export updates
  - [x] 2.1 Write 4 focused tests for export verification
    - Test that `@hex-di/devtools` exports do not include removed symbols
    - Test that `containerDiscoveryMachine` is not exported from machines
    - Test that `useRegisterContainerFlow` is not exported
    - Test that `TabId` type is not exported
  - [x] 2.2 Update machines/index.ts
    - Remove export of `containerDiscoveryMachine` and related types (line 13)
    - Keep exports of `devtools-ui.machine.ts` and `tracing.machine.ts`
  - [x] 2.3 Update react/hooks/index.ts
    - Remove all exports from `use-container-lifecycle.ts` (lines 49-63)
    - Keep other hook exports intact
  - [x] 2.4 Update react/providers/index.ts
    - Remove `useRegisterContainerFlow` export (line 12)
  - [x] 2.5 Update react/index.ts
    - Remove `useRegisterContainerFlow` export (line 345)
    - Remove `TabId` type export (line 522)
  - [x] 2.6 Ensure export tests pass
    - Run ONLY the 4 tests written in 2.1
    - Verify removed exports are not accessible

**Acceptance Criteria:**

- The 4 tests written in 2.1 pass
- All barrel exports updated to exclude deleted code
- Package compiles without export errors

### Component Modification Layer

#### Task Group 3: Update devtools-flow-provider.tsx

**Dependencies:** Task Group 2

- [x] 3.0 Complete DevToolsFlowProvider cleanup
  - [x] 3.1 Write 4 focused tests for context value changes
    - Test that `DevToolsFlowContextValue` does not have `registerContainer`
    - Test that `DevToolsFlowContextValue` does not have `unregisterContainer`
    - Test that provider still functions without deprecated callbacks
    - Test that container discovery works via `containerSnapshot` prop
  - [x] 3.2 Remove deprecated imports
    - Remove import of `ContainerDiscoveryState`, `ContainerDiscoveryContext`, `ContainerTreeNode` types (lines 40-44)
  - [x] 3.3 Remove useRegisterContainerFlow function
    - Delete function definition (lines 626-632)
    - This was a no-op function for backward compatibility
  - [x] 3.4 Remove ContainerDiscoveryInstance interface
    - Delete interface definition (lines 115-123)
  - [x] 3.5 Remove mapRuntimeStateToMachineState helper
    - Delete helper function (lines 229-250)
  - [x] 3.6 Remove containerMachines useMemo
    - Delete the useMemo that builds legacy instances (lines 252-307)
    - Remove from context value and dependency array
  - [x] 3.7 Remove no-op callbacks from DevToolsFlowContextValue
    - Delete `registerContainer` from interface (lines 140-143)
    - Delete `unregisterContainer` from interface (line 144)
    - Remove implementations (lines 311-325)
    - Remove from context value object (lines 464-465)
    - Remove from useMemo dependency array (lines 472-473)
  - [x] 3.8 Ensure DevToolsFlowProvider tests pass
    - Run ONLY the 4 tests written in 3.1
    - Verify provider compiles and functions correctly

**Acceptance Criteria:**

- The 4 tests written in 3.1 pass
- All deprecated code removed from provider
- Provider still functions correctly with `containerSnapshot` prop

#### Task Group 4: Update tab-navigation.tsx

**Dependencies:** Task Group 2

- [x] 4.0 Complete TabNavigation cleanup
  - [x] 4.1 Write 2 focused tests for TabNavigation changes
    - Test that `TabNavigationProps` does not include deprecated props
    - Test that component renders without deprecated props
  - [x] 4.2 Remove TabId type
    - Delete `TabId` type definition (lines 25-28)
  - [x] 4.3 Remove deprecated props from TabNavigationProps
    - Remove `activeTab` prop
    - Remove `onTabChange` prop
    - Remove `showInspector` prop
    - Keep interface but with no deprecated optional properties
  - [x] 4.4 Ensure TabNavigation tests pass
    - Run ONLY the 2 tests written in 4.1
    - Verify component compiles correctly

**Acceptance Criteria:**

- The 2 tests written in 4.1 pass
- TabId type removed
- Deprecated props removed from interface

#### Task Group 5: Update container-inspector.tsx

**Dependencies:** Task Group 2

- [x] 5.0 Complete ContainerInspector cleanup
  - [x] 5.1 Write 3 focused tests for inspector changes
    - Test that `ContainerInspectorProps.inspector` only accepts `RuntimeInspector`
    - Test that `normalizeInspector` handles `RuntimeInspector` correctly
    - Test that component renders with `RuntimeInspector`
  - [x] 5.2 Remove InspectorAPI import
    - Delete `InspectorAPI` import (line 15)
  - [x] 5.3 Remove isInspectorAPI type guard
    - Delete type guard function (lines 139-141)
  - [x] 5.4 Simplify normalizeInspector function
    - Update to only handle `RuntimeInspector` (lines 150-183)
    - Remove legacy `InspectorAPI` handling code
  - [x] 5.5 Update ContainerInspectorProps interface
    - Change `inspector` type to only accept `RuntimeInspector` (line 212)
  - [x] 5.6 Ensure ContainerInspector tests pass
    - Run ONLY the 3 tests written in 5.1
    - Verify component compiles and functions correctly

**Acceptance Criteria:**

- The 3 tests written in 5.1 pass
- InspectorAPI support completely removed
- Only RuntimeInspector is supported

### Test Cleanup Layer

#### Task Group 6: Remove and Update Test Files

**Dependencies:** Task Groups 3, 4, 5

- [x] 6.0 Complete test file cleanup
  - [x] 6.1 Identify test files to delete
    - Check if `/packages/devtools/tests/react/lifecycle-and-integration.test.tsx` exists
    - Check if `/packages/devtools/tests/runtime/container-lifecycle.test.ts` exists
  - [x] 6.2 Delete lifecycle-and-integration.test.tsx
    - Remove test file that tests `ContainerLifecycleEmitter`
  - [x] 6.3 Delete container-lifecycle.test.ts
    - Remove test file that tests `containerDiscoveryMachine` FSM
  - [x] 6.4 Review and update multi-container-integration.test.tsx
    - Identify deprecated patterns in test
    - Remove or update tests that reference removed APIs
    - Keep tests that use current `DevToolsRuntimeWithContainers` patterns
  - [x] 6.5 Review and update architecture-visualization-e2e.test.tsx
    - Identify deprecated patterns in test
    - Remove or update tests that reference removed APIs
    - Keep tests that verify current architecture

**Acceptance Criteria:**

- Deprecated test files deleted
- Remaining test files updated to use current APIs
- No references to removed code in test files

### Verification Layer

#### Task Group 7: Final Verification and Test Suite

**Dependencies:** Task Group 6

- [x] 7.0 Complete final verification
  - [x] 7.1 Run TypeScript compilation
    - Execute `pnpm --filter @hex-di/devtools typecheck`
    - Verify no compilation errors
  - [x] 7.2 Run ESLint
    - Execute `pnpm --filter @hex-di/devtools lint`
    - Verify no linting errors (warnings are acceptable)
  - [x] 7.3 Run devtools test suite
    - Execute `pnpm --filter @hex-di/devtools test`
    - All remaining tests should pass
    - Note: Test count will be lower due to removed tests
  - [x] 7.4 Run react-showcase tests
    - Execute `pnpm --filter react-showcase test`
    - Verify showcase still works with cleaned API
    - All 170 tests should pass
  - [x] 7.5 Verify no dangling imports
    - Search codebase for references to removed symbols
    - Ensure no file imports deleted modules

**Acceptance Criteria:**

- TypeScript compilation succeeds
- ESLint passes (0 errors, warnings acceptable)
- All remaining devtools tests pass (886 tests)
- All react-showcase tests pass (170 tests)
- No dangling imports to removed code

## Execution Order

Recommended implementation sequence:

1. **File Deletion Layer (Task Group 1)**
   - Delete deprecated files first to establish a clean slate
   - Compilation will break temporarily

2. **Export Cleanup Layer (Task Group 2)**
   - Fix barrel exports to remove references to deleted files
   - This allows imports to resolve

3. **Component Modification Layer (Task Groups 3, 4, 5)**
   - These can be done in parallel as they modify independent files
   - Task Group 3: devtools-flow-provider.tsx (most complex)
   - Task Group 4: tab-navigation.tsx (simple type removal)
   - Task Group 5: container-inspector.tsx (InspectorAPI removal)

4. **Test Cleanup Layer (Task Group 6)**
   - Delete and update tests after components are fixed
   - Tests depend on component changes being complete

5. **Verification Layer (Task Group 7)**
   - Final verification after all changes
   - Ensures clean compilation and passing tests

## Files Summary

### Files Deleted

| File                                                                | Description                                   |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `/packages/devtools/src/machines/container-discovery.machine.ts`    | Legacy container discovery FSM                |
| `/packages/devtools/src/react/hooks/use-container-lifecycle.ts`     | ContainerLifecycleEmitter and hooks           |
| `/packages/devtools/src/react/container-multi-select.tsx`           | Component depending on deleted lifecycle hook |
| `/packages/devtools/tests/react/lifecycle-and-integration.test.tsx` | Tests for deleted lifecycle code              |
| `/packages/devtools/tests/runtime/container-lifecycle.test.ts`      | Tests for deleted machine                     |
| `/packages/devtools/tests/react/container-multi-select.test.tsx`    | Tests for deleted component                   |

### Files Modified

| File                                                                     | Changes                           |
| ------------------------------------------------------------------------ | --------------------------------- |
| `/packages/devtools/src/machines/index.ts`                               | Remove machine export             |
| `/packages/devtools/src/react/hooks/index.ts`                            | Remove lifecycle exports          |
| `/packages/devtools/src/react/providers/index.ts`                        | Remove useRegisterContainerFlow   |
| `/packages/devtools/src/react/index.ts`                                  | Remove multiple exports           |
| `/packages/devtools/src/react/providers/devtools-flow-provider.tsx`      | Major cleanup                     |
| `/packages/devtools/src/react/tab-navigation.tsx`                        | Remove TabId and deprecated props |
| `/packages/devtools/src/react/container-inspector.tsx`                   | Remove InspectorAPI support       |
| `/packages/devtools/src/react/devtools-panel.tsx`                        | Update imports                    |
| `/packages/devtools/src/activities/inspector-subscription.activity.ts`   | Remove deleted import             |
| `/packages/devtools/tests/multi-container-integration.test.tsx`          | Update patterns                   |
| `/packages/devtools/tests/react/architecture-visualization-e2e.test.tsx` | Update patterns                   |
| `/packages/devtools/tests/react/devtools-panel-tabs.test.tsx`            | Remove unused ts-expect-error     |
| `/packages/devtools/tests/plugin-architecture-integration.test.tsx`      | Fix linting issues                |

## Breaking Changes

This cleanup introduces breaking changes to the public API:

1. **Removed exports:**
   - `useRegisterContainerFlow`
   - `TabId` type
   - `ContainerLifecycleEmitter` and related
   - `containerDiscoveryMachine` and related types

2. **Changed interfaces:**
   - `DevToolsFlowContextValue` no longer has `registerContainer`/`unregisterContainer`
   - `TabNavigationProps` no longer has deprecated optional props
   - `ContainerInspectorProps.inspector` only accepts `RuntimeInspector`

## Completion Summary

All task groups completed successfully:

- Task Group 1: Delete Deprecated Files - COMPLETE
- Task Group 2: Update Barrel Exports - COMPLETE
- Task Group 3: Update devtools-flow-provider.tsx - COMPLETE
- Task Group 4: Update tab-navigation.tsx - COMPLETE
- Task Group 5: Update container-inspector.tsx - COMPLETE
- Task Group 6: Remove and Update Test Files - COMPLETE
- Task Group 7: Final Verification - COMPLETE

Test Results:

- @hex-di/devtools: 886 tests passed, 5 skipped
- react-showcase: 170 tests passed
- TypeScript: No errors
- ESLint: 0 errors, 41 warnings
