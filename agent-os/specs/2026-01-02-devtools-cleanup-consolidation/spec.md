# Specification: DevTools Cleanup and Consolidation

## Goal

Remove legacy context/provider systems and manual container registration from the devtools package, consolidating to the runtime-based plugin architecture with automatic container discovery.

## User Stories

- As a developer, I want a single consistent API for DevTools so that I can use the modern runtime architecture without confusion from legacy exports
- As a maintainer, I want to remove deprecated code so that the codebase is smaller and easier to understand

## Specific Requirements

**Remove Legacy Context Files**

- Delete `packages/devtools/src/react/context/devtools-context.ts` (DevToolsContext)
- Delete `packages/devtools/src/react/context/devtools-provider.tsx` (DevToolsProvider)
- Delete `packages/devtools/src/react/context/container-registry.ts` (ContainerRegistryContext, ContainerEntry, ContainerRegistryValue)
- Delete `packages/devtools/src/react/context/container-registry-provider.tsx` (HexDiDevToolsProvider)
- Update `packages/devtools/src/react/context/index.ts` to only export ContainerTreeContext

**Remove Legacy Hooks**

- Delete `packages/devtools/src/react/hooks/use-devtools.ts` (useDevTools, useTracingAPI, useExportedGraph)
- Delete `packages/devtools/src/react/hooks/use-register-container.ts` (useRegisterContainer)
- Delete `packages/devtools/src/react/hooks/use-container-list.ts` (useContainerList)
- Update `packages/devtools/src/react/hooks/index.ts` to remove exports for deleted hooks

**Remove Sections Mode from DevToolsPanel**

- Remove the CollapsibleSection internal component from `packages/devtools/src/react/devtools-panel.tsx`
- Remove the "sections" mode code path and GraphView internal component
- Remove DevToolsPanelMode type (or simplify to only "tabs")
- Keep only the plugin-based tabs mode implementation
- Update DevToolsPanelProps to remove `mode` prop

**Update Main React Index Exports**

- Update `packages/devtools/src/react/index.ts` to remove all legacy exports
- Remove: DevToolsProvider, DevToolsContext, DevToolsProviderProps, DevToolsContextValue
- Remove: HexDiDevToolsProvider, ContainerRegistryContext, ContainerEntry, ContainerRegistryValue, InheritanceMode
- Remove: useDevTools, useTracingAPI, useExportedGraph
- Remove: useRegisterContainer, useContainerList, UseContainerListResult
- Remove: DevToolsPanelMode type and "sections" mode documentation

**Update Test Files**

- Update tests that reference removed legacy APIs to use runtime-based equivalents
- Check `packages/devtools/tests/react/hooks.test.tsx` for legacy hook tests
- Check `packages/devtools/tests/react/devtools-provider.test.tsx` for legacy provider tests
- Remove or update tests that specifically test removed functionality
- Ensure remaining tests pass with the consolidated architecture

**Keep Runtime Architecture Files**

- Keep `packages/devtools/src/runtime/` directory entirely (create-runtime.ts, types.ts, selectors/, etc.)
- Keep `packages/devtools/src/react/runtime-context.ts` (DevToolsRuntimeContext)
- Keep `packages/devtools/src/react/runtime-provider.tsx` (DevToolsRuntimeProvider)
- Keep `packages/devtools/src/react/providers/devtools-container-provider.tsx` (DevToolsContainerProvider)
- Keep `packages/devtools/src/react/hooks/use-runtime.ts`, `use-state.ts`, `use-selector.ts`

**Keep Automatic Container Discovery**

- Keep `packages/devtools/src/react/context/container-tree-context.ts` (ContainerTreeContext)
- Keep `packages/devtools/src/react/hooks/use-container-tree.ts` (useContainerTree)
- Keep `packages/devtools/src/react/hooks/use-container-tree-context.ts` (useContainerTreeContext)
- These provide automatic discovery via InspectorPlugin.getChildContainers()

**Keep Flow Architecture for Future Enhancement**

- Keep `packages/devtools/src/machines/` directory (state machines)
- Keep `packages/devtools/src/activities/` directory (activities)
- Keep `packages/devtools/src/react/providers/devtools-flow-provider.tsx` (DevToolsFlowProvider)
- Keep exports for useDevToolsFlow, useDevToolsUI, useDevToolsTracing, useRegisterContainerFlow

## Existing Code to Leverage

**Runtime Architecture (`packages/devtools/src/runtime/`)**

- createDevToolsRuntime and createDevToolsRuntimeWithContainers are the factory functions for DevTools state
- Plugin architecture with defineDevToolsPlugin provides extensibility model
- Selectors in `runtime/selectors/` provide state access patterns

**DevToolsContainerProvider (`packages/devtools/src/react/providers/devtools-container-provider.tsx`)**

- Uses useSyncExternalStore for efficient subscription management
- Provides useContainerRuntime, useContainerSnapshot, useContainerSelector, useContainerDispatch hooks
- This is the primary React integration for the new architecture

**HexDiDevTools Component (`packages/devtools/src/react/hex-di-devtools.tsx`)**

- Already uses the runtime architecture internally (createDevToolsRuntimeWithContainers)
- Extracts inspector from container via INSPECTOR symbol
- Uses DevToolsContainerProvider and DevToolsRuntimeProvider together
- No changes needed - this is the target API

**React Showcase App (`examples/react-showcase/src/App.tsx`)**

- Already uses HexDiDevTools with just container prop
- Uses HexDiContainerProvider from @hex-di/react (not devtools)
- No manual container registration - relies on automatic discovery
- App.tsx does NOT use any of the legacy APIs being removed

## Out of Scope

- Flow architecture implementation or enhancements (keep existing files but do not modify)
- New DevTools features or plugins
- Performance optimizations to existing code
- Documentation updates to website or external docs
- Changes to @hex-di/react package (HexDiContainerProvider, etc.)
- Changes to @hex-di/inspector package
- Changes to @hex-di/tracing package
- Network protocol changes in devtools-network
- Changes to data-source implementations
- Adding new test coverage beyond fixing broken tests
- Deprecation warnings or migration guides (this is a breaking change)
