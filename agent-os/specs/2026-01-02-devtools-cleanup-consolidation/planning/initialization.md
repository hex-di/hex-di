# Spec Initialization

## Raw Idea

The user wants to clean up old devtools code and use the latest implementation with the devtools runtime.

## Initial Context from Codebase Research

Based on codebase analysis, the devtools package has multiple architectural layers:

### Current State

1. **Legacy Context/Provider System** (older):
   - `DevToolsContext` / `DevToolsProvider` - provides TracingAPI and graph data
   - `ContainerRegistryContext` / `HexDiDevToolsProvider` - multi-container registry
   - Legacy hooks: `useDevTools`, `useTracingAPI`, `useExportedGraph`, `useTraces`, `useTraceStats`, `useTracingControls`

2. **DevTools Runtime (newer)** - plugin-based architecture:
   - `DevToolsRuntimeContext` / `DevToolsRuntimeProvider` - provides DevToolsRuntime
   - `DevToolsContainerProvider` - container-aware runtime context
   - Runtime hooks: `useDevToolsRuntime`, `useDevToolsState`, `useDevToolsSelector`

3. **Flow-based Architecture** (in progress):
   - `DevToolsFlowProvider` - Flow state machine provider
   - `useDevToolsFlow`, `useDevToolsUI`, `useDevToolsTracing`, `useRegisterContainerFlow`

4. **Container Discovery System**:
   - Legacy manual: `useRegisterContainer`, `useContainerList`, `useContainerInspector`
   - Newer automatic: `useContainerTree`, `useContainerTreeContext`, `ContainerTreeContext`

### Components

- `HexDiDevTools` - uses both `DevToolsContainerProvider` and `DevToolsRuntimeProvider`
- `DevToolsPanel` - supports "tabs" mode (plugin architecture) and "sections" mode (legacy)

### Key Files Marked as "Legacy"

From the index.ts files, these are explicitly labeled:

- `// Legacy Context and Provider` section in react/index.ts
- `// Legacy React Hooks` section in hooks/index.ts
- `// Multi-container registry (legacy - use ContainerTreeContext for automatic discovery)` comment

### The Cleanup Opportunity

There appear to be overlapping implementations:

1. Multiple context providers doing similar things
2. Manual container registration vs automatic container discovery
3. Legacy hooks alongside runtime hooks
4. "sections" mode in DevToolsPanel as legacy backward compatibility
