---
id: INV-SF-28
kind: invariant
title: Clarification Timeout Bound
status: active
enforced_by: [BEH-SF-319, BEH-SF-395, BEH-SF-396]
behaviors: []
---

## INV-SF-28: Clarification Timeout Bound

All `awaiting` states (clarification requests between agents or HITL pauses) MUST resolve within a configurable timeout (default: 300 seconds). After timeout, the system MUST resume with default behavior.
