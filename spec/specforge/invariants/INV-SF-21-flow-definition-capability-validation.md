---
id: INV-SF-21
kind: invariant
title: Flow Definition Capability Validation
status: active
enforced_by: [TemplateService.validateCapabilities(), FlowEngine startup validation]
behaviors: [BEH-SF-057]
---

## INV-SF-21: Flow Definition Capability Validation

Every flow definition is validated for capability compatibility before the first phase starts. All agent role tool requirements must be satisfiable by the `ToolRegistryPort`. Missing tools or capabilities produce `FlowCapabilityError` — no flow starts with unresolvable tool bindings.
