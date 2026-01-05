# Specification: DevTools Deprecated Code Cleanup

## Goal

Remove all deprecated code from the devtools package after the DevTools Runtime Architecture Refactor, where `DevToolsRuntimeWithContainers` now owns container discovery instead of the React layer.

## User Stories

- As a library maintainer, I want to remove dead code paths so that the codebase remains clean and maintainable
- As a developer consuming the devtools API, I want a simplified API without deprecated no-op functions so that I can understand and use the library more easily

## Specific Requirements

**Remove useRegisterContainerFlow hook**

- Delete the `useRegisterContainerFlow` function from `/packages/devtools/src/react/providers/devtools-flow-provider.tsx` (lines 626-632)
- Remove the export from `/packages/devtools/src/react/providers/index.ts` (line 12)
- Remove the export from `/packages/devtools/src/react/index.ts` (line 345)
- This was a no-op function kept for backward compatibility that is no longer needed

**Remove deprecated TabId type and TabNavigationProps**

- Delete the `TabId` type export from `/packages/devtools/src/react/tab-navigation.tsx` (lines 25-28)
- Remove deprecated `activeTab`, `onTabChange`, and `showInspector` props from `TabNavigationProps` interface (lines 37-52)
- Keep the `TabNavigationProps` interface but remove all its deprecated optional properties
- Remove `TabId` export from `/packages/devtools/src/react/index.ts` (line 522)

**Remove no-op container callbacks from DevToolsFlowContextValue**

- Delete `registerContainer` callback from interface and implementation (lines 140-143, 311-316)
- Delete `unregisterContainer` callback from interface and implementation (lines 144, 319-325)
- Remove these from the context value object (lines 464-465) and useMemo dependency array (lines 472-473)
- This is a breaking change to the public API

**Delete containerDiscoveryMachine.ts entirely**

- Remove the entire file `/packages/devtools/src/machines/container-discovery.machine.ts`
- Update `/packages/devtools/src/machines/index.ts` to remove the export (line 13)
- Update `/packages/devtools/src/react/providers/devtools-flow-provider.tsx` to remove the import of `ContainerDiscoveryState`, `ContainerDiscoveryContext`, `ContainerTreeNode` types (lines 40-44)
- Replace usage with inline types or remove unused code paths

**Remove InspectorAPI support from container-inspector.tsx**

- Delete `InspectorAPI` import from `/packages/devtools/src/react/container-inspector.tsx` (line 15)
- Remove the `isInspectorAPI` type guard function (lines 139-141)
- Simplify `normalizeInspector` to only handle `RuntimeInspector` (lines 150-183)
- Update `ContainerInspectorProps.inspector` type to only accept `RuntimeInspector` (line 212)

**Delete use-container-lifecycle.ts entirely**

- Remove the entire file `/packages/devtools/src/react/hooks/use-container-lifecycle.ts` (468 lines)
- Update `/packages/devtools/src/react/hooks/index.ts` to remove all exports from this file (lines 49-63)
- This removes: `ContainerLifecycleEmitter`, `useContainerLifecycle`, `getContainerLifecycleEmitter`, `resetContainerLifecycleEmitter`, and all related types

**Remove ContainerDiscoveryInstance interface**

- Delete the `ContainerDiscoveryInstance` interface from `devtools-flow-provider.tsx` (lines 115-123)
- Remove the `mapRuntimeStateToMachineState` helper function (lines 229-250)
- Remove the `containerMachines` useMemo that builds legacy instances (lines 252-307)
- Remove `containerMachines` from context value and dependencies

**Remove or update affected test files**

- Delete `/packages/devtools/tests/react/lifecycle-and-integration.test.tsx` entirely (tests ContainerLifecycleEmitter)
- Delete `/packages/devtools/tests/runtime/container-lifecycle.test.ts` entirely (tests containerDiscoveryMachine FSM)
- Review and update `/packages/devtools/tests/multi-container-integration.test.tsx` to remove deprecated patterns
- Review and update `/packages/devtools/tests/react/architecture-visualization-e2e.test.tsx` to remove deprecated patterns

## Visual Design

N/A - This is a code cleanup task with no UI changes.

## Existing Code to Leverage

**DevToolsRuntimeWithContainers pattern**

- Container discovery is now handled by `DevToolsRuntimeWithContainers` using `useSyncExternalStore`
- The `containerSnapshot` prop passed to `DevToolsFlowProvider` provides all container data
- Follow this pattern to remove redundant discovery code from the React layer

**RuntimeInspector interface**

- The `RuntimeInspector` interface from `@hex-di/devtools` is the current standard for container inspection
- All inspector code should use `RuntimeInspector` exclusively after removing `InspectorAPI` support

**devtools-ui.machine.ts and tracing.machine.ts**

- These machines remain in `/packages/devtools/src/machines/` and are actively used
- The machines index.ts should continue to export these after removing `container-discovery.machine.ts`

## Out of Scope

- Adding new functionality or features
- Refactoring code that is not related to deprecated patterns
- Documentation updates beyond removing docs for deleted code
- Changes to packages other than `@hex-di/devtools`
- Migration to HexDi Flow (will be done in a separate spec after this cleanup)
- Changes to the `DevToolsRuntimeWithContainers` class itself
- Changes to the runtime container discovery logic
- Performance optimizations unrelated to the cleanup
- Adding deprecation warnings or console logs (full removal is the approach)
- Supporting backward compatibility with removed APIs
