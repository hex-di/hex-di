/**
 * Analyze cache efficiency tool for MCP.
 *
 * @packageDocumentation
 */

import type { DataGetter } from "../server/mcp-server.js";

/**
 * Analyze cache efficiency tool definition.
 */
export const analyzeCacheEfficiencyTool = {
  name: "analyze_cache_efficiency",
  description:
    "Analyze the cache efficiency of service resolutions. Shows hit rates, misses, and optimization suggestions.",
  inputSchema: {
    type: "object" as const,
    properties: {
      serviceName: {
        type: "string",
        description: "Optional: Analyze a specific service",
      },
      groupByLifetime: {
        type: "boolean",
        description: "Group results by service lifetime (default: true)",
      },
    },
    required: [],
  },
};

interface AnalyzeCacheEfficiencyParams {
  serviceName?: string;
  groupByLifetime?: boolean;
}

interface ServiceCacheStats {
  portName: string;
  lifetime: string;
  totalResolutions: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  avgDuration: number;
}

/**
 * Execute analyze cache efficiency tool.
 */
export async function executeAnalyzeCacheEfficiency(
  getData: DataGetter,
  params: AnalyzeCacheEfficiencyParams
): Promise<string> {
  const [traces, stats] = await Promise.all([getData.getTraces(), getData.getStats()]);

  let filtered = [...traces];

  // Filter by service name if specified
  if (params.serviceName !== undefined) {
    const searchName = params.serviceName.toLowerCase();
    filtered = filtered.filter(trace => trace.portName.toLowerCase().includes(searchName));
  }

  // Group by service
  const serviceStats = new Map<string, ServiceCacheStats>();

  for (const trace of filtered) {
    const existing = serviceStats.get(trace.portName);
    if (existing !== undefined) {
      existing.totalResolutions++;
      if (trace.isCacheHit) {
        existing.cacheHits++;
      } else {
        existing.cacheMisses++;
      }
      existing.avgDuration =
        (existing.avgDuration * (existing.totalResolutions - 1) + trace.duration) /
        existing.totalResolutions;
    } else {
      serviceStats.set(trace.portName, {
        portName: trace.portName,
        lifetime: trace.lifetime,
        totalResolutions: 1,
        cacheHits: trace.isCacheHit ? 1 : 0,
        cacheMisses: trace.isCacheHit ? 0 : 1,
        hitRate: 0,
        avgDuration: trace.duration,
      });
    }
  }

  // Calculate hit rates
  for (const s of serviceStats.values()) {
    s.hitRate = s.totalResolutions > 0 ? s.cacheHits / s.totalResolutions : 0;
  }

  const services = Array.from(serviceStats.values());

  // Sort by hit rate (lowest first to show potential problems)
  services.sort((a, b) => a.hitRate - b.hitRate);

  // Generate suggestions
  const suggestions: string[] = [];

  // Find transient services with many resolutions
  const frequentTransients = services.filter(
    s => s.lifetime === "transient" && s.totalResolutions > 5
  );
  if (frequentTransients.length > 0) {
    suggestions.push(
      `Consider changing ${frequentTransients.length} frequently-resolved transient services to scoped or singleton for better performance`
    );
  }

  // Find services with low hit rates that are singletons
  const lowHitSingletons = services.filter(
    s => s.lifetime === "singleton" && s.hitRate < 0.9 && s.totalResolutions > 1
  );
  if (lowHitSingletons.length > 0) {
    suggestions.push(
      `${lowHitSingletons.length} singleton services have unexpectedly low cache hit rates - check for scope issues`
    );
  }

  // Group by lifetime if requested
  const groupByLifetime = params.groupByLifetime ?? true;
  let groupedResults: Record<string, ServiceCacheStats[]> | ServiceCacheStats[];

  if (groupByLifetime) {
    groupedResults = {
      singleton: services.filter(s => s.lifetime === "singleton"),
      scoped: services.filter(s => s.lifetime === "scoped"),
      transient: services.filter(s => s.lifetime === "transient"),
    };
  } else {
    groupedResults = services;
  }

  const result = {
    summary: {
      totalServices: services.length,
      totalResolutions: stats.totalResolutions,
      overallHitRate: stats.cacheHitRate,
      averageDuration: stats.averageDuration,
    },
    services: groupedResults,
    suggestions,
  };

  return JSON.stringify(result, null, 2);
}

/**
 * Register analyze cache efficiency tool (placeholder for backwards compatibility).
 */
export function registerAnalyzeCacheEfficiencyTool(): void {
  // Tools are registered via the unified handler in mcp-server.ts
}
