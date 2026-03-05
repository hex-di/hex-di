---
id: INV-SF-16
kind: invariant
title: Permission Escalation Requires Explicit Grant
status: active
enforced_by: [Trust tier state machine, PermissionDecision` recording]
behaviors: [BEH-SF-201, BEH-SF-202, BEH-SF-206]
---

## INV-SF-16: Permission Escalation Requires Explicit Grant

No agent can acquire elevated or autonomous permissions without a recorded `PermissionDecision` node in the knowledge graph. Permission escalation is never implicit — every trust tier promotion is an auditable, queryable graph event.
