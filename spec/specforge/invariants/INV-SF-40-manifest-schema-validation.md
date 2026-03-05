---
id: INV-SF-40
kind: invariant
title: Manifest Schema Validation
status: active
enforced_by: [AgentRegistryService.register(), AgentRegistryService.validateManifest()]
behaviors: [BEH-SF-504, BEH-SF-508, BEH-SF-509]
---

## INV-SF-40: Manifest Schema Validation

Every agent manifest accepted into the registry MUST pass `AgentManifestSchema` validation. The `version` field MUST be valid semver. The `branding.icon` MUST be a 16x16 SVG using `currentColor`. Platform targets MUST match the current runtime. Invalid manifests are rejected with `ManifestValidationError` and never stored.
