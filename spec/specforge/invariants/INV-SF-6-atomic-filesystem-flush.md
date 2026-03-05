---
id: INV-SF-6
kind: invariant
title: Atomic Filesystem Flush
status: active
enforced_by: [Write-to-temp-then-rename pattern in `FileAccessPort]
behaviors: [BEH-SF-009, BEH-SF-016]
---

## INV-SF-6: Atomic Filesystem Flush

When the rendering pipeline writes output files, each file write is atomic: either the entire file is written successfully, or the file is not modified. Partial writes do not corrupt spec documents.
