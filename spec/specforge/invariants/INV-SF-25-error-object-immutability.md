---
id: INV-SF-25
kind: invariant
title: Error Object Immutability
status: active
enforced_by: [All behavior files (system-wide constraint)]
behaviors: []
---

## INV-SF-25: Error Object Immutability

All error objects returned from factories and services MUST be `Object.freeze()`d. Each error type MUST have a unique `_tag` field enabling exhaustive pattern matching.
