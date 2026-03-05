---
id: FEAT-SF-016
kind: feature
title: "Authentication & Cloud"
status: active
behaviors:
  [
    BEH-SF-095,
    BEH-SF-096,
    BEH-SF-097,
    BEH-SF-098,
    BEH-SF-099,
    BEH-SF-100,
    BEH-SF-101,
    BEH-SF-102,
    BEH-SF-103,
    BEH-SF-104,
    BEH-SF-105,
    BEH-SF-106,
    BEH-SF-107,
    BEH-SF-108,
    BEH-SF-109,
    BEH-SF-110,
    BEH-SF-111,
    BEH-SF-112,
  ]
adrs: [ADR-005, ADR-017]
roadmap_phases: [RM-07]
---

# Authentication & Cloud

## Problem

SpecForge must operate in two deployment modes — solo (fully local) and SaaS (managed cloud) — with appropriate authentication for each. Solo mode needs zero-auth simplicity; SaaS mode needs OAuth, API tokens, and multi-tenant isolation.

## Solution

Deployment mode selection (solo vs. SaaS) is a port-level decision: the same features work in both modes, with adapters providing mode-specific implementations. Solo mode skips authentication entirely. SaaS mode provides OAuth integration, API token management, JWT lifecycle, managed Neo4j instances, billing tiers, bring-your-own-cloud (BYOC) options, and data residency controls. Mode-switched port behaviors ensure feature parity across modes.

## Constituent Behaviors

| ID             | Summary                                          |
| -------------- | ------------------------------------------------ |
| BEH-SF-095     | Solo mode deployment configuration               |
| BEH-SF-096     | SaaS mode deployment configuration               |
| BEH-SF-097     | Feature parity across deployment modes           |
| BEH-SF-098     | Mode-aware adapter selection                     |
| BEH-SF-099     | Mode switching and migration                     |
| BEH-SF-100     | Mode-specific configuration validation           |
| BEH-SF-101     | Solo mode no-auth pass-through                   |
| BEH-SF-102     | SaaS OAuth integration                           |
| BEH-SF-103     | API token management                             |
| BEH-SF-104     | JWT lifecycle (issue, validate, refresh, revoke) |
| BEH-SF-105     | Organization model and multi-tenancy             |
| BEH-SF-106     | Authentication error handling                    |
| BEH-SF-107     | Managed Neo4j provisioning                       |
| BEH-SF-108     | Billing tier management                          |
| BEH-SF-109     | Usage metering and limits                        |
| BEH-SF-110     | BYOC (Bring Your Own Cloud)                      |
| BEH-SF-111     | Data residency controls                          |
| BEH-SF-112     | Cloud infrastructure health monitoring           |
| BEH-SF-353–358 | Mode-switched port behaviors                     |

## Acceptance Criteria

- [ ] Solo mode works without any authentication configuration
- [ ] SaaS mode authenticates via OAuth and issues JWTs
- [ ] API tokens can be created, listed, and revoked
- [ ] Feature parity is maintained — same capabilities in both modes
- [ ] Managed Neo4j provisions correctly per billing tier
- [ ] Data residency controls enforce geographic constraints
