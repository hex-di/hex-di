#!/usr/bin/env node
/**
 * CLI entry point for HexDI DevTools MCP server.
 *
 * @packageDocumentation
 */

import { createMcpServer } from "../server/mcp-server.js";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const arg = args.find((a: string) => a.startsWith(`--${name}=`));
  if (arg !== undefined) {
    const value = arg.split("=")[1];
    return value !== "" ? value : undefined;
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`) || args.includes(`-${name[0]}`);
}

function showHelp(): void {
  console.log(`
HexDI DevTools MCP Server

An MCP server for exposing HexDI dependency graphs and tracing data
to AI assistants like Claude.

Usage:
  hexdi-mcp [options]

Options:
  --url=URL      DevTools server URL (default: ws://localhost:9229/devtools)
  --app=APP_ID   Target app ID (auto-selects first app if not specified)
  --help, -h     Show this help message
  --version, -v  Show version

Examples:
  # Start MCP server (connects to local DevTools server)
  hexdi-mcp

  # Connect to specific app
  hexdi-mcp --app=my-app

  # Connect to remote server
  hexdi-mcp --url=ws://example.com:9229/devtools --app=my-app

Claude Desktop Configuration:

Add to your Claude Desktop config file:

  {
    "mcpServers": {
      "hexdi-devtools": {
        "command": "npx",
        "args": ["@hex-di/devtools-mcp"],
        "env": {}
      }
    }
  }

MCP Resources:
  hexdi://graph     - Dependency graph structure
  hexdi://traces    - Resolution trace entries
  hexdi://stats     - Resolution statistics
  hexdi://snapshot  - Container state snapshot

MCP Tools:
  query_services           - Query registered services
  find_dependency_chain    - Trace dependency path
  detect_circular_deps     - Find circular dependencies
  get_resolution_trace     - Get trace for a service
  analyze_cache_efficiency - Analyze caching patterns

MCP Prompts:
  diagnose_slow_resolution - Diagnose performance issues
  detect_scope_leaks       - Find scope-related problems
  audit_lifetimes          - Review lifetime configurations
  cache_miss_analysis      - Analyze cache misses
`);
}

function showVersion(): void {
  console.log("@hex-di/devtools-mcp v0.0.1");
}

async function main(): Promise<void> {
  if (hasFlag("help") || hasFlag("h")) {
    showHelp();
    return;
  }

  if (hasFlag("version") || hasFlag("v")) {
    showVersion();
    return;
  }

  const url = getArg("url");
  const appId = getArg("app");

  // Build options object, only including defined values
  const server = createMcpServer({
    ...(url !== undefined ? { serverUrl: url } : {}),
    ...(appId !== undefined ? { appId } : {}),
  });

  // Start in stdio mode (required for MCP)
  await server.startStdio();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
