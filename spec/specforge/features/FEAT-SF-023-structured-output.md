---
id: FEAT-SF-023
kind: feature
title: "Structured Output"
status: active
behaviors:
  [BEH-SF-424, BEH-SF-425, BEH-SF-426, BEH-SF-427, BEH-SF-428, BEH-SF-429, BEH-SF-430, BEH-SF-431]
adrs: [ADR-012]
roadmap_phases: [RM-11]
---

# Structured Output

## Problem

Agents producing free-text output require brittle parsing layers to extract graph nodes, findings, and metadata. Schema violations go undetected, roles can produce node types outside their domain (reviewer creating Task nodes), and convergence evaluation relies on external observation rather than agent self-assessment.

## Solution

Every agent role produces typed JSON output via Claude Code's `--json-schema` flag. Each role has a constrained schema: `graphNodes[]`, `graphEdges[]`, `findings[]`, `errors[]`, and `selfAssessment` (confidence score, suggested next action, reasoning, blockers). Output is validated against the role's schema immediately — valid output writes directly to Neo4j via GraphSyncPort; invalid output triggers a retry with `SchemaValidationError`. Streaming integration via `--output-format stream-json` provides real-time events (`tool-call`, `tool-result`, `partial-text`, `token-update`, `error`, `system`) feeding the dashboard's live monitoring.

## Constituent Behaviors

| ID         | Summary                                      |
| ---------- | -------------------------------------------- |
| BEH-SF-424 | Per-role JSON schema definition              |
| BEH-SF-425 | Schema validation pipeline                   |
| BEH-SF-426 | Agent self-assessment in every output        |
| BEH-SF-427 | Graph-direct writing from structured output  |
| BEH-SF-428 | Schema validation error handling and retry   |
| BEH-SF-429 | Streaming event output for live monitoring   |
| BEH-SF-430 | Schema versioning and backward compatibility |
| BEH-SF-431 | Graceful degradation to text mode            |

## Acceptance Criteria

- [ ] Each agent role has a distinct JSON schema constraining its output types
- [ ] Schema validation catches malformed output before graph writes
- [ ] Role contamination is prevented — reviewer cannot produce Task nodes
- [ ] Self-assessment confidence scores feed convergence evaluation
- [ ] Streaming events arrive in real-time at dashboard and VS Code extension
- [ ] Schema validation failures trigger automatic retry with error context
- [ ] Graceful degradation to text mode when structured output fails repeatedly
