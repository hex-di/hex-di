---
id: ADR-014
kind: decision
title: Role-Adaptive Model Routing
status: Accepted
date: 2026-02-27
supersedes: []
invariants: [INV-SF-15]
---

# ADR-014: Role-Adaptive Model Routing

## Context

The current spec supports flow-level and phase-level model selection (BEH-SF-080 model escalation). However, all agents within a phase use the same model, leading to cost inefficiency. An all-Opus flow costs ~$8/iteration while many tasks (feedback synthesis, simple aggregation) can be handled by cheaper models with no quality penalty.

Research file 08 demonstrated that per-role, per-stage model routing with convergence-responsive escalation can cut costs 40%+ without impacting convergence quality.

## Decision

Replace coarse flow-level model selection with a three-dimensional routing strategy: per-role base model, per-stage override, and convergence-responsive escalation. Introduce four budget zones (Green/Yellow/Orange/Red) that progressively degrade model selection as budget is consumed.

## Mechanism

### 1. Role-Based Default Models

Each agent role has a default model based on task complexity:

| Role                 | Default Model | Rationale                                                         |
| -------------------- | ------------- | ----------------------------------------------------------------- |
| discovery-agent      | opus          | Planning and requirements elicitation require deep reasoning      |
| spec-author          | opus          | Architectural decision-making requires high capability            |
| reviewer             | sonnet        | Pattern matching and issue detection are well-handled by mid-tier |
| feedback-synthesizer | haiku         | Simple aggregation and prioritization                             |
| task-decomposer      | sonnet        | Structured decomposition, moderate reasoning                      |
| dev-agent            | sonnet        | Code implementation, escalates to opus on stalls                  |
| codebase-analyzer    | sonnet        | File scanning and pattern extraction                              |
| coverage-agent       | haiku         | Metric computation and gap identification                         |

### 2. Budget Zones

Four progressive degradation zones based on remaining budget:

| Zone   | Budget Remaining | Behavior                                                                    |
| ------ | ---------------- | --------------------------------------------------------------------------- |
| Green  | >60%             | Normal operation — role defaults apply                                      |
| Yellow | 30–60%           | Non-critical roles downgrade to haiku; reduce max iterations by 25%         |
| Orange | 10–30%           | All roles to sonnet; minimal iterations; skip optional stages               |
| Red    | <10%             | Essential stages only; "budget critical" prompt injection; graceful wrap-up |

### 3. Convergence-Responsive Escalation

When `PhaseMetrics.criticalFindings` stalls for 2+ iterations at the same count, the model for the responsible role escalates one tier (haiku → sonnet → opus). Escalation events are recorded in the graph.

### 4. Cost Prediction

`specforge estimate` computes predicted cost using: `flow_cost = sum(phase_estimates)`, where `phase_estimate = avg_iterations * sum(stage_estimates)`, and `stage_estimate = model_cost_per_token * estimated_tokens`. Historical data from prior runs refines estimates.

## Rationale

1. **40%+ cost reduction** — Matching model capability to task complexity eliminates waste.

2. **No convergence penalty** — High-reasoning tasks keep Opus; routine tasks use cheaper models without quality impact.

3. **Predictable degradation** — Budget zones provide smooth degradation instead of hard cutoffs.

4. **Self-correcting** — Convergence-responsive escalation automatically allocates capability where needed.

5. **Observable** — Zone transitions and escalation events are graph nodes, enabling cost analytics.

## Trade-offs

- **Complexity** — Three-dimensional routing is more complex than fixed model selection. Mitigated by sensible defaults and override capability.

- **Model availability** — Not all models may be available in all environments. Mitigated by fallback to the next available model tier.

- **Zone transition races** — Rapid budget consumption could skip zones. Mitigated by monotonic zone transitions (Green→Yellow→Orange→Red only, no reverse).

- **Estimation accuracy** — Cost prediction depends on historical data that may not exist for new projects. Mitigated by conservative default estimates.

## References

- [Cost Optimization Behaviors](../behaviors/BEH-SF-169-cost-optimization.md) — BEH-SF-169 through BEH-SF-176
- [Token Budgeting](../behaviors/BEH-SF-073-token-budgeting.md) — BEH-SF-073 through BEH-SF-080
- [Flow Types](../types/flow.md) — TokenUsage, ModelSelection
- [INV-SF-15](../invariants/INV-SF-15-budget-zone-monotonicity.md) — Budget Zone Monotonicity
