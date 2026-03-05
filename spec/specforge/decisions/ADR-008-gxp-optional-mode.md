---
id: ADR-008
kind: decision
title: GxP as Optional Plugin
status: Accepted
date: 2026-02-26
supersedes: []
invariants: []
---

# ADR-008: GxP as Optional Plugin

## Context

The original SpecForge design baked GxP (Good Practice) regulatory compliance into every decision: audit trail hash chains, agent invocation records, FMEA risk analysis, traceability enforcement, validation protocols (IQ/OQ/PQ), document governance. Every agent, every phase, every data structure carried GxP concerns.

Problems:

1. **Overhead for non-regulated teams** -- Most software teams don't need pharmaceutical-grade audit trails. The GxP infrastructure added complexity, performance overhead, and cognitive load for zero benefit.
2. **Design distortion** -- GxP requirements influenced core architecture decisions that would have been simpler without them. Data structures carried fields only needed for compliance. Agents ran extra validation steps that slowed non-GxP workflows.
3. **Barrier to adoption** -- Teams evaluating SpecForge for standard spec-and-dev workflows were overwhelmed by regulatory terminology and compliance features they didn't need.

## Decision

GxP compliance is an optional plugin, disabled by default. When disabled, SpecForge operates as a standard specification-and-development platform. When enabled via the plugin system, it adds the full suite of regulatory compliance features.

## Rationale

1. **Separation of concerns** -- Core spec authoring, review, task decomposition, and development are valuable without regulatory compliance. GxP adds an orthogonal dimension that should be independently activatable.

2. **Simpler default experience** -- Teams evaluating or adopting SpecForge encounter a clean, focused tool. No audit trail terminology, no compliance warnings, no validation protocols until explicitly requested.

3. **Performance** -- GxP features (hash chain computation, detailed audit records, FMEA analysis) have non-trivial cost. Non-regulated teams shouldn't pay this cost.

4. **Clean architecture** -- GxP features are additive: they layer on top of the core platform via the plugin architecture (BEH-SF-090) rather than being woven into it. This makes both the core and the GxP layer easier to maintain and test independently.

5. **Plugin model** -- The GxP plugin uses the same plugin architecture as all other SpecForge plugins: discovery from `~/.specforge/plugins/` or `.specforge/plugins/`, manifest declaration, and activation via `specforge plugin enable gxp`.

## What GxP Plugin Controls

See [GxP Plugin](../plugins/PLG-gxp.md) for the full feature matrix.

Summary:

- **Enabled:** Audit trail hash chain, agent invocation records, user identity, data retention, document governance, FMEA, traceability enforcement, validation protocols, `gxp-reviewer` agent, regulatory output formats
- **Disabled (default):** Simple event recording, token tracking, basic versioning, traceability reporting (not enforcement), standard output formats

## Deployment Modes

GxP plugin is available in both solo and SaaS modes. In solo mode, the plugin provides local compliance features. In SaaS mode, additional cloud-backed audit storage and multi-user audit trails are available.

## Trade-offs

- **Feature parity risk** -- GxP plugin might lag behind core features if maintained as a separate layer. Mitigated by GxP-specific test suites that run alongside core tests.

- **Configuration complexity** -- Users must know to enable the GxP plugin. Mitigated by clear documentation, CLI command (`specforge plugin enable gxp`), and web dashboard plugin management.

- **Partial compliance risk** -- A team might enable the GxP plugin but not configure all required sub-features (e.g., user identity). Mitigated by the plugin performing a configuration completeness check at activation time.

## References

- [GxP Plugin](../plugins/PLG-gxp.md) -- Feature matrix and activation
- [Plugin Architecture](../behaviors/BEH-SF-087-extensibility.md) -- BEH-SF-090 plugin system
