---
id: FEAT-SF-022
kind: feature
title: "Natural Language Queries"
status: active
behaviors: [BEH-SF-008]
adrs: [ADR-005]
roadmap_phases: [RM-03]
---

# Natural Language Queries

## Problem

The knowledge graph stores rich relationships between requirements, decisions, tests, and agent sessions — but querying it requires Cypher expertise. Most users cannot write graph queries, making the graph's value inaccessible to non-technical stakeholders.

## Solution

The NLQ (Natural Language Query) engine translates plain-language questions into Cypher queries against the knowledge graph. Users ask questions like `specforge ask "what changed since last week?"` or `"which requirements have no tests?"` and receive structured results. The NLQPort handles translation, validation, and result formatting. The engine supports follow-up questions with conversational context and suggests related queries.

## Constituent Behaviors

| ID         | Summary                                      |
| ---------- | -------------------------------------------- |
| BEH-SF-008 | Natural language query translation to Cypher |

## Acceptance Criteria

- [ ] Plain-language questions translate to valid Cypher queries
- [ ] Results are formatted as human-readable tables and summaries
- [ ] Invalid or ambiguous questions produce helpful error messages
- [ ] CLI (`specforge ask`), dashboard, and VS Code extension all support NLQ
- [ ] Follow-up questions maintain conversational context
