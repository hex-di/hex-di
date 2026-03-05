---
id: INV-SF-42
kind: invariant
title: Session Checkpoint Integrity
status: active
enforced_by: [SessionStateManager, checkpoint verification]
behaviors: [BEH-SF-524, BEH-SF-525, BEH-SF-526, BEH-SF-527]
---

## INV-SF-42: Session Checkpoint Integrity

Session checkpoints store a SHA-256 `stateHash` computed from the serialized state at the time of creation. On resume or fork, the checkpoint `stateHash` MUST be re-computed from the stored state and compared to the recorded hash. A mismatch raises `SessionResumeError` and the operation is aborted. Checkpoints are created automatically at phase boundaries and cannot be modified after creation.
