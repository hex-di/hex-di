---
id: INV-SF-29
kind: invariant
title: Server Startup Atomicity
status: active
enforced_by: [BEH-SF-DEPLOY-01, BEH-SF-DEPLOY-02]
behaviors: []
---

## INV-SF-29: Server Startup Atomicity

Server startup is all-or-nothing. If startup fails at step N, steps 1..N-1 MUST be rolled back in reverse order. A partially started server MUST NOT accept client connections.
