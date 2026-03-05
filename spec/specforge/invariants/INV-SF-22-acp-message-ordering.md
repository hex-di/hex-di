---
id: INV-SF-22
kind: invariant
title: ACP Message Ordering
status: active
enforced_by: [BEH-SF-235, BEH-SF-238]
behaviors: []
---

## INV-SF-22: ACP Message Ordering

Within a single ACP session, messages MUST be totally ordered by sequence number. No two messages within the same session may share the same sequence number.
