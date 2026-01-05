# Spec Requirements: DevTools Cleanup and Consolidation

## Initial Description

The user wants to clean up old devtools code and use the latest implementation with the devtools runtime. The devtools package has accumulated multiple architectural layers over time, including legacy context/provider systems, a newer runtime-based plugin architecture, and an in-progress Flow-based architecture. This cleanup consolidates to the runtime architecture and removes deprecated code.

## Requirements Discussion

### First Round Questions

**Q1:** I assume the goal is to deprecate/remove the legacy provider system (`DevToolsContext`, `DevToolsProvider`, `ContainerRegistryContext`, `HexDiDevToolsProvider`) in favor of the newer runtime-based architecture (`DevToolsRuntimeContext`, `DevToolsRuntimeProvider`, `DevToolsContainerProvider`). Is that correct, or should some legacy providers be preserved for backward compatibility?
**Answer:** Remove entirely (DevToolsContext, DevToolsProvider, ContainerRegistryContext, HexDiDevToolsProvider)

**Q2:** I'm thinking the legacy hooks (`useDevTools`, `useTracingAPI`, `useExportedGraph`) should be replaced with the runtime-based equivalents (`useDevToolsRuntime`, `useDevToolsSelector`). Should we provide migration aliases that warn about deprecation, or remove them entirely?
**Answer:** Remove entirely (useDevTools, useTracingAPI, useExportedGraph) - no migration aliases

**Q3:** For container discovery, I see there's manual registration (`useRegisterContainer`, `useContainerList`) and automatic discovery (`useContainerTree`, `ContainerTreeContext`). I assume we should consolidate to the automatic discovery approach - is that correct?
**Answer:** Remove manual registration (useRegisterContainer, useContainerList) - keep only automatic discovery

**Q4:** The `DevToolsPanel` component currently supports both "tabs" mode (plugin architecture) and "sections" mode (legacy). Should we remove the "sections" mode entirely, or keep it as a deprecated fallback?
**Answer:** Remove "sections" mode - keep only "tabs" mode with plugin architecture

**Q5:** I notice there's also a Flow-based architecture (`DevToolsFlowProvider`, `useDevToolsFlow`) that appears to be in progress. Should this cleanup wait until the Flow architecture is complete, or should we consolidate using the current runtime architecture and update when Flow is ready?
**Answer:** Clean up now with current runtime architecture. Flow can be added later as enhancement.

**Q6:** For the cleanup approach, should we: Option A (remove entirely), Option B (deprecate first), or Option C (keep as re-exports)?
**Answer:** Breaking change - remove old code entirely in one release (Option A)

**Q7:** Are there any external consumers of the devtools package that we need to consider for backward compatibility, or is this primarily an internal/showcase concern?
**Answer:** None - package not published to npm, only used internally in react-showcase

**Q8:** Is there anything you want to explicitly exclude from this cleanup effort?
**Answer:** None - clean up everything identified

### Existing Code to Reference

No similar existing features identified for reference.

### Follow-up Questions

None required - user provided comprehensive answers.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A

## Requirements Summary

### Functional Requirements

#### Files/Modules to REMOVE

**Legacy Context and Providers:**

- `packages/devtools/src/react/context/devtools-context.ts` - Legacy TracingAPI context
- `packages/devtools/src/react/context/devtools-provider.tsx` - Legacy TracingAPI provider
- `packages/devtools/src/react/context/container-registry.ts` - Manual container registry context
- `packages/devtools/src/react/context/container-registry-provider.tsx` - Manual container registry provider

**Legacy Hooks:**

- `packages/devtools/src/react/hooks/use-devtools.ts` - Legacy context access hooks (useDevTools, useTracingAPI, useExportedGraph)
- `packages/devtools/src/react/hooks/use-register-container.ts` - Manual container registration
- `packages/devtools/src/react/hooks/use-container-list.ts` - Manual container list access

**Legacy Component Features:**

- "sections" mode from `DevToolsPanel` component - remove CollapsibleSection-based layout

#### Files/Modules to KEEP

**DevTools Runtime Architecture:**

- `packages/devtools/src/runtime/` - Complete runtime directory (create-runtime.ts, types.ts, selectors/, etc.)
- `packages/devtools/src/react/runtime-context.ts` - Runtime React context
- `packages/devtools/src/react/runtime-provider.tsx` - Runtime provider component

**Container-Aware Runtime:**

- `packages/devtools/src/react/providers/devtools-container-provider.tsx` - Container-aware provider

**Runtime Hooks:**

- `packages/devtools/src/react/hooks/use-runtime.ts` - useDevToolsRuntime
- `packages/devtools/src/react/hooks/use-state.ts` - useDevToolsState
- `packages/devtools/src/react/hooks/use-selector.ts` - useDevToolsSelector

**Automatic Container Discovery:**

- `packages/devtools/src/react/context/container-tree-context.ts` - Automatic discovery context
- `packages/devtools/src/react/hooks/use-container-tree.ts` - Automatic discovery hook
- `packages/devtools/src/react/hooks/use-container-tree-context.ts` - Context access hook

**Plugin Architecture:**

- `packages/devtools/src/plugins/` - Complete plugins directory

**Flow Architecture (Future Enhancement):**

- `packages/devtools/src/machines/` - State machines (keep for later)
- `packages/devtools/src/activities/` - Activities (keep for later)
- `packages/devtools/src/react/providers/devtools-flow-provider.tsx` - Flow provider (keep for later)

**Infrastructure:**

- `packages/devtools/src/data-source/` - Data source implementations
- `packages/devtools/src/network/` - Network protocol

**Other Hooks to Keep:**

- `packages/devtools/src/react/hooks/use-traces.ts` - If used by runtime architecture
- `packages/devtools/src/react/hooks/use-trace-stats.ts` - If used by runtime architecture
- `packages/devtools/src/react/hooks/use-tracing-controls.ts` - If used by runtime architecture
- `packages/devtools/src/react/hooks/use-container-inspector.ts` - Container inspection
- `packages/devtools/src/react/hooks/use-inspector-snapshot.ts` - Inspector snapshots
- `packages/devtools/src/react/hooks/use-container-phase.ts` - Container phase tracking
- `packages/devtools/src/react/hooks/use-container-scope-tree.ts` - Scope tree visualization

### Reusability Opportunities

- The automatic container discovery system (`ContainerTreeContext`, `useContainerTree`) should be the single approach for container tracking
- The plugin architecture in `plugins/` provides the extensibility model going forward
- The runtime architecture in `runtime/` is the foundation for all DevTools state management

### Scope Boundaries

**In Scope:**

- Remove all legacy context/provider files
- Remove all legacy hooks
- Remove "sections" mode from DevToolsPanel
- Update index.ts exports to remove legacy exports
- Update react/index.ts exports to remove legacy exports
- Update react/context/index.ts to remove legacy exports
- Update react/hooks/index.ts to remove legacy hooks
- Update any internal imports that reference removed files
- Update react-showcase example to use new APIs (if needed)

**Out of Scope:**

- Flow architecture enhancements (keep existing files, add features later)
- New DevTools features
- Performance optimizations
- Documentation updates (beyond code comments)

### Technical Considerations

- **Breaking Change**: This is intentionally a breaking change since the package is not published to npm
- **Internal Usage Only**: Only react-showcase example uses devtools, simplifying the cleanup
- **Plugin Architecture**: The tabs mode with plugin architecture is the target API surface
- **Automatic Discovery**: Container discovery should be automatic, not manual registration
- **Runtime-Based State**: All DevTools state management should flow through the runtime architecture
