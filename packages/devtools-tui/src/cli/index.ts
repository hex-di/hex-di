#!/usr/bin/env node
/**
 * CLI entry point for HexDI DevTools TUI.
 *
 * @packageDocumentation
 */

import { createDevToolsClient } from "../app/client.js";
import { renderAsciiGraph, renderNodeList } from "../components/ascii-graph.js";

const args = process.argv.slice(2);
const command = args[0];

async function main(): Promise<void> {
  switch (command) {
    case "list":
      await listApps();
      break;

    case "graph":
      await showGraph();
      break;

    case "services":
      await showServices();
      break;

    case "watch":
      await watchApp();
      break;

    case "interactive":
    case "i":
      await launchInteractive();
      break;

    case "help":
    case "--help":
    case "-h":
    case undefined:
      showHelp();
      break;

    case "version":
    case "--version":
    case "-v":
      showVersion();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

async function listApps(): Promise<void> {
  const url = getServerUrl();
  const { client, dispose } = createDevToolsClient({ url, autoReconnect: false });

  try {
    await client.connect();
    const apps = await client.listApps();

    if (apps.length === 0) {
      console.log("No apps connected to the server.");
    } else {
      console.log("Connected apps:");
      console.log("");
      for (const app of apps) {
        console.log(`  ${app.appName} (${app.appId})`);
      }
    }
  } catch (err) {
    console.error("Failed to connect to server:", (err as Error).message);
    process.exit(1);
  } finally {
    await dispose();
  }
}

async function showGraph(): Promise<void> {
  const url = getServerUrl();
  const appId = getAppId();

  if (appId === undefined) {
    console.error("Please specify an app ID with --app=<appId>");
    process.exit(1);
    return;
  }

  const { client, dispose } = createDevToolsClient({ url, autoReconnect: false });

  try {
    await client.connect();
    const graph = await client.getGraph(appId);

    console.log("");
    console.log(renderAsciiGraph(graph, { useColors: !hasNoColor() }));
    console.log("");
  } catch (err) {
    console.error("Failed to get graph:", (err as Error).message);
    process.exit(1);
  } finally {
    await dispose();
  }
}

async function showServices(): Promise<void> {
  const url = getServerUrl();
  const appId = getAppId();

  if (appId === undefined) {
    console.error("Please specify an app ID with --app=<appId>");
    process.exit(1);
    return;
  }

  const { client, dispose } = createDevToolsClient({ url, autoReconnect: false });

  try {
    await client.connect();
    const graph = await client.getGraph(appId);

    console.log("");
    console.log("Registered Services:");
    console.log("");
    console.log(renderNodeList(graph, { useColors: !hasNoColor() }));
    console.log("");
  } catch (err) {
    console.error("Failed to get services:", (err as Error).message);
    process.exit(1);
  } finally {
    await dispose();
  }
}

async function watchApp(): Promise<void> {
  const url = getServerUrl();
  const appId = getAppId();

  if (appId === undefined) {
    console.error("Please specify an app ID with --app=<appId>");
    process.exit(1);
    return;
  }

  const { client, dispose } = createDevToolsClient({ url, autoReconnect: true });

  client.on((event) => {
    switch (event.type) {
      case "connected":
        console.log("Connected to server");
        refreshDisplay();
        break;
      case "disconnected":
        console.log("Disconnected, reconnecting...");
        break;
      case "error":
        console.error("Error:", event.error.message);
        break;
      case "data_update":
        refreshDisplay();
        break;
    }
  });

  async function refreshDisplay(): Promise<void> {
    try {
      const graph = await client.getGraph(appId!);
      console.clear();
      console.log(renderAsciiGraph(graph, { useColors: !hasNoColor() }));
      console.log("");
      console.log("Press Ctrl+C to exit");
    } catch {
      // Ignore refresh errors
    }
  }

  console.log(`Connecting to ${url}...`);

  try {
    await client.connect();
  } catch (err) {
    console.error("Failed to connect:", (err as Error).message);
    await dispose();
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nDisconnecting...");
    dispose().then(() => {
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  });
}

function getServerUrl(): string {
  const urlArg = args.find((arg) => arg.startsWith("--url="));
  if (urlArg !== undefined) {
    const value = urlArg.split("=")[1];
    return value ?? "ws://localhost:9229/devtools";
  }
  return "ws://localhost:9229/devtools";
}

function getAppId(): string | undefined {
  const appArg = args.find((arg) => arg.startsWith("--app="));
  if (appArg !== undefined) {
    return appArg.split("=")[1];
  }
  return undefined;
}

function hasNoColor(): boolean {
  return args.includes("--no-color") || process.env["NO_COLOR"] !== undefined;
}

async function launchInteractive(): Promise<void> {
  const url = getServerUrl();
  const appId = getAppId();

  if (appId === undefined) {
    console.error("Please specify an app ID with --app=<appId>");
    process.exit(1);
    return;
  }

  // Check if running in Bun (OpenTUI requires Bun for its FFI-based renderer)
  const isBun = "Bun" in globalThis;
  if (!isBun) {
    console.error("Error: Interactive mode requires Bun (https://bun.sh)");
    console.error("");
    console.error("OpenTUI uses Bun's FFI for terminal rendering.");
    console.error("Please run with: bun packages/devtools-tui/dist/cli/index.js interactive --app=<appId>");
    console.error("");
    console.error("Alternatively, use the non-interactive commands with Node.js:");
    console.error("  hexdi-tui list");
    console.error("  hexdi-tui graph --app=<appId>");
    console.error("  hexdi-tui services --app=<appId>");
    console.error("  hexdi-tui watch --app=<appId>");
    process.exit(1);
    return;
  }

  // Dynamic import to avoid loading OpenTUI for simple commands
  const { createCliRenderer } = await import("@opentui/core");
  const { createRoot } = await import("@opentui/react");
  const { App } = await import("../tui/App.js");
  const React = await import("react");

  console.log(`Launching interactive TUI for ${appId}...`);
  console.log(`Connecting to ${url}`);
  console.log("");

  const renderer = await createCliRenderer();
  // React.createElement returns ReactElement which is assignable to ReactNode
  // The Root.render() method from @opentui/react accepts ReactNode
  createRoot(renderer).render(React.createElement(App, { url, appId }));
}

function showHelp(): void {
  console.log(`
HexDI DevTools TUI

Usage:
  hexdi-tui <command> [options]

Commands:
  list          List connected apps
  graph         Show dependency graph (requires --app)
  services      List registered services (requires --app)
  watch         Watch app in real-time (requires --app)
  interactive   Launch interactive TUI (requires --app, Bun only) [alias: i]
  help          Show this help message
  version       Show version

Options:
  --url=URL     DevTools server URL (default: ws://localhost:9229/devtools)
  --app=APP_ID  Target app ID
  --no-color    Disable colored output

Examples:
  hexdi-tui list
  hexdi-tui graph --app=my-app
  hexdi-tui services --app=my-app
  hexdi-tui watch --app=my-app
  hexdi-tui interactive --app=my-app --url=ws://localhost:3000/devtools
  hexdi-tui i --app=react-showcase
`);
}

function showVersion(): void {
  console.log("@hex-di/devtools-tui v0.0.1");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
