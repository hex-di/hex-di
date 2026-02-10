/**
 * Vital Signs panel - Health Metrics dashboard.
 *
 * Displays 6 metric cards with live values and sparkline SVGs:
 * - Neural Response Time (resolution durations)
 * - Memory Efficiency (cache hit rate)
 * - Pain Signals (error rate)
 * - Active Memory Banks (scope count)
 * - Synapse Throughput (total spans)
 * - Time Alive (uptime)
 *
 * Each sparkline tracks 60 data points sampled every 1 second.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { useTracingSummary, useSnapshot, useScopeTree } from "@hex-di/react";
import type { ScopeTree } from "@hex-di/core";
import { RingBuffer } from "../utils/ring-buffer.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetricHealth = "green" | "yellow" | "red";

interface MetricCardData {
  readonly label: string;
  readonly porygonName: string;
  readonly value: string;
  readonly health: MetricHealth;
  readonly sparklineData: readonly number[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPARKLINE_CAPACITY = 60;
const SAMPLE_INTERVAL_MS = 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countActiveScopes(tree: ScopeTree): number {
  let count = tree.status === "active" ? 1 : 0;
  for (const child of tree.children) {
    count += countActiveScopes(child);
  }
  return count;
}

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours)}h ${String(minutes)}m`;
  }
  if (minutes > 0) {
    return `${String(minutes)}m ${String(seconds)}s`;
  }
  return `${String(seconds)}s`;
}

function getHealthColor(health: MetricHealth): string {
  switch (health) {
    case "green":
      return "text-emerald-400";
    case "yellow":
      return "text-amber-400";
    case "red":
      return "text-red-400";
  }
}

function getSparklineStroke(health: MetricHealth): string {
  switch (health) {
    case "green":
      return "#10B981";
    case "yellow":
      return "#F59E0B";
    case "red":
      return "#EF4444";
  }
}

function getHealthDotColor(health: MetricHealth): string {
  switch (health) {
    case "green":
      return "bg-emerald-400";
    case "yellow":
      return "bg-amber-400";
    case "red":
      return "bg-red-400";
  }
}

// ---------------------------------------------------------------------------
// Sparkline Component
// ---------------------------------------------------------------------------

interface SparklineProps {
  readonly data: readonly number[];
  readonly health: MetricHealth;
  readonly width?: number;
  readonly height?: number;
}

function Sparkline({ data, health, width = 120, height = 30 }: SparklineProps): ReactNode {
  if (data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#374151" strokeWidth="1" />
      </svg>
    );
  }

  let min = Infinity;
  let max = -Infinity;
  for (const val of data) {
    if (val < min) min = val;
    if (val > max) max = val;
  }

  // Avoid division by zero if all values are the same
  const range = max - min || 1;
  const padding = 2;
  const usableHeight = height - padding * 2;
  const stepX = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = padding + usableHeight - ((val - min) / range) * usableHeight;
    return `${String(Math.round(x * 10) / 10)},${String(Math.round(y * 10) / 10)}`;
  });

  const strokeColor = getSparklineStroke(health);

  return (
    <svg width={width} height={height}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Metric Card Component
// ---------------------------------------------------------------------------

interface MetricCardProps {
  readonly metric: MetricCardData;
}

function MetricCard({ metric }: MetricCardProps): ReactNode {
  const healthColor = getHealthColor(metric.health);
  const dotColor = getHealthDotColor(metric.health);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
            <span className="text-xs font-medium text-gray-400">{metric.porygonName}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-600">{metric.label}</p>
          <p className={`mt-2 text-xl font-bold ${healthColor}`}>{metric.value}</p>
        </div>
        <div className="shrink-0">
          <Sparkline data={metric.sparklineData} health={metric.health} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook: useSampledMetrics
// ---------------------------------------------------------------------------

interface SampledMetrics {
  readonly avgDurations: readonly number[];
  readonly cacheHitRates: readonly number[];
  readonly errorRates: readonly number[];
  readonly scopeCounts: readonly number[];
  readonly totalSpans: readonly number[];
  readonly uptimeMs: number;
}

function useSampledMetrics(): SampledMetrics {
  const summary = useTracingSummary();
  const scopeTree = useScopeTree();

  const avgDurationBuf = useRef(new RingBuffer<number>(SPARKLINE_CAPACITY));
  const cacheHitBuf = useRef(new RingBuffer<number>(SPARKLINE_CAPACITY));
  const errorRateBuf = useRef(new RingBuffer<number>(SPARKLINE_CAPACITY));
  const scopeCountBuf = useRef(new RingBuffer<number>(SPARKLINE_CAPACITY));
  const totalSpansBuf = useRef(new RingBuffer<number>(SPARKLINE_CAPACITY));
  const mountTimeRef = useRef(Date.now());
  const [, setTick] = useState(0);

  const sample = useCallback(() => {
    const totalSpans = summary?.totalSpans ?? 0;
    const errorCount = summary?.errorCount ?? 0;
    const avgDuration = summary?.averageDuration ?? 0;
    const cacheHitRate = summary?.cacheHitRate ?? 0;
    const errorRate = totalSpans > 0 ? errorCount / totalSpans : 0;
    const activeScopes = countActiveScopes(scopeTree);

    avgDurationBuf.current.push(avgDuration);
    cacheHitBuf.current.push(cacheHitRate);
    errorRateBuf.current.push(errorRate);
    scopeCountBuf.current.push(activeScopes);
    totalSpansBuf.current.push(totalSpans);

    setTick(t => t + 1);
  }, [summary, scopeTree]);

  useEffect(() => {
    // Take an initial sample
    sample();

    const intervalId = setInterval(sample, SAMPLE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [sample]);

  return {
    avgDurations: avgDurationBuf.current.toArray(),
    cacheHitRates: cacheHitBuf.current.toArray(),
    errorRates: errorRateBuf.current.toArray(),
    scopeCounts: scopeCountBuf.current.toArray(),
    totalSpans: totalSpansBuf.current.toArray(),
    uptimeMs: Date.now() - mountTimeRef.current,
  };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function VitalSigns(): ReactNode {
  const summary = useTracingSummary();
  const snapshot = useSnapshot();
  const scopeTree = useScopeTree();
  const sampled = useSampledMetrics();

  const activeScopes = countActiveScopes(scopeTree);
  const totalSpans = summary?.totalSpans ?? 0;
  const errorCount = summary?.errorCount ?? 0;
  const avgDuration = summary?.averageDuration ?? 0;
  const cacheHitRate = summary?.cacheHitRate ?? 0;
  const errorRate = totalSpans > 0 ? errorCount / totalSpans : 0;

  // Determine health thresholds
  const durationHealth: MetricHealth =
    avgDuration < 5 ? "green" : avgDuration < 20 ? "yellow" : "red";
  const cacheHealth: MetricHealth =
    cacheHitRate > 0.7 ? "green" : cacheHitRate > 0.4 ? "yellow" : "red";
  const errorHealth: MetricHealth =
    errorRate < 0.01 ? "green" : errorRate < 0.05 ? "yellow" : "red";
  const scopeHealth: MetricHealth =
    activeScopes < 10 ? "green" : activeScopes < 50 ? "yellow" : "red";
  const throughputHealth: MetricHealth = "green";
  const uptimeHealth: MetricHealth = "green";

  const metrics: readonly MetricCardData[] = [
    {
      porygonName: "Neural Response Time",
      label: "Resolution p50/p95/p99",
      value: `${String(Math.round(avgDuration * 100) / 100)}ms`,
      health: durationHealth,
      sparklineData: sampled.avgDurations,
    },
    {
      porygonName: "Memory Efficiency",
      label: "Cache Hit Rate",
      value: `${String(Math.round(cacheHitRate * 1000) / 10)}%`,
      health: cacheHealth,
      sparklineData: sampled.cacheHitRates,
    },
    {
      porygonName: "Pain Signals",
      label: "Error Rate",
      value: `${String(Math.round(errorRate * 10000) / 100)}%`,
      health: errorHealth,
      sparklineData: sampled.errorRates,
    },
    {
      porygonName: "Active Memory Banks",
      label: "Scope Count",
      value: String(activeScopes),
      health: scopeHealth,
      sparklineData: sampled.scopeCounts,
    },
    {
      porygonName: "Synapse Throughput",
      label: "Total Spans",
      value: String(totalSpans),
      health: throughputHealth,
      sparklineData: sampled.totalSpans,
    },
    {
      porygonName: "Time Alive",
      label: "Uptime",
      value: formatUptime(sampled.uptimeMs),
      health: uptimeHealth,
      sparklineData: [], // Uptime is monotonically increasing, no sparkline needed
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Container status bar */}
      <div className="flex items-center gap-6 border-b border-gray-800 px-4 py-2 text-xs">
        <span className="text-gray-500">
          Container: <span className="text-white">{snapshot.containerName}</span>
        </span>
        <span className="text-gray-500">
          Kind: <span className="text-white">{snapshot.kind}</span>
        </span>
        <span className="text-gray-500">
          Phase: <span className="text-emerald-400">{snapshot.phase}</span>
        </span>
        <span className="text-gray-500">
          Singletons: <span className="text-white">{String(snapshot.singletons.length)}</span>
        </span>
        <span className="text-gray-500">
          Disposed:{" "}
          <span className={snapshot.isDisposed ? "text-red-400" : "text-emerald-400"}>
            {snapshot.isDisposed ? "Yes" : "No"}
          </span>
        </span>
      </div>

      {/* Metric cards grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 gap-4">
          {metrics.map(metric => (
            <MetricCard key={metric.porygonName} metric={metric} />
          ))}
        </div>

        {/* Singleton list */}
        <div className="mt-6">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Resolved Singletons ({String(snapshot.singletons.filter(s => s.isResolved).length)}/
            {String(snapshot.singletons.length)})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {snapshot.singletons.map(singleton => (
              <div
                key={singleton.portName}
                className={`rounded border px-3 py-1.5 text-xs ${
                  singleton.isResolved
                    ? "border-amber-800/50 bg-amber-900/20 text-amber-400"
                    : "border-gray-800 bg-gray-900/30 text-gray-600"
                }`}
              >
                <span className="truncate font-mono">{singleton.portName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { VitalSigns };
