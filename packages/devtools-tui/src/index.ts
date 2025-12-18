/**
 * @hex-di/devtools-tui - Terminal UI for HexDI DevTools.
 *
 * @deprecated This package is deprecated and will be removed in the next major version (v2.0).
 * Please migrate to the new unified package structure:
 *
 * ## Migration Guide
 *
 * | Old Import | New Import |
 * |------------|------------|
 * | `@hex-di/devtools-tui` | `@hex-di/devtools/tui` |
 * | `createDevToolsClient` | `DevToolsClient` from `@hex-di/devtools-network` |
 * | `renderAsciiGraph` | `TUIGraphRenderer` from `@hex-di/devtools/tui` |
 * | CLI: `npx hexdi-tui` | CLI: `npx hexdi-devtools` (from `@hex-di/devtools`) |
 *
 * ## Example Migration
 *
 * Before:
 * ```typescript
 * import { createDevToolsClient, renderAsciiGraph } from '@hex-di/devtools-tui';
 *
 * const { client, dispose } = createDevToolsClient({
 *   url: 'ws://localhost:9229/devtools'
 * });
 * ```
 *
 * After:
 * ```typescript
 * import { TuiDevTools, TUIDevToolsProvider } from '@hex-di/devtools/tui';
 * import { RemoteDataSource } from '@hex-di/devtools';
 *
 * const dataSource = new RemoteDataSource({
 *   url: 'ws://localhost:9229/devtools',
 *   appId: 'my-app',
 * });
 * ```
 *
 * This package provides a terminal-based interface for inspecting
 * HexDI dependency graphs and trace data. It connects to the
 * DevTools server to visualize remote applications.
 *
 * ## Quick Start
 *
 * ### CLI Usage
 *
 * ```bash
 * # List connected apps
 * npx hexdi-tui list
 *
 * # Show dependency graph
 * npx hexdi-tui graph --app=my-app
 *
 * # List services
 * npx hexdi-tui services --app=my-app
 *
 * # Watch in real-time
 * npx hexdi-tui watch --app=my-app
 * ```
 *
 * ### Programmatic Usage
 *
 * ```typescript
 * import { createDevToolsClient, renderAsciiGraph } from '@hex-di/devtools-tui';
 *
 * const { client, dispose } = createDevToolsClient({
 *   url: 'ws://localhost:9229/devtools'
 * });
 *
 * await client.connect();
 *
 * const apps = await client.listApps();
 * console.log('Connected apps:', apps);
 *
 * if (apps.length > 0) {
 *   const graph = await client.getGraph(apps[0].appId);
 *   console.log(renderAsciiGraph(graph));
 * }
 *
 * // Clean up resources
 * await dispose();
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Client
// =============================================================================

/**
 * @deprecated Use `RemoteDataSource` from `@hex-di/devtools` or
 * `TuiDevTools` from `@hex-di/devtools/tui` instead.
 * Will be removed in v2.0.
 */
export {
  createDevToolsClient,
  DevToolsClient,
  type DevToolsClientResult,
  type ClientOptions,
  type ClientEvent,
  type ClientEventListener,
} from "./app/index.js";

// =============================================================================
// Components
// =============================================================================

/**
 * @deprecated Use `TUIGraphRenderer` from `@hex-di/devtools/tui` instead.
 * Will be removed in v2.0.
 */
export {
  renderAsciiGraph,
  renderNodeList,
  type AsciiGraphOptions,
} from "./components/index.js";
