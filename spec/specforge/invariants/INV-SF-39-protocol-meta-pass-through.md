---
id: INV-SF-39
kind: invariant
title: Protocol Meta Pass-Through
status: active
enforced_by: [ACPServer, ACPClient, MessageTranslator]
behaviors: [BEH-SF-499, BEH-SF-500]
---

## INV-SF-39: Protocol Meta Pass-Through

`_meta` fields on `ACPMessage` and `FlowUpdate` instances MUST be preserved end-to-end by all protocol components. Intermediaries (ACPServer, ACPClient, MessageTranslator) MUST NOT strip, modify, or rewrite `_meta` fields. The `_meta.traceId` field, when present, carries W3C Trace Context and MUST be propagated to enable distributed tracing across the ACP boundary. Violation is detectable by comparing `_meta` at ingress and egress.
