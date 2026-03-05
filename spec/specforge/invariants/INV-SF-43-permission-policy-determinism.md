---
id: INV-SF-43
kind: invariant
title: Permission Policy Determinism
status: active
enforced_by: [PermissionPolicyService.evaluate()]
behaviors: [BEH-SF-529, BEH-SF-530, BEH-SF-534]
---

## INV-SF-43: Permission Policy Determinism

Given the same policy set, subject, action, and resource, `PermissionPolicyService.evaluate()` MUST return the same `PermissionDecision` every time. Policy priority resolution is deterministic: higher-priority rules override lower-priority rules; within the same priority, deny overrides allow. Absent policies result in denial (deny-by-default). The evaluation order is fixed and produces no side effects.
