---
id: FM-SF-043
kind: risk-assessment
title: Protocol Extension & Registry Failure Modes
status: active
fm_range: 043--048
invariants: [INV-SF-38, INV-SF-39, INV-SF-40]
---

# Protocol Extension & Registry Failure Modes

Protocol extension collisions, metadata pass-through, version negotiation, and agent registry distribution failures.

| FM ID     | Failure Mode                                             | S   | O   | D   | RPN | Risk Level | Mitigation                                                                                                                                                                                                          | Behaviors                                                                                                                                  |
| --------- | -------------------------------------------------------- | --- | --- | --- | --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FM-SF-043 | Extension method collision (shadows protocol method)     | 5   | 3   | 3   | 45  | Acceptable | `ExtensionMethodDispatcher` validates against reserved method list at registration time; `_` prefix convention enforces namespace separation ([INV-SF-38](../invariants/INV-SF-38-extension-method-isolation.md))   | [BEH-SF-496](../behaviors/BEH-SF-496-protocol-extensions.md), [BEH-SF-497](../behaviors/BEH-SF-496-protocol-extensions.md)                 |
| FM-SF-044 | `_meta` field stripped by intermediary                   | 4   | 4   | 5   | 80  | Moderate   | Protocol integration tests verify `_meta` round-trip; `MessageTranslator` treats `_meta` as opaque pass-through ([INV-SF-39](../invariants/INV-SF-39-protocol-meta-pass-through.md))                                | [BEH-SF-499](../behaviors/BEH-SF-496-protocol-extensions.md), [BEH-SF-500](../behaviors/BEH-SF-496-protocol-extensions.md)                 |
| FM-SF-045 | Version negotiation failure (incompatible backend)       | 6   | 3   | 3   | 54  | Acceptable | `ConnectionManagerService.negotiate()` returns `VersionNegotiationError` with mismatch details; client can fall back to minimum supported version                                                                   | [BEH-SF-503](../behaviors/BEH-SF-496-protocol-extensions.md)                                                                               |
| FM-SF-046 | Agent manifest schema drift (CDN serves invalid)         | 5   | 4   | 4   | 80  | Moderate   | `AgentRegistryService.validateManifest()` enforces `AgentManifestSchema` validation; invalid manifests rejected with `ManifestValidationError` ([INV-SF-40](../invariants/INV-SF-40-manifest-schema-validation.md)) | [BEH-SF-504](../behaviors/BEH-SF-504-agent-registry-distribution.md)                                                                       |
| FM-SF-047 | Registry source unreachable (network partition)          | 5   | 5   | 3   | 75  | Moderate   | Offline fallback uses last-known cached manifests; registry source health reported via `HealthCheckService`                                                                                                         | [BEH-SF-511](../behaviors/BEH-SF-504-agent-registry-distribution.md), [BEH-SF-510](../behaviors/BEH-SF-504-agent-registry-distribution.md) |
| FM-SF-048 | Manifest version conflict (multiple sources, same agent) | 4   | 4   | 3   | 48  | Acceptable | Registry deduplicates by agent name + version; highest semver wins; conflicts logged as warnings                                                                                                                    | [BEH-SF-505](../behaviors/BEH-SF-504-agent-registry-distribution.md), [BEH-SF-506](../behaviors/BEH-SF-504-agent-registry-distribution.md) |
