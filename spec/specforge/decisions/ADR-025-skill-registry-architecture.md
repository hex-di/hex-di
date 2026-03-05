---
id: ADR-025
kind: decision
title: Skill Registry Architecture
status: Accepted
date: 2026-02-28
supersedes: []
invariants: []
---

# ADR-025: Skill Registry Architecture

**Extends:** [ADR-009](./ADR-009-compositional-sessions.md), [ADR-018](./ADR-018-acp-agent-protocol.md)

## Context

SpecForge agents receive skills — markdown instructions that guide their behavior for specific tasks (naming conventions, file layout patterns, error handling strategies, etc.). The current approach uses a `SkillInjector` component that only reads `.claude/skills/` files from the project filesystem and matches them by working directory scope:

1. **Single source** — Skills come only from the project's `.claude/skills/` directory. Skills discovered during codebase analysis (e.g., project-specific patterns, architectural conventions) and skills built into SpecForge's spec-authoring workflows have no mechanism to enter agent system prompts.
2. **No role awareness** — `SkillInjector` injects all matching skills regardless of agent role. A `dev-agent` receives the same skills as a `spec-author`, even though their tasks are fundamentally different.
3. **No deduplication** — If the same skill exists as both a project file and a codebase-analyzer output, agents receive duplicates, wasting token budget.
4. **No graph integration** — Skills are not represented in the knowledge graph. They cannot be queried, linked to agents or spec files, or analyzed alongside other project artifacts.
5. **No bundling** — Related skills (e.g., all spec-authoring skills) have no grouping mechanism. There is no way to assign a coherent skill set to a role.

## Decision

### 1. Three-Source Skill Registry

Replace `SkillInjector` with a `SkillRegistry` component that loads skills from three sources:

| Source              | Description                                                                                                                                               | Lifecycle                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **builtin**         | Skills bundled with SpecForge. 5 bundles shipping with the initial release: `spec-authoring`, `architecture`, `visual`, `compliance`, `coding-standards`. | Updated with SpecForge releases.                           |
| **graph-extracted** | Skills produced by the `codebase-analyzer` agent during analysis flows. Persisted as `Skill` nodes in Neo4j.                                              | Updated on re-analysis. Reflect project-specific patterns. |
| **project**         | Skills from `.claude/skills/*.md` files in the project directory. Parsed from frontmatter + content.                                                      | Picked up on next agent spawn. User-managed.               |

Each skill has a `source` field indicating its origin. The registry merges all three sources into a unified skill catalog before resolution.

### 2. Skill Resolution Algorithm

When an agent session is created, the `SkillRegistry` resolves skills for that session via `resolveSkills(role, scope, tokenBudget)`:

1. **Load** — Fetch skills from all 3 sources (builtin bundles, graph query, filesystem scan).
2. **Filter by role** — Keep only skills whose `roles` array includes the target role (or is empty, meaning "all roles").
3. **Filter by scope** — Keep only skills whose `scope` pattern matches the session's working directory or project path.
4. **Deduplicate by name** — When multiple skills share the same name, keep the one with highest source priority: `graph-extracted` > `builtin` > `project`. Graph-extracted skills win because they reflect the actual codebase; builtin skills are authoritative defaults; project skills are user overrides that yield to more specific sources.
5. **Trim to token budget** — If the combined token count exceeds the skill token budget (a fraction of the total session budget), drop lowest-priority skills until the budget fits. Skills within a role's assigned bundles are kept preferentially.
6. **Return** — A `ResolvedSkillSet` containing the final skill list, total token count, trim flag, and source breakdown.

### 3. Role-to-Bundle Assignment

Each built-in role has a fixed assignment of skill bundles:

| Role                 | Assigned Bundles                                 |
| -------------------- | ------------------------------------------------ |
| spec-author          | spec-authoring, architecture, visual, compliance |
| reviewer             | spec-authoring, compliance                       |
| codebase-analyzer    | coding-standards, architecture                   |
| task-decomposer      | spec-authoring, architecture                     |
| dev-agent            | coding-standards                                 |
| coverage-agent       | spec-authoring, compliance                       |
| discovery-agent      | spec-authoring                                   |
| feedback-synthesizer | spec-authoring                                   |

Custom and dynamic roles can declare bundle assignments via `RoleTemplate.skillBundles`. Roles with no explicit assignment receive only graph-extracted and project skills.

### 4. Skills as Graph Nodes

Skills are represented in the knowledge graph as first-class nodes:

- `Skill` node: `name`, `source`, `bundle`, `content`, `contentHash`, `scope`, `roles`
- `SkillBundle` node: `name`, `description`
- `PART_OF` relationship: `Skill → SkillBundle`
- `EXTRACTED_FROM` relationship: `Skill → SpecFile` (for graph-extracted skills)
- `ASSIGNED_TO` relationship: `Skill → Agent` (for role-specific assignments)

Builtin skills are seeded as graph nodes at startup. Graph-extracted skills are created by `codebase-analyzer` and linked via `EXTRACTED_FROM` edges to their source files. The `contentHash` property enables change detection: re-analysis only updates skills whose content has changed.

### 5. Composition Engine Integration

The `SkillRegistry` feeds resolved skills into the Composition Engine pipeline. Skills occupy a dedicated section in the assembled system prompt:

```
[role system prompt]
[resolved skills section]
[composed session chunks]
[tool definitions]
```

The skill token budget is carved from the total session token budget. The Budget Manager allocates a configurable fraction (default: 20%) to skills before chunk ranking. This ensures skills always have reserved space while chunks compete for the remainder.

## Concept Mapping

| Pattern                       | SpecForge Adoption                                            |
| ----------------------------- | ------------------------------------------------------------- |
| Ansible Galaxy roles          | Builtin skill bundles as reusable, versioned instruction sets |
| npm package resolution        | 3-source loading with priority-based deduplication            |
| Kubernetes ConfigMap layering | Graph > builtin > project priority ordering                   |
| Claude Code `.claude/skills/` | Project skills as the lowest-priority user override layer     |
| Neo4j node extraction         | Codebase-analyzer produces Skill nodes linked to source files |

## Trade-Offs

**Benefits:**

- Three sources ensure skills from all origins (built-in expertise, project analysis, user customization) reach agents
- Role-to-bundle mapping gives each agent type the right skill set without manual configuration
- Graph representation makes skills queryable and linkable to other project artifacts
- Deduplication with priority ordering prevents token waste while preserving the most relevant skill version
- Token budget carve-out guarantees skills always have space in the system prompt

**Costs:**

- Graph queries for skill nodes add latency to session bootstrapping (mitigated: skills are cached per project scope)
- 5 builtin bundles must be maintained and versioned alongside SpecForge releases
- Priority ordering (graph > builtin > project) may surprise users who expect their project skills to always win (documented in skill authoring guide)
- Token budget split between skills and chunks reduces the chunk budget by the skill allocation

## Consequences

- [architecture/c3-skill-registry.md](../architecture/c3-skill-registry.md) — C3 component diagram for SkillRegistry subsystem
- [architecture/c3-agent-system.md](../architecture/c3-agent-system.md) — `SkillInjector` replaced by `SkillRegistry`
- [architecture/c3-knowledge-graph.md](../architecture/c3-knowledge-graph.md) — `Skill`, `SkillBundle` node types added
- [architecture/dynamic-session-composition.md](../architecture/dynamic-session-composition.md) — Skill resolution stage added to pipeline
- [types/skill.md](../types/skill.md) — `Skill`, `SkillBundle`, `SkillSource`, `ResolvedSkillSet`, `SkillResolutionConfig`
- [types/agent.md](../types/agent.md) — `SkillDefinition` and `SkillSummary` replaced by canonical types from `types/skill.md`
- [behaviors/BEH-SF-558-skill-registry.md](../behaviors/BEH-SF-558-skill-registry.md) — BEH-SF-558 through BEH-SF-565

## References

- [ADR-009](./ADR-009-compositional-sessions.md) — Compositional Sessions (extended with skill composition)
- [ADR-018](./ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol (skills injected via ACP run creation)
- [ADR-005](./ADR-005-graph-first-architecture.md) — Graph-First Architecture (skills as graph nodes)
- [types/skill.md](../types/skill.md) — Full type definitions
- [architecture/c3-skill-registry.md](../architecture/c3-skill-registry.md) — Component diagram
