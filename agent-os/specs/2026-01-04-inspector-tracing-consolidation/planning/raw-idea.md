# Raw Idea: Inspector-Tracing Consolidation

## Spec Name

inspector-tracing-consolidation

## Description

Consolidate the @hex-di/inspector and @hex-di/tracing plugin packages into the @hex-di/runtime package while preserving the plugin-based architecture. This addresses the child container discovery bug caused by fragile WeakMap lookups in the wrapper chain, while following the expert consensus to maintain Inspector and Tracer as separate composed components (not inline methods on Container).

## Key Points

- Move InspectorPlugin and TracingPlugin implementations from separate packages into runtime/src/plugins/
- Fix getEnhancedWrapper() to follow the full wrapper chain (root cause of child discovery bug)
- Preserve symbol-based access pattern (container[INSPECTOR], container[TRACING])
- Maintain testability through composed components
- Reduce package count from 3 to 1 for these capabilities

## Goals

1. Consolidate inspector and tracing functionality into runtime package
2. Fix child container discovery bug in wrapper chain
3. Preserve plugin-based architecture
4. Maintain testability
5. Reduce package complexity
