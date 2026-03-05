---
id: INV-SF-19
kind: invariant
title: Degraded Mode
status: active
enforced_by: [ACPServer` error handling, port health check pipeline, run-level isolation]
behaviors: [BEH-SF-209, BEH-SF-216]
---

## INV-SF-19: Degraded Mode

When any non-critical port adapter fails health check, the system enters degraded mode. In degraded mode: (a) the affected port's operations return a descriptive error, (b) other ports continue normal operation, (c) the health check endpoint reports `degraded` status, (d) an OrchestratorEvent with `_tag: 'system-degraded'` is emitted.

> **Lock File (M26):** Lock file acquisition uses atomic file locking (`flock` on Unix, `LockFileEx` on Windows) with dead PID detection. Before acquiring, the process checks if the PID in an existing lock file is still running.
