---
id: TYPE-SF-015
kind: types
title: Memory Types
status: active
domain: memory
behaviors: []
adrs: [ADR-013]
---

# Memory Types

- [types/graph.md](./graph.md) -- graph node types
- [types/agent.md](./agent.md) -- `AgentRole`, `SessionChunk`
- [decisions/ADR-013-dual-memory-architecture.md](../decisions/ADR-013-dual-memory-architecture.md) -- ADR-013

---

## Rendered Artifacts

```typescript
interface RenderedArtifact {
  readonly _tag: "RenderedArtifact";
  readonly artifactId: string;
  readonly targetPath: string;
  readonly contentHash: string;
  readonly generatedAt: string;
  readonly sourceQuery: string;
  readonly sourceNodeIds: ReadonlyArray<string>;
  readonly templateId: string;
}
```

---

## Generator Pipeline

```typescript
interface GeneratorPipeline {
  readonly pipelineId: string;
  readonly stages: ReadonlyArray<GeneratorStage>;
  readonly triggerEvents: ReadonlyArray<string>;
  readonly outputPaths: ReadonlyArray<string>;
}

interface GeneratorStage {
  readonly name: string;
  readonly query: string;
  readonly templateId: string;
  readonly outputPath: string;
}
```

---

## Knowledge Patterns

```typescript
interface KnowledgePattern {
  readonly patternId: string;
  readonly type:
    | "naming-convention"
    | "file-layout"
    | "import-ordering"
    | "error-handling"
    | "architectural-decision"
    | "port-api";
  readonly content: string;
  readonly confidence: number;
  readonly sourceSessionIds: ReadonlyArray<string>;
  readonly lastUpdated: string;
}
```

---

## Memory Curation

```typescript
interface MemoryCurationResult {
  readonly merged: ReadonlyArray<string>;
  readonly pruned: ReadonlyArray<string>;
  readonly ranked: ReadonlyArray<{ readonly patternId: string; readonly rank: number }>;
  readonly totalLines: number;
  readonly withinLimit: boolean;
}

interface MemoryRule {
  readonly ruleId: string;
  readonly pathScope: string;
  readonly content: string;
  readonly derivedFrom: ReadonlyArray<string>;
  readonly priority: number;
}
```

---

## Collective Memory

```typescript
interface CollectiveMemory {
  readonly projectId: string;
  readonly patterns: ReadonlyArray<KnowledgePattern>;
  readonly rules: ReadonlyArray<MemoryRule>;
  readonly lastCurated: string;
  readonly sessionCount: number;
}

interface ClaudeMdSection {
  readonly heading: string;
  readonly content: string;
  readonly sourceNodeIds: ReadonlyArray<string>;
  readonly priority: number;
}
```
