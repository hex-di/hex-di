---
id: INV-SF-9
kind: invariant
title: Flow Determinism
status: active
enforced_by: [Scheduler, FlowEngine` (no randomization in scheduling)]
behaviors: [BEH-SF-049, BEH-SF-055, BEH-SF-057, BEH-SF-062, BEH-SF-087]
---

## INV-SF-9: Flow Determinism

Given the same flow definition, the same initial state, and deterministic agent outputs, the flow engine produces the same sequence of phase executions and agent invocations. The orchestration logic itself introduces no non-determinism. (Agent LLM outputs are inherently non-deterministic; this invariant covers the orchestration layer only.)
