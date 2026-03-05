---
id: BEH-SF-558
kind: behavior
title: Skill Registry
status: active
id_range: 558--565
invariants: [INV-SF-7, INV-SF-40]
adrs: [ADR-025]
types: [skill, agent]
ports: [SkillRegistryPort, GraphStorePort]
---

# 46 — Skill Registry

**ADR:** [ADR-025](../decisions/ADR-025-skill-registry-architecture.md)

---

## BEH-SF-558: Builtin Skill Loading

> **Invariant:** None (builtin skills are static data, not a system constraint)

The system ships with 5 built-in skill bundles (`spec-authoring`, `architecture`, `visual`, `compliance`, `coding-standards`) containing skills for spec-authoring workflows, architectural guidance, visual design patterns, compliance checklists, and coding standards enforcement. Each builtin skill is a complete markdown instruction with metadata.

### Contract

REQUIREMENT (BEH-SF-558): The system MUST ship 5 builtin skill bundles: `spec-authoring`, `architecture`, `visual`, `compliance`, and `coding-standards`. Each bundle MUST contain at least 1 skill. Each builtin skill MUST have `source: "builtin"`, a valid `bundle` reference, non-empty `content`, a `contentHash` computed as SHA-256 of the `content`, a `scope` of `"**"` (all projects), and a `roles` array listing the agent roles that receive this bundle. `SkillRegistryPort.listBundles()` MUST return all 5 bundles with their skill counts. Builtin skills MUST be loadable without filesystem or graph access (embedded in the application).

### Verification

- Unit test: `listBundles()` returns exactly 5 bundles with correct names
- Unit test: Each bundle contains at least 1 skill with `source: "builtin"`
- Unit test: All builtin skills have valid `contentHash` matching SHA-256 of their `content`
- Unit test: Builtin loading succeeds when GraphStorePort and filesystem are unavailable

---

## BEH-SF-559: Graph Skill Loading

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Skills extracted by the `codebase-analyzer` agent are persisted as `Skill` nodes in the Neo4j knowledge graph. The graph skill loader queries these nodes when resolving skills for an agent session.

### Contract

REQUIREMENT (BEH-SF-559): The system MUST query the knowledge graph for `Skill` nodes matching the current project scope when resolving skills. The query MUST filter by `scope` pattern match against the session's working directory and by `roles` array intersection with the target agent role. Each returned skill MUST have `source: "graph-extracted"`. If the graph query fails (connection error, timeout), the system MUST continue resolution with the remaining sources (builtin, project) and include a diagnostic warning in the `ResolvedSkillSet`. Graph-extracted skills MUST have `EXTRACTED_FROM` relationships linking them to their source `SpecFile` or source file nodes.

### Verification

- Integration test: Skills created by codebase-analyzer are returned by graph loader
- Integration test: Scope filtering returns only skills matching the session path
- Integration test: Role filtering excludes skills not assigned to the target role
- Unit test: Graph failure degrades gracefully — resolution completes with builtin + project skills
- Integration test: Each graph-extracted skill has at least one `EXTRACTED_FROM` relationship

---

## BEH-SF-560: Project Skill Loading

> **Invariant:** None

Project skills are user-authored markdown files in the `.claude/skills/` directory. The project skill loader reads these files, parses their frontmatter metadata, and creates `Skill` objects.

### Contract

REQUIREMENT (BEH-SF-560): The system MUST read all `*.md` files in the project's `.claude/skills/` directory. Each file MUST be parsed for YAML frontmatter with optional fields: `name` (defaults to filename without extension), `roles` (defaults to empty array meaning all roles), `scope` (defaults to `"**"`), and `bundle` (defaults to `undefined`). The file body (after frontmatter) becomes the skill's `content`. Each parsed skill MUST have `source: "project"` and a `contentHash` computed as SHA-256 of the `content`. If the `.claude/skills/` directory does not exist, the loader MUST return an empty array (not an error). Files with invalid frontmatter MUST be skipped with a diagnostic warning, not cause resolution failure.

### Verification

- Unit test: Valid markdown files are parsed into Skill objects with `source: "project"`
- Unit test: Missing `.claude/skills/` directory returns empty array
- Unit test: Files without frontmatter use default values (filename as name, empty roles, `"**"` scope)
- Unit test: Invalid frontmatter files are skipped with warning
- Unit test: `contentHash` matches SHA-256 of file body content

---

## BEH-SF-561: Skill Resolution Algorithm

> **Invariant:** None

The skill resolution algorithm merges skills from all 3 sources, applies filtering and deduplication, and trims the result to fit the token budget.

### Contract

REQUIREMENT (BEH-SF-561): `SkillRegistryPort.resolveSkills(config)` MUST execute the following steps in order: (1) Load skills from all 3 sources (builtin, graph-extracted, project) concurrently. (2) Filter by role: keep skills whose `roles` array includes `config.role` or whose `roles` array is empty. (3) Filter by scope: keep skills whose `scope` glob pattern matches `config.scope`. (4) Deduplicate by name: when multiple skills share the same `name`, keep the one with highest source priority (`graph-extracted` > `builtin` > `project`). (5) Sort remaining skills: skills from assigned bundles first (per role-to-bundle mapping), then by source priority, then alphabetically by name. (6) Trim to token budget: estimate token count for each skill's content and greedily include skills in sorted order until `config.tokenBudget` would be exceeded. (7) Return a `ResolvedSkillSet` with the final skill list, total token count, `trimmed: true` if any skills were dropped, and per-source counts. The resolution MUST be deterministic: given the same inputs and graph state, the output MUST be identical.

### Verification

- Unit test: All 3 sources are queried during resolution
- Unit test: Role filtering excludes skills not matching the target role
- Unit test: Scope filtering excludes skills not matching the session path
- Unit test: Deduplication keeps graph-extracted over builtin over project for same-name skills
- Unit test: Token budget trimming drops lowest-priority skills first
- Unit test: Resolution is deterministic (same input produces same output)
- Unit test: `trimmed` flag is `true` when skills are dropped, `false` otherwise
- Unit test: `sources` record has correct per-source counts

---

## BEH-SF-562: Role-to-Bundle Assignment

> **Invariant:** None

Each built-in agent role has a static mapping to skill bundles that determines which builtin skills it receives by default.

### Contract

REQUIREMENT (BEH-SF-562): The system MUST maintain a static role-to-bundle assignment for all 8 built-in roles: `spec-author` receives `[spec-authoring, architecture, visual, compliance]`, `reviewer` receives `[spec-authoring, compliance]`, `codebase-analyzer` receives `[coding-standards, architecture]`, `task-decomposer` receives `[spec-authoring, architecture]`, `dev-agent` receives `[coding-standards]`, `coverage-agent` receives `[spec-authoring, compliance]`, `discovery-agent` receives `[spec-authoring]`, `feedback-synthesizer` receives `[spec-authoring]`. `SkillRegistryPort.getBundleAssignment(role)` MUST return the assignment for any role. Custom roles with no explicit assignment MUST receive an empty bundle list (they still receive graph-extracted and project skills through resolution). Dynamic roles MAY declare bundle assignments via `RoleTemplate.skillBundles`.

### Verification

- Unit test: Each of the 8 built-in roles returns correct bundle assignments
- Unit test: Custom role with no assignment returns empty bundle list
- Unit test: Dynamic role with `skillBundles` in template returns declared bundles
- Unit test: Assignment lookup is O(1) (static map, not computed)

---

## BEH-SF-563: Skill Graph Sync

> **Invariant:** [INV-SF-7](../invariants/INV-SF-7-graph-data-persistence.md) — Graph Data Persistence

Skills are represented as nodes in the knowledge graph, enabling queries, linking, and analysis alongside other project artifacts.

### Contract

REQUIREMENT (BEH-SF-563): When the `codebase-analyzer` agent produces skills, the system MUST persist each skill as a `Skill` node in Neo4j with properties: `name`, `source: "graph-extracted"`, `bundle` (if applicable), `content`, `contentHash`, `scope`, and `roles`. Each `Skill` node MUST have an `EXTRACTED_FROM` relationship to the source `SpecFile` or source file node it was derived from. If a `Skill` node with the same `name` and `scope` already exists, the system MUST compare `contentHash`: if different, update the node's `content` and `contentHash`; if identical, skip the update. Builtin skills MUST be seeded as `Skill` nodes at system startup with `source: "builtin"` and `PART_OF` relationships to their `SkillBundle` nodes. `SkillBundle` nodes MUST be created for each of the 5 builtin bundles. The `ASSIGNED_TO` relationship MUST link `Skill` nodes to `Agent` nodes when skills are resolved for a session.

### Verification

- Integration test: Codebase-analyzer output creates `Skill` nodes with correct properties
- Integration test: `EXTRACTED_FROM` edges link skills to source files
- Integration test: Duplicate skill names with same contentHash are not updated (idempotent)
- Integration test: Changed contentHash triggers node update
- Integration test: Builtin skills are seeded at startup as graph nodes
- Integration test: `SkillBundle` nodes exist for all 5 builtin bundles
- Integration test: `PART_OF` relationships link builtin skills to their bundles

---

## BEH-SF-564: Skill Lifecycle & Evolution

> **Invariant:** None

Skills evolve over time as the codebase changes, users edit project skills, and SpecForge releases update builtin bundles.

### Contract

REQUIREMENT (BEH-SF-564): Graph-extracted skills MUST be updated when the `codebase-analyzer` re-analyzes the project. The `contentHash` property MUST be used for change detection: only skills with changed content are updated in the graph. Stale graph-extracted skills (those whose source file no longer exists or whose `EXTRACTED_FROM` target is deleted) MUST be marked with a `stale: true` property but NOT automatically deleted (deletion requires explicit user action or a cleanup flow). Project skills MUST be re-read from the filesystem on every agent spawn (no caching across sessions). Builtin skills MUST be versioned with SpecForge releases; on version upgrade, the system MUST re-seed builtin `Skill` nodes and `SkillBundle` nodes with updated content and contentHash values.

### Verification

- Integration test: Re-analysis updates skills with changed contentHash
- Integration test: Skills with unchanged contentHash are not modified
- Integration test: Skills from deleted source files are marked `stale: true`
- Unit test: Project skills are re-read on every spawn (no cross-session cache)
- Integration test: Version upgrade re-seeds builtin skills with new content

---

## BEH-SF-565: Composition Engine Skill Injection

> **Invariant:** None

Resolved skills are injected into the agent system prompt via the Composition Engine, occupying a dedicated section between the role prompt and session chunks.

### Contract

REQUIREMENT (BEH-SF-565): The Composition Engine MUST assemble the agent system prompt in the following order: (1) role system prompt, (2) resolved skills section, (3) composed session chunks, (4) tool definitions. The resolved skills section MUST be wrapped in a `## Skills` heading and list each skill's `name` as a subheading followed by its `content`. The skill token budget MUST be carved from the total session token budget before chunk ranking: the Budget Manager MUST allocate `skillBudgetFraction` (configurable, default `0.20`) of the total budget to skills and the remainder to chunks. If `ResolvedSkillSet.totalTokens` is less than the allocated skill budget, the unused skill tokens MUST be returned to the chunk budget (no wasted allocation). If `ResolvedSkillSet.totalTokens` exceeds the allocated skill budget, the resolution algorithm (BEH-SF-561) MUST have already trimmed skills to fit, so this condition MUST NOT occur. The `ComposedContext` returned by the Composition Engine MUST include skill metadata: `skillCount`, `skillTokens`, `skillSources`.

### Verification

- Unit test: System prompt assembles in correct order (role, skills, chunks, tools)
- Unit test: Skills section uses `## Skills` heading with name subheadings
- Unit test: Skill budget is 20% of total budget by default
- Unit test: Unused skill budget is returned to chunk budget
- Unit test: `ComposedContext` includes `skillCount`, `skillTokens`, `skillSources` fields
- Integration test: End-to-end: agent session receives resolved skills in system prompt
