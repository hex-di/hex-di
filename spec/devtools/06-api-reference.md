# 16 - API Reference

_Previous: [15 - Visual Design & Accessibility](./05-visual-design.md)_ | _Next: [17 - Appendices](./07-appendices.md)_

---

Consolidated type signatures for the `@hex-di/devtools-client` and `@hex-di/devtools` packages. See individual spec sections for detailed explanations and examples.

---

## 16.1 Client SDK (`@hex-di/devtools-client`)

### connectDevTools

Connects an application's `InspectorAPI` to a running DevTools server over WebSocket. This is the imperative, framework-agnostic entry point for any JavaScript or TypeScript application.

```typescript
import { connectDevTools } from "@hex-di/devtools-client";

function connectDevTools(inspector: InspectorAPI, config: DevToolsClientConfig): DevToolsConnection;
```

```typescript
interface DevToolsClientConfig {
  /**
   * WebSocket URL of the DevTools server.
   *
   * @default "ws://localhost:4200"
   */
  readonly serverUrl?: string;

  /** Human-readable application name displayed in the dashboard sidebar. */
  readonly appName: string;

  /** Application environment type, used for iconography and filtering. */
  readonly appType: "react" | "node" | "unknown";

  /**
   * Unique instance identifier for this specific app instance. Used to
   * distinguish multiple browser tabs or Node.js processes running the
   * same application.
   *
   * If omitted, the client auto-generates one:
   * - **Browser**: `crypto.randomUUID()` stored in `sessionStorage` so each
   *   tab gets a stable ID that persists across reconnections but not across
   *   tab close/reopen.
   * - **Node.js**: `crypto.randomUUID()` generated once at process start.
   */
  readonly instanceId?: string;

  /**
   * Additional metadata sent during handshake. Auto-populated by the client
   * library if not explicitly provided:
   *
   * - **Browser**: `url` from `location.href`, `title` from `document.title`
   * - **Node.js**: `pid` from `process.pid`, `argv` from `process.argv.slice(0, 2)`
   */
  readonly metadata?: ConnectionMetadata;

  /**
   * Whether to automatically reconnect on disconnect.
   *
   * @default true
   */
  readonly reconnect?: boolean;

  /**
   * Delay between reconnection attempts in milliseconds.
   *
   * @default 3000
   */
  readonly reconnectInterval?: number;

  /**
   * Maximum number of messages to buffer while disconnected.
   * Once the buffer is full, oldest messages are dropped.
   *
   * @default 1000
   */
  readonly bufferSize?: number;
}
```

```typescript
interface ConnectionMetadata {
  /** Browser: current page URL. Node.js: undefined. */
  readonly url?: string;

  /** Browser: document.title. Node.js: undefined. */
  readonly title?: string;

  /** Node.js: process.pid. Browser: undefined. */
  readonly pid?: number;

  /** Node.js: process.argv.slice(0, 2). Browser: undefined. */
  readonly argv?: readonly string[];

  /** Arbitrary key-value pairs for custom identification. */
  readonly [key: string]: unknown;
}
```

```typescript
interface DevToolsConnection {
  /** Current connection lifecycle status. */
  readonly status: "connecting" | "connected" | "disconnected" | "reconnecting";

  /** Unique identifier assigned by the server upon handshake acknowledgment. */
  readonly connectionId: string;

  /** Gracefully disconnects from the DevTools server. */
  disconnect(): void;

  /**
   * Registers a listener for connection status changes.
   *
   * @returns Unsubscribe function
   */
  onStatusChange(listener: (status: DevToolsConnection["status"]) => void): () => void;
}
```

**Usage Examples:**

```typescript
// Node.js application
import { connectDevTools } from "@hex-di/devtools-client";

const connection = connectDevTools(container.inspector, {
  appName: "order-service",
  appType: "node",
});

connection.onStatusChange(status => {
  console.log(`DevTools: ${status}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  connection.disconnect();
});
```

```typescript
// Custom server URL and buffer size
const connection = connectDevTools(inspector, {
  serverUrl: "ws://devtools.internal:4200",
  appName: "payment-gateway",
  appType: "node",
  reconnect: true,
  reconnectInterval: 5000,
  bufferSize: 2000,
});
```

---

### DevToolsClientProvider

React component that manages a DevTools client connection within the React tree. Automatically connects on mount and disconnects on unmount.

```typescript
import { DevToolsClientProvider } from "@hex-di/devtools-client";

function DevToolsClientProvider(props: DevToolsClientProviderProps): React.ReactElement;
```

```typescript
interface DevToolsClientProviderProps {
  /**
   * The InspectorAPI instance to consume. When omitted, auto-detects
   * from the nearest InspectorProvider context.
   */
  readonly inspector?: InspectorAPI;

  /** Client connection configuration. */
  readonly config: DevToolsClientConfig;

  /**
   * Whether the client is active. When `false`, no connection is established
   * and the provider is a transparent passthrough for children.
   *
   * @default true
   */
  readonly enabled?: boolean;

  /** Child elements rendered within the provider. */
  readonly children: React.ReactNode;
}
```

**Usage Examples:**

```tsx
// Minimal -- auto-detects inspector from InspectorProvider
<DevToolsClientProvider config={{ appName: "my-app", appType: "react" }}>
  <App />
</DevToolsClientProvider>

// Explicit inspector, custom server
<DevToolsClientProvider
  inspector={container.inspector}
  config={{
    serverUrl: "ws://devtools.local:4200",
    appName: "admin-dashboard",
    appType: "react",
  }}
>
  <App />
</DevToolsClientProvider>

// Production guard -- no connection, zero overhead
<DevToolsClientProvider
  enabled={process.env.NODE_ENV === "development"}
  config={{ appName: "storefront", appType: "react" }}
>
  <App />
</DevToolsClientProvider>
```

---

## 16.2 DevTools Server & Dashboard (`@hex-di/devtools`)

### CLI

The `@hex-di/devtools` package provides a CLI that starts the WebSocket server and opens the dashboard in a browser.

```bash
# Default: port 4200, opens browser
npx @hex-di/devtools

# Custom port, no auto-open
npx @hex-di/devtools --port 9000 --no-open

# Bind to all interfaces
npx @hex-di/devtools --host 0.0.0.0
```

```typescript
interface DevToolsServerConfig {
  /**
   * Port number for the WebSocket server and dashboard HTTP server.
   *
   * @default 4200
   */
  readonly port?: number;

  /**
   * Host to bind the server to.
   *
   * @default "localhost"
   */
  readonly host?: string;

  /**
   * Whether to automatically open the dashboard in the default browser on start.
   *
   * @default true
   */
  readonly openBrowser?: boolean;

  /**
   * Whether to start an MCP server alongside the dashboard.
   * When enabled, the DevTools inspection adapters (34 resources, 18 tools,
   * 5 prompts) are composed into an MCP server using the @hex-di/mcp framework.
   * See spec/mcp/ for the framework specification.
   *
   * @default false
   */
  readonly enableMcp?: boolean;

  /**
   * MCP transport type. Only used when enableMcp is true.
   * - "stdio": Communicates over stdin/stdout (for Claude Code CLI integration)
   * - "sse": Communicates over HTTP Server-Sent Events (for web-based MCP clients)
   *
   * @default "stdio"
   */
  readonly mcpTransport?: "stdio" | "sse";

  /**
   * Port for SSE MCP transport. Only used when mcpTransport is "sse".
   *
   * @default 3001
   */
  readonly mcpPort?: number;
}
```

---

### RemoteInspectorAPI

Server-side proxy that mirrors a connected application's `InspectorAPI` over the WebSocket connection. Each connected application is represented by a `RemoteInspectorAPI` instance within the dashboard.

```typescript
interface RemoteInspectorAPI {
  /** Unique identifier for this connection, assigned during handshake. */
  readonly connectionId: string;

  /** Human-readable application name provided by the client. */
  readonly appName: string;

  /** Application environment type provided by the client. */
  readonly appType: "react" | "node" | "unknown";

  /** Client-generated instance identifier for multi-tab/process disambiguation. */
  readonly instanceId: string;

  /** Environment metadata provided during handshake. */
  readonly metadata: ConnectionMetadata;

  /** Current connection health status. */
  readonly status: "connected" | "stale" | "disconnected";

  /** Round-trip latency to the connected application in milliseconds. */
  readonly latencyMs: number;

  /** Returns the most recent container snapshot, or undefined if not yet received. */
  getSnapshot(): ContainerSnapshot | undefined;

  /** Returns the most recent scope tree, or undefined if not yet received. */
  getScopeTree(): ScopeTree | undefined;

  /** Returns the most recent graph data, or undefined if not yet received. */
  getGraphData(): ContainerGraphData | undefined;

  /** Returns the most recent unified snapshot, or undefined if not yet received. */
  getUnifiedSnapshot(): UnifiedSnapshot | undefined;

  /** Returns the most recent adapter info, or undefined if not yet received. */
  getAdapterInfo(): readonly AdapterInfo[] | undefined;

  /** Returns the most recent library inspectors map, or undefined if not yet received. */
  getLibraryInspectors(): ReadonlyMap<string, LibraryInspector> | undefined;

  /** Returns the most recent result statistics map, or undefined if not yet received. */
  getAllResultStatistics(): ReadonlyMap<string, ResultStatistics> | undefined;

  /**
   * Subscribes to inspector events forwarded from the connected application.
   *
   * @returns Unsubscribe function
   */
  subscribe(listener: (event: InspectorEvent) => void): () => void;
}
```

---

## 16.3 Panel Plugin API

### DevToolsPanel

Interface for registering custom panels within the DevTools dashboard.

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

Props injected into every panel component (built-in and custom). In the standalone dashboard architecture, panels receive a `RemoteInspectorAPI` instead of a local `InspectorAPI`.

```typescript
interface PanelProps {
  /** The remote inspector proxy for the currently selected connection. */
  readonly remoteInspector: RemoteInspectorAPI;

  /** The connection ID of the currently selected application. */
  readonly connectionId: string;

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
  component: function MyPanel({ remoteInspector, theme }: PanelProps) {
    const snapshot = remoteInspector.getSnapshot();
    return <div style={{ color: theme.colors.text }}>Custom panel content</div>;
  },
};
```

---

## 16.4 Remote Hooks (Dashboard-Side)

React hooks used within the DevTools dashboard to consume remote application data. These are exported from `@hex-di/devtools` for use by custom panel components.

### useRemoteInspector

```typescript
/**
 * Returns the RemoteInspectorAPI for a given connection, or undefined
 * if the connection does not exist or has been removed.
 *
 * @param connectionId - The connection identifier
 * @returns Remote inspector proxy or undefined
 */
function useRemoteInspector(connectionId: string): RemoteInspectorAPI | undefined;
```

### useRemoteSnapshot

```typescript
/**
 * Returns the latest ContainerSnapshot for a given connection.
 * Re-renders when a new snapshot arrives over WebSocket.
 *
 * @param connectionId - The connection identifier
 * @returns Container snapshot or undefined if not yet received
 */
function useRemoteSnapshot(connectionId: string): ContainerSnapshot | undefined;
```

### useRemoteScopeTree

```typescript
/**
 * Returns the latest ScopeTree for a given connection.
 * Re-renders when a new scope tree arrives over WebSocket.
 *
 * @param connectionId - The connection identifier
 * @returns Scope tree or undefined if not yet received
 */
function useRemoteScopeTree(connectionId: string): ScopeTree | undefined;
```

### useRemoteUnifiedSnapshot

```typescript
/**
 * Returns the latest UnifiedSnapshot for a given connection.
 * Re-renders when a new unified snapshot arrives over WebSocket.
 *
 * @param connectionId - The connection identifier
 * @returns Unified snapshot or undefined if not yet received
 */
function useRemoteUnifiedSnapshot(connectionId: string): UnifiedSnapshot | undefined;
```

### useConnections

```typescript
/**
 * Returns an array of all known connections and their metadata.
 * Re-renders when connections are added, removed, or change status.
 *
 * @returns Readonly array of connection info objects
 */
function useConnections(): readonly ConnectionInfo[];
```

### useActiveConnection

```typescript
/**
 * Returns the currently selected connection in the dashboard sidebar,
 * or undefined if no connection is selected.
 *
 * @returns Active connection info or undefined
 */
function useActiveConnection(): ConnectionInfo | undefined;
```

### ConnectionInfo

```typescript
interface ConnectionInfo {
  /** Unique identifier assigned during handshake. */
  readonly connectionId: string;

  /** Human-readable application name. */
  readonly appName: string;

  /** Application environment type. */
  readonly appType: "react" | "node" | "unknown";

  /**
   * Client-generated instance identifier. Distinguishes multiple tabs or
   * processes of the same application. Stable across reconnections within
   * a single tab/process lifecycle.
   */
  readonly instanceId: string;

  /**
   * Environment metadata provided by the client during handshake.
   * Browser apps include url and title; Node.js apps include pid.
   */
  readonly metadata: ConnectionMetadata;

  /** Current connection health status. */
  readonly status: "connected" | "stale" | "disconnected";

  /** Timestamp (ms since epoch) when the connection was established. */
  readonly connectedAt: number;

  /** Round-trip latency in milliseconds. */
  readonly latencyMs: number;

  /** Timestamp (ms since epoch) of the last message received from this client. */
  readonly lastMessageAt: number;

  /**
   * Computed display label for the sidebar. Combines appName with
   * disambiguating metadata when multiple instances share the same appName.
   *
   * Examples:
   * - "api-server" (single instance)
   * - "web-app /dashboard" (browser, disambiguated by URL path)
   * - "api-server PID:4521" (Node.js, disambiguated by PID)
   */
  readonly displayLabel: string;
}
```

---

## 16.5 Internal Dashboard Hooks

Internal hooks used by the DevTools dashboard. These are **not exported** from the package public API.

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
 * Auto-discovers library inspectors from a RemoteInspectorAPI and generates
 * DevToolsPanel entries for each registered library.
 *
 * For each library inspector:
 * 1. Checks if the inspector has a `panelModule` string field
 *    (e.g., `"@hex-di/flow/devtools"`).
 * 2. If present, dynamically imports the module via `import()` and uses
 *    its default export as the panel component.
 * 3. If the import fails or the field is absent, falls back to the generic
 *    JSON tree viewer.
 *
 * The dynamic import happens once per library per connection. The resolved
 * component is cached and reused on subsequent renders.
 *
 * @returns Array of auto-generated library panels
 */
function useLibraryPanels(): readonly DevToolsPanel[];
```

---

## 16.6 WebSocket Message Protocol

All communication between the client SDK and the DevTools server uses a typed JSON message protocol over WebSocket.

### Client-to-Server Messages

Messages sent by the application client to the DevTools server.

```typescript
type ClientToServerMessage =
  | {
      readonly type: "handshake";
      readonly appName: string;
      readonly appType: "react" | "node" | "unknown";
      readonly instanceId: string;
      readonly metadata: ConnectionMetadata;
      readonly clientVersion: string;
    }
  | { readonly type: "snapshot"; readonly data: ContainerSnapshot }
  | { readonly type: "scope-tree"; readonly data: ScopeTree }
  | { readonly type: "graph-data"; readonly data: ContainerGraphData }
  | { readonly type: "unified-snapshot"; readonly data: UnifiedSnapshot }
  | { readonly type: "adapter-info"; readonly data: readonly AdapterInfo[] }
  | {
      readonly type: "library-inspectors";
      readonly data: Record<string, Readonly<Record<string, unknown>>>;
    }
  | { readonly type: "result-statistics"; readonly data: Record<string, ResultStatistics> }
  | { readonly type: "event"; readonly data: InspectorEvent }
  | { readonly type: "data-update"; readonly topic: SubscriptionTopic; readonly data: unknown }
  | { readonly type: "pong"; readonly timestamp: number };
```

| Message Type         | Description                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `handshake`          | Initial identification with `appName`, `instanceId`, and `metadata`. Sent immediately after WebSocket open.                        |
| `snapshot`           | Full container snapshot, sent in response to `request-snapshot`.                                                                   |
| `scope-tree`         | Scope hierarchy data, sent in response to `request-scope-tree`.                                                                    |
| `graph-data`         | Container graph visualization data, sent in response to request.                                                                   |
| `unified-snapshot`   | Combined snapshot including library data, sent in response to request.                                                             |
| `adapter-info`       | Registered adapter metadata, sent in response to request.                                                                          |
| `library-inspectors` | Library inspector snapshots keyed by name, sent in response to request.                                                            |
| `result-statistics`  | Result tracking statistics keyed by identifier, sent in response to request.                                                       |
| `event`              | Real-time inspector event forwarded as it occurs (always pushed).                                                                  |
| `data-update`        | Pushed update for a subscribed topic. Client sends this whenever the subscribed data changes, without the server re-requesting it. |
| `pong`               | Response to a server `ping`, echoing the timestamp for latency.                                                                    |

### Server-to-Client Messages

Messages sent by the DevTools server to a connected application client.

```typescript
type ServerToClientMessage =
  | {
      readonly type: "handshake-ack";
      readonly connectionId: string;
      readonly serverVersion: string;
    }
  | { readonly type: "request-snapshot" }
  | { readonly type: "request-scope-tree" }
  | { readonly type: "request-graph-data" }
  | { readonly type: "request-unified-snapshot" }
  | { readonly type: "request-adapter-info" }
  | { readonly type: "request-library-inspectors" }
  | { readonly type: "request-result-statistics" }
  | { readonly type: "subscribe"; readonly topic: SubscriptionTopic }
  | { readonly type: "unsubscribe"; readonly topic: SubscriptionTopic }
  | { readonly type: "ping"; readonly timestamp: number };
```

| Message Type                 | Description                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `handshake-ack`              | Server acknowledgment with assigned connection ID and server version.                                                     |
| `request-snapshot`           | One-shot request for the client to send a fresh container snapshot.                                                       |
| `request-scope-tree`         | One-shot request for the client to send scope tree data.                                                                  |
| `request-graph-data`         | One-shot request for the client to send graph data.                                                                       |
| `request-unified-snapshot`   | One-shot request for the client to send a unified snapshot.                                                               |
| `request-adapter-info`       | One-shot request for the client to send adapter information.                                                              |
| `request-library-inspectors` | One-shot request for the client to send library inspector snapshots.                                                      |
| `request-result-statistics`  | One-shot request for the client to send result statistics.                                                                |
| `subscribe`                  | Subscribe to live updates for a data topic. Client will push `data-update` messages whenever the subscribed data changes. |
| `unsubscribe`                | Unsubscribe from live updates for a data topic. Client stops pushing.                                                     |
| `ping`                       | Server heartbeat; client must respond with `pong` echoing the timestamp.                                                  |

### SubscriptionTopic

```typescript
/**
 * Topics that the dashboard can subscribe to for live push updates.
 * When subscribed, the client pushes `data-update` messages whenever
 * the underlying data changes, eliminating the need for repeated
 * request-response polling.
 */
type SubscriptionTopic =
  | "snapshot"
  | "scope-tree"
  | "graph-data"
  | "unified-snapshot"
  | "library-inspectors"
  | "result-statistics";
```

**Subscription vs Request-Response:** The `request-*` messages are one-shot pulls: "send me the current value." The `subscribe`/`unsubscribe` messages establish a live stream: "push me every change." The dashboard uses subscriptions for the active panel's data needs (e.g., subscribing to `snapshot` while viewing the Container panel) and one-shot requests for initial data load. When the user switches panels, the dashboard unsubscribes from the previous panel's topics and subscribes to the new one's. This minimizes unnecessary data transfer for inactive panels.

### Protocol Flow

```
Client                              Server
  |                                    |
  |--- [WebSocket Open] -------------->|
  |--- handshake { appName,           |
  |     instanceId, metadata } ------->|
  |<-- handshake-ack { connectionId }--|
  |                                    |
  |<-- request-snapshot ---------------|  (one-shot: initial data load)
  |--- snapshot ----------------------->|
  |                                    |
  |<-- subscribe { topic:             |  (live stream: push on change)
  |     "snapshot" } ------------------|
  |--- data-update { topic:           |
  |     "snapshot", data: ... } ------>|  (pushed on every change)
  |--- data-update { ... } ----------->|  (pushed again)
  |                                    |
  |<-- unsubscribe { topic:           |  (panel switched, no longer needed)
  |     "snapshot" } ------------------|
  |                                    |
  |<-- subscribe { topic:             |  (new panel needs different data)
  |     "scope-tree" } ---------------|
  |--- data-update { topic:           |
  |     "scope-tree", data: ... } --->|
  |                                    |
  |<-- ping { timestamp: T } ---------|
  |--- pong { timestamp: T } --------->|
  |                                    |
  |--- event { data: ... } ----------->|  (always pushed, not subscription-based)
  |                                    |
```

---

## 16.7 Typed LibraryInspector Protocol

Compile-time enhancement to the existing `LibraryInspector` protocol that preserves snapshot types through the container boundary.

### TypedLibraryInspector

```typescript
/**
 * Enhanced LibraryInspector with typed snapshot and optional panel module.
 *
 * Assignable to base LibraryInspector -- additive enhancement only.
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

  /**
   * Optional module specifier for a dedicated DevTools panel component.
   * When provided, the dashboard dynamically imports this module and uses
   * its default export as the panel component instead of the generic
   * JSON tree viewer.
   *
   * The module must export a React component conforming to LibraryPanelProps.
   *
   * Examples:
   * - "@hex-di/flow/devtools" (Flow statechart panel)
   * - "@hex-di/query/devtools" (Query cache table panel)
   * - "@hex-di/store/devtools" (Store state inspector)
   *
   * This field is serialized over WebSocket as part of the library inspector
   * snapshot metadata, so the dashboard can import the module without any
   * build-time dependency on the library package.
   */
  readonly panelModule?: string;
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

## 16.8 Type Utilities

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
 * Assignable to base UnifiedSnapshot -- the libraries field narrows
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

## 16.9 Theme API

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
  readonly sidebarWidth: string;
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

## 16.10 Configuration

### Persistence: localStorage vs sessionStorage

Dashboard state is split between two storage backends to correctly handle multiple dashboard tabs:

- **`localStorage`** — Global preferences shared across all dashboard tabs. Changing the theme in one tab changes it in all tabs (via the `storage` event).
- **`sessionStorage`** — Per-tab navigation state. Each dashboard tab maintains independent connection selection and active panel, avoiding conflicts when two dashboard tabs are open simultaneously.

#### localStorage Keys (global, shared across tabs)

| Key                          | Type                | Description                                    | Default    |
| ---------------------------- | ------------------- | ---------------------------------------------- | ---------- |
| `hex-devtools:sidebar-width` | `string` (number)   | Sidebar width in pixels                        | `"240"`    |
| `hex-devtools:theme`         | `"light" \| "dark"` | Theme override (omitted when following system) | _(absent)_ |

#### sessionStorage Keys (per-tab, independent per dashboard instance)

| Key                              | Type     | Description                               | Default      |
| -------------------------------- | -------- | ----------------------------------------- | ------------ |
| `hex-devtools:active-connection` | `string` | Connection ID of the selected application | _(absent)_   |
| `hex-devtools:tab`               | `string` | Active panel ID                           | `"overview"` |

### Persistence Format

```typescript
// Global preferences (shared)
const sidebarWidth = Number(localStorage.getItem("hex-devtools:sidebar-width")) || 240;
localStorage.setItem("hex-devtools:sidebar-width", String(sidebarWidth));

// Per-tab navigation (independent)
const activeConnection = sessionStorage.getItem("hex-devtools:active-connection");
const activeTab = sessionStorage.getItem("hex-devtools:tab") ?? "overview";
sessionStorage.setItem("hex-devtools:active-connection", connectionId);
sessionStorage.setItem("hex-devtools:tab", activeTab);
```

- Missing or invalid values fall back to defaults silently (no errors thrown).
- Clearing localStorage resets global preferences; clearing sessionStorage resets per-tab state.
- Multiple dashboard tabs: each tab can view a different connection and panel simultaneously without conflict. Theme and sidebar width changes propagate across tabs via the `storage` event.

---

_Previous: [15 - Visual Design & Accessibility](./05-visual-design.md)_ | _Next: [17 - Appendices](./07-appendices.md)_
