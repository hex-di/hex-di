---
id: INV-SF-27
kind: invariant
title: ACP Message Delivery Guarantee
status: active
enforced_by: [BEH-SF-235, BEH-SF-238, BEH-SF-309]
behaviors: []
---

## INV-SF-27: ACP Message Delivery Guarantee

ACP messages MUST have at-least-once delivery semantics. Consumers MUST be idempotent — processing the same message twice MUST produce the same effect as processing it once.
