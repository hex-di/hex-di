---
id: INV-SF-12
kind: invariant
title: Hook Pipeline Ordering
status: active
enforced_by: [HookRegistry, PreToolUsePipeline, PostToolUsePipeline]
behaviors: [BEH-SF-161, BEH-SF-162, BEH-SF-163, BEH-SF-164]
---

## INV-SF-12: Hook Pipeline Ordering

Hooks execute in registration order. PreToolUse hooks complete before the tool runs. PostToolUse hooks execute asynchronously via FIFO queue. No hook reordering occurs at runtime — the execution sequence is deterministic and matches the registration sequence.
