/**
 * @hex-di/devtools-tui - Terminal UI for HexDI DevTools.
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

export {
  renderAsciiGraph,
  renderNodeList,
  type AsciiGraphOptions,
} from "./components/index.js";
