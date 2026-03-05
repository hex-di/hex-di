---
id: INV-SF-32
kind: invariant
title: GxP Hash Chain Continuity
status: active
enforced_by: [GxP plugin behaviors (BEH-SF-370+)]
behaviors: []
---

## INV-SF-32: GxP Hash Chain Continuity

When GxP mode is active, the audit trail hash chain MUST be contiguous across flow runs. No gap or break in the hash chain is permitted. Each entry's hash MUST include the previous entry's hash.
