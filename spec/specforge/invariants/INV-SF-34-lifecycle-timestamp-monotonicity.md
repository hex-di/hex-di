---
id: INV-SF-34
kind: invariant
title: Lifecycle Timestamp Monotonicity
status: active
enforced_by: [Graph node mutation hooks, ImplementationTrackingPort.setStatus()]
behaviors: [BEH-SF-467]
---

## INV-SF-34: Lifecycle Timestamp Monotonicity

Every concept node in the graph carries `createdAt` and `updatedAt` ISO-8601 timestamps. `createdAt` is set exactly once at node creation and MUST never change. `updatedAt` is set on every mutation and MUST be monotonically non-decreasing — any mutation that would set `updatedAt` to a value earlier than the current `updatedAt` is rejected. This guarantees a reliable temporal ordering of concept changes for staleness detection, audit trails, and burndown chart data.
