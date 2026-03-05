---
id: INV-SF-30
kind: invariant
title: Session History Bounded Growth
status: active
enforced_by: [BEH-SF-235 (append-only with compaction)]
behaviors: []
---

## INV-SF-30: Session History Bounded Growth

Session history MUST NOT grow unboundedly. When history length exceeds a configurable threshold, older entries MUST be compacted or archived while preserving the most recent entries and any entries referenced by active flows.
