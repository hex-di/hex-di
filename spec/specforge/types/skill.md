---
id: TYPE-SF-019
kind: types
title: Skill Types
status: active
domain: skill
behaviors:
  [
    BEH-SF-558,
    BEH-SF-559,
    BEH-SF-560,
    BEH-SF-561,
    BEH-SF-562,
    BEH-SF-563,
    BEH-SF-564,
    BEH-SF-565,
    BEH-SF-566,
    BEH-SF-567,
    BEH-SF-568,
    BEH-SF-569,
    BEH-SF-570,
    BEH-SF-571,
    BEH-SF-572,
    BEH-SF-573,
    BEH-SF-574,
    BEH-SF-575,
    BEH-SF-576,
    BEH-SF-577,
    BEH-SF-578,
    BEH-SF-579,
    BEH-SF-580,
    BEH-SF-581,
    BEH-SF-582,
    BEH-SF-583,
    BEH-SF-584,
    BEH-SF-585,
  ]
adrs: [ADR-025, ADR-007, ADR-005]
---

# Skill Types

**Source:** [ADR-025](../decisions/ADR-025-skill-registry-architecture.md) — Skill Registry Architecture

**Cross-references:**

- [types/agent.md](./agent.md) — `AgentRole`, `SessionConfig` (imports `Skill`, `ResolvedSkillSet`)
- [types/graph.md](./graph.md) — `Skill` and `SkillBundle` as Neo4j node types
- [types/errors.md](./errors.md) — `SkillResolverError`
- [architecture/c3-skill-registry.md](../architecture/c3-skill-registry.md) — Component diagram

---

## Skill Source

```typescript
type SkillSource = "builtin" | "graph-extracted" | "project" | "custom";
```

> `builtin` — Bundled with SpecForge. `graph-extracted` — Produced by codebase-analyzer and stored in Neo4j. `project` — Read from `.claude/skills/*.md` files. `custom` — User-authored via dashboard or CLI (BEH-SF-567).

---

## Skill Bundle Name

```typescript
type SkillBundleName =
  | "spec-authoring"
  | "architecture"
  | "visual"
  | "compliance"
  | "coding-standards"
  | (string & { readonly __brand: "SkillBundleName" });
```

> The 5 built-in bundles plus branded string for custom bundles from plugins or dynamic role templates.

---

## Skill

```typescript
interface Skill {
  readonly name: string;
  readonly source: SkillSource;
  readonly bundle: SkillBundleName | undefined;
  readonly content: string;
  readonly contentHash: string;
  readonly scope: string;
  readonly roles: ReadonlyArray<AgentRole>;
}
```

> A single skill instruction. `scope` is a glob pattern matching project paths (e.g., `"**"` for all projects, `"libs/flow/**"` for flow packages). `roles` is the set of agent roles this skill applies to; an empty array means all roles. `contentHash` is a SHA-256 of `content` for change detection.

---

## Skill Summary

```typescript
interface SkillSummary {
  readonly name: string;
  readonly source: SkillSource;
  readonly bundle: SkillBundleName | undefined;
  readonly scope: string;
  readonly roles: ReadonlyArray<AgentRole>;
}
```

> Lightweight skill reference without content. Used in listings and graph queries.

---

## Skill Bundle

```typescript
interface SkillBundle {
  readonly name: SkillBundleName;
  readonly description: string;
  readonly skills: ReadonlyArray<Skill>;
}
```

> A named collection of related skills. Bundles are the unit of assignment to agent roles.

---

## Resolved Skill Set

```typescript
interface ResolvedSkillSet {
  readonly role: AgentRole;
  readonly skills: ReadonlyArray<Skill>;
  readonly totalTokens: number;
  readonly trimmed: boolean;
  readonly sources: Readonly<Record<SkillSource, number>>;
}
```

> The output of skill resolution for a single agent session. `totalTokens` is the estimated token count of all included skills. `trimmed` indicates whether any skills were dropped to fit the budget. `sources` is a count of skills per source type.

---

## Skill Resolution Config

```typescript
interface SkillResolutionConfig {
  readonly role: AgentRole;
  readonly scope: string;
  readonly tokenBudget: number;
}
```

> Input to the skill resolution algorithm. `scope` is the project path or working directory. `tokenBudget` is the maximum token count allocated for skills in this session.

---

## Role Bundle Assignment

```typescript
interface RoleBundleAssignment {
  readonly role: AgentRole;
  readonly bundles: ReadonlyArray<SkillBundleName>;
}
```

> Static mapping from an agent role to its assigned skill bundles. Used by the `SkillRegistry` to determine which builtin bundles apply to a given role.

---

## Skill Registry Port

```typescript
interface SkillRegistryPort {
  readonly resolveSkills: (
    config: SkillResolutionConfig
  ) => ResultAsync<ResolvedSkillSet, SkillResolverError>;
  readonly listSkills: (
    scope: string
  ) => ResultAsync<ReadonlyArray<SkillSummary>, SkillResolverError>;
  readonly listBundles: () => ResultAsync<ReadonlyArray<SkillBundle>, SkillResolverError>;
  readonly getBundleAssignment: (
    role: AgentRole
  ) => ResultAsync<RoleBundleAssignment, SkillResolverError>;
}
```

> Port interface for the Skill Registry. Injected into `SessionManager` and `CompositionEngine`. The `resolveSkills` method executes the full resolution algorithm (load, filter, deduplicate, trim).

---

## Skill Type

```typescript
type SkillType = "system" | "role";
```

> `system` — Global skills applying to all agent roles (empty `roles` array). `role` — Skills scoped to specific agent roles (non-empty `roles` array). See BEH-SF-566.

---

## Skill Version

```typescript
interface SkillVersion {
  readonly version: number;
  readonly contentHash: string;
  readonly content: string;
  readonly createdAt: string;
  readonly createdBy: string;
}
```

> Snapshot of a skill's content at a point in time. Created when `updateSkill()` changes the `content` field. See BEH-SF-568.

---

## Skill Search Query

```typescript
interface SkillSearchQuery {
  readonly text?: string;
  readonly type?: SkillType;
  readonly source?: SkillSource;
  readonly roles?: ReadonlyArray<AgentRole>;
  readonly bundle?: SkillBundleName;
}
```

> Input to `searchSkills()`. All fields are optional; empty query returns all skills. See BEH-SF-571.

---

## Skill Export Bundle

```typescript
interface SkillExportBundle {
  readonly skills: ReadonlyArray<Skill>;
  readonly dependencies: ReadonlyArray<{ readonly from: string; readonly to: string }>;
  readonly versions: Readonly<Record<string, ReadonlyArray<SkillVersion>>>;
  readonly exportedAt: string;
}
```

> Self-contained export of skills with dependencies and version history. See BEH-SF-573.

---

## Skill Import Result

```typescript
interface SkillImportResult {
  readonly created: number;
  readonly skipped: number;
  readonly overwritten: number;
  readonly renamed: number;
}
```

> Result of importing a `SkillExportBundle`. See BEH-SF-573.

---

## Skill Import Strategy

```typescript
type SkillImportStrategy = "skip" | "overwrite" | "rename";
```

> Conflict resolution strategy for skill import. See BEH-SF-573.

---

## Skill Orchestration Graph

```typescript
interface SkillOrchestrationGraph {
  readonly nodes: ReadonlyArray<SkillGraphNode>;
  readonly edges: ReadonlyArray<SkillGraphEdge>;
}

interface SkillGraphNode {
  readonly id: string;
  readonly name: string;
  readonly type: SkillType;
  readonly source: SkillSource;
  readonly bundle: SkillBundleName | undefined;
  readonly topologicalOrder: number;
  readonly cluster: string;
  readonly depth: number;
}

interface SkillGraphEdge {
  readonly source: string;
  readonly target: string;
  readonly relationship: "DEPENDS_ON" | "ASSIGNED_TO" | "PART_OF";
}
```

> DAG representation of skills, dependencies, role assignments, and bundle membership. See BEH-SF-570.

---

## Skill Management Port

```typescript
interface SkillManagementPort {
  readonly createSkill: (input: SkillCreateInput) => ResultAsync<Skill, SkillManagementError>;
  readonly getSkill: (id: string) => ResultAsync<Skill, SkillManagementError>;
  readonly updateSkill: (
    id: string,
    patch: SkillUpdatePatch
  ) => ResultAsync<Skill, SkillManagementError>;
  readonly deleteSkill: (id: string) => ResultAsync<void, SkillManagementError>;
  readonly listSkills: (filter?: {
    readonly type?: SkillType;
  }) => ResultAsync<ReadonlyArray<SkillSummary>, SkillManagementError>;
  readonly searchSkills: (
    query: SkillSearchQuery
  ) => ResultAsync<
    { readonly results: ReadonlyArray<SkillSummary>; readonly totalCount: number },
    SkillManagementError
  >;
  readonly getVersionHistory: (
    skillId: string
  ) => ResultAsync<ReadonlyArray<SkillVersion>, SkillManagementError>;
  readonly diffVersions: (
    skillId: string,
    fromVersion: number,
    toVersion: number
  ) => ResultAsync<string, SkillManagementError>;
  readonly addDependency: (
    skillId: string,
    dependsOnSkillId: string
  ) => ResultAsync<void, SkillManagementError>;
  readonly removeDependency: (
    skillId: string,
    dependsOnSkillId: string
  ) => ResultAsync<void, SkillManagementError>;
  readonly assignToRole: (
    skillId: string,
    role: AgentRole
  ) => ResultAsync<void, SkillManagementError>;
  readonly unassignFromRole: (
    skillId: string,
    role: AgentRole
  ) => ResultAsync<void, SkillManagementError>;
  readonly getAssignments: (
    skillId: string
  ) => ResultAsync<ReadonlyArray<AgentRole>, SkillManagementError>;
  readonly exportSkills: (
    skillIds: ReadonlyArray<string>
  ) => ResultAsync<SkillExportBundle, SkillManagementError>;
  readonly importSkills: (
    bundle: SkillExportBundle,
    strategy: SkillImportStrategy
  ) => ResultAsync<SkillImportResult, SkillManagementError>;
}
```

> Port for skill CRUD, versioning, dependency management, role assignment, and import/export. See BEH-SF-566 through BEH-SF-573.

---

## Skill Graph Port

```typescript
interface SkillGraphPort {
  readonly assembleOrchestrationGraph: (
    scope: string
  ) => ResultAsync<SkillOrchestrationGraph, SkillGraphError>;
  readonly getDependencies: (
    skillId: string
  ) => ResultAsync<
    { readonly direct: ReadonlyArray<string>; readonly transitive: ReadonlyArray<string> },
    SkillGraphError
  >;
}
```

> Port for skill orchestration graph assembly and dependency queries. See BEH-SF-569, BEH-SF-570.

---

## Workflow Step

```typescript
interface WorkflowStep {
  readonly stepId: string;
  readonly skillId: string;
  readonly order: number;
  readonly condition: string | undefined;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly onFailure: "continue" | "abort" | "retry";
}
```

> A single step in a skill workflow. See BEH-SF-574.

---

## Skill Workflow

```typescript
interface SkillWorkflow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: "private" | "project" | "public";
  readonly steps: ReadonlyArray<WorkflowStep>;
  readonly clonedFrom: string | undefined;
  readonly cloneCount: number;
  readonly createdBy: string;
  readonly createdAt: string;
}
```

> An ordered sequence of skill steps with conditions and failure policies. See BEH-SF-574, BEH-SF-577.

---

## Workflow Run

```typescript
interface WorkflowRun {
  readonly runId: string;
  readonly workflowId: string;
  readonly startedAt: string;
  readonly completedAt: string | undefined;
  readonly status: "running" | "completed" | "aborted" | "failed";
  readonly stepResults: ReadonlyArray<WorkflowStepResult>;
}

interface WorkflowStepResult {
  readonly stepId: string;
  readonly status: "completed" | "failed" | "skipped";
  readonly duration: number;
  readonly tokenUsage: number;
  readonly error: string | undefined;
}
```

> Result of executing a skill workflow. See BEH-SF-576, BEH-SF-579.

---

## Workflow Template

```typescript
interface WorkflowTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly steps: ReadonlyArray<WorkflowStep>;
}
```

> Predefined workflow template. Immutable — users instantiate a copy. See BEH-SF-580.

---

## Workflow Version

```typescript
interface WorkflowVersion {
  readonly version: number;
  readonly steps: ReadonlyArray<WorkflowStep>;
  readonly createdAt: string;
  readonly createdBy: string;
}
```

> Snapshot of workflow step configuration at a point in time. See BEH-SF-581.

---

## Workflow Validation Result

```typescript
interface WorkflowValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<WorkflowValidationError>;
}

type WorkflowValidationError =
  | {
      readonly _tag: "WorkflowBrokenReferenceError";
      readonly stepId: string;
      readonly skillId: string;
    }
  | { readonly _tag: "WorkflowOrderGapError"; readonly expected: number; readonly actual: number }
  | {
      readonly _tag: "WorkflowDependencyOrderError";
      readonly stepId: string;
      readonly unmetDependency: string;
    }
  | {
      readonly _tag: "WorkflowConditionParseError";
      readonly stepId: string;
      readonly expression: string;
      readonly reason: string;
    };
```

> Result of workflow validation. See BEH-SF-575.

---

## Skill Workflow Port

```typescript
interface SkillWorkflowPort {
  readonly createWorkflow: (
    input: SkillWorkflowCreateInput
  ) => ResultAsync<SkillWorkflow, SkillWorkflowError>;
  readonly getWorkflow: (id: string) => ResultAsync<SkillWorkflow, SkillWorkflowError>;
  readonly updateWorkflow: (
    id: string,
    patch: SkillWorkflowUpdatePatch
  ) => ResultAsync<SkillWorkflow, SkillWorkflowError>;
  readonly deleteWorkflow: (id: string) => ResultAsync<void, SkillWorkflowError>;
  readonly validateWorkflow: (
    workflowId: string
  ) => ResultAsync<WorkflowValidationResult, SkillWorkflowError>;
  readonly executeWorkflow: (
    workflowId: string,
    context: Record<string, unknown>
  ) => ResultAsync<WorkflowRun, SkillWorkflowError>;
  readonly getRunStatus: (runId: string) => ResultAsync<WorkflowRun, SkillWorkflowError>;
  readonly setVisibility: (
    workflowId: string,
    visibility: "private" | "project" | "public"
  ) => ResultAsync<void, SkillWorkflowError>;
  readonly listWorkflows: (
    scope: "private" | "project" | "public"
  ) => ResultAsync<ReadonlyArray<SkillWorkflow>, SkillWorkflowError>;
  readonly discoverWorkflows: (query: {
    readonly text?: string;
    readonly visibility?: string;
    readonly sortBy?: "cloneCount" | "createdAt";
  }) => ResultAsync<ReadonlyArray<SkillWorkflow>, SkillWorkflowError>;
  readonly cloneWorkflow: (workflowId: string) => ResultAsync<SkillWorkflow, SkillWorkflowError>;
  readonly listTemplates: () => ResultAsync<ReadonlyArray<WorkflowTemplate>, SkillWorkflowError>;
  readonly instantiateTemplate: (
    templateId: string,
    overrides?: Partial<SkillWorkflowCreateInput>
  ) => ResultAsync<SkillWorkflow, SkillWorkflowError>;
  readonly getWorkflowVersionHistory: (
    workflowId: string
  ) => ResultAsync<ReadonlyArray<WorkflowVersion>, SkillWorkflowError>;
  readonly rollbackWorkflow: (
    workflowId: string,
    version: number
  ) => ResultAsync<SkillWorkflow, SkillWorkflowError>;
}
```

> Port for skill workflow CRUD, execution, sharing, templates, and versioning. See BEH-SF-574 through BEH-SF-581.

---

## Spec Component Graph

```typescript
interface SpecComponentGraph {
  readonly nodes: ReadonlyArray<SpecComponentNode>;
  readonly edges: ReadonlyArray<SpecComponentEdge>;
}

interface SpecComponentNode {
  readonly id: string;
  readonly kind: "capability" | "feature" | "behavior" | "invariant" | "adr" | "risk-assessment";
  readonly title: string;
  readonly status: string;
  readonly depth: number;
  readonly orphan: boolean;
}

interface SpecComponentEdge {
  readonly source: string;
  readonly target: string;
  readonly relationship: string;
}
```

> DAG of all spec components with depth levels and orphan detection. See BEH-SF-582.

---

## Coverage Overlay

```typescript
interface CoverageOverlay {
  readonly nodes: Readonly<Record<string, CoverageStatus>>;
  readonly aggregate: CoverageAggregate;
}

interface CoverageStatus {
  readonly implementationStatus: "not-started" | "in-progress" | "implemented" | "verified";
  readonly testCoverage: number;
  readonly color: string;
}

interface CoverageAggregate {
  readonly totalNodes: number;
  readonly perStatus: Readonly<Record<string, number>>;
  readonly averageTestCoverage: number;
}
```

> Color overlay for spec component graph nodes. See BEH-SF-584.

---

## Spec Impact Result

```typescript
interface SpecImpactResult {
  readonly directlyAffected: ReadonlyArray<SpecComponentNode>;
  readonly transitivelyAffected: ReadonlyArray<SpecComponentNode>;
  readonly totalAffected: number;
  readonly affectedByKind: Readonly<Record<string, number>>;
  readonly severity: "low" | "medium" | "high";
}
```

> Impact analysis result for a changed spec component. See BEH-SF-585.

---

## Spec Component Graph Port

```typescript
interface SpecComponentGraphPort {
  readonly assembleGraph: (
    projectId: string
  ) => ResultAsync<SpecComponentGraph, SpecComponentGraphError>;
  readonly traceUpstream: (nodeId: string) => ResultAsync<
    ReadonlyArray<{
      readonly node: SpecComponentNode;
      readonly relationship: string;
      readonly distance: number;
    }>,
    SpecComponentGraphError
  >;
  readonly traceDownstream: (nodeId: string) => ResultAsync<
    ReadonlyArray<{
      readonly node: SpecComponentNode;
      readonly relationship: string;
      readonly distance: number;
    }>,
    SpecComponentGraphError
  >;
  readonly traceChain: (
    fromNodeId: string,
    toNodeId: string
  ) => ResultAsync<ReadonlyArray<ReadonlyArray<string>>, SpecComponentGraphError>;
  readonly computeCoverageOverlay: (
    projectId: string
  ) => ResultAsync<CoverageOverlay, SpecComponentGraphError>;
  readonly analyzeImpact: (
    nodeId: string
  ) => ResultAsync<SpecImpactResult, SpecComponentGraphError>;
}
```

> Port for spec component graph assembly, traceability navigation, coverage overlay, and impact analysis. See BEH-SF-582 through BEH-SF-585.
