# Raw Idea

## Feature Description

Apply architectural recommendations to the DevTools package

This spec is about refactoring the DevTools architecture based on the following recommendations:

**Short-term (Low effort, high impact):**

1. Consolidate providers - Single `DevToolsProvider` that sets up everything
2. Remove ADTs - Use `T | null` and discriminated unions directly instead of Option/Result
3. Document the canonical data flow - One diagram showing command → state → render

**Medium-term:** 4. Choose runtime OR Flow - Don't run parallel state systems 5. Extract graph visualization - `@hex-di/graph-viz` as reusable package

**Long-term:** 6. Consider event sourcing - Full event log for time-travel debugging

The goal is to simplify the architecture by removing over-layering and making the source of truth clear.
