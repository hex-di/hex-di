---
id: INV-SF-15
kind: invariant
title: Budget Zone Monotonicity
status: active
enforced_by: [CostTracker, budget zone state machine]
behaviors: [BEH-SF-169, BEH-SF-170]
---

## INV-SF-15: Budget Zone Monotonicity

Budget zones transition Green → Yellow → Orange → Red. No reverse transitions occur within a phase. Once a zone transitions to a higher severity, it remains at that severity or escalates further. This prevents oscillation in cost-optimization behavior.
