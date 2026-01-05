# DevTools Runtime Architecture Refactor

## Raw Idea

**Title:** DevTools Runtime Architecture Refactor

**Description:**
Refactor the DevTools architecture so that:

1. DevToolsRuntime owns container discovery (not React layer)
2. Root container is passed at runtime creation
3. Runtime discovers child containers recursively via getChildContainers()
4. Runtime aggregates events from all containers with source tagging
5. Plugins receive container tree, events, and subscriptions from runtime via PluginProps
6. HexDiDevTools becomes the main component (not a wrapper)
7. XState machines move to runtime layer as internal implementation
8. React layer becomes thin UI bindings only

This fixes the current architectural inversion where container discovery lives in React (DevToolsFlowProvider) instead of the runtime layer.
