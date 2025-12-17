/**
 * @hex-di/devtools-mcp - MCP server for HexDI DevTools.
 *
 * This package provides an MCP (Model Context Protocol) server that
 * exposes HexDI dependency graphs and tracing data to AI assistants.
 * It enables AI tools to inspect, query, and analyze dependency
 * injection containers.
 *
 * ## Quick Start
 *
 * ### CLI Usage (stdio mode)
 *
 * ```bash
 * # Start MCP server with local app
 * npx hexdi-mcp --app=my-app
 *
 * # Connect to remote DevTools server
 * npx hexdi-mcp --url=ws://localhost:9229/devtools --app=my-app
 * ```
 *
 * ### Programmatic Usage
 *
 * ```typescript
 * import { createMcpServer } from '@hex-di/devtools-mcp';
 *
 * const server = createMcpServer({
 *   serverUrl: 'ws://localhost:9229/devtools',
 * });
 *
 * // Start in stdio mode (for Claude Desktop)
 * await server.startStdio();
 * ```
 *
 * ## MCP Resources
 *
 * - `hexdi://graph` - Dependency graph structure
 * - `hexdi://traces` - Resolution trace entries
 * - `hexdi://stats` - Resolution statistics
 * - `hexdi://snapshot` - Container state snapshot
 *
 * ## MCP Tools
 *
 * - `query_services` - Query registered services
 * - `find_dependency_chain` - Trace dependency path
 * - `detect_circular_deps` - Find circular dependencies
 * - `get_resolution_trace` - Get trace for a specific service
 * - `analyze_cache_efficiency` - Analyze caching patterns
 *
 * ## MCP Prompts
 *
 * - `diagnose_slow_resolution` - Diagnose performance issues
 * - `detect_scope_leaks` - Find scope-related problems
 * - `audit_lifetimes` - Review lifetime configurations
 * - `cache_miss_analysis` - Analyze cache misses
 *
 * @packageDocumentation
 */

// =============================================================================
// Server
// =============================================================================

export {
  HexDIMcpServer,
  createMcpServer,
  type McpServerOptions,
} from "./server/index.js";

// =============================================================================
// Resources
// =============================================================================

export {
  registerGraphResource,
  registerTracesResource,
  registerStatsResource,
  registerSnapshotResource,
} from "./resources/index.js";

// =============================================================================
// Tools
// =============================================================================

export {
  registerQueryServicesTool,
  registerFindDependencyChainTool,
  registerDetectCircularDepsTool,
  registerGetResolutionTraceTool,
  registerAnalyzeCacheEfficiencyTool,
} from "./tools/index.js";

// =============================================================================
// Prompts
// =============================================================================

export {
  registerDiagnoseSlowResolutionPrompt,
  registerDetectScopeLeaksPrompt,
  registerAuditLifetimesPrompt,
  registerCacheMissAnalysisPrompt,
} from "./prompts/index.js";
