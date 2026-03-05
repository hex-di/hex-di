---
id: ADR-021
kind: decision
title: Schema-Driven Agent Registry & Distribution
status: Accepted
date: 2026-02-28
supersedes: []
invariants: [INV-SF-40]
---

# ADR-021: Schema-Driven Agent Registry & Distribution

**Extends:** [ADR-018](./ADR-018-acp-agent-protocol.md)

## Context

ADR-019 introduced the `AgentRegistryService` to unify built-in roles, dynamic templates, and marketplace agents into a single resolution path. However, the registry lacks:

1. **Schema validation** — Agent manifests arrive from untrusted sources (npm, GitHub, CDN) with no validation beyond TypeScript structural typing at compile time. Malformed manifests produce confusing runtime errors deep in the flow engine.
2. **Multi-source distribution** — Agents are currently resolved from a flat in-memory map. There is no mechanism to discover agents from remote registries, cache them locally, or refresh them on a schedule.
3. **Branding consistency** — Agents appear in the dashboard and desktop app with inconsistent naming, missing icons, and no visual identity standards. The surface layer renders agents differently depending on their source.
4. **Offline operation** — When remote sources are unreachable (air-gapped environments, network outages), the registry returns empty results instead of falling back to cached manifests.

## Decision

### 1. JSON Manifest Schema

All agent manifests MUST conform to the `AgentManifestSchema` type (defined in [types/acp.md](../types/acp.md)). This extends `ACPAgentManifest` with registry-specific metadata:

- `version` — Semver string validated at registration time. The registry rejects manifests with invalid semver.
- `platformTargets` — Array of `PlatformTarget` values (`"darwin" | "linux" | "win32" | "web" | "all"`). The registry filters manifests by the current platform during resolution.
- `branding` — An `AgentBranding` record with display name, icon SVG, and color mode constraints.
- `registrySource` — The source identifier that provided this manifest (e.g., `"cdn:specforge.dev"`, `"npm:@acme/lint-agent"`).
- `lastUpdated` — ISO 8601 timestamp of the last manifest refresh.

Schema validation runs synchronously at the `AgentRegistryService.register()` boundary. Manifests that fail validation produce a `ManifestValidationError` with a structured list of violations (INV-SF-40).

### 2. Multi-Source Registry

The `AgentRegistryService` resolves agents from multiple `RegistrySourceConfig` entries, each with its own transport, URL, refresh interval, and optional authentication:

| Source Type | Transport           | Resolution Strategy                                                                   |
| ----------- | ------------------- | ------------------------------------------------------------------------------------- |
| `cdn`       | HTTPS GET           | Fetches a JSON manifest index from a well-known URL path (`/.well-known/agents.json`) |
| `npm`       | npm registry API    | Resolves the package's `specforge.agents` field from `package.json`                   |
| `github`    | GitHub Releases API | Fetches `agent-manifest.json` from the latest release assets                          |
| `local`     | Filesystem          | Reads manifest files from a configured directory (e.g., `~/.specforge/agents/`)       |

Sources are polled independently based on their `refreshIntervalMs`. The registry merges results with deduplication by `name + version`. When the same agent exists in multiple sources, the source with the highest priority (local > github > npm > cdn) wins.

### 3. Agent Branding Standards

All agents rendered in the dashboard, desktop app, or VS Code extension MUST provide an `AgentBranding` record:

- `displayName` — Human-readable name, max 32 characters, no special characters beyond hyphens and spaces.
- `icon` — A 16x16 SVG string. The SVG MUST use `currentColor` for fill/stroke so it adapts to light and dark themes.
- `iconSize` — Fixed at `"16x16"`. The surface layer renders icons at this size; larger SVGs are scaled down.
- `iconColorMode` — Fixed at `"currentColor"`. SVGs using hardcoded colors are rejected at validation time.

Built-in agents ship with default branding. Template-generated agents inherit branding from their template with the `displayName` overridden. Marketplace agents MUST provide branding in their manifest; the registry rejects manifests with missing branding.

### 4. Offline Fallback

When a remote registry source is unreachable, the `AgentRegistryService` falls back to the most recently cached manifest set for that source:

- Each successful source refresh writes the manifest set to local storage (`~/.specforge/cache/registry/<source-id>.json`).
- The cache entry includes the fetch timestamp and the source's `refreshIntervalMs` for staleness detection.
- On fallback, the registry emits a `RegistrySourceStale` event via the event bus, including the source ID, last successful refresh time, and the error that triggered the fallback.
- If no cache exists for a source (first run, never connected), the source contributes zero agents. The registry does not block startup waiting for unreachable sources.

The local source type (`"local"`) never needs fallback since it reads from the filesystem directly.

## Concept Mapping

| Pattern                             | SpecForge Adoption                                                    |
| ----------------------------------- | --------------------------------------------------------------------- |
| npm `package.json` metadata         | `specforge.agents` field for npm-distributed agents                   |
| GitHub Release assets               | `agent-manifest.json` in release assets for GitHub-distributed agents |
| VS Code extension marketplace icons | 16x16 SVG with `currentColor`, validated at registration              |
| Docker registry multi-source        | `RegistrySourceConfig` with priority-based deduplication              |
| Service worker cache-first          | Offline fallback with cached manifest sets per source                 |

## Trade-Offs

**Benefits:**

- Schema validation catches malformed manifests early with structured error messages
- Multi-source resolution enables agent distribution through existing package ecosystems (npm, GitHub)
- Branding standards ensure consistent agent presentation across all surface layers
- Offline fallback enables air-gapped and intermittent-connectivity environments
- Platform targeting prevents agents from being offered on unsupported platforms

**Costs:**

- Schema validation adds synchronous overhead at registration time (mitigated: validation is fast for small JSON documents)
- Multi-source polling adds background network activity and cache storage
- Branding enforcement may increase the barrier for third-party agent authors
- Cache invalidation complexity: stale caches may present outdated agents until the next successful refresh

## Consequences

- [types/acp.md](../types/acp.md) — `AgentManifestSchema`, `AgentBranding`, `PlatformTarget`, `RegistrySourceConfig`
- [types/ports.md](../types/ports.md) — `AgentRegistryService.register()` validates against `AgentManifestSchema`
- [types/errors.md](../types/errors.md) — `ManifestValidationError` with structured violation list
- [invariants/INV-SF-40-manifest-schema-validation.md](../invariants/INV-SF-40-manifest-schema-validation.md) — All manifests MUST pass schema validation before registration
- [behaviors/BEH-SF-504-agent-registry-distribution.md](../behaviors/BEH-SF-504-agent-registry-distribution.md) — BEH-SF-504 through BEH-SF-511
- [architecture/c3-acp-layer.md](../architecture/c3-acp-layer.md) — Registry source resolution pipeline, cache layer

## References

- [ADR-018](./ADR-018-acp-agent-protocol.md) — ACP as Primary Agent Protocol (extended, not superseded)
- [ADR-019](./ADR-019-zed-inspired-architecture.md) — Agent Registry concept introduction
- [types/acp.md](../types/acp.md) — `AgentManifestSchema`, `RegistrySourceConfig`, full type definitions
- [Semver Specification](https://semver.org/) — Version string validation rules
