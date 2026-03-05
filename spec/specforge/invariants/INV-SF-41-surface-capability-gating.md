---
id: INV-SF-41
kind: invariant
title: Surface Capability Gating
status: active
enforced_by: [MessageTranslator, ContentGatingFilter, SurfaceCapabilities exchange]
behaviors: [BEH-SF-518, BEH-SF-519]
---

## INV-SF-41: Surface Capability Gating

FlowUpdate content blocks MUST be validated against the session's `SurfaceCapabilities` before delivery to the subscriber. Unsupported content types are downgraded to a compatible representation (e.g., `CodeDiff` to plain text) or dropped entirely. Every gating decision is recorded as a `ContentGatingResult` for observability. The gating pipeline runs after FlowUpdate emission and before subscriber delivery.
