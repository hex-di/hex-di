---
id: BEH-SF-566
kind: behavior
title: Skill Management
status: active
id_range: 566--573
invariants: [INV-SF-7, INV-SF-43]
adrs: [ADR-025]
types: [skill, agent]
ports: [SkillManagementPort, SkillGraphPort]
---

# 47 — Skill Management

**ADR:** [ADR-025](../decisions/ADR-025-skill-registry-architecture.md)

---

## BEH-SF-566: Skill Type Classification

> **Invariant:** None

Skills are classified as either `system` or `role` type. System skills define tool configurations, prompt templates, and workflow instructions that apply globally across agent roles. Role skills are scoped to specific agent roles and provide domain-specific expertise instructions. The classification determines visibility, assignment rules, and badge rendering in the dashboard.

### Contract

REQUIREMENT (BEH-SF-566): Every `Skill` node MUST have a `type` property set to either `"system"` or `"role"`. System skills (`type: "system"`) MUST have an empty `roles` array (they apply to all roles). Role skills (`type: "role"`) MUST have a non-empty `roles` array specifying which agent roles they apply to. `SkillManagementPort.listSkills()` MUST support filtering by `type`. The dashboard MUST render a type badge (system: blue, role: green) on each skill card. Builtin skills MUST default to `type: "system"` unless their bundle is role-specific. Custom skills MUST have their `type` explicitly set during creation.

### Verification

- Unit test: System skills have empty `roles` array; role skills have non-empty `roles`
- Unit test: `listSkills({ type: "system" })` returns only system skills
- Unit test: `listSkills({ type: "role" })` returns only role skills
- Unit test: Builtin skills default to `type: "system"`
- Unit test: Creating a custom skill without `type` returns a validation error

---

## BEH-SF-567: Skill CRUD

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Users can create, read, update, and delete custom skills through the dashboard or CLI. Custom skills have `source: "custom"` and are persisted as `Skill` nodes in the knowledge graph. Builtin and graph-extracted skills cannot be modified through this interface.

### Contract

REQUIREMENT (BEH-SF-567): `SkillManagementPort.createSkill(input)` MUST create a new `Skill` node with `source: "custom"`, compute `contentHash` as SHA-256 of the provided `content`, and return the created skill. The `name` MUST be unique within the project scope; duplicate names MUST return `SkillNameConflictError`. `SkillManagementPort.updateSkill(id, patch)` MUST update the mutable fields (`content`, `roles`, `scope`, `type`, `bundle`) and recompute `contentHash` if `content` changed. Updates to `source` or `name` MUST be rejected. `SkillManagementPort.deleteSkill(id)` MUST remove the `Skill` node and all its relationships. Deletion of non-custom skills MUST return `SkillProtectedError`. `SkillManagementPort.getSkill(id)` MUST return the full `Skill` with content, or `SkillNotFoundError` if the ID does not exist.

### Verification

- Unit test: `createSkill` produces a skill with `source: "custom"` and valid `contentHash`
- Unit test: Duplicate name returns `SkillNameConflictError`
- Unit test: `updateSkill` recomputes `contentHash` when content changes
- Unit test: `updateSkill` rejects changes to `source` and `name`
- Unit test: `deleteSkill` removes the node and its relationships
- Unit test: Deleting a builtin skill returns `SkillProtectedError`
- Unit test: `getSkill` with non-existent ID returns `SkillNotFoundError`

---

## BEH-SF-568: Skill Versioning

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Custom skills maintain a version history based on content-hash changes. Each update creates a new version entry with the previous content, timestamp, and author. Users can view the version history and diff between any two versions.

### Contract

REQUIREMENT (BEH-SF-568): When `SkillManagementPort.updateSkill()` changes the `content` field, the system MUST create a `SkillVersion` node linked to the `Skill` via a `HAS_VERSION` relationship. The `SkillVersion` MUST contain `version` (monotonically increasing integer), `contentHash`, `content` (snapshot), `createdAt`, and `createdBy`. `SkillManagementPort.getVersionHistory(skillId)` MUST return all versions ordered by `version` descending. `SkillManagementPort.diffVersions(skillId, fromVersion, toVersion)` MUST return a line-by-line diff of the two version contents. Version history MUST NOT be created for non-content updates (e.g., changing only `roles`).

### Verification

- Unit test: Updating content creates a `SkillVersion` node with correct properties
- Unit test: Updating only `roles` does not create a new version
- Unit test: `getVersionHistory` returns versions in descending order
- Unit test: `diffVersions` produces a correct line-by-line diff
- Unit test: Version numbers are monotonically increasing per skill

---

## BEH-SF-569: Skill Dependency Declaration

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-dag-integrity.md) — DAG Integrity

Skills can declare dependencies on other skills using `DEPENDS_ON` relationships. The dependency graph MUST be a DAG — cycles are rejected at declaration time using topological sort validation.

### Contract

REQUIREMENT (BEH-SF-569): `SkillManagementPort.addDependency(skillId, dependsOnSkillId)` MUST create a `DEPENDS_ON` relationship between two `Skill` nodes. Before creating the relationship, the system MUST perform a cycle detection check using topological sort on the existing dependency graph plus the proposed edge. If a cycle would be created, the system MUST return `SkillCyclicDependencyError` with the cycle path. `SkillManagementPort.removeDependency(skillId, dependsOnSkillId)` MUST remove the `DEPENDS_ON` relationship. `SkillGraphPort.getDependencies(skillId)` MUST return the direct dependencies (outgoing `DEPENDS_ON` edges) and transitive dependencies (full reachability set). Self-dependencies MUST be rejected.

### Verification

- Unit test: `addDependency` creates a `DEPENDS_ON` relationship
- Unit test: Adding a cycle returns `SkillCyclicDependencyError` with the cycle path
- Unit test: Self-dependency is rejected
- Unit test: `getDependencies` returns both direct and transitive dependencies
- Unit test: `removeDependency` removes the relationship without affecting other edges

---

## BEH-SF-570: Skill Orchestration Graph Assembly

> **Invariant:** [INV-SF-43](../invariants/INV-SF-43-dag-integrity.md) — DAG Integrity

The skill orchestration graph is a DAG assembled from all skill nodes, their `DEPENDS_ON` edges, `ASSIGNED_TO` edges (skill-to-role), and `PART_OF` edges (skill-to-bundle). This graph powers the interactive DAG visualizer in the dashboard.

### Contract

REQUIREMENT (BEH-SF-570): `SkillGraphPort.assembleOrchestrationGraph(scope)` MUST return a `SkillOrchestrationGraph` containing all `Skill` nodes matching the scope, all `DEPENDS_ON` edges, all `ASSIGNED_TO` edges linking skills to agent roles, and all `PART_OF` edges linking skills to bundles. Each node in the graph MUST include `id`, `name`, `type`, `source`, and `bundle`. Each edge MUST include `source`, `target`, and `relationship` type. The graph MUST be validated as a DAG (no cycles in `DEPENDS_ON` edges). The graph MUST include layout hints: topological order position, cluster assignment (by bundle or by type), and depth level. Nodes with no edges MUST be included as isolated nodes in the graph.

### Verification

- Unit test: Graph includes all skills matching the scope
- Unit test: `DEPENDS_ON`, `ASSIGNED_TO`, and `PART_OF` edges are all present
- Unit test: Each node has required properties (`id`, `name`, `type`, `source`)
- Unit test: Layout hints include topological order and cluster assignment
- Unit test: Isolated nodes (no edges) are included in the graph
- Unit test: Graph validates as a DAG

---

## BEH-SF-571: Skill Search and Discovery

> **Invariant:** None

Users can search for skills using full-text search and faceted filtering by type, role, source, and bundle. The search supports partial matching on skill names and content.

### Contract

REQUIREMENT (BEH-SF-571): `SkillManagementPort.searchSkills(query)` MUST support full-text search across skill `name` and `content` fields. The `query` parameter MUST support faceted filters: `type` (`"system"` | `"role"`), `source` (`"builtin"` | `"graph-extracted"` | `"project"` | `"custom"`), `roles` (array of role names), `bundle` (bundle name), and `text` (free-text search string). Free-text search MUST use case-insensitive partial matching. Results MUST be sorted by relevance (text match score) then alphabetically by name. `SkillManagementPort.searchSkills({})` with no filters MUST return all skills. Results MUST include a `totalCount` for pagination. Each result MUST be a `SkillSummary` (without full content) for performance.

### Verification

- Unit test: Free-text search matches skill names partially
- Unit test: Free-text search matches skill content partially
- Unit test: Faceted filter by `type` returns only matching skills
- Unit test: Faceted filter by `source` returns only matching skills
- Unit test: Combining multiple facets produces an intersection
- Unit test: Empty query returns all skills
- Unit test: Results are `SkillSummary` objects (no content field)

---

## BEH-SF-572: Skill Role Assignment

> **Invariant:** None

Skills can be assigned to specific agent roles and user personas through `ASSIGNED_TO` relationships. Role assignment determines which skills are injected into an agent's session context during resolution.

### Contract

REQUIREMENT (BEH-SF-572): `SkillManagementPort.assignToRole(skillId, role)` MUST create an `ASSIGNED_TO` relationship between the `Skill` node and the target `Agent` node for the given role. If the relationship already exists, the operation MUST be idempotent (no duplicate edges). `SkillManagementPort.unassignFromRole(skillId, role)` MUST remove the `ASSIGNED_TO` relationship. Assignment MUST also update the skill's `roles` array property to keep it in sync with the graph relationships. `SkillManagementPort.getAssignments(skillId)` MUST return all roles the skill is assigned to. Assigning a `type: "system"` skill to specific roles MUST return `SkillTypeConstraintError` (system skills apply to all roles).

### Verification

- Unit test: `assignToRole` creates an `ASSIGNED_TO` relationship
- Unit test: Duplicate assignment is idempotent
- Unit test: `unassignFromRole` removes the relationship
- Unit test: Skill `roles` array stays in sync with graph relationships
- Unit test: Assigning a system skill to a specific role returns `SkillTypeConstraintError`
- Unit test: `getAssignments` returns all assigned roles

---

## BEH-SF-573: Skill Import/Export

> **Invariant:** None

Skills can be exported from one project and imported into another. The import/export mechanism handles name conflicts with configurable strategies: `skip`, `overwrite`, or `rename`.

### Contract

REQUIREMENT (BEH-SF-573): `SkillManagementPort.exportSkills(skillIds)` MUST return a `SkillExportBundle` containing the selected skills with their full content, metadata, dependencies, and version history. The export format MUST be a self-contained JSON structure. `SkillManagementPort.importSkills(bundle, strategy)` MUST import skills from a `SkillExportBundle` into the current project. The `strategy` parameter MUST support: `"skip"` (skip skills whose name already exists), `"overwrite"` (replace existing skills with imported content), and `"rename"` (append a numeric suffix to conflicting names). Import MUST validate that all `DEPENDS_ON` references in the bundle are resolvable (either included in the bundle or already exist in the target project). Unresolvable dependencies MUST return `SkillImportDependencyError`. The import MUST return a `SkillImportResult` with counts of created, skipped, overwritten, and renamed skills.

### Verification

- Unit test: `exportSkills` produces a valid `SkillExportBundle` with content and metadata
- Unit test: Export includes dependency relationships
- Unit test: `importSkills` with `"skip"` strategy skips name conflicts
- Unit test: `importSkills` with `"overwrite"` strategy replaces existing skills
- Unit test: `importSkills` with `"rename"` strategy appends numeric suffix
- Unit test: Unresolvable dependency returns `SkillImportDependencyError`
- Unit test: `SkillImportResult` has correct counts
