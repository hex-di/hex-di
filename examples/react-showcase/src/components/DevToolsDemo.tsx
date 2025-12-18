/**
 * DevToolsDemo - Demonstrates the new DevTools hooks API.
 *
 * This component showcases how to use the hooks from @hex-di/devtools-react
 * to access graph, stats, and timeline data programmatically.
 *
 * @packageDocumentation
 */

import { useGraph, useStats, useTimeline } from "@hex-di/devtools-react";

/**
 * Demo component showing DevTools hooks integration.
 *
 * Displays:
 * - Graph node count and edge count
 * - Resolution statistics (total, cache hit rate)
 * - Recent trace information
 *
 * @example
 * ```tsx
 * import { DevToolsDemo } from "./components/DevToolsDemo";
 *
 * // Must be inside DevToolsProvider
 * <DevToolsProvider dataSource={dataSource}>
 *   <DevToolsDemo />
 * </DevToolsProvider>
 * ```
 */
export function DevToolsDemo(): JSX.Element {
  const { viewModel: graph, selectedNodeId } = useGraph();
  const { viewModel: stats } = useStats();
  const { viewModel: timeline } = useTimeline();

  return (
    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-emerald-800">
          DevTools Hooks Demo
        </h2>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          @hex-di/devtools-react
        </span>
      </div>
      <p className="mb-4 text-sm text-emerald-700">
        This section demonstrates programmatic access to DevTools data using the
        new hooks API (<code>useGraph</code>, <code>useStats</code>,{" "}
        <code>useTimeline</code>).
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Graph Info */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Graph Structure
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-500">Nodes:</span>{" "}
              <span className="font-mono text-emerald-600">
                {graph?.nodes.length ?? 0}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Edges:</span>{" "}
              <span className="font-mono text-emerald-600">
                {graph?.edges.length ?? 0}
              </span>
            </p>
            {selectedNodeId !== null && (
              <p>
                <span className="text-gray-500">Selected:</span>{" "}
                <span className="font-mono text-emerald-600">
                  {selectedNodeId}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Stats Info */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Resolution Stats
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-500">Total:</span>{" "}
              <span className="font-mono text-emerald-600">
                {stats?.metrics.totalResolutions.formattedValue ?? "0"}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Cache Hit:</span>{" "}
              <span className="font-mono text-emerald-600">
                {stats?.metrics.cacheHitRate.formattedValue ?? "0"}%
              </span>
            </p>
            <p>
              <span className="text-gray-500">Session:</span>{" "}
              <span className="font-mono text-emerald-600">
                {stats?.sessionDuration ?? "-"}
              </span>
            </p>
          </div>
        </div>

        {/* Timeline Info */}
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">
            Timeline Traces
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-gray-500">Total:</span>{" "}
              <span className="font-mono text-emerald-600">
                {timeline?.totalCount ?? 0}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Visible:</span>{" "}
              <span className="font-mono text-emerald-600">
                {timeline?.visibleCount ?? 0}
              </span>
            </p>
            {timeline !== null && timeline.entries.length > 0 && (
              <p>
                <span className="text-gray-500">Last:</span>{" "}
                <span className="font-mono text-emerald-600">
                  {timeline.entries[timeline.entries.length - 1]?.portName ??
                    "-"}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-emerald-600">
        Try resolving services and watch the stats update in real-time. Open
        DevTools panel (bottom-right) for full visualization.
      </p>
    </div>
  );
}
