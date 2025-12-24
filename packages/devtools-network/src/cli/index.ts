#!/usr/bin/env node
/**
 * CLI entry point for HexDI DevTools server.
 *
 * @packageDocumentation
 */

import { DevToolsServer } from "../server/websocket-server.js";

const args = process.argv.slice(2);
const command = args[0];

function main(): void {
  switch (command) {
    case "start":
    case undefined:
      startServer();
      break;

    case "help":
    case "--help":
    case "-h":
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

function startServer(): void {
  const portArg = args.find(arg => arg.startsWith("--port="));
  const portValue = portArg?.split("=")[1];
  const port = portValue !== undefined ? parseInt(portValue, 10) : 9229;

  const verbose = args.includes("--verbose") || args.includes("-v");

  console.log(`Starting HexDI DevTools server on port ${port}...`);

  const server = new DevToolsServer({ port, verbose });

  server.on(event => {
    switch (event.type) {
      case "started":
        console.log(`DevTools server running on ws://localhost:${event.port}/devtools`);
        break;
      case "connection":
        console.log(`App connected: ${event.appName} (${event.appId})`);
        break;
      case "disconnection":
        console.log(`App disconnected: ${event.appName} (${event.appId})`);
        break;
      case "error":
        console.error("Server error:", event.error.message);
        break;
    }
  });

  server.start();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    void server.stop().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void server.stop().then(() => process.exit(0));
  });
}

function showHelp(): void {
  console.log(`
HexDI DevTools Server

Usage:
  hexdi-devtools [command] [options]

Commands:
  start       Start the DevTools server (default)
  help        Show this help message
  version     Show version

Options:
  --port=PORT    Port to listen on (default: 9229)
  --verbose, -v  Enable verbose logging

Examples:
  hexdi-devtools
  hexdi-devtools start --port=9229
  hexdi-devtools start --verbose
`);
}

function showVersion(): void {
  console.log("@hex-di/devtools-network v0.1.0");
}

try {
  main();
} catch (err) {
  console.error("Fatal error:", err);
  process.exit(1);
}
