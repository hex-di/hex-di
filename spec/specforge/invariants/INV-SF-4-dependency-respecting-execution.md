---
id: INV-SF-4
kind: invariant
title: Dependency-Respecting Execution
status: active
enforced_by: [Scheduler, FlowEngine]
behaviors: [BEH-SF-057, BEH-SF-062]
---

## INV-SF-4: Dependency-Respecting Execution

Phases execute in the order defined by the flow. Stages within a phase respect their ordering. No stage begins before its predecessor completes (unless explicitly marked `concurrent`). No phase begins before the previous phase completes or is paused.
