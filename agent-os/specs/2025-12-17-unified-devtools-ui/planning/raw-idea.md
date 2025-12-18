# Raw Idea: Unified DevTools UI Architecture

## User Description

The devtools-ui should keep only the interactive interface. It should read the config from hex-di.json to get connected to the relay server. The interactive UI should have the same UI/UX as the FloatingDevtools interface with the same features and can share the logic and host component in the devtools UI library. It should use HexDI to implement separation between render and logic. The TUI needs to be one-to-one compatible with FloatingDevTools - both should share the same code and only differentiate on the tiny components from react-dom or opentui-react.

## Refined Requirements (from Expert Analysis)

After extensive analysis by 5 specialized expert agents:

1. **Package Consolidation**: 8 packages -> 2 packages (75% reduction)
   - `@hex-di/devtools-core` - Pure types, transforms, protocol
   - `@hex-di/devtools` - UI with `/dom` and `/tui` entry points

2. **RenderPrimitivesPort**: HexDI port for injecting render primitives
   - Shared components use `usePrimitives()` hook
   - DOM adapter: `<div>`, `<span>`, D3/SVG graph
   - TUI adapter: `<box>`, `<text>`, ASCII graph

3. **Code Sharing**: ~95% shared, only ~200 lines per platform differ

4. **Type Safety**: Conditional props based on renderer type

## Spec Details

- **Spec Name**: unified-devtools-ui
- **Date Created**: 2025-12-17
- **Status**: Requirements Complete - Ready for Spec Writing
