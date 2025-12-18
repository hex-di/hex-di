#!/usr/bin/env bun
/**
 * hexdi-tui - Terminal DevTools CLI for HexDI.
 *
 * This CLI binary provides a terminal-based DevTools interface for
 * connecting to remote HexDI DevTools servers.
 *
 * ## Usage
 *
 * ```bash
 * npx hexdi-tui --url ws://localhost:9000
 * npx hexdi-tui --url ws://localhost:9000 --app-id my-app
 * ```
 *
 * ## Options
 *
 * - `--url, -u`: WebSocket URL of the DevTools server (required)
 * - `--app-id, -a`: Application ID to filter (optional)
 * - `--help, -h`: Show help message
 * - `--version, -v`: Show version
 *
 * @packageDocumentation
 */

import React from "react";
import { TuiDevTools } from "../TuiDevTools.js";
import { createMutablePanelViewModel } from "../../view-models/index.js";
import type { PanelViewModel, TabId, ConnectionStatus } from "../../view-models/panel.vm.js";
import type { GraphViewModelMinimal } from "../../ports/render-primitives.port.js";
import type { ClientEvent, ClientEventListener, DevToolsClient } from "@hex-di/devtools-network";
import type { ExportedGraph } from "@hex-di/devtools-core";
import { TUIGraphRenderer } from "../ascii-graph.js";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert ExportedGraph to GraphViewModelMinimal for rendering.
 */
function convertToGraphViewModel(graph: ExportedGraph): GraphViewModelMinimal {
  const nodes = graph.nodes.map((node, index) => ({
    id: node.id,
    label: node.label,
    lifetime: node.lifetime,
    factoryKind: node.factoryKind,
    position: { x: 0, y: index * 50 },
    dimensions: { width: 150, height: 40 },
    isSelected: false,
    isHighlighted: false,
    isDimmed: false,
  }));

  const edges = graph.edges.map((edge, index) => ({
    id: `edge-${index}`,
    from: edge.from,
    to: edge.to,
    isHighlighted: false,
    isDimmed: false,
  }));

  return {
    nodes,
    edges,
    direction: "TB",
    viewport: { width: 800, height: 600, minX: 0, minY: 0, maxX: 800, maxY: 600 },
    selectedNodeId: null,
    highlightedNodeIds: [],
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    isEmpty: nodes.length === 0,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

// =============================================================================
// Types
// =============================================================================

/**
 * Parsed command line arguments.
 */
export interface ParsedArgs {
  /** WebSocket URL of the DevTools server */
  url: string | undefined;
  /** Application ID to filter */
  appId: string | undefined;
  /** Show help message */
  help: boolean;
  /** Show version */
  version: boolean;
}

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse command line arguments.
 *
 * @param args - Array of command line arguments (without node and script name)
 * @returns Parsed arguments object
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    url: undefined,
    appId: undefined,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--url":
      case "-u":
        result.url = args[++i];
        break;

      case "--app-id":
      case "-a":
        result.appId = args[++i];
        break;

      case "--help":
      case "-h":
        result.help = true;
        break;

      case "--version":
      case "-v":
        result.version = true;
        break;
    }
  }

  return result;
}

// =============================================================================
// Help and Version
// =============================================================================

/** CLI version number */
export const VERSION = "0.1.0";

/** Help text for the CLI */
export const HELP_TEXT = `
hexdi-tui - Terminal DevTools for HexDI

Usage:
  hexdi-tui --url <websocket-url> [options]

Options:
  -u, --url <url>     WebSocket URL of the DevTools server (required)
  -a, --app-id <id>   Application ID to filter (optional)
  -h, --help          Show this help message
  -v, --version       Show version number

Examples:
  hexdi-tui --url ws://localhost:9000
  hexdi-tui -u ws://localhost:9000 -a my-app

Keyboard Shortcuts (in TUI):
  Tab          Switch between tabs
  Arrow keys   Navigate within views
  q            Quit the application
`;

// =============================================================================
// TUI App Component
// =============================================================================

/**
 * Props for the TUI App component.
 */
interface TuiAppProps {
  url: string;
  appId: string;
}

/**
 * Minimal TUI component that displays basic connection info.
 * Uses raw OpenTUI elements to avoid React 19 prop freezing issues.
 */
function MinimalTuiApp({ url, appId }: TuiAppProps): React.ReactElement {
  const handleExit = React.useCallback(() => {
    process.exit(0);
  }, []);

  // Use minimal OpenTUI elements directly
  // Note: OpenTUI has compatibility issues with React 19's prop freezing
  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      border={true}
      borderStyle="rounded"
    >
      <box flexDirection="row" paddingLeft={1} paddingRight={1}>
        <text>HexDI DevTools - {appId}</text>
      </box>
      <box flexDirection="row" paddingLeft={1} paddingRight={1}>
        <text>Connected to: {url}</text>
      </box>
      <box flexDirection="column" flexGrow={1} paddingLeft={1} paddingRight={1}>
        <text>Press 'q' to quit</text>
      </box>
    </box>
  );
}

/**
 * Creates the DevTools client with WebSocket support.
 * Dynamically imports the network package to avoid bundling issues.
 */
async function createDevToolsClientAsync(serverUrl: string) {
  const { DevToolsClient } = await import("@hex-di/devtools-network");
  const { WebSocketPort } = await import("@hex-di/devtools-core");

  // Try to import ws adapter for Node.js/Bun
  try {
    const { WsAdapter } = await import("@hex-di/devtools-network");
    const { GraphBuilder } = await import("@hex-di/graph");
    const { createContainer } = await import("@hex-di/runtime");

    // Create a minimal graph with just the WebSocket adapter
    const graph = GraphBuilder.create().provide(WsAdapter).build();
    const container = createContainer(graph);
    const webSocket = container.resolve(WebSocketPort);

    return new DevToolsClient({ url: serverUrl, webSocket });
  } catch {
    // Fallback: create client without adapter (will fail on connect)
    return new DevToolsClient({ url: serverUrl });
  }
}

/**
 * Full TUI application component with state management.
 * Falls back to minimal mode if OpenTUI has issues with React 19.
 */
function TuiApp({ url, appId }: TuiAppProps): React.ReactElement {
  const [viewModel, setViewModel] = React.useState<PanelViewModel>(() => {
    const vm = createMutablePanelViewModel();
    // Initialize with connecting status and app info
    return {
      ...vm,
      appName: appId,
      connection: {
        ...vm.connection,
        status: "connecting" as ConnectionStatus,
        serverUrl: url,
      },
    };
  });
  const [graphViewModel, setGraphViewModel] = React.useState<GraphViewModelMinimal | null>(null);
  const [useMinimal, setUseMinimal] = React.useState(false);
  const clientRef = React.useRef<DevToolsClient | null>(null);

  // Update connection status helper
  const updateConnectionStatus = React.useCallback((
    status: ConnectionStatus,
    errorMessage: string | null = null
  ) => {
    setViewModel((prev) => ({
      ...prev,
      connection: {
        ...prev.connection,
        status,
        serverUrl: url,
        errorMessage,
        lastPing: status === "connected" ? new Date().toISOString() : prev.connection.lastPing,
      },
    }));
  }, [url]);

  // Fetch graph data from server
  const fetchGraphData = React.useCallback(async (client: DevToolsClient, targetAppId: string) => {
    try {
      // First try to list available apps
      const apps = await client.listApps();

      // Find the matching app or use the first available
      let resolvedAppId = targetAppId;
      if (apps.length > 0) {
        const matchingApp = apps.find(a => a.appId === targetAppId);
        if (matchingApp === undefined) {
          // Use the first available app if target not found
          const firstApp = apps[0];
          if (firstApp !== undefined) {
            resolvedAppId = firstApp.appId;
            // Update app name in view model
            setViewModel((prev) => ({
              ...prev,
              appName: firstApp.appName || firstApp.appId,
            }));
          }
        }
      }

      const graph = await client.getGraph(resolvedAppId);
      const viewModel = convertToGraphViewModel(graph);
      setGraphViewModel(viewModel);
    } catch (error) {
      console.error("Failed to fetch graph:", error);
      // Show error state
      setGraphViewModel({
        nodes: [],
        edges: [],
        direction: "TB",
        viewport: { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 },
        selectedNodeId: null,
        highlightedNodeIds: [],
        zoom: 1,
        panOffset: { x: 0, y: 0 },
        isEmpty: true,
        nodeCount: 0,
        edgeCount: 0,
      });
    }
  }, []);

  // Connect to WebSocket server on mount
  React.useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        const client = await createDevToolsClientAsync(url);

        if (!mounted) {
          client.disconnect();
          return;
        }

        clientRef.current = client;

        // Set up event listeners
        const handleEvent: ClientEventListener = (event: ClientEvent) => {
          if (!mounted) return;

          switch (event.type) {
            case "connected":
              updateConnectionStatus("connected");
              // Fetch data when connected
              fetchGraphData(client, appId);
              break;
            case "disconnected":
              updateConnectionStatus("disconnected");
              setGraphViewModel(null);
              break;
            case "error":
              updateConnectionStatus("error", event.error.message);
              break;
          }
        };

        client.on(handleEvent);

        // Attempt connection
        await client.connect();
      } catch (error) {
        if (mounted) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          updateConnectionStatus("error", errorMsg);
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      if (clientRef.current !== null) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [url, appId, updateConnectionStatus, fetchGraphData]);

  const handleTabChange = React.useCallback((tabId: TabId) => {
    setViewModel((prev) => ({
      ...prev,
      activeTabId: tabId,
    }));
  }, []);

  const handleExit = React.useCallback(() => {
    if (clientRef.current !== null) {
      clientRef.current.disconnect();
    }
    process.exit(0);
  }, []);

  // Keyboard event handling for tab switching
  React.useEffect(() => {
    const tabOrder: TabId[] = ["graph", "services", "tracing", "inspector"];

    const handleKeyPress = (data: Buffer): void => {
      const key = data.toString();

      // Number keys 1-4 for direct tab selection
      if (key === "1") {
        handleTabChange("graph");
      } else if (key === "2") {
        handleTabChange("services");
      } else if (key === "3") {
        handleTabChange("tracing");
      } else if (key === "4") {
        handleTabChange("inspector");
      }
      // 'n' for next tab
      else if (key === "n" || key === "N") {
        setViewModel((prev) => {
          const currentIndex = tabOrder.indexOf(prev.activeTabId);
          const nextIndex = (currentIndex + 1) % tabOrder.length;
          const nextTabId = tabOrder[nextIndex];
          if (nextTabId === undefined) return prev;
          return {
            ...prev,
            activeTabId: nextTabId,
            tabs: prev.tabs.map((tab) => ({
              ...tab,
              isActive: tab.id === nextTabId,
            })),
          };
        });
      }
      // 'p' for previous tab
      else if (key === "p" || key === "P") {
        setViewModel((prev) => {
          const currentIndex = tabOrder.indexOf(prev.activeTabId);
          const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
          const prevTabId = tabOrder[prevIndex];
          if (prevTabId === undefined) return prev;
          return {
            ...prev,
            activeTabId: prevTabId,
            tabs: prev.tabs.map((tab) => ({
              ...tab,
              isActive: tab.id === prevTabId,
            })),
          };
        });
      }
    };

    process.stdin.on("data", handleKeyPress);

    return () => {
      process.stdin.off("data", handleKeyPress);
    };
  }, [handleTabChange]);

  // If minimal mode, render simple interface
  if (useMinimal) {
    return <MinimalTuiApp url={url} appId={appId} />;
  }

  // Render content based on active tab
  const renderTabContent = (): React.ReactNode => {
    switch (viewModel.activeTabId) {
      case "graph":
        if (graphViewModel !== null) {
          return <TUIGraphRenderer viewModel={graphViewModel} />;
        }
        return (
          <box flexDirection="column" paddingTop={1}>
            <text>Loading graph data...</text>
          </box>
        );
      case "services":
        return (
          <box flexDirection="column" paddingTop={1}>
            <text>Services tab - coming soon</text>
          </box>
        );
      case "tracing":
        return (
          <box flexDirection="column" paddingTop={1}>
            <text>Tracing tab - coming soon</text>
          </box>
        );
      case "inspector":
        return (
          <box flexDirection="column" paddingTop={1}>
            <text>Inspector tab - coming soon</text>
          </box>
        );
      default:
        return null;
    }
  };

  // Try full TUI - if it fails due to React 19 prop freezing,
  // the error boundary in main() will catch it
  return (
    <TuiDevTools
      viewModel={viewModel}
      appId={appId}
      url={url}
      onTabChange={handleTabChange}
      onExit={handleExit}
    >
      {renderTabContent()}
    </TuiDevTools>
  );
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Main CLI entry point.
 *
 * Parses arguments, validates input, and renders the TUI DevTools interface.
 */
export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Handle help
  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Handle version
  if (args.version) {
    console.log(`hexdi-tui v${VERSION}`);
    process.exit(0);
  }

  // Validate URL
  if (args.url === undefined) {
    console.error("Error: --url is required");
    console.error("");
    console.error("Usage: hexdi-tui --url <websocket-url>");
    console.error("Run 'hexdi-tui --help' for more information.");
    process.exit(1);
  }

  const appId = args.appId ?? "devtools";

  // Try to load OpenTUI
  try {
    // Dynamic imports to handle optional dependencies
    const opentuiCore = await import("@opentui/core");
    const opentuiReact = await import("@opentui/react");

    console.log(`hexdi-tui v${VERSION}`);
    console.log(`Connecting to: ${args.url}`);
    if (args.appId !== undefined) {
      console.log(`Filtering by app ID: ${args.appId}`);
    }
    console.log("Starting TUI...");

    // Create the CLI renderer using the async factory
    const renderer = await opentuiCore.createCliRenderer({
      exitOnCtrlC: true,
      useAlternateScreen: true,
      useMouse: false,
    });

    // Create React root and render
    const root = opentuiReact.createRoot(renderer);
    root.render(<TuiApp url={args.url} appId={appId} />);

    // Start the renderer
    await renderer.start();
  } catch (error) {
    // OpenTUI not installed or wrong runtime - show fallback message
    console.log(`hexdi-tui v${VERSION}`);
    console.log("");

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("bun:")) {
      console.error("Error: OpenTUI requires Bun runtime.");
      console.error("");
      console.error("The interactive TUI uses OpenTUI which requires Bun.");
      console.error("Run with Bun instead of Node.js:");
      console.error("");
      console.error("  bun packages/devtools/dist/tui/cli/index.js --url ws://localhost:9000");
      console.error("");
      console.error("Or install Bun globally: https://bun.sh");
    } else if (errorMessage.includes("readonly property")) {
      console.error("Error: OpenTUI is incompatible with React 19's strict mode.");
      console.error("");
      console.error("React 19 freezes props objects, which OpenTUI's renderer tries to mutate.");
      console.error("This is a known compatibility issue between OpenTUI and React 19.");
      console.error("");
      console.error("Options:");
      console.error("  1. Use the DOM DevTools in a browser instead (recommended)");
      console.error("  2. Wait for OpenTUI to release a React 19 compatible version");
      console.error("  3. Build with NODE_ENV=production to disable prop freezing");
      console.error("");
      console.error("For DOM DevTools, add to your app:");
      console.error("  import { DevToolsFloating } from '@hex-di/devtools-react';");
    } else {
      console.error("Error: OpenTUI runtime not found.");
      console.error("");
      console.error("The interactive TUI requires @opentui/core and @opentui/react.");
      console.error("Install them with:");
      console.error("");
      console.error("  bun add @opentui/core @opentui/react");
      console.error("");
      console.error("Note: OpenTUI requires Bun runtime (not Node.js).");
    }
    console.error("");
    console.error("Connection parameters that would be used:");
    console.error(`  URL: ${args.url}`);
    console.error(`  App ID: ${appId}`);

    if (error instanceof Error && !errorMessage.includes("bun:") && !errorMessage.includes("readonly")) {
      console.error("");
      console.error("Error details:", error.message);
    }
    process.exit(1);
  }
}

// =============================================================================
// Auto-execute when run directly (not imported)
// =============================================================================

/**
 * Check if this module is being run directly (not imported).
 * Uses multiple checks to avoid false positives in test environments:
 * 1. process.argv[1] must exist
 * 2. Must not be in a test environment (vitest, jest)
 * 3. The script being run should match this file's path
 */
function checkIsMainModule(): boolean {
  if (typeof process === "undefined" || process.argv[1] === undefined) {
    return false;
  }

  // Don't auto-execute in test environments
  if (
    process.env["VITEST"] !== undefined ||
    process.env["JEST_WORKER_ID"] !== undefined ||
    process.env["NODE_ENV"] === "test"
  ) {
    return false;
  }

  // Check if the script being run matches this file
  const scriptPath = process.argv[1];
  return scriptPath.includes("tui/cli") || scriptPath.includes("hexdi-tui");
}

const isMainModule = checkIsMainModule();

if (isMainModule) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
