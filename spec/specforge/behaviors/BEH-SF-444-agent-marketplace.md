---
id: BEH-SF-444
kind: behavior
title: Agent Marketplace
status: active
id_range: 444--447
invariants: [INV-SF-40, INV-SF-5]
adrs: [ADR-021]
types: [agent, extensibility]
ports: [MarketplacePort, AgentRegistryPort]
---

# 65 — Agent Marketplace

**Feature:** [FEAT-SF-032](../features/FEAT-SF-032-agent-marketplace.md)

---

## BEH-SF-444: Pack Discovery and Search — Browse and Find Agent Packs

The marketplace provides discovery and search capabilities for agent packs. Operators can browse by domain, filter by rating and compatibility, and search by keyword. In solo mode, the registry is local/curated; in SaaS mode, it connects to the cloud marketplace.

### Contract

REQUIREMENT (BEH-SF-444): `MarketplacePort.search(query)` MUST return an array of pack summaries matching the search criteria. The query MUST support: `keyword` (full-text search across name, description, tags), `domain` (filter by domain category), `minRating` (minimum average rating, 0–5), and `compatibility` (SpecForge version constraint). Each result MUST contain: `packId`, `name`, `description`, `version`, `domain`, `rating`, `downloads`, `publisher`, and `verified` (boolean — publisher badge). Results MUST be sorted by relevance (keyword match score) by default, with optional sort by `rating`, `downloads`, or `updated`. In solo mode, search MUST query the local registry and bundled curated packs.

### Verification

- Keyword search test: search for "security"; verify results include security-related packs.
- Domain filter test: filter by domain "compliance"; verify all results are compliance packs.
- Solo mode test: in solo mode, search packs; verify results come from local registry.

---

## BEH-SF-445: Pack Installation and Version Management — Install, Upgrade, Rollback

Packs are installed via CLI or UI with full version management. Operators can install specific versions, upgrade to latest, pin versions, and rollback to previous versions.

### Contract

REQUIREMENT (BEH-SF-445): `MarketplacePort.install(packId, version?)` MUST download and install the specified pack version (or latest if omitted). Installation MUST validate the pack manifest (INV-SF-40), resolve dependencies, and register the pack's components (agent roles, flows, hooks). `MarketplacePort.upgrade(packId)` MUST upgrade to the latest compatible version. `MarketplacePort.rollback(packId)` MUST revert to the previously installed version. `MarketplacePort.pin(packId, version)` MUST lock the pack to the specified version, preventing automatic upgrades. All installation operations MUST be atomic — on failure, the previous state MUST be restored.

### Verification

- Install test: install a pack; verify its agent roles and hooks are registered.
- Upgrade test: install v1; upgrade to v2; verify v2 components are active.
- Rollback test: upgrade to v2; rollback; verify v1 components are restored.
- Atomic test: simulate installation failure mid-process; verify previous state is intact.

---

## BEH-SF-446: Community Pack Publishing — Submit and Review Pipeline

Community members can publish packs to the marketplace through a review pipeline. Submissions are validated, security-scanned, and reviewed before being listed.

### Contract

REQUIREMENT (BEH-SF-446): `MarketplacePort.submit(packBundle)` MUST accept a pack bundle for community review. The submission pipeline MUST: (1) validate the manifest schema (INV-SF-40), (2) run automated security scanning for known vulnerabilities, (3) verify the pack executes successfully against a test suite, and (4) queue for manual review. Each stage MUST produce a `SubmissionStatus` update: `validating`, `scanning`, `testing`, `reviewing`, `approved`, or `rejected`. `MarketplacePort.getSubmissionStatus(submissionId)` MUST return the current status with stage-specific details. Rejected submissions MUST include a `rejectionReason`.

### Verification

- Submission test: submit a valid pack; verify it progresses through pipeline stages.
- Invalid manifest test: submit a pack with invalid manifest; verify rejection at validation stage.
- Status tracking test: submit a pack; call `getSubmissionStatus`; verify current stage and details.

---

## BEH-SF-447: Pack Sandboxing — Isolated Execution Environment

Installed packs run in sandboxed isolation. The sandbox restricts file system access, network access, and system calls to prevent malicious or buggy packs from affecting the host system.

### Contract

REQUIREMENT (BEH-SF-447): When a pack's hooks or agent roles execute, they MUST run within a sandbox that enforces: (1) file system access limited to the pack's own data directory (no access to project files unless explicitly granted), (2) network access limited to declared endpoints in the manifest, (3) execution time limited to the configured timeout (default 30s per hook), and (4) memory limited to the configured ceiling (default 256MB). Sandbox violations MUST terminate the pack's execution immediately and emit a `SandboxViolation` event via `EventBusPort` containing `packId`, `violationType`, and `details`. The host system MUST remain unaffected by sandbox violations (INV-SF-5).

### Verification

- File isolation test: a pack attempts to read project files; verify access is denied and `SandboxViolation` is emitted.
- Network isolation test: a pack attempts to connect to an undeclared endpoint; verify connection is blocked.
- Timeout test: a pack exceeds 30s execution; verify termination and `SandboxViolation` event.
- Host safety test: after a sandbox violation, verify the host system continues operating normally.
