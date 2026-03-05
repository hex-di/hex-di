---
id: FM-SF-049
kind: risk-assessment
title: Capabilities, Resilience & Permission Failure Modes
status: active
fm_range: 049--054
invariants: [INV-SF-41, INV-SF-42, INV-SF-43]
---

# Capabilities, Resilience & Permission Failure Modes

Surface capability gating, MCP proxy resilience, session checkpoint integrity, and permission policy determinism failures.

| FM ID     | Failure Mode                                                  | S   | O   | D   | RPN | Risk Level | Mitigation                                                                                                                                                                                                                     | Behaviors                                                                                                                    |
| --------- | ------------------------------------------------------------- | --- | --- | --- | --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| FM-SF-049 | Surface capability mismatch (content on incapable surface)    | 4   | 5   | 4   | 80  | Moderate   | `ContentGatingFilter` validates all FlowUpdate blocks against session's `SurfaceCapabilities`; unsupported blocks downgraded or dropped with logged reason ([INV-SF-41](../invariants/INV-SF-41-surface-capability-gating.md)) | [BEH-SF-518](../behaviors/BEH-SF-512-dynamic-capabilities.md), [BEH-SF-519](../behaviors/BEH-SF-512-dynamic-capabilities.md) |
| FM-SF-050 | MCP proxy backend failure (proxy starts, backend unreachable) | 6   | 4   | 3   | 72  | Moderate   | `McpProxyService` performs health check before agent spawn; unreachable backends reported via `McpProxyError`                                                                                                                  | [BEH-SF-520](../behaviors/BEH-SF-520-session-resilience.md), [BEH-SF-522](../behaviors/BEH-SF-520-session-resilience.md)     |
| FM-SF-051 | Session checkpoint corruption (hash fail on resume)           | 8   | 3   | 3   | 72  | Moderate   | SHA-256 `stateHash` verification on resume; mismatch raises `SessionResumeError`; automatic fallback to earliest valid checkpoint ([INV-SF-42](../invariants/INV-SF-42-session-checkpoint-integrity.md))                       | [BEH-SF-524](../behaviors/BEH-SF-520-session-resilience.md), [BEH-SF-527](../behaviors/BEH-SF-520-session-resilience.md)     |
| FM-SF-052 | Permission policy conflict (contradictory rules)              | 7   | 3   | 4   | 84  | Moderate   | Deterministic priority resolution: higher priority wins, deny overrides allow at same priority; conflicts logged with full audit trail ([INV-SF-43](../invariants/INV-SF-43-permission-policy-determinism.md))                 | [BEH-SF-529](../behaviors/BEH-SF-528-permission-policy.md), [BEH-SF-530](../behaviors/BEH-SF-528-permission-policy.md)       |
| FM-SF-053 | Session fork state leak (shared mutable state)                | 8   | 2   | 5   | 80  | Moderate   | Session fork creates deep copy of checkpoint state; forked session gets new session ID; no shared references between parent and fork                                                                                           | [BEH-SF-525](../behaviors/BEH-SF-520-session-resilience.md)                                                                  |
| FM-SF-054 | Config option injection (malicious config values)             | 6   | 3   | 4   | 72  | Moderate   | `ConfigOption` schema validated against declared type and enum constraints; invalid values rejected with `ExtensionMethodError`                                                                                                | [BEH-SF-512](../behaviors/BEH-SF-512-dynamic-capabilities.md), [BEH-SF-513](../behaviors/BEH-SF-512-dynamic-capabilities.md) |
