---
id: INV-SF-3
kind: invariant
title: Convergence Bound
status: active
enforced_by: [ConvergenceCriteria.maxIterations, phase execution loop]
behaviors: [BEH-SF-057, BEH-SF-058]
---

## INV-SF-3: Convergence Bound

Every phase has a finite maximum iteration bound. A phase always terminates — either by converging or by reaching its `maxIterations` limit. No phase runs indefinitely.
