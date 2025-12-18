/**
 * Interactive TUI Application for HexDI DevTools.
 *
 * A full-featured terminal UI built with OpenTUI + React that provides
 * real-time inspection of running HexDI applications.
 *
 * @packageDocumentation
 */

import React, { useState, useEffect, useCallback } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { ExportedGraph, TraceEntry, TraceStats } from "@hex-di/devtools-core";
import { createDevToolsClient, type DevToolsClient } from "../app/client.js";
import { renderAsciiGraph, renderNodeList } from "../components/ascii-graph.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TUI App component.
 */
export interface AppProps {
  /**
   * WebSocket URL to connect to.
   */
  readonly url: string;

  /**
   * Target app ID to inspect.
   */
  readonly appId: string;
}

/**
 * Connection state.
 */
type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

/**
 * Available tabs.
 */
type Tab = "graph" | "services" | "traces" | "stats";

const TABS: readonly Tab[] = ["graph", "services", "traces", "stats"];

// =============================================================================
// App Component
// =============================================================================

/**
 * Main TUI application component.
 *
 * Features:
 * - Tab-based navigation (Graph, Services, Traces, Stats)
 * - Real-time data updates via WebSocket
 * - Keyboard shortcuts for navigation and control
 */
export function App({ url, appId }: AppProps): React.ReactNode {
  const { width, height } = useTerminalDimensions();

  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [client, setClient] = useState<DevToolsClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [graph, setGraph] = useState<ExportedGraph | null>(null);
  const [traces, setTraces] = useState<readonly TraceEntry[]>([]);
  const [stats, setStats] = useState<TraceStats | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("graph");
  const [isPaused, setIsPaused] = useState(false);

  // Refresh data from server
  const refreshData = useCallback(async (c: DevToolsClient) => {
    if (isPaused) return;

    try {
      const [newGraph, newTraces, newStats] = await Promise.all([
        c.getGraph(appId),
        c.getTraces(appId),
        c.getStats(appId),
      ]);
      setGraph(newGraph);
      setTraces(newTraces);
      setStats(newStats);
    } catch {
      // Ignore refresh errors - will retry on next update
    }
  }, [appId, isPaused]);

  // Connect to server
  useEffect(() => {
    const { client: newClient, dispose } = createDevToolsClient({
      url,
      autoReconnect: true,
      reconnectDelay: 3000,
    });

    newClient.on((event) => {
      switch (event.type) {
        case "connected":
          setConnectionState("connected");
          setError(null);
          break;
        case "disconnected":
          setConnectionState("disconnected");
          break;
        case "error":
          setConnectionState("error");
          setError(event.error.message);
          break;
        case "data_update":
          refreshData(newClient);
          break;
      }
    });

    setClient(newClient);

    newClient.connect().then(() => {
      refreshData(newClient);
    }).catch((err) => {
      setConnectionState("error");
      setError((err as Error).message);
    });

    return () => {
      dispose().catch(() => {
        // Ignore cleanup errors
      });
    };
  }, [url, refreshData]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (client !== null) {
      refreshData(client);
    }
  }, [client, refreshData]);

  // Clear traces
  const handleClearTraces = useCallback(async () => {
    if (client !== null) {
      await client.clearTraces(appId);
      setTraces([]);
    }
  }, [client, appId]);

  // Toggle pause
  const handleTogglePause = useCallback(async () => {
    if (client !== null) {
      if (isPaused) {
        await client.resumeTracing(appId);
      } else {
        await client.pauseTracing(appId);
      }
      setIsPaused(!isPaused);
    }
  }, [client, appId, isPaused]);

  // Keyboard navigation
  useKeyboard((key) => {
    // Tab switching with number keys
    if (key.name === "1") setActiveTab("graph");
    if (key.name === "2") setActiveTab("services");
    if (key.name === "3") setActiveTab("traces");
    if (key.name === "4") setActiveTab("stats");

    // Tab navigation with arrow keys
    if (key.name === "left") {
      const currentIndex = TABS.indexOf(activeTab);
      const newIndex = currentIndex === 0 ? TABS.length - 1 : currentIndex - 1;
      setActiveTab(TABS[newIndex]!);
    }
    if (key.name === "right") {
      const currentIndex = TABS.indexOf(activeTab);
      const newIndex = (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[newIndex]!);
    }

    // Actions
    if (key.name === "r") handleRefresh();
    if (key.name === "c") handleClearTraces();
    if (key.name === "p") handleTogglePause();
    if (key.name === "q" || key.name === "escape") process.exit(0);
  });

  // Connection status color
  const statusColor = connectionState === "connected" ? "#00ff00"
    : connectionState === "error" ? "#ff0000"
    : "#ffff00";

  // Calculate content height
  const contentHeight = Math.max(height - 6, 10);

  return (
    <box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <box border borderStyle="single" paddingLeft={1} paddingRight={1} height={3}>
        <text>
          <strong><span fg="#00ffff">HexDI DevTools</span></strong>
          <span> | </span>
          <span fg="#ffffff">{appId}</span>
          <span> | </span>
          <span fg={statusColor}>{connectionState}</span>
          {isPaused && <span fg="#ffff00"> [PAUSED]</span>}
        </text>
      </box>

      {/* Tab Bar */}
      <box paddingLeft={1} paddingRight={1} gap={2} height={1}>
        {TABS.map((tab, index) => (
          <text key={tab}>
            {activeTab === tab ? (
              <strong><span fg="#00ffff" bg="#333333">{` ${index + 1}:${tab.charAt(0).toUpperCase() + tab.slice(1)} `}</span></strong>
            ) : (
              <span fg="#888888">{` ${index + 1}:${tab.charAt(0).toUpperCase() + tab.slice(1)} `}</span>
            )}
          </text>
        ))}
      </box>

      {/* Content Area */}
      <box flexDirection="column" paddingLeft={1} paddingRight={1} flexGrow={1}>
        {activeTab === "graph" && <GraphPanel graph={graph} height={contentHeight} />}
        {activeTab === "services" && <ServicesPanel graph={graph} height={contentHeight} />}
        {activeTab === "traces" && <TracesPanel traces={traces} height={contentHeight} />}
        {activeTab === "stats" && <StatsPanel stats={stats} height={contentHeight} />}
      </box>

      {/* Status Bar */}
      <box border borderStyle="single" paddingLeft={1} paddingRight={1} height={3}>
        <text>
          <span fg="#888888">
            {error !== null ? `Error: ${error}` : `Nodes: ${graph?.nodes.length ?? 0} | Traces: ${traces.length}`}
          </span>
          <span> | </span>
          <span fg="#666666">q:quit r:refresh c:clear p:pause 1-4:tabs</span>
        </text>
      </box>
    </box>
  );
}

// =============================================================================
// Panel Components
// =============================================================================

function GraphPanel({ graph, height }: { graph: ExportedGraph | null; height: number }) {
  if (graph === null) {
    return (
      <box height={height}>
        <text fg="#888888">Loading graph...</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" height={height}>
      <text>
        <strong><span fg="#00ffff">Dependency Graph</span></strong>
      </text>
      <text>{renderAsciiGraph(graph, { useColors: false })}</text>
    </box>
  );
}

function ServicesPanel({ graph, height }: { graph: ExportedGraph | null; height: number }) {
  if (graph === null) {
    return (
      <box height={height}>
        <text fg="#888888">Loading services...</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" height={height}>
      <text>
        <strong><span fg="#00ffff">Registered Services ({graph.nodes.length})</span></strong>
      </text>
      <text>{renderNodeList(graph, { useColors: false })}</text>
    </box>
  );
}

function TracesPanel({ traces, height }: { traces: readonly TraceEntry[]; height: number }) {
  if (traces.length === 0) {
    return (
      <box height={height}>
        <text fg="#888888">No traces recorded yet. Interact with the app to generate traces.</text>
      </box>
    );
  }

  // Show last 20 traces
  const recentTraces = traces.slice(-Math.min(20, height - 2));

  return (
    <box flexDirection="column" height={height}>
      <text>
        <strong><span fg="#00ffff">Resolution Traces ({traces.length} total, showing last {recentTraces.length})</span></strong>
      </text>
      {recentTraces.map((trace) => (
        <text key={trace.id}>
          <span fg={trace.isCacheHit ? "#00ff00" : "#ffff00"}>
            {trace.isCacheHit ? "HIT " : "MISS"}
          </span>
          <span> </span>
          <span fg="#ffffff">{trace.portName}</span>
          <span fg="#888888"> ({trace.lifetime}) </span>
          <span fg="#888888">{trace.duration.toFixed(2)}ms</span>
        </text>
      ))}
    </box>
  );
}

function StatsPanel({ stats, height }: { stats: TraceStats | null; height: number }) {
  if (stats === null) {
    return (
      <box height={height}>
        <text fg="#888888">Loading stats...</text>
      </box>
    );
  }

  return (
    <box flexDirection="column" height={height}>
      <text>
        <strong><span fg="#00ffff">Resolution Statistics</span></strong>
      </text>
      <text>Total Resolutions: {stats.totalResolutions}</text>
      <text>Average Duration: {stats.averageDuration.toFixed(2)}ms</text>
      <text>Cache Hit Rate: {(stats.cacheHitRate * 100).toFixed(1)}%</text>
      <text>Slow Resolutions: {stats.slowCount}</text>
      <text>Total Duration: {stats.totalDuration.toFixed(2)}ms</text>
    </box>
  );
}
