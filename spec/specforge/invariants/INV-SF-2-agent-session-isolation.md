---
id: INV-SF-2
kind: invariant
title: Agent Session Isolation
status: active
enforced_by: [SessionManager, ACP run isolation]
behaviors: [BEH-SF-025, BEH-SF-032, BEH-SF-041, BEH-SF-048]
---

## INV-SF-2: Agent Session Isolation

Agent sessions within a flow run are isolated from each other. An agent cannot directly read or modify another agent's conversation context. All inter-agent communication flows through ACP messages within the shared flow session.
