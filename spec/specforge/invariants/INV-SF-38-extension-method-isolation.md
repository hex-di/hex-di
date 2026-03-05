---
id: INV-SF-38
kind: invariant
title: Extension Method Isolation
status: active
enforced_by: [MessageTranslator, ExtensionMethodDispatcher]
behaviors: [BEH-SF-496, BEH-SF-497, BEH-SF-498]
---

## INV-SF-38: Extension Method Isolation

Extension methods registered with `_` prefix MUST be dispatched in isolation from core protocol methods. An extension method MUST NOT shadow, override, or intercept any core ACP protocol method. The `ExtensionMethodDispatcher` validates that no registered extension name collides with the set of reserved protocol method names. Extension results flow exclusively through the `ExtFlowUpdate` variant.
