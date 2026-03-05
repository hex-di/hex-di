---
id: INV-SF-18
kind: invariant
title: ACP Run State Consistency
status: active
enforced_by: [RunLifecycleTracker, state transition validation]
behaviors: [BEH-SF-209, BEH-SF-212]
---

## INV-SF-18: ACP Run State Consistency

ACP run state transitions follow a strict 7-state machine. Only valid transitions are allowed (e.g., `created` → `in_progress`, `in_progress` → `completed`/`failed`/`awaiting`/`cancelling`). Terminal states (`completed`, `failed`, `cancelled`) are final — no further transitions are permitted.
