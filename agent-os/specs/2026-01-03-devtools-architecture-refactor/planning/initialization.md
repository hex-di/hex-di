# Spec Initialization: DevTools Architecture Refactor

## Initial Idea

Apply architectural recommendations to simplify the DevTools package. The current architecture has several identified issues that need to be addressed:

### Current Problems

1. **Multiple overlapping state systems**: DevToolsRuntimeImpl, DevToolsFlowProvider, and FSMs all manage state
2. **Three separate providers**: RuntimeProvider, ContainerProvider, and FlowProvider create confusion
3. **Over-engineered ADTs**: Option<T> and Result<T,E> patterns when TypeScript native patterns suffice
4. **Unclear source of truth**: No single authoritative state system

### Recommendations to Apply

**Short-term (Low effort, high impact):**

1. Consolidate providers - Single `DevToolsProvider` that sets up everything
2. Remove ADTs - Use `T | null` and discriminated unions directly
3. Document the canonical data flow

**Medium-term:** 4. Choose runtime OR Flow - Don't run parallel state systems 5. Extract graph visualization - `@hex-di/graph-viz` as reusable package

**Long-term:** 6. Consider event sourcing - Full event log for time-travel debugging

## Key Files Involved

- `/packages/devtools/src/react/providers/` - Multiple providers to consolidate
- `/packages/devtools/src/react/types/adt.ts` - Option/Result ADTs to remove
- `/packages/devtools/src/runtime/` - Runtime state management
- `/packages/devtools/src/machines/` - Flow state machines
- `/packages/devtools/src/react/graph-visualization/` - Graph viz to extract
