---
id: INV-SF-5
kind: invariant
title: Tool Isolation
status: active
enforced_by: [ToolRegistryPort.getToolsForRole(), AgentBackendService.execute()]
behaviors: [BEH-SF-081, BEH-SF-083, BEH-SF-085, BEH-SF-087, BEH-SF-090]
---

## INV-SF-5: Tool Isolation

Each agent role has access only to its declared set of tools. The tool set is resolved at run creation time from `ToolRegistryPort` and enforced by the agent backend configuration. An agent cannot escalate its tool access at runtime.
