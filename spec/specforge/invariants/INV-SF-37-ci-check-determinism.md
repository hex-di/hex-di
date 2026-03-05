---
id: INV-SF-37
kind: invariant
title: CI Check Determinism
status: active
enforced_by: [CIValidationPort.check()]
behaviors: [BEH-SF-480, BEH-SF-483]
---

## INV-SF-37: CI Check Determinism

`specforge check` produces deterministic results: given the same spec files and graph state, the command MUST return the same exit code (0 for pass, 1 for failure) and the same set of violations. CI gates (coverage threshold, completeness requirements, structural integrity) are evaluated in a fixed order and short-circuit on first fatal violation. The check report includes a `checksum` field computed from the input state, enabling CI caches to skip re-evaluation when the spec has not changed.
