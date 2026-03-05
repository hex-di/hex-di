---
id: INV-SF-14
kind: invariant
title: Memory Artifact Traceability
status: active
enforced_by: [Memory generation pipeline, RenderedArtifact` node constraints]
behaviors: [BEH-SF-177, BEH-SF-178, BEH-SF-182]
---

## INV-SF-14: Memory Artifact Traceability

Every `RenderedArtifact` (generated CLAUDE.md, `.claude/rules/*` files) carries `DERIVED_FROM` edges to the source graph nodes that produced it. Memory artifacts are always traceable to their origin — no generated content exists without provenance.
