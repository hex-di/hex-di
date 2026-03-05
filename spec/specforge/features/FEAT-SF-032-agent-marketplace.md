---
id: FEAT-SF-032
kind: feature
title: "Agent Marketplace"
status: active
behaviors: [BEH-SF-444, BEH-SF-445, BEH-SF-446, BEH-SF-447]
adrs: [ADR-021]
roadmap_phases: [RM-13]
---

# Agent Marketplace

## Problem

Building custom agent roles, flow templates, and compliance packs requires deep SpecForge expertise. Teams with common needs (security review, API design, data modeling) duplicate effort creating similar configurations. There is no way to share, discover, or reuse agent packs across organizations.

## Solution

The agent marketplace (backed by MarketplacePort) provides a registry of installable packs: agent role templates, flow definitions, hook pipelines, and compliance overlays. In solo mode, the marketplace resolves from local files and a curated registry; in SaaS mode, it connects to a cloud marketplace with ratings, downloads, and verified publisher badges. Packs install via CLI (`specforge install`) or UI, are version-managed, and run in sandboxed isolation. Community contributions go through a review pipeline before publishing.

## Constituent Behaviors

| ID         | Summary                                  |
| ---------- | ---------------------------------------- |
| BEH-SF-444 | Marketplace pack discovery and search    |
| BEH-SF-445 | Pack installation and version management |
| BEH-SF-446 | Community pack publishing pipeline       |
| BEH-SF-447 | Pack sandboxing and security review      |

## Acceptance Criteria

- [ ] `specforge install <pack>` installs agent packs from the marketplace
- [ ] Packs include agent roles, flows, hooks, and compliance overlays
- [ ] Version management supports install, upgrade, and rollback
- [ ] Installed packs run in sandboxed isolation
- [ ] Community publishers submit packs through a review pipeline
- [ ] Marketplace search filters by domain, rating, and compatibility
