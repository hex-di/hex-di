---
id: INV-SF-1
kind: invariant
title: ACP Session History Append-Only
status: active
enforced_by: [SessionStateManager.appendHistory(), MessageExchangeService]
behaviors: [BEH-SF-229, BEH-SF-235, BEH-SF-238]
---

## INV-SF-1: ACP Session History Append-Only

The ACP session history is append-only. Messages are never modified or deleted during a flow run. This ensures complete auditability of all agent actions and state transitions.
