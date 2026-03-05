---
id: INV-SF-23
kind: invariant
title: Session Resource Cleanup Deadline
status: active
enforced_by: [BEH-SF-032, BEH-SF-216]
behaviors: []
---

## INV-SF-23: Session Resource Cleanup Deadline

When a session fails or is cancelled, all resources (connections, file handles, temporary files, backend processes) MUST be released within 5 seconds.
