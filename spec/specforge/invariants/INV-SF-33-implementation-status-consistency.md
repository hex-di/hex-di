---
id: INV-SF-33
kind: invariant
title: Implementation Status Consistency
status: active
enforced_by:
  [
    ImplementationTrackingPort.setStatus(),
    SourceTracePort.linkTestFile(),
    SourceTracePort.linkSourceFile(),
  ]
behaviors: [BEH-SF-464, BEH-SF-465, BEH-SF-467]
---

## INV-SF-33: Implementation Status Consistency

Every behavior's implementation status follows a forward-only state machine: `not_started` -> `in_progress` -> `implemented` -> `verified`. Backward transitions are rejected unless the `force` flag is set. A behavior marked `verified` MUST have at least one `TESTED_BY` edge linking it to a test file. A behavior marked `implemented` MUST have at least one `IMPLEMENTED_BY` edge linking it to a source file. Status transitions are atomic — a failed transition leaves the previous status unchanged. All status changes record `changedBy`, `changedAt`, and `reason` in the graph audit trail.
