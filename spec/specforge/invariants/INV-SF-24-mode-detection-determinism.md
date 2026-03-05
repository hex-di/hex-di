---
id: INV-SF-24
kind: invariant
title: Mode Detection Determinism
status: active
enforced_by: [BEH-SF-098, BEH-SF-DEPLOY-06]
behaviors: []
---

## INV-SF-24: Mode Detection Determinism

For any given configuration state (environment variables + config file), the system MUST deterministically resolve to exactly one deployment mode. The precedence chain (env var > config file > default) MUST be applied without ambiguity.
