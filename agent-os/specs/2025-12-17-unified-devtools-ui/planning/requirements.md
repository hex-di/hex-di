# Requirements: Unified DevTools UI Architecture

## Expert Analysis Summary

This document captures the consolidated findings from 5 specialized expert agents:
- Architecture Guardian (Clean/Hexagonal Architecture)
- DI Container Architect
- TypeScript Type System Architect
- React Ports Integrator
- AI Optimization Architect

---

## 1. Package Structure Decision

### Selected: 2 Packages with Entry Points (75% Reduction)

| Current State | Target State |
|---------------|--------------|
| devtools-core | devtools-core (keep) |
| devtools-ui | devtools (merge) |
| devtools-adapters | devtools-core or devtools |
| devtools-network | devtools |
| devtools | devtools/dom |
| devtools-react | devtools/dom |
| devtools-tui | devtools/tui |
| devtools-testing | devtools-core (internal) |

**Final Package Count: 2**

```
@hex-di/devtools-core        # Pure types, transforms, protocol (no React)
@hex-di/devtools             # Everything else with entry points
  /dom                       # Browser React + D3 graph
  /tui                       # Terminal OpenTUI + ASCII graph
```

---

## 2. Architecture Layers

| Layer | Location | Sharing |
|-------|----------|---------|
| Types, Transforms | `devtools-core/` | 100% Shared |
| State, Reducers, Selectors | `devtools/state/` | 100% Shared |
| View Models | `devtools/view-models/` | 100% Shared |
| Presenters | `devtools/presenters/` | 100% Shared |
| RenderPrimitivesPort | `devtools/ports/` | Contract Shared |
| usePrimitives Hook | `devtools/hooks/` | 100% Shared |
| Headless Components | `devtools/components/` | 100% Shared |
| DOM Primitives | `devtools/dom/primitives.ts` | Platform-Specific (~100 lines) |
| TUI Primitives | `devtools/tui/primitives.ts` | Platform-Specific (~100 lines) |
| Graph Renderer | `devtools/dom/graph.tsx` & `tui/ascii-graph.ts` | Platform-Specific |

---

## 3. Directory Structure

```
packages/
  devtools-core/
    src/
      index.ts
      types.ts                    # ExportedGraph, TraceEntry, etc.
      protocol/                   # JSON-RPC definitions
      transforms/                 # toJSON, toDOT, toMermaid
      filters/                    # filterGraph, byLifetime
      utils/                      # formatDuration, etc.

  devtools/
    src/
      index.ts                    # Shared exports (state, VMs, ports, network)

      state/                      # DevToolsState, reducer, actions
        devtools.state.ts
        actions.ts
        reducer.ts
        selectors.ts

      view-models/                # View model types and factories
        graph.vm.ts
        timeline.vm.ts
        stats.vm.ts
        inspector.vm.ts
        panel.vm.ts

      presenters/                 # Framework-agnostic presentation logic
        graph.presenter.ts
        timeline.presenter.ts

      ports/                      # HexDI port definitions
        render-primitives.port.ts  # RenderPrimitives interface
        graph-view.port.ts
        timeline-view.port.ts

      hooks/                      # React hooks (shared)
        use-primitives.ts
        use-devtools.ts

      components/                 # SHARED headless components
        DevToolsPanel.tsx
        GraphView.tsx
        TimelineView.tsx
        StatsView.tsx
        InspectorView.tsx

      network/                    # WebSocket client (shared)
        client.ts
        data-source.ts

      dom/                        # Browser entry (/dom)
        index.ts
        primitives.ts             # Box, Text, Button DOM implementations
        graph-renderer.tsx        # D3/SVG graph
        FloatingDevTools.tsx

      tui/                        # Terminal entry (/tui)
        index.ts
        primitives.ts             # Box, Text, Button TUI implementations
        ascii-graph.ts            # ASCII graph renderer
        cli/
          index.ts                # hexdi-tui binary
```

---

## 4. Key Design Pattern: RenderPrimitivesPort

### Port Contract

```typescript
// ports/render-primitives.port.ts
import { createPort } from '@hex-di/ports';

export type RendererType = 'dom' | 'tui';

export interface RenderPrimitives<R extends RendererType = RendererType> {
  Box: React.FC<BoxProps<R>>;
  Text: React.FC<TextProps<R>>;
  Button: React.FC<ButtonProps<R>>;
  Icon: React.FC<IconProps>;
  ScrollView: React.FC<ScrollViewProps>;
  Divider: React.FC<DividerProps>;
  GraphRenderer: React.FC<GraphRendererProps>;
  styles: StyleSystem;
}

export const RenderPrimitivesPort = createPort<RenderPrimitives>('RenderPrimitives');
```

### Semantic Styling

```typescript
// Semantic colors - work across renderers
export type SemanticColor =
  | 'primary'      // Accent actions
  | 'secondary'    // Secondary UI
  | 'success'      // Success states (singleton)
  | 'warning'      // Warning states (scoped)
  | 'error'        // Error states
  | 'muted'        // Dimmed text
  | 'foreground'   // Primary text
  | 'background'   // Background color
  | 'border'       // Border color
  | 'accent';      // Highlights

// Common layout props (Yoga-based flexbox)
export interface LayoutProps {
  display?: 'flex' | 'block' | 'none';
  flexDirection?: 'row' | 'column';
  justifyContent?: 'start' | 'end' | 'center' | 'between' | 'around';
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  gap?: SpacingToken;
  padding?: SpacingToken;
  // ... full flexbox API
}
```

### Conditional Props

```typescript
// DOM-only props
export interface DOMOnlyProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  'data-testid'?: string;
}

// TUI-only props
export interface TUIOnlyProps {
  focusable?: boolean;
  title?: string;  // Border title
  titleAlignment?: 'left' | 'center' | 'right';
}

// Conditional selection based on renderer
export type RendererSpecificProps<R extends RendererType> =
  R extends 'dom' ? DOMOnlyProps :
  R extends 'tui' ? TUIOnlyProps :
  never;
```

---

## 5. Shared Component Pattern

```typescript
// components/GraphView.tsx - Works in BOTH DOM and TUI
import { usePrimitives } from '../hooks/use-primitives.js';
import type { GraphViewModel } from '../view-models/graph.vm.js';

export interface GraphViewProps {
  readonly viewModel: GraphViewModel;
  readonly onNodeSelect?: (nodeId: string | null) => void;
}

export function GraphView({ viewModel, onNodeSelect }: GraphViewProps) {
  // Primitives injected via context - works for both DOM and TUI
  const { Box, Text, Icon, ScrollView, GraphRenderer } = usePrimitives();

  if (viewModel.isEmpty) {
    return (
      <Box style={{ justifyContent: 'center', alignItems: 'center', padding: 'lg' }}>
        <Text style={{ color: 'muted' }}>No services registered</Text>
      </Box>
    );
  }

  return (
    <Box style={{ flexDirection: 'column', height: 'full' }}>
      <Box style={{ gap: 'sm', padding: 'sm' }}>
        <Text variant="label">
          {viewModel.nodeCount} nodes, {viewModel.edgeCount} edges
        </Text>
      </Box>
      <ScrollView style={{ flex: 1 }}>
        <GraphRenderer viewModel={viewModel} onNodeSelect={onNodeSelect} />
      </ScrollView>
    </Box>
  );
}
```

---

## 6. Platform Entry Points

### DOM Entry (`/dom`)

```typescript
// dom/index.ts
export { DOMPrimitives } from './primitives.js';
export { FloatingDevTools } from './FloatingDevTools.js';
export { DevToolsPanel } from './DevToolsPanel.js';

// Convenience re-exports
export * from '../components/index.js';
export * from '../hooks/index.js';
```

### TUI Entry (`/tui`)

```typescript
// tui/index.ts
export { TUIPrimitives } from './primitives.js';
export { TuiDevTools } from './TuiDevTools.js';

// Convenience re-exports
export * from '../components/index.js';
export * from '../hooks/index.js';
```

---

## 7. Package.json Configuration

```json
{
  "name": "@hex-di/devtools",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./dom": {
      "types": "./dist/dom/index.d.ts",
      "import": "./dist/dom/index.js"
    },
    "./tui": {
      "types": "./dist/tui/index.d.ts",
      "import": "./dist/tui/index.js"
    }
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "@opentui/core": ">=0.1.0",
    "@opentui/react": ">=0.1.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true },
    "@opentui/core": { "optional": true },
    "@opentui/react": { "optional": true }
  },
  "bin": {
    "hexdi-tui": "./dist/tui/cli/index.js"
  }
}
```

---

## 8. Usage Examples

### Browser App (React DOM)

```typescript
import { DevToolsProvider, LocalDataSource } from '@hex-di/devtools';
import { FloatingDevTools } from '@hex-di/devtools/dom';
import { appGraph, container } from './di';

const dataSource = new LocalDataSource(appGraph, container);

function App() {
  return (
    <DevToolsProvider dataSource={dataSource}>
      <MainApp />
      <FloatingDevTools position="bottom-right" />
    </DevToolsProvider>
  );
}
```

### Terminal App (Bun + OpenTUI)

```typescript
import { DevToolsProvider, RemoteDataSource } from '@hex-di/devtools';
import { TuiDevTools } from '@hex-di/devtools/tui';
import { render } from '@opentui/core';

const dataSource = new RemoteDataSource({ url: 'ws://localhost:9000' });

render(
  <DevToolsProvider dataSource={dataSource}>
    <TuiDevTools appId="my-app" />
  </DevToolsProvider>
);
```

---

## 9. What Changes Between Renderers

| Component | DOM Implementation | TUI Implementation |
|-----------|-------------------|-------------------|
| Box | `<div style={{display:'flex',...}}>` | `<box flexDirection={...}>` |
| Text | `<span style={{color,...}}>` | `<text><span fg={...}>` |
| Button | `<button className="btn">` | `<box border onClick>` |
| Icon | Unicode/SVG icons | ASCII characters `[G]`, `->` |
| GraphRenderer | D3 + SVG with dagre layout | ASCII art with box-drawing chars |
| Colors | CSS hex colors | ANSI color codes |
| Interactions | onClick, onMouseEnter | onKeyboard, focus navigation |

**Lines of platform-specific code: ~200 lines each (~400 total)**

---

## 10. Migration Path

### Phase 1: Create New Structure
1. Create `devtools/` package with new directory structure
2. Move types and transforms to `devtools-core/`
3. Set up entry point exports

### Phase 2: Implement Primitives Port
1. Define `RenderPrimitivesPort` contract
2. Create `DOMPrimitives` implementation
3. Create `TUIPrimitives` implementation
4. Add `usePrimitives` hook

### Phase 3: Convert Components
1. Refactor `DevToolsPanel` to use primitives
2. Refactor `GraphView` to use primitives
3. Refactor other views (Timeline, Stats, Inspector)

### Phase 4: Wire Up Entries
1. Create `/dom` entry with FloatingDevTools
2. Create `/tui` entry with TuiDevTools CLI
3. Test both platforms

### Phase 5: Cleanup
1. Deprecate old packages
2. Update documentation
3. Remove old packages after migration period

---

## Decision Log

| Question | Decision | Rationale |
|----------|----------|-----------|
| Package structure | 2 packages with entries | Maximum sharing, minimal overhead |
| Primitive injection | React Context + HexDI Port | Flexible, testable, consistent with library patterns |
| Style system | Semantic tokens | Cross-platform consistency |
| Props API | Conditional types by renderer | Type safety without runtime cost |
| Graph rendering | Platform-specific | D3/SVG vs ASCII are fundamentally different |
| State management | Shared reducer | Already framework-agnostic |
