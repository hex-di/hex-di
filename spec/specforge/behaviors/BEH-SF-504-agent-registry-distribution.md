---
id: BEH-SF-504
kind: behavior
title: Agent Registry Distribution
status: active
id_range: 504--511
invariants: [INV-SF-40]
adrs: [ADR-021]
types: [acp, errors]
ports: [AgentRegistryService]
---

# 39 — Agent Registry Distribution

**ADR:** [ADR-021](../decisions/ADR-021-agent-registry-distribution.md)

**Architecture:** [c3-acp-layer.md](../architecture/c3-acp-layer.md)

---

## BEH-SF-504: JSON Manifest Schema — Manifests Validated Against AgentManifestSchema

> **Invariant:** [INV-SF-40](../invariants/INV-SF-40-agent-manifest-schema-compliance.md) — Agent Manifest Schema Compliance

Agent manifests are validated against the `AgentManifestSchema` at registration time. The schema enforces semver versioning, branding constraints, and platform target declarations.

### Contract

REQUIREMENT (BEH-SF-504): When `AgentRegistryService.registerManifest(manifest)` is called, the system MUST validate the manifest against `AgentManifestSchema`. The `version` field MUST be a valid semver string. The `branding` object MUST include `name`, `icon`, and `description`. The `platformTargets` array MUST contain at least one valid `PlatformTarget`. If any validation fails, the system MUST return `ManifestValidationError` with details of all violated constraints.

### Verification

- Unit test: register a valid manifest with semver version `1.2.3`; verify registration succeeds.
- Unit test: register a manifest with invalid version `not-semver`; verify `ManifestValidationError` is returned.
- Unit test: register a manifest with empty `platformTargets`; verify `ManifestValidationError` reports missing targets.

---

## BEH-SF-505: CDN Registry Source — Auto-Update with Configurable Check Interval

`AgentRegistryService` supports a CDN-backed registry source that periodically checks for new or updated agent manifests. The check interval is configurable, and manifests are cached locally between checks.

### Contract

REQUIREMENT (BEH-SF-505): When a CDN registry source is configured, the system MUST check the CDN endpoint for updated manifests at the configured `checkIntervalMs`. The system MUST cache fetched manifests locally and serve them from cache between checks. If the CDN returns a newer manifest version (by semver comparison), the local cache MUST be updated. If the CDN is unreachable during a scheduled check, the system MUST retain the cached manifests and log a warning.

### Verification

- Unit test: configure CDN source with 60s interval; verify a check is triggered after 60s.
- Unit test: CDN returns newer manifest version; verify local cache is updated with the new version.
- Unit test: CDN is unreachable; verify cached manifests remain available and a warning is logged.

---

## BEH-SF-506: npm Registry Source — Discover Agent Packs from npm

`AgentRegistryService` supports discovering agent manifests from npm packages tagged with `specforge-agent`. Discovered packages are fetched, validated, and merged into the registry.

### Contract

REQUIREMENT (BEH-SF-506): When an npm registry source is configured, the system MUST search npm for packages with the `specforge-agent` keyword tag. For each discovered package, the system MUST fetch the package's `specforge-agent.json` manifest file, validate it against `AgentManifestSchema`, and register it in the local registry. Packages without a valid manifest MUST be skipped with a warning. The npm source MUST support scoped packages (e.g., `@org/agent-name`).

### Verification

- Unit test: npm search returns 3 packages, 2 with valid manifests; verify 2 are registered and 1 is skipped.
- Unit test: discover a scoped package `@myorg/my-agent`; verify it is registered with full scope in the ID.
- Unit test: npm search returns no packages; verify the registry is unchanged and no error is raised.

---

## BEH-SF-507: GitHub Registry Source — Fetch Manifests from GitHub Releases

`AgentRegistryService` supports fetching agent manifests from GitHub release assets. Releases are scanned for manifest files attached as release assets.

### Contract

REQUIREMENT (BEH-SF-507): When a GitHub registry source is configured with an `owner/repo` target, the system MUST list releases from the repository and scan release assets for files named `specforge-agent.json`. For each found asset, the system MUST download, validate against `AgentManifestSchema`, and register the manifest. The release tag MUST be used as the manifest version if the manifest does not specify one. Pre-release tags MUST be excluded unless `includePreReleases` is set to `true`.

### Verification

- Unit test: repo has 2 releases, each with a `specforge-agent.json` asset; verify both manifests are registered.
- Unit test: release has no `specforge-agent.json` asset; verify the release is skipped without error.
- Unit test: pre-release is present with `includePreReleases: false`; verify it is excluded.

---

## BEH-SF-508: Platform Target Filtering — Exclude Incompatible Manifests

> **Invariant:** [INV-SF-40](../invariants/INV-SF-40-agent-manifest-schema-compliance.md) — Agent Manifest Schema Compliance

When manifests are loaded from any registry source, they are filtered by the current platform target. Manifests that do not support the current platform are excluded from the active registry.

### Contract

REQUIREMENT (BEH-SF-508): When manifests are loaded from any registry source, the system MUST filter out manifests whose `platformTargets` array does not include the current `PlatformTarget`. The current platform MUST be determined by querying the runtime environment (OS, architecture, runtime). Manifests with `platformTargets: ["*"]` (wildcard) MUST be included on all platforms. Filtered manifests MUST NOT appear in `AgentRegistryService.listAgents()` results.

### Verification

- Unit test: current platform is `linux-x64`; manifest targets `["linux-x64", "darwin-arm64"]`; verify it is included.
- Unit test: current platform is `linux-x64`; manifest targets `["darwin-arm64"]`; verify it is excluded.
- Unit test: manifest targets `["*"]`; verify it is included regardless of current platform.

---

## BEH-SF-509: Agent Branding SVG Validation — Icon Must Be 16x16 currentColor

> **Invariant:** [INV-SF-40](../invariants/INV-SF-40-agent-manifest-schema-compliance.md) — Agent Manifest Schema Compliance

Agent branding icons are validated to ensure they conform to the 16x16 SVG specification using `currentColor` for theming compatibility.

### Contract

REQUIREMENT (BEH-SF-509): When a manifest's `branding.icon` is provided as an inline SVG string, the system MUST validate that: (1) the SVG `viewBox` is `0 0 16 16`, (2) the SVG uses `currentColor` for all fill and stroke attributes (no hardcoded colors), (3) the SVG contains no external references (`<use href>`, `<image>`, etc.). If any constraint is violated, the system MUST return `BrandingValidationError` with details. If `branding.icon` is a URL reference, the system MUST fetch and validate it before registration.

### Verification

- Unit test: valid 16x16 SVG with `currentColor`; verify validation passes.
- Unit test: SVG with `viewBox="0 0 24 24"`; verify `BrandingValidationError` reports incorrect dimensions.
- Unit test: SVG with hardcoded `fill="#ff0000"`; verify `BrandingValidationError` reports non-`currentColor` usage.

---

## BEH-SF-510: Registry Source Refresh — Manual and Scheduled Refresh

`AgentRegistryService.refreshSource(sourceId)` triggers an immediate refresh of a specific registry source, bypassing the scheduled check interval. This enables on-demand updates when users install new agents.

### Contract

REQUIREMENT (BEH-SF-510): When `AgentRegistryService.refreshSource(sourceId)` is called, the system MUST trigger an immediate fetch from the specified registry source, bypassing any scheduled interval. The refresh MUST validate all fetched manifests and update the local cache. If the `sourceId` does not correspond to a configured source, the system MUST return `SourceNotFoundError`. The scheduled timer for that source MUST be reset after a manual refresh to avoid redundant immediate re-checks.

### Verification

- Unit test: manually refresh a CDN source; verify manifests are fetched immediately and cache is updated.
- Unit test: refresh with unknown `sourceId`; verify `SourceNotFoundError` is returned.
- Unit test: manually refresh then wait; verify the scheduled timer resets and the next check occurs after a full interval.

---

## BEH-SF-511: Offline Fallback — Cached Manifests When Sources Unreachable

When all configured registry sources are unreachable (network unavailable, CDN down, etc.), the system falls back to the last-known cached manifests to ensure agents remain discoverable.

### Contract

REQUIREMENT (BEH-SF-511): When all configured registry sources are unreachable during a refresh cycle, the system MUST serve the last-known cached manifests from the local cache. The cache MUST persist across process restarts (stored on disk). The system MUST emit a `RegistrySourceUnreachable` warning event for each failed source. When connectivity is restored and a source becomes reachable again, the system MUST resume normal fetching and update the cache.

### Verification

- Unit test: all sources unreachable; verify cached manifests are returned by `listAgents()`.
- Unit test: verify cache persists across simulated process restart (write to disk, reload).
- Unit test: source becomes reachable after failure; verify cache is updated on next check.

---
