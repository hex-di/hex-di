# ADR-GD-022: MCP resources and A2A skills have concrete input/output schemas

> **Status:** Accepted
> **ADR Number:** 022 (monorepo-wide)
> **Extracted from:** [Appendix A: Architectural Decisions](../appendices/architectural-decisions.md) during spec restructure (CCR-GUARD-018, 2026-02-17)

## Context

Guard's MCP integration could return unstructured data (plain objects or strings). AI agents and DevTools panels need structured, predictable response formats to operate deterministically. Unstructured data makes AI tooling unreliable — tools cannot reason about the response format.

## Decision

Guard's MCP resources have defined JSON response schemas with required fields and types. A2A skills have typed input/output interfaces. This follows the diagnostic port philosophy: explicit contracts for deterministic integration.

```ts
// MCP resource has a defined schema — not free-form JSON
interface GuardPolicyResource {
  policyId: string;
  kind: PolicyKind;
  serialized: SerializedPolicy;
  metadata: { createdAt: string; version: number };
}
```

## Consequences

**Positive**:
- Deterministic AI agent integration (AI tools can reason about the response format)
- Structured DevTools panel data
- Breaking changes are detectable via schema versioning

**Negative**:
- Schema maintenance burden
- Breaking changes require versioning
- Additional documentation overhead

**Trade-off accepted**: Structured contracts are essential for reliable AI integration; schema versioning is a manageable cost for the reliability benefits.
