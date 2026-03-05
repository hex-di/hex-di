---
id: FEAT-SF-012
kind: feature
title: "Import / Export"
status: active
behaviors: [BEH-SF-127, BEH-SF-128, BEH-SF-129, BEH-SF-130, BEH-SF-131, BEH-SF-132]
adrs: [ADR-005, ADR-012]
roadmap_phases: [RM-08]
---

# Import / Export

## Problem

Existing specifications live in markdown files, OpenAPI schemas, and other formats. Users need to bring existing artifacts into the knowledge graph and export graph content back to portable formats.

## Solution

Import adapters parse markdown documents, OpenAPI specifications, and other structured formats into graph nodes. Export adapters render graph content back to markdown, JSON, or custom formats. The transformation pipeline validates, normalizes, and maps imported content to the graph schema, preserving metadata and cross-references where possible.

## Constituent Behaviors

| ID         | Summary                             |
| ---------- | ----------------------------------- |
| BEH-SF-127 | Markdown import adapter             |
| BEH-SF-128 | OpenAPI import adapter              |
| BEH-SF-129 | Import validation and normalization |
| BEH-SF-130 | Export to markdown                  |
| BEH-SF-131 | Export to JSON                      |
| BEH-SF-132 | Custom export adapter registration  |

## Acceptance Criteria

- [ ] Markdown files import as graph nodes with relationships preserved
- [ ] OpenAPI specs import with endpoints, schemas, and references mapped
- [ ] Import validation rejects malformed input with clear errors
- [ ] Export produces well-formed markdown/JSON from graph content
- [ ] Custom export adapters can be registered and invoked
