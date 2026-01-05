# Spec Initialization

## Raw Idea

Cleanup deprecated code from the devtools package after the DevTools Runtime Architecture Refactor. The `DevToolsRuntimeWithContainers` now owns container discovery instead of the React layer, which left behind:

1. Deprecated hooks like `useRegisterContainerFlow` that are now no-ops
2. Legacy callbacks (`registerContainer`, `unregisterContainer`) that do nothing
3. Possibly other dead code paths from the old architecture

The refactor was completed successfully with all tests passing (945 devtools tests, 170 react-showcase tests).

## Context from Research

### Deprecated Code Identified

**Hooks and Functions:**

- `useRegisterContainerFlow` - Explicitly marked `@deprecated`, now a no-op
- `registerContainer` callback in `DevToolsFlowContextValue` - No-op, kept for backward compatibility
- `unregisterContainer` callback in `DevToolsFlowContextValue` - No-op, kept for backward compatibility

**Tab Navigation (Deprecated Props):**

- `TabId` type - Marked `@deprecated`, kept for backward compatibility
- `TabNavigationProps.activeTab` - Deprecated, now read from runtime state
- `TabNavigationProps.onTabChange` - Deprecated, tab changes dispatch to runtime
- `TabNavigationProps.showInspector` - Deprecated, controlled by plugin registration

**Other Patterns:**

- Legacy `ContainerDiscoveryInstance` format in `devtools-flow-provider.tsx` - Used for backward compatibility mapping from runtime snapshot
- Inspector normalization supporting both `InspectorAPI` (deprecated) and `RuntimeInspector` in `container-inspector.tsx`
- Comments throughout referencing "backward compatibility" and "kept for"

### Files Affected

- `/packages/devtools/src/react/providers/devtools-flow-provider.tsx` - Contains deprecated hooks and no-op callbacks
- `/packages/devtools/src/react/providers/index.ts` - Exports deprecated hook
- `/packages/devtools/src/react/index.ts` - Exports deprecated hook
- `/packages/devtools/src/react/tab-navigation.tsx` - Contains deprecated types and props
- `/packages/devtools/src/react/container-inspector.tsx` - Has normalization for deprecated `InspectorAPI`

### Tests Referencing These Patterns

- Tests in `/packages/devtools/tests/runtime/container-lifecycle.test.ts` use `registerContainer`/`unregisterContainer` (but these are internal runtime methods, not the deprecated React callbacks)
- Tests in `/packages/devtools/tests/react/lifecycle-and-integration.test.tsx` use emitter's `registerContainer`
