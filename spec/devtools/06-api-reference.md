# 16 - API Reference

_Previous: [15 - Visual Design & Accessibility](./05-visual-design.md)_ | _Next: [17 - Appendices](./07-appendices.md)_

---

Consolidated type signatures for the entire `@hex-di/devtools` surface area. See individual spec sections for detailed explanations and examples.

## 16.1 Components

### HexDevTools

Main entry point. Renders a toggleable in-app overlay panel for inspecting HexDI applications at runtime.

```typescript
import { HexDevTools } from "@hex-di/devtools";

function HexDevTools(props: HexDevToolsProps): React.ReactElement | null;
```

```typescript
interface HexDevToolsProps {
  /**
   * The InspectorAPI instance to consume. When omitted, auto-detects
   * from the nearest InspectorProvider context.
   */
  readonly inspector?: InspectorAPI;

  /**
   * Whether DevTools is active. When `false`, the component renders nothing
   * and is fully tree-shaken in production builds.
   *
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Whether the panel starts open on mount.
   *
   * @default false
   */
  readonly defaultOpen?: boolean;

  /**
   * Initial panel height in pixels. Persisted to localStorage on resize.
   *
   * @default 300
   */
  readonly defaultHeight?: number;

  /**
   * Position of the floating trigger button when the panel is closed.
   *
   * @default "bottom-right"
   */
  readonly triggerPosition?: TriggerPosition;

  /**
   * Keyboard shortcut to toggle the panel. Expressed as a key combination
   * string (e.g., "ctrl+shift+d", "meta+d").
   *
   * @default "ctrl+shift+d"
   */
  readonly hotkey?: string;

  /**
   * Additional custom panels to display alongside built-in panels.
   * Custom panels appear after the built-in panels in the tab bar,
   * ordered by the `order` property.
   */
  readonly panels?: readonly DevToolsPanel[];

  /**
   * Color theme for the overlay. "system" detects via
   * `prefers-color-scheme` media query.
   *
   * @default "system"
   */
  readonly theme?: "light" | "dark" | "system";
}

type TriggerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
```

**Prop Examples:**

```tsx
// Minimal — auto-detects inspector from InspectorProvider
<HexDevTools />

// Explicit inspector, starts open, dark theme
<HexDevTools
  inspector={container.inspector}
  defaultOpen={true}
  theme="dark"
/>

// Production guard — tree-shakes to nothing
<HexDevTools enabled={process.env.NODE_ENV === "development"} />

// Custom panels
<HexDevTools panels={[myCustomPanel]} triggerPosition="bottom-left" />
```

---

## 16.2 Panel Plugin API

### DevToolsPanel

Interface for registering custom panels within the DevTools overlay.

```typescript
interface DevToolsPanel {
  /** Unique identifier for this panel. Used as localStorage key suffix. */
  readonly id: string;

  /** Human-readable label displayed in the tab bar. */
  readonly label: string;

  /**
   * Icon identifier. Accepts a single emoji character or an SVG path string.
   * Built-in panels use emoji; custom panels may use either.
   */
  readonly icon: string;

  /**
   * Sort order in the tab bar. Lower values appear first.
   * Built-in panels use orders 0-99. Custom panels should use 100+.
   */
  readonly order: number;

  /** React component rendered when this panel's tab is active. */
  readonly component: React.ComponentType<PanelProps>;
}
```

### PanelProps

Props injected into every panel component (built-in and custom).

```typescript
interface PanelProps {
  /** The InspectorAPI instance providing container data. */
  readonly inspector: InspectorAPI;

  /** Resolved theme (always "light" or "dark", never "system"). */
  readonly theme: ResolvedTheme;

  /** Current panel width in pixels. */
  readonly width: number;

  /** Current panel height in pixels. */
  readonly height: number;
}
```

**Custom Panel Example:**

```typescript
const MyCustomPanel: DevToolsPanel = {
  id: "my-panel",
  label: "My Panel",
  icon: "\u{1F527}", // wrench emoji
  order: 100,
  component: function MyPanel({ inspector, theme }: PanelProps) {
    const snapshot = inspector.getSnapshot();
    return <div style={{ color: theme.colors.text }}>Custom panel content</div>;
  },
};
```

---

## 16.3 Typed LibraryInspector Protocol

Compile-time enhancement to the existing `LibraryInspector` protocol that preserves snapshot types through the container boundary.

### TypedLibraryInspector

```typescript
/**
 * Enhanced LibraryInspector with typed snapshot.
 *
 * Assignable to base LibraryInspector — additive enhancement only.
 * The type parameters carry through port resolution and graph validation.
 */
interface TypedLibraryInspector<
  TName extends string,
  TSnapshot extends Readonly<Record<string, unknown>>,
> {
  readonly name: TName;
  getSnapshot(): Readonly<TSnapshot>;
  subscribe?(listener: LibraryEventListener): () => void;
  dispose?(): void;
}
```

### createTypedLibraryInspectorPort

```typescript
/**
 * Creates a port for a typed library inspector.
 *
 * Returns a DirectedPort with the "library-inspector" category, enabling
 * auto-discovery by the container's afterResolve hook and compile-time
 * extraction via ExtractLibraryInspectorPorts.
 *
 * @param config - Port configuration
 * @returns DirectedPort typed with the specific library inspector
 */
function createTypedLibraryInspectorPort<
  const TName extends string,
  TSnapshot extends Readonly<Record<string, unknown>>,
>(config: {
  readonly name: TName;
  readonly description?: string;
  readonly tags?: readonly string[];
}): DirectedPort<TypedLibraryInspector<TName, TSnapshot>, TName, "outbound", "library-inspector">;
```

**Example:**

```typescript
// Flow library defines its typed inspector port
interface FlowSnapshot {
  readonly machineCount: number;
  readonly machines: readonly { readonly portName: string; readonly state: string }[];
}

const FlowInspectorPort = createTypedLibraryInspectorPort<"FlowInspector", FlowSnapshot>({
  name: "FlowInspector",
  description: "Flow library inspection",
  tags: ["flow"],
});
```

---

## 16.4 Type Utilities

### ExtractLibraryInspectorPorts

```typescript
/**
 * Filters a graph's provides type to only library-inspector category ports.
 *
 * @typeParam TProvides - Union of all ports provided by a graph
 * @returns Union of only those ports whose category is "library-inspector"
 */
type ExtractLibraryInspectorPorts<TProvides> =
  TProvides extends DirectedPort<infer S, infer N, infer D, "library-inspector">
    ? DirectedPort<S, N, D, "library-inspector">
    : never;
```

### ExtractLibraryNames

```typescript
/**
 * Extracts library names as a string union from a graph's provides type.
 *
 * @typeParam TProvides - Union of all ports provided by a graph
 * @returns String literal union of library inspector port names
 */
type ExtractLibraryNames<TProvides> =
  ExtractLibraryInspectorPorts<TProvides> extends DirectedPort<
    infer _S,
    infer N,
    infer _D,
    "library-inspector"
  >
    ? N
    : never;
```

### LibrarySnapshotMap

```typescript
/**
 * Builds a typed map from library inspector port names to their snapshot types.
 *
 * @typeParam TProvides - Union of all ports provided by a graph
 * @returns Record mapping each library inspector name to its typed snapshot
 */
type LibrarySnapshotMap<TProvides> = {
  [K in ExtractLibraryNames<TProvides>]: ExtractLibraryInspectorPorts<TProvides> extends DirectedPort<
    TypedLibraryInspector<K, infer TSnapshot>,
    K,
    infer _D,
    "library-inspector"
  >
    ? Readonly<TSnapshot>
    : Readonly<Record<string, unknown>>;
};
```

### TypedUnifiedSnapshot

```typescript
/**
 * Unified snapshot with typed library snapshots.
 *
 * Assignable to base UnifiedSnapshot — the libraries field narrows
 * from Record<string, Record<string, unknown>> to the specific typed map.
 */
interface TypedUnifiedSnapshot<
  TLibraries extends Record<string, Readonly<Record<string, unknown>>>,
> {
  readonly timestamp: number;
  readonly container: ContainerSnapshot;
  readonly libraries: Readonly<TLibraries>;
  readonly registeredLibraries: readonly string[];
}
```

---

## 16.5 Hooks

Internal hooks used by the DevTools overlay. These are **not exported** from the package public API.

### useDevToolsState

```typescript
/**
 * Manages DevTools overlay state: open/closed, active tab, panel height,
 * theme mode. Reads initial values from localStorage and persists changes.
 *
 * @returns Current state and action dispatchers
 */
function useDevToolsState(): DevToolsState & DevToolsActions;

interface DevToolsState {
  readonly isOpen: boolean;
  readonly activeTab: string;
  readonly panelHeight: number;
  readonly themeMode: "light" | "dark";
}

interface DevToolsActions {
  toggle(): void;
  open(): void;
  close(): void;
  setActiveTab(tabId: string): void;
  setPanelHeight(height: number): void;
  setThemeMode(mode: "light" | "dark"): void;
}
```

### usePanelRegistry

```typescript
/**
 * Merges built-in panels with custom panels, sorted by order.
 *
 * @returns Sorted array of all registered panels
 */
function usePanelRegistry(): readonly DevToolsPanel[];
```

### useLibraryPanels

```typescript
/**
 * Auto-discovers library inspectors from the InspectorAPI and generates
 * DevToolsPanel entries for each registered library.
 *
 * @returns Array of auto-generated library panels
 */
function useLibraryPanels(): readonly DevToolsPanel[];
```

---

## 16.6 Theme API

### DevToolsTheme

```typescript
interface DevToolsTheme {
  /** Resolved mode: always "light" or "dark", never "system". */
  readonly mode: "light" | "dark";
  readonly colors: ThemeColors;
  readonly typography: ThemeTypography;
  readonly spacing: ThemeSpacing;
}

interface ThemeColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceHover: string;
  readonly border: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly error: string;
  readonly warning: string;
  readonly success: string;
  readonly info: string;
  readonly badgeBg: string;
  readonly badgeText: string;
  readonly codeBg: string;
  readonly codeText: string;
  readonly graphNode: string;
  readonly graphEdge: string;
  readonly graphNodeActive: string;
  readonly graphNodeError: string;
  readonly timelineBar: string;
  readonly timelineBarError: string;
}

interface ThemeTypography {
  readonly fontFamily: string;
  readonly fontFamilyMono: string;
  readonly fontSizeXs: string;
  readonly fontSizeSm: string;
  readonly fontSizeMd: string;
  readonly fontSizeLg: string;
  readonly lineHeight: string;
}

interface ThemeSpacing {
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly panelPadding: string;
  readonly tabHeight: string;
  readonly triggerSize: string;
}
```

**Theme Tokens as CSS Custom Properties:**

```css
[data-hex-devtools] {
  --hdt-bg: var(--hdt-bg-light, #ffffff);
  --hdt-surface: var(--hdt-surface-light, #f8f9fa);
  --hdt-text: var(--hdt-text-light, #1a1a2e);
  --hdt-accent: var(--hdt-accent-light, #6366f1);
  /* ... etc */
}

[data-hex-devtools="dark"] {
  --hdt-bg: #1a1a2e;
  --hdt-surface: #252542;
  --hdt-text: #e2e8f0;
  --hdt-accent: #818cf8;
  /* ... etc */
}
```

---

## 16.7 Configuration

### localStorage Keys

All DevTools state is persisted to localStorage under the `hex-devtools:` prefix.

| Key                   | Type                | Description                                    | Default       |
| --------------------- | ------------------- | ---------------------------------------------- | ------------- |
| `hex-devtools:open`   | `"true" \| "false"` | Panel open/closed state                        | `"false"`     |
| `hex-devtools:height` | `string` (number)   | Panel height in pixels                         | `"300"`       |
| `hex-devtools:tab`    | `string`            | Active tab ID                                  | `"container"` |
| `hex-devtools:theme`  | `"light" \| "dark"` | Theme override (omitted when following system) | _(absent)_    |

### Persistence Format

```typescript
// Read example
const isOpen = localStorage.getItem("hex-devtools:open") === "true";
const height = Number(localStorage.getItem("hex-devtools:height")) || 300;
const activeTab = localStorage.getItem("hex-devtools:tab") ?? "container";

// Write example (on state change)
localStorage.setItem("hex-devtools:open", String(isOpen));
localStorage.setItem("hex-devtools:height", String(height));
localStorage.setItem("hex-devtools:tab", activeTab);
```

- SSR-safe: all localStorage access is guarded by `typeof window !== "undefined"`.
- Missing or invalid values fall back to defaults silently (no errors thrown).
- Clearing localStorage resets all DevTools state to defaults on next mount.

---

_Previous: [15 - Visual Design & Accessibility](./05-visual-design.md)_ | _Next: [17 - Appendices](./07-appendices.md)_
