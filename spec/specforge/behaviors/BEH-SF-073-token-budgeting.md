---
id: BEH-SF-073
kind: behavior
title: Token Budgeting
status: active
id_range: "073--080"
invariants: [INV-SF-15]
adrs: [ADR-014]
types: [agent, agent]
ports: [MetricsPort, EventBusPort]
---

# 10 — Token Budgeting

**Related:** [BEH-SF-155](./BEH-SF-151-claude-code-adapter.md) (token tracking from stream)
**Decisions:** [ADR-014](../decisions/ADR-014-role-adaptive-model-routing.md)

## BEH-SF-073: Flow-Level Budget — Total Token Budget for Entire Flow Run

A total token budget can be set for an entire flow run, constraining the aggregate token consumption across all phases and agents. Configured via the flow definition's `tokenBudget` field or the `--budget` CLI flag.

### Contract

REQUIREMENT (BEH-SF-073): When a `tokenBudget` is specified for a flow run, the system MUST track total token consumption (input + output) across all agent sessions in the flow. When the budget is exceeded, the system MUST signal agents to wrap up (see BEH-SF-077). Default behavior MUST be no limit (unbounded) — budgets are opt-in.

### Verification

- Tracking test: set a flow-level budget; run a flow; verify total token usage is tracked and reported.
- Default test: run without a budget; verify no budget enforcement occurs.
- CLI test: set budget via `--budget <tokens>`; verify it is applied to the flow run.

---

## BEH-SF-074: Phase-Level Budget — Per-Phase Token Allocation

Each phase can have its own token budget, allocating a portion of the flow-level budget (or an independent limit) to a single phase.

### Contract

REQUIREMENT (BEH-SF-074): When a `PhaseDefinition` includes a `tokenBudget`, the system MUST track token consumption within that phase across all agent sessions. The system MUST enforce the phase budget independently of the flow-level budget. `ToolRegistryPort.checkPhaseBudget()` MUST return the current `PhaseBudget` with `allocated`, `consumed`, and `remaining` fields.

### Verification

- Phase tracking test: set a phase-level budget; verify token consumption is tracked per-phase.
- Independence test: verify a phase budget is enforced even when the flow-level budget is not set.
- API test: call `checkPhaseBudget()`; verify it returns accurate budget information.

---

## BEH-SF-075: Agent-Level Budget — Per-Session Token Tracking

Each agent session has its own token tracking. Per-agent budget is the granular unit of token consumption: input tokens, output tokens, and total tokens are tracked per-session.

### Contract

REQUIREMENT (BEH-SF-075): The system MUST track token usage per agent session with `inputTokens`, `outputTokens`, and `totalTokens`. `ToolRegistryPort.checkBudget(sessionId)` MUST return the current `TokenBudget` with `allocated`, `consumed`, `remaining`, and `warningThreshold` fields. Token usage MUST be computed from LLM response metadata.

### Verification

- Per-session tracking test: run two agents; verify token usage is tracked independently for each.
- Accuracy test: compare tracked token usage with LLM response metadata; verify they match.
- API test: call `checkBudget(sessionId)`; verify it returns accurate per-session budget information.

---

## BEH-SF-076: Budget Warning — Event Emitted when Usage Exceeds Threshold (e.g., 90%)

When token usage approaches the configured budget limit (configurable threshold, default 90%), the agent receives a "budget warning" in its next prompt, and a `budget-warning` orchestrator event is emitted.

### Contract

REQUIREMENT (BEH-SF-076): When an agent's token consumption exceeds the `warningThreshold` (default 0.9 = 90%) of its budget, the system MUST include a budget warning message in the agent's next prompt and MUST emit a `budget-warning` orchestrator event with the current `TokenUsage` and threshold. The threshold MUST be configurable.

### Verification

- Warning trigger test: consume 91% of budget; verify a budget warning is injected into the agent's next prompt.
- Event test: verify a `budget-warning` orchestrator event is emitted with correct `usage` and `threshold`.
- Threshold test: set a custom threshold (e.g., 0.8); verify the warning triggers at 80%.
- Below threshold test: consume 50% of budget; verify no warning is issued.

---

## BEH-SF-077: Budget Exceeded — Agent Receives BudgetExceededError, Must Wrap Up

When an agent's token budget is fully exhausted, the agent receives a `BudgetExceededError` signal and must wrap up its current task. The current LLM response completes (no mid-response truncation), but no further turns are dispatched.

### Contract

REQUIREMENT (BEH-SF-077): When an agent's token consumption exceeds its budget, the system MUST signal the agent with a `BudgetExceededError` after its current LLM response completes. No new turns MUST be dispatched to the agent. If the agent cannot complete within the remaining budget, the phase MUST terminate with `BudgetExceededError` recorded as a finding. The current LLM response MUST NOT be truncated mid-stream.

### Verification

- Exceeded test: exhaust an agent's budget; verify `BudgetExceededError` is signaled.
- No truncation test: verify the in-flight LLM response completes before the error is applied.
- Finding test: verify `BudgetExceededError` is recorded as a finding in the ACP session.
- No new turns test: verify no new tasks are dispatched to the agent after budget exhaustion.

---

## BEH-SF-078: Budget Tracking — TokenUsage Computed from LLM Response Metadata

Token usage (`inputTokens`, `outputTokens`, `totalTokens`) is computed from the LLM response metadata returned by the Claude Code CLI. The CLI adapter aggregates usage per session and per phase.

### Contract

REQUIREMENT (BEH-SF-078): The system MUST compute `TokenUsage` from the LLM response metadata (input tokens, output tokens) returned by each Claude Code CLI response. Usage MUST be aggregated at the session level, phase level, and flow level. The `estimatedCost` field MUST be computed if pricing configuration is available.

### Verification

- Metadata extraction test: make an LLM call; verify `TokenUsage` is populated from the response metadata.
- Aggregation test: run multiple turns; verify session-level usage is the sum of all turn usages.
- Phase aggregation test: verify phase-level usage is the sum of all session usages in the phase.
- Cost test: configure pricing; verify `estimatedCost` is computed based on token counts and pricing rates.

---

## BEH-SF-079: Cost Estimation Command — `specforge estimate <flow-name>` Predicts Token Usage and Cost

The CLI provides `specforge estimate` to predict token usage and cost before running a flow. The estimate is based on package size, flow definition, model pricing, and historical data from prior runs.

### Contract

REQUIREMENT (BEH-SF-079): `specforge estimate <flow-name> [options]` MUST predict token usage and cost for a flow run. The estimate MUST consider: (a) the flow definition (number of phases, stages, max iterations), (b) the target package size (file count, total lines), (c) model pricing configuration, and (d) historical averages from prior runs of the same flow (if available). The output MUST include min/avg/max ranges for both token usage and estimated cost. `--preset <name>` MUST adjust the estimate for the specified preset. `--format json` MUST output structured JSON.

### Verification

- Estimate test: run `specforge estimate spec-writing --package @example/pkg`; verify min/avg/max token usage and cost are output.
- Preset test: run with `--preset quick` vs `--preset thorough`; verify the thorough estimate is significantly higher.
- Historical test: run a flow, then estimate the same flow; verify historical data improves estimate accuracy.
- JSON test: run with `--format json`; verify structured JSON output with `minTokens`, `avgTokens`, `maxTokens`, `estimatedCost` fields.
- No history test: estimate a flow with no prior runs; verify the estimate falls back to heuristic-based calculation.

---

## BEH-SF-080: Adaptive Model Escalation — Start with Sonnet, Escalate to Opus after N Iterations

Phases can use `modelStrategy: "escalating"` to start agents with a cheaper model (e.g., sonnet) and automatically escalate to a more capable model (e.g., opus) after N iterations if findings remain unresolved.

### Contract

REQUIREMENT (BEH-SF-080): When a `PhaseDefinition` has `modelStrategy: "escalating"` and a `ModelEscalation` configuration, the system MUST spawn agents with `startModel` for the first N iterations (where N = `escalateAfterIteration`). If the phase has not converged after N iterations, subsequent iterations MUST use `escalateToModel`. The escalation MUST be transparent to the agent — its session is respawned with the new model. Token usage MUST track the model used per iteration. `modelStrategy: "fixed"` (the default) MUST use the role's default model for all iterations.

### Verification

- Escalation test: configure `escalateAfterIteration: 2` with `startModel: "sonnet"` and `escalateToModel: "opus"`; run 4 iterations; verify iterations 1-2 use sonnet and iterations 3-4 use opus.
- No escalation test: configure `escalateAfterIteration: 5`; converge in 3 iterations; verify only sonnet is used.
- Fixed test: use `modelStrategy: "fixed"`; verify all iterations use the role's default model.
- Token tracking test: verify token usage records distinguish between model tiers.
- Session respawn test: verify the agent session is properly respawned with the escalated model, preserving ACP session context.
