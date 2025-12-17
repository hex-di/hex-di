/**
 * HexDI MCP Server - Main server implementation.
 *
 * @packageDocumentation
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ExportedGraph, TraceEntry, TraceStats, ContainerSnapshot } from "@hex-di/devtools-core";

import { graphResource, getGraphResourceContent } from "../resources/graph.js";
import { tracesResource, getTracesResourceContent } from "../resources/traces.js";
import { statsResource, getStatsResourceContent } from "../resources/stats.js";
import { snapshotResource, getSnapshotResourceContent } from "../resources/snapshot.js";

import {
  queryServicesTool,
  executeQueryServices,
  findDependencyChainTool,
  executeFindDependencyChain,
  detectCircularDepsTool,
  executeDetectCircularDeps,
  getResolutionTraceTool,
  executeGetResolutionTrace,
  analyzeCacheEfficiencyTool,
  executeAnalyzeCacheEfficiency,
} from "../tools/index.js";

import {
  diagnoseSlowResolutionPrompt,
  getDiagnoseSlowResolutionMessages,
  detectScopeLeaksPrompt,
  getDetectScopeLeaksMessages,
  auditLifetimesPrompt,
  getAuditLifetimesMessages,
  cacheMissAnalysisPrompt,
  getCacheMissAnalysisMessages,
} from "../prompts/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * MCP server options.
 */
export interface McpServerOptions {
  /**
   * Server name for MCP identification.
   * @default "hexdi-devtools"
   */
  readonly name?: string;

  /**
   * Server version.
   * @default "0.0.1"
   */
  readonly version?: string;

  /**
   * Data provider for fetching HexDI data.
   * If not provided, server runs in remote mode and
   * connects to a DevTools WebSocket server.
   */
  readonly dataProvider?: DataProvider;

  /**
   * WebSocket URL for remote DevTools server.
   * Only used when dataProvider is not set.
   * @default "ws://localhost:9229/devtools"
   */
  readonly serverUrl?: string;

  /**
   * Target app ID when connecting to remote server.
   */
  readonly appId?: string;
}

/**
 * Data provider interface for fetching HexDI data.
 * This abstracts the data source (local or remote).
 */
export interface DataProvider {
  getGraph(): Promise<ExportedGraph>;
  getTraces(): Promise<readonly TraceEntry[]>;
  getStats(): Promise<TraceStats>;
  getSnapshot(): Promise<ContainerSnapshot | null>;
}

/**
 * Data getter interface used by resources and tools.
 */
export interface DataGetter {
  getGraph(): Promise<ExportedGraph>;
  getTraces(): Promise<readonly TraceEntry[]>;
  getStats(): Promise<TraceStats>;
  getSnapshot(): Promise<ContainerSnapshot | null>;
}

/**
 * Disposable data getter with explicit lifecycle management.
 */
export interface DisposableDataGetter extends DataGetter {
  dispose(): Promise<void>;
}

// =============================================================================
// RemoteDataGetter Class
// =============================================================================

/**
 * Remote data getter that connects to DevTools server.
 *
 * Manages connection lifecycle with explicit disposal to prevent resource leaks.
 */
class RemoteDataGetter implements DisposableDataGetter {
  private client: import("@hex-di/devtools-network").DevToolsClient | null = null;
  private container: { dispose(): Promise<void> } | null = null;
  private currentAppId: string | null;

  constructor(
    private readonly serverUrl: string,
    appId: string | null
  ) {
    this.currentAppId = appId;
  }

  /**
   * Ensure the client is connected, creating it if necessary.
   */
  private async ensureConnected(): Promise<import("@hex-di/devtools-network").DevToolsClient> {
    if (this.client === null) {
      // Import HexDI packages dynamically
      const { GraphBuilder } = await import("@hex-di/graph");
      const { createContainer } = await import("@hex-di/runtime");
      const { DevToolsClient, WsAdapter, WebSocketPort } = await import("@hex-di/devtools-network");

      // Create WebSocket service using HexDI container
      const graph = GraphBuilder.create().provide(WsAdapter).build();
      const container = createContainer(graph);
      const webSocket = container.resolve(WebSocketPort);

      // Store container for disposal
      this.container = container;

      // Create client with WebSocket service
      this.client = new DevToolsClient({ url: this.serverUrl, webSocket });
      await this.client.connect();

      // If no appId specified, use the first available app
      if (this.currentAppId === null) {
        const apps = await this.client.listApps();
        const firstApp = apps[0];
        if (firstApp === undefined) {
          throw new Error("No apps connected to DevTools server");
        }
        this.currentAppId = firstApp.appId;
      }
    }
    return this.client;
  }

  /**
   * Dispose of resources (client and container).
   */
  async dispose(): Promise<void> {
    if (this.client !== null) {
      this.client.disconnect();
      this.client = null;
    }
    if (this.container !== null) {
      await this.container.dispose();
      this.container = null;
    }
  }

  async getGraph(): Promise<ExportedGraph> {
    const client = await this.ensureConnected();
    return client.getGraph(this.currentAppId!);
  }

  async getTraces(): Promise<readonly TraceEntry[]> {
    const client = await this.ensureConnected();
    return client.getTraces(this.currentAppId!);
  }

  async getStats(): Promise<TraceStats> {
    const client = await this.ensureConnected();
    return client.getStats(this.currentAppId!);
  }

  async getSnapshot(): Promise<ContainerSnapshot | null> {
    const client = await this.ensureConnected();
    return client.getSnapshot(this.currentAppId!);
  }
}

// =============================================================================
// HexDIMcpServer
// =============================================================================

/**
 * MCP server for HexDI DevTools.
 *
 * Exposes HexDI dependency graphs and tracing data to AI assistants
 * through the Model Context Protocol.
 */
export class HexDIMcpServer {
  private readonly server: Server;
  private readonly getData: DataGetter;
  private readonly disposableDataGetter: DisposableDataGetter | null;
  private readonly options: Required<Omit<McpServerOptions, "dataProvider" | "appId">> & {
    dataProvider: DataProvider | null;
    appId: string | null;
  };

  constructor(options: McpServerOptions = {}) {
    this.options = {
      name: options.name ?? "hexdi-devtools",
      version: options.version ?? "0.0.1",
      serverUrl: options.serverUrl ?? "ws://localhost:9229/devtools",
      dataProvider: options.dataProvider ?? null,
      appId: options.appId ?? null,
    };

    this.server = new Server(
      {
        name: this.options.name,
        version: this.options.version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    const { dataGetter, disposable } = this.createDataGetter();
    this.getData = dataGetter;
    this.disposableDataGetter = disposable;
    this.registerHandlers();
  }

  /**
   * Start the server in stdio mode.
   * This is the standard mode for Claude Desktop integration.
   */
  async startStdio(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Dispose of resources used by the server.
   * Call this when shutting down to clean up connections.
   */
  async dispose(): Promise<void> {
    if (this.disposableDataGetter !== null) {
      await this.disposableDataGetter.dispose();
    }
  }

  /**
   * Get the underlying MCP server instance.
   */
  get mcpServer(): Server {
    return this.server;
  }

  /**
   * Get the current data provider.
   */
  get dataProvider(): DataProvider | null {
    return this.options.dataProvider;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private registerHandlers(): void {
    this.registerResourceHandlers();
    this.registerToolHandlers();
    this.registerPromptHandlers();
  }

  private registerResourceHandlers(): void {
    const resources = [graphResource, tracesResource, statsResource, snapshotResource];

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources,
    }));

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      let text: string;
      switch (uri) {
        case "hexdi://graph":
          text = await getGraphResourceContent(this.getData);
          break;
        case "hexdi://traces":
          text = await getTracesResourceContent(this.getData);
          break;
        case "hexdi://stats":
          text = await getStatsResourceContent(this.getData);
          break;
        case "hexdi://snapshot":
          text = await getSnapshotResourceContent(this.getData);
          break;
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text,
          },
        ],
      };
    });
  }

  private registerToolHandlers(): void {
    const tools = [
      queryServicesTool,
      findDependencyChainTool,
      detectCircularDepsTool,
      getResolutionTraceTool,
      analyzeCacheEfficiencyTool,
    ];

    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      let result: string;
      switch (name) {
        case "query_services":
          result = await executeQueryServices(this.getData, args ?? {});
          break;
        case "find_dependency_chain":
          result = await executeFindDependencyChain(this.getData, args as { from: string; to: string });
          break;
        case "detect_circular_deps":
          result = await executeDetectCircularDeps(this.getData, args ?? {});
          break;
        case "get_resolution_trace":
          result = await executeGetResolutionTrace(this.getData, args as { serviceName: string });
          break;
        case "analyze_cache_efficiency":
          result = await executeAnalyzeCacheEfficiency(this.getData, args ?? {});
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    });
  }

  private registerPromptHandlers(): void {
    const prompts = [
      diagnoseSlowResolutionPrompt,
      detectScopeLeaksPrompt,
      auditLifetimesPrompt,
      cacheMissAnalysisPrompt,
    ];

    // List prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts,
    }));

    // Get prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      let messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
      switch (name) {
        case "diagnose_slow_resolution":
          messages = getDiagnoseSlowResolutionMessages(args ?? {});
          break;
        case "detect_scope_leaks":
          messages = getDetectScopeLeaksMessages();
          break;
        case "audit_lifetimes":
          messages = getAuditLifetimesMessages();
          break;
        case "cache_miss_analysis":
          messages = getCacheMissAnalysisMessages(args ?? {});
          break;
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }

      return { messages };
    });
  }

  private createDataGetter(): { dataGetter: DataGetter; disposable: DisposableDataGetter | null } {
    if (this.options.dataProvider !== null) {
      // Use local data provider (no disposal needed)
      const dataGetter: DataGetter = {
        getGraph: () => this.options.dataProvider!.getGraph(),
        getTraces: () => this.options.dataProvider!.getTraces(),
        getStats: () => this.options.dataProvider!.getStats(),
        getSnapshot: () => this.options.dataProvider!.getSnapshot(),
      };
      return { dataGetter, disposable: null };
    }

    // Use remote connection with explicit lifecycle management
    const remoteGetter = new RemoteDataGetter(this.options.serverUrl, this.options.appId);
    return { dataGetter: remoteGetter, disposable: remoteGetter };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an MCP server instance.
 */
export function createMcpServer(options?: McpServerOptions): HexDIMcpServer {
  return new HexDIMcpServer(options);
}
