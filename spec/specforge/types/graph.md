---
id: TYPE-SF-011
kind: types
title: Graph Store Types
status: active
domain: graph
behaviors: []
adrs: []
---

# Graph Store Types

- [architecture/c1-system-context.md](../architecture/c1-system-context.md) -- system context for graph store placement
- [types/errors.md](./errors.md) -- `GraphConnectionError`, `GraphQueryError`, `GraphTransactionError`, `GraphSyncConflictError`, `GraphUnavailableError`
- [types/acp.md](./acp.md) -- `ACPMessage` used by `GraphSyncService` for message-to-graph projection

---

## Connection Configuration

```typescript
interface Neo4jConfig {
  readonly uri: string;
  readonly user: string;
  readonly password: string;
  readonly database?: string;
  readonly maxConnectionPoolSize?: number;
  readonly connectionTimeout?: number;
}
```

---

## Core Graph Primitives

```typescript
interface GraphNode {
  readonly id: string;
  readonly labels: ReadonlyArray<string>;
  readonly properties: Record<string, unknown>;
}

interface GraphEdge {
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: string;
  readonly properties?: Record<string, unknown>;
}
```

> **Note (N51):** `GraphEdge` has fewer properties than `GraphNode` because edges represent typed relationships with metadata, while nodes carry the full domain entity payload. Edge properties are constrained to relationship metadata (type, weight, timestamps) to keep graph traversal efficient.

---

## Impact Analysis

```typescript
interface ImpactAnalysisResult {
  readonly rootNodeId: string;
  readonly affectedNodes: ReadonlyArray<AffectedNode>;
  readonly depth: number;
}

interface AffectedNode {
  readonly id: string;
  readonly labels: ReadonlyArray<string>;
  readonly distance: number;
  readonly relationship: string;
}
```

---

## Traceability & Orphan Detection

```typescript
interface TraceabilityGapsResult {
  readonly requirementsWithoutTasks: ReadonlyArray<string>;
  readonly tasksWithoutCode: ReadonlyArray<string>;
  readonly codeWithoutTests: ReadonlyArray<string>;
  readonly totalGaps: number;
}

interface OrphanDetectionResult {
  readonly orphanNodes: ReadonlyArray<GraphNode>;
  readonly totalOrphans: number;
}
```

---

## Coverage Paths

```typescript
interface CoveragePathResult {
  readonly requirementId: string;
  readonly paths: ReadonlyArray<TraceabilityPath>;
}

interface TraceabilityPath {
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly edges: ReadonlyArray<GraphEdge>;
}
```

---

## Dependency Chains & Subgraphs

```typescript
interface DependencyChainResult {
  readonly rootNodeId: string;
  readonly chain: ReadonlyArray<GraphNode>;
  readonly cycles: ReadonlyArray<ReadonlyArray<string>>;
}

interface SubgraphResult {
  readonly centerNodeId: string;
  readonly nodes: ReadonlyArray<GraphNode>;
  readonly edges: ReadonlyArray<GraphEdge>;
  readonly depth: number;
}
```

---

## Graph Sync

```typescript
interface GraphSyncReport {
  readonly nodesUpserted: number;
  readonly edgesUpserted: number;
  readonly nodesDeleted: number;
  readonly conflicts: ReadonlyArray<SyncConflict>;
  readonly duration: number;
}

interface SyncConflict {
  readonly nodeId: string;
  readonly field: string;
  readonly localValue: unknown;
  readonly remoteValue: unknown;
  readonly resolution: "local-wins" | "remote-wins" | "merged";
}
```

---

## Cross-Project Dependencies

```typescript
interface CrossProjectDepsResult {
  readonly projectId: string;
  readonly inboundReferences: ReadonlyArray<{
    readonly sourceProjectId: string;
    readonly nodeId: string;
    readonly nodeType: string;
  }>;
  readonly outboundReferences: ReadonlyArray<{
    readonly targetProjectId: string;
    readonly nodeId: string;
    readonly nodeType: string;
  }>;
}
```

---

## Health and Metrics Types

Types used by `HealthCheckService` and `MetricsService` in [types/ports.md](./ports.md).

```typescript
type HealthStatus = "healthy" | "degraded" | "unhealthy";

interface HealthCheck {
  readonly status: HealthStatus;
  readonly checks: ReadonlyArray<{
    readonly name: string;
    readonly status: HealthStatus;
    readonly message: string | undefined;
    readonly latencyMs: number | undefined;
  }>;
  readonly timestamp: string;
}

interface MetricEntry {
  readonly name: string;
  readonly value: number;
  readonly unit: "count" | "ms" | "bytes" | "tokens" | "usd";
  readonly tags: Record<string, string>;
  readonly timestamp: string;
}

interface MetricFilter {
  readonly name: string | undefined;
  readonly tags: Record<string, string> | undefined;
  readonly since: string | undefined;
  readonly until: string | undefined;
}
```
