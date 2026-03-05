---
id: BEH-SF-107
kind: behavior
title: Cloud Services
status: active
id_range: 107--112
invariants: [INV-SF-7, INV-SF-24]
adrs: [ADR-017]
types: [cloud, cloud]
ports: [BillingPort, TelemetryPort, MarketplacePort]
---

# 15 — Cloud Services

**Decisions:** [ADR-017](../decisions/ADR-017-standalone-server-over-sidecar.md)

## BEH-SF-107: Managed Neo4j — Provisioning, Scaling, Backups

In SaaS mode, SpecForge Cloud provides a managed Neo4j instance for each organization (or personal account). Cloud handles provisioning, scaling based on graph storage usage, daily automated backups with tier-dependent retention, and schema migrations.

### Contract

REQUIREMENT (BEH-SF-107): In SaaS mode, SpecForge Cloud MUST provision an isolated Neo4j tenant per organization/personal account. The Cloud MUST handle: (a) automatic provisioning on account creation, (b) scaling based on storage usage, (c) daily automated backups with retention based on tier (7 days Starter, 30 days Pro, 90 days Team, custom Enterprise), (d) automatic schema migration on deployment. Users MUST NOT see Neo4j credentials.

### Verification

- Provisioning test: create a new SaaS account; verify a Neo4j tenant is provisioned.
- Backup test: verify daily backups are created and old backups are pruned per tier retention policy.
- Scaling test: add significant data; verify the instance scales without user intervention.
- Credential isolation test: verify no Neo4j credentials are exposed to the user.

---

## BEH-SF-108: Billing Tiers — Starter/Pro/Team/Enterprise Gate Infrastructure, Not Features

SaaS billing tiers gate cloud infrastructure (storage, backup retention, SSO, data residency), not features. All features are available in all tiers including the free Starter tier.

### Contract

REQUIREMENT (BEH-SF-108): Billing tiers MUST gate only infrastructure: Starter (100MB, 1 project, 7-day backup, $0), Pro (5GB, 5 projects, 30-day backup, $29/mo), Team (50GB, unlimited projects, 90-day backup, SSO, $19/seat/mo), Enterprise (custom). Tiers MUST NOT gate features — all flows, agents, analytics, composition, GxP, and `specforge ask` MUST be available at every tier.

### Verification

- Feature access test: on Starter tier, verify all features are accessible.
- Storage gate test: exceed Starter storage limit; verify a storage warning or upgrade prompt (not feature lockout).
- Tier comparison test: compare available features across all tiers; verify they are identical.

---

## BEH-SF-109: BYOC — Users Pay for Claude Code Separately, SpecForge Charges for Graph Only

SpecForge separates LLM costs from infrastructure costs. Claude Code CLI runs locally on the user's machine with the user's own configuration. SpecForge charges only for managed graph infrastructure in SaaS mode. Self-hosted modes are free.

### Contract

REQUIREMENT (BEH-SF-109): SpecForge MUST NOT proxy, meter, or charge for Claude Code CLI usage. Claude Code CLI configuration and credentials MUST remain on the user's local machine. SpecForge SaaS billing MUST cover only graph infrastructure (storage, backups, cloud services). Self-hosted mode (solo) MUST have zero SpecForge billing.

### Verification

- Credential isolation test: verify no Claude Code CLI credentials are transmitted to or stored by SpecForge Cloud.
- Billing scope test: verify SaaS invoices reflect only infrastructure charges, not LLM usage.
- Self-hosted free test: verify solo mode has no SpecForge billing components.

---

## BEH-SF-110: Data Residency — Default US, EU Option for Enterprise

Data residency defaults to US (AWS/GCP). Enterprise tier offers an EU region option with a single-tenant Neo4j instance.

### Contract

REQUIREMENT (BEH-SF-110): By default, managed Neo4j instances MUST be deployed in the US region. Enterprise tier MUST offer an EU region option. Data MUST NOT leave the configured region. Encryption at rest (Neo4j enterprise encryption) and in transit (TLS) MUST be enabled for all tiers.

### Verification

- Default region test: create a non-Enterprise account; verify the Neo4j instance is in the US region.
- EU option test: configure Enterprise with EU residency; verify the instance is in the EU.
- Encryption test: verify TLS is enabled for all API communication and encryption at rest for stored data.

---

## BEH-SF-111: Cloud API Proxy — Graph Operations via HTTPS in SaaS Mode

In SaaS mode, `CloudNeo4jAdapter` routes all graph operations through the SpecForge Cloud API over HTTPS. The Cloud API proxies to the managed Neo4j instance. This is transparent to the application — all ports and application logic work identically.

### Contract

REQUIREMENT (BEH-SF-111): In SaaS mode, `CloudNeo4jAdapter` MUST route all `GraphStorePort` and `GraphQueryPort` operations through the SpecForge Cloud API over HTTPS. The Cloud API MUST proxy these operations to the managed Neo4j instance. The proxy MUST be transparent — all graph operations, queries, sync, and composition MUST work identically to direct Neo4j connections.

### Verification

- Transparency test: run the same graph operations via `LocalNeo4jAdapter` and `CloudNeo4jAdapter`; verify identical results.
- HTTPS test: verify all communication between the local server and Cloud API uses HTTPS.
- Performance test: measure latency overhead of the proxy compared to direct connection; verify it is acceptable.

---

## BEH-SF-112: Agent Marketplace — Publish/Discover/Version Agent Templates (SaaS)

The SaaS agent marketplace allows publishing, discovering, and versioning custom agent templates. Org-scoped agents are visible only to org members; public agents are discoverable by all users.

### Contract

REQUIREMENT (BEH-SF-112): In SaaS mode, the system MUST support: (a) `specforge agent publish <name>` to push an agent template to the marketplace, (b) `specforge agent search <query>` to discover shared agents, (c) semver versioning for published agents, (d) org-scoped and public visibility. Published agents MUST follow the agent template schema. Org admin approval MAY be required for publishing.

### Verification

- Publish test: publish an agent template; verify it appears in the marketplace.
- Search test: search for published agents; verify results include the published template.
- Version test: publish multiple versions; verify version listing and pinning work correctly.
- Scope test: publish an org-scoped agent; verify it is visible only to org members.
- Public test: publish a public agent; verify it is visible to all users.
