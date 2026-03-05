---
id: RES-08
kind: research
title: Research 08 — Model Strategy and Cost Optimization
status: Research
date: 2026-02-27
outcome: deferred
related_adr: []
---

# Research 08 — Model Strategy and Cost Optimization

**Related behaviors:** BEH-SF-073 through BEH-SF-080, BEH-SF-155, BEH-SF-156
**Related references:** [model-config.md](../references/claude-code/model-config.md), [costs.md](../references/claude-code/costs.md)

---

## Problem Statement

SpecForge orchestrates multiple AI agent sessions across multi-phase flows. A single `spec-writing` run can spawn dozens of agent sessions across five phases with varying complexity: a conversational discovery session, iterative spec authoring loops, architectural review, implementation, and verification. Today the system has basic model selection (`FlowOptions.model`) and preset-level model overrides (`quick` uses sonnet, `thorough` uses opus). This is coarse. A single flow run can cost anywhere from $2 to $50+ depending on codebase size, iteration count, and model choice. The system lacks the intelligence to minimize cost without sacrificing quality.

This research explores how Claude Code's model configuration primitives -- model aliases, effort levels, 1M context, opusplan, subagent models, and budget caps -- can be composed into an adaptive cost optimization layer inside SpecForge's orchestrator.

---

## 1. Intelligent Model Routing per Agent Role

The current `ModelSelection` type is `'opus' | 'sonnet' | 'haiku'` and is set per-flow or per-phase. But agent roles have inherently different complexity profiles.

### Role-to-Model Affinity Matrix

| Agent Role               | Default Task Complexity                          | Recommended Model | Rationale                                                                |
| ------------------------ | ------------------------------------------------ | ----------------- | ------------------------------------------------------------------------ |
| `discovery-agent`        | High (open-ended reasoning, domain modeling)     | opus              | Requirements gathering demands deep reasoning about ambiguous inputs     |
| `spec-author` (scaffold) | Medium (template-following, brief extraction)    | sonnet            | Initial scaffolding is structured transformation, not creative reasoning |
| `spec-author` (author)   | High (detailed behavioral contracts)             | opus              | Writing precise behavioral specs requires architectural reasoning        |
| `spec-author` (revise)   | Medium (targeted edits based on feedback)        | sonnet            | Revisions are scoped; the creative work is done, now it is editing       |
| `reviewer`               | High (architectural analysis, traceability gaps) | opus              | Finding subtle architectural flaws requires deep reasoning               |
| `feedback-synthesizer`   | Low (aggregation, deduplication, sorting)        | haiku             | Mechanical aggregation of structured findings                            |
| `task-decomposer`        | Medium (spec comprehension, dependency analysis) | sonnet            | Structured decomposition with clear input/output                         |
| `dev-agent` (implement)  | High (code generation, test writing)             | opus              | Implementation correctness requires careful reasoning                    |
| `dev-agent` (repair)     | Medium (targeted fixes with stack traces)        | sonnet            | Repair cycles have narrow scope: specific failures and known fixes       |
| `codebase-analyzer`      | Medium (file scanning, pattern matching)         | sonnet            | Largely mechanical analysis with some classification judgment            |
| `coverage-agent`         | Low (graph queries, metric computation)          | haiku             | Coverage computation is formulaic once the data is gathered              |

### Feature: `ModelRoutingStrategy`

Extend `PhaseDefinition` with a new strategy variant beyond `"fixed"` and `"escalating"`:

```typescript
type ModelStrategy = "fixed" | "escalating" | "role-adaptive";

interface RoleModelMapping {
  readonly role: string;
  readonly stage: string;
  readonly model: ModelSelection;
  readonly effort?: EffortLevel;
}

interface RoleAdaptiveConfig {
  readonly mappings: ReadonlyArray<RoleModelMapping>;
  readonly fallback: ModelSelection;
}
```

When `modelStrategy: "role-adaptive"`, the orchestrator consults the `RoleAdaptiveConfig` to select the model per agent spawn, rather than using a single model for the entire phase. This means in the Spec Forge phase, the `spec-author` scaffolding stage runs on sonnet, the authoring stage runs on opus, the `reviewer` runs on opus, the `feedback-synthesizer` runs on haiku, and the revision stage drops back to sonnet. A single phase uses three different models.

### Estimated Savings

Based on Claude Code's documented average costs and the assumption that opus is roughly 5x the cost of sonnet per token and sonnet is roughly 3x haiku:

- Spec Forge phase with all-opus: ~$8 per iteration (4 agent stages, all opus)
- Spec Forge phase with role-adaptive: ~$4.50 per iteration (opus for author+reviewer, sonnet for revision, haiku for synthesizer)
- Savings: ~44% per iteration, compounding across 3-5 convergence iterations

---

## 2. Effort-Level Adaptation per Flow Phase

Claude Code's effort levels (`low`, `medium`, `high`) control Opus 4.6's adaptive reasoning depth. SpecForge currently ignores this axis entirely.

### Phase-to-Effort Mapping

| Phase Type                 | Iteration Context   | Effort Level | Rationale                                                    |
| -------------------------- | ------------------- | ------------ | ------------------------------------------------------------ |
| Discovery (conversational) | User interaction    | high         | Open-ended exploration benefits from deep reasoning          |
| Spec Forge (scaffold)      | First pass          | medium       | Structured transformation, not novel reasoning               |
| Spec Forge (author)        | Content creation    | high         | Detailed behavioral contracts need careful thought           |
| Spec Forge (review)        | Evaluation          | high         | Finding flaws requires thoroughness                          |
| Spec Forge (revise)        | Targeted edits      | medium       | Scope is narrow -- specific findings to address              |
| Task Master                | Decomposition       | medium       | Structured output from clear input                           |
| Dev Forge (implement)      | First attempt       | high         | Getting implementation right the first time saves iterations |
| Dev Forge (repair)         | Subsequent attempts | medium       | Focused repairs on known failures                            |
| Verification               | Validation          | low          | Largely mechanical graph queries and metric computation      |

### Feature: `EffortLevel` in Agent Spawn Config

```typescript
type EffortLevel = "low" | "medium" | "high";

// Extension to AgentSpawnConfig
interface AgentSpawnConfig {
  // ... existing fields
  readonly effortLevel?: EffortLevel;
}
```

The `ClaudeCodeAdapter` maps this to `CLAUDE_CODE_EFFORT_LEVEL` environment variable on the spawned subprocess. Since effort levels only affect Opus 4.6, this is a no-op when the model is sonnet or haiku.

### Convergence-Responsive Effort Escalation

A more interesting strategy: within a convergence loop, start with `medium` effort and escalate to `high` when convergence stalls. If iteration 1 and 2 do not reduce critical findings, iteration 3 switches to `high` effort. This parallels `modelStrategy: "escalating"` but along the effort axis rather than the model axis.

```typescript
interface EffortEscalation {
  readonly startEffort: EffortLevel;
  readonly escalateToEffort: EffortLevel;
  readonly escalateAfterIteration: number;
  readonly trigger: "iteration-count" | "stalled-metrics";
}
```

The `stalled-metrics` trigger is the interesting one: instead of escalating after a fixed iteration count, the orchestrator detects that `PhaseMetrics.criticalFindings` has not decreased between iterations and escalates effort. This is an adaptive signal, not a static threshold.

---

## 3. Cost Prediction Engine

BEH-SF-079 specifies `specforge estimate` for predicting flow costs. This research proposes the internal architecture of that prediction engine.

### Prediction Inputs

1. **Flow definition structure** -- number of phases, stages per phase, max iterations, concurrent vs sequential
2. **Codebase metrics** -- file count, total lines, language distribution, module count
3. **Model configuration** -- which models will be used, effort levels, whether 1M context is needed
4. **Historical data** -- prior runs of the same flow against similar codebases

### Prediction Model

The cost prediction is not a single formula. It is a per-phase estimator that sums to a flow total.

```
flow_cost_estimate = sum(phase_estimates)

phase_estimate = avg_iterations * sum(stage_estimates)

stage_estimate = model_cost_per_token * estimated_tokens_per_stage

estimated_tokens_per_stage = base_tokens(role)
  + context_tokens(codebase_size, composition_strategy)
  + output_tokens(role, codebase_size)
```

Where:

- `base_tokens(role)` is a fixed overhead per role (system prompt size, tool definitions)
- `context_tokens` grows with codebase size and the composition strategy's chunk selection
- `output_tokens` is role-dependent (spec-author produces longer output than feedback-synthesizer)
- `avg_iterations` comes from historical data or heuristic defaults

### Token Cost Rates

From Claude Code's pricing (as of 2026-02-27), stored in a `PricingConfig`:

```typescript
interface PricingConfig {
  readonly models: Record<ModelSelection, ModelPricing>;
}

interface ModelPricing {
  readonly inputPer1MTokens: number;
  readonly outputPer1MTokens: number;
  readonly longContextInputPer1MTokens?: number; // beyond 200K
  readonly longContextOutputPer1MTokens?: number;
}
```

### Output Format

```
$ specforge estimate spec-writing --package @hex-di/guard --preset standard

Flow: spec-writing (standard preset)
Target: @hex-di/guard (142 files, 8,412 lines)

Phase           | Model(s)       | Est. Iterations | Token Est.     | Cost Est.
----------------|----------------|-----------------|----------------|----------
Discovery       | opus           | 1               | 45K-80K        | $0.90-$1.60
Spec Forge      | opus+sonnet    | 2-3             | 180K-450K      | $3.60-$9.00
Task Master     | sonnet         | 1               | 30K-60K        | $0.15-$0.30
Dev Forge       | opus+sonnet    | 2-4             | 200K-800K      | $4.00-$16.00
Verification    | haiku          | 1               | 20K-40K        | $0.02-$0.04

Total estimate: $8.67-$26.94 (avg: $15.80)

Historical (3 prior runs): avg $14.20, range $11.50-$18.90
```

---

## 4. Budget-Aware Orchestration

BEH-SF-073 through BEH-SF-077 define budget enforcement as a hard constraint. This research proposes a softer, adaptive layer on top: the orchestrator adjusts its strategy as budget depletes, rather than simply cutting agents off.

### Budget Depletion Zones

| Zone            | Budget Remaining | Orchestrator Behavior                                                                                                                         |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Green (>60%)    | Normal           | Use configured models and effort levels                                                                                                       |
| Yellow (30-60%) | Economize        | Downgrade non-critical agents (synthesizer, coverage) to haiku; reduce effort to medium; skip optional stages                                 |
| Orange (10-30%) | Conserve         | All agents drop to sonnet; effort drops to low; convergence thresholds relaxed (zero-critical-only); max iterations reduced to 1              |
| Red (<10%)      | Wrap-up          | Only essential stages execute; agents receive "budget critical" prompt injection instructing concise responses; no new convergence iterations |

### Implementation: `BudgetPolicy`

```typescript
interface BudgetPolicy {
  readonly zones: ReadonlyArray<BudgetZone>;
}

interface BudgetZone {
  readonly name: string;
  readonly triggerPercent: number;
  readonly modelDowngrade?: ModelSelection;
  readonly effortOverride?: EffortLevel;
  readonly maxIterationsOverride?: number;
  readonly convergenceRelaxation?: "none" | "critical-only" | "skip";
  readonly promptInjection?: string;
}
```

The orchestrator evaluates the current budget zone before each agent spawn. When transitioning between zones, it emits an orchestrator event (`budget-zone-transition`) so the dashboard and CLI can notify the user.

### Graceful Degradation vs. Hard Cutoff

The current BEH-SF-077 behavior (hard cutoff after budget exceeded) remains the final safety net. Budget-aware orchestration is the layer above it -- the system tries to avoid hitting the hard cutoff by progressively cheapening its behavior. If the user configured a $20 budget, the system should aim to complete the flow within $18-19, using the remaining budget as a safety margin for unexpected iterations.

---

## 5. Token Economy Dashboard

SpecForge's web dashboard (BEH-SF-133 through BEH-SF-138) should include a real-time cost visualization panel.

### Dashboard Views

**Live Flow View** -- during active flow execution:

- Per-agent token consumption bar chart (input vs output tokens, stacked)
- Running cost counter with budget zone indicator (green/yellow/orange/red)
- Model usage timeline: which model is active at each point in the flow
- Effort level indicator per active agent
- Estimated remaining cost to complete the flow (based on prediction engine)

**Historical Analytics View** -- across completed flows:

- Cost trend chart: cost per flow run over time, broken down by phase
- Model distribution pie chart: what percentage of tokens went to opus vs sonnet vs haiku
- Cost per convergence iteration: how much each iteration costs, showing diminishing returns
- ROI analysis: cost to reach convergence iteration N vs value of findings resolved
- Phase cost ranking: which phases consistently cost the most

**Comparison View** -- side-by-side:

- Same flow, different presets: "quick cost $4, thorough cost $22, standard cost $12"
- Same flow, different codebases: "@hex-di/guard cost $14, @hex-di/flow cost $28"
- Same codebase, different model strategies: "all-opus $20, role-adaptive $12, all-sonnet $8 (but didn't converge)"

### Data Source

All data comes from `TokenUsage` tracked per BEH-SF-078, stored as graph nodes in Neo4j:

```
(:FlowRun)-[:HAS_PHASE]->(:PhaseRun)-[:HAS_STAGE]->(:StageRun)-[:HAS_SESSION]->(:AgentSession)
```

Each `AgentSession` node carries `inputTokens`, `outputTokens`, `modelUsed`, `effortLevel`, `estimatedCost`. Aggregation queries roll up to phase and flow levels.

---

## 6. Opusplan for SpecForge Flows

Claude Code's `opusplan` alias uses Opus for planning and Sonnet for execution. This maps directly to SpecForge's flow structure.

### Mapping

- **Discovery phase** = planning. Use opus. The discovery agent reasons about requirements, domain boundaries, architectural trade-offs.
- **Spec Forge phase** = mixed planning/execution. Author and reviewer stages are planning (opus). Revision and synthesis stages are execution (sonnet).
- **Task Master phase** = planning. Use opus. Decomposing specs into task groups requires reasoning about dependencies and ordering.
- **Dev Forge phase** = execution. Use sonnet. Implementation follows the plan laid out in task groups.
- **Verification phase** = execution. Use sonnet or haiku. Mechanical validation of coverage metrics.

### Feature: `"opusplan"` as a ModelStrategy

```typescript
type ModelStrategy = "fixed" | "escalating" | "role-adaptive" | "opusplan";
```

When `modelStrategy: "opusplan"`, the orchestrator classifies each stage as "planning" or "execution" based on the agent role's nature and passes `--model opusplan` to the Claude Code CLI. Claude Code internally handles the Opus-to-Sonnet routing within a single session.

However, there is a subtlety: `opusplan` works within a single session where Opus plans and Sonnet executes tool calls. SpecForge's phases are across sessions. So the true analog is not passing `--model opusplan` to every session, but having the orchestrator act as the plan/execute router at the flow level. The orchestrator decides "this stage is planning, spawn with opus" and "this stage is execution, spawn with sonnet." This is effectively `role-adaptive` with a planning/execution classification layer.

The recommendation is to expose `"opusplan"` as a preset shorthand that configures `role-adaptive` with the planning/execution affinity matrix, rather than passing `--model opusplan` to Claude Code directly. This gives SpecForge finer control.

---

## 7. 1M Context Window Strategy

Opus 4.6 and Sonnet 4.6 support 1M token context windows. This is relevant when the composed context for an agent exceeds the standard 200K window.

### When to Enable 1M Context

| Signal                | Threshold                                        | Action                                     |
| --------------------- | ------------------------------------------------ | ------------------------------------------ |
| Codebase size         | >50K lines or >500 files                         | Enable 1M for `codebase-analyzer` sessions |
| Composed context size | >150K tokens after chunk assembly                | Enable 1M for the receiving agent          |
| Review scope          | Full-repo review (no `--diff` scoping)           | Enable 1M for `reviewer` sessions          |
| Session history       | >180K tokens accumulated in a persistent session | Enable 1M before next `sendTask()` call    |

### Cost Implications

The 1M context window uses long-context pricing beyond 200K tokens. The cost prediction engine (section 3) must account for this:

```typescript
function estimateSessionCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): number {
  const standardInputTokens = Math.min(inputTokens, 200_000);
  const longContextInputTokens = Math.max(0, inputTokens - 200_000);

  return (
    (standardInputTokens / 1_000_000) * pricing.inputPer1MTokens +
    (longContextInputTokens / 1_000_000) *
      (pricing.longContextInputPer1MTokens ?? pricing.inputPer1MTokens) +
    (outputTokens / 1_000_000) * pricing.outputPer1MTokens
  );
}
```

### Compaction vs. 1M Context Decision

The orchestrator faces a choice when a session approaches 200K tokens: compact (summarize and lose detail) or switch to 1M context (keep detail, pay more). The decision should be based on the agent's role and phase:

- **Agents in review or discovery phases**: prefer 1M context. Detail loss during compaction can cause missed findings.
- **Agents in implementation phases**: prefer compaction. The dev-agent needs its own code changes in context, not the entire conversation history. Compact with a focus directive: `"preserve code changes, test results, and current task group"`.
- **Budget-constrained flows**: always compact. The cost premium of 1M context is not justified when the user set a tight budget.

```typescript
interface CompactionPolicy {
  readonly strategy: "auto-compact" | "prefer-1m" | "always-compact";
  readonly compactFocus?: string;
  readonly autoThresholdTokens?: number;
}
```

---

## 8. Effort Level per Convergence Iteration

Within a convergence loop, the value of each iteration's output changes. Early iterations catch the obvious issues; later iterations hunt for subtle problems.

### Adaptive Effort Schedule

```
Iteration 1: effort=medium  -- Catch the low-hanging fruit cheaply
Iteration 2: effort=medium  -- Continue resolving straightforward issues
Iteration 3: effort=high    -- If not converged, switch to deep reasoning
Iteration 4: effort=high    -- Final push with maximum reasoning depth
Iteration 5: effort=high    -- Last-resort iteration, all-in
```

### Metrics-Driven Effort

A smarter approach: use `PhaseMetrics` to decide effort level.

```typescript
function selectEffort(
  iteration: number,
  prevMetrics: PhaseMetrics | undefined,
  currMetrics: PhaseMetrics
): EffortLevel {
  // First iteration: always medium
  if (iteration === 1) return "medium";

  // Metrics improving: keep medium
  if (prevMetrics && currMetrics.criticalFindings < prevMetrics.criticalFindings) {
    return "medium";
  }

  // Metrics stalled: escalate to high
  return "high";
}
```

This means: if the cheap iterations are making progress (findings decreasing), stay cheap. The moment progress stalls, invest in deeper reasoning. This avoids paying for `high` effort when `medium` is sufficient, but does not let the system waste iterations making no progress with insufficient reasoning.

---

## 9. Cost Benchmarking Across Projects

SpecForge manages multiple projects and flow types. Cost benchmarking provides organizational visibility.

### Benchmark Dimensions

| Dimension        | Example Query                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| Flow type        | "spec-writing averages $14, code-review averages $3, onboarding averages $8"                        |
| Preset           | "thorough costs 3.2x quick on average, but converges in 1.4 fewer iterations"                       |
| Model strategy   | "role-adaptive saves 38% over all-opus with no convergence penalty"                                 |
| Codebase size    | "cost scales ~linearly with file count up to 200 files, then sublinear due to compaction"           |
| Convergence rate | "opus converges in 2.1 avg iterations, sonnet in 3.4, cost-adjusted opus is cheaper for Spec Forge" |

### Neo4j Benchmark Queries

All cost data is stored in the knowledge graph. Benchmark queries are Cypher aggregations:

```cypher
// Average cost per flow type
MATCH (fr:FlowRun)-[:HAS_PHASE]->(pr:PhaseRun)-[:HAS_STAGE]->(sr:StageRun)-[:HAS_SESSION]->(s:AgentSession)
WHERE fr.status = 'completed'
RETURN fr.flowName, avg(fr.estimatedCost) AS avgCost, count(fr) AS runCount
ORDER BY avgCost DESC

// Cost per convergence iteration (diminishing returns analysis)
MATCH (pr:PhaseRun)
WHERE pr.status = 'converged'
RETURN pr.phaseName, pr.iterations, avg(pr.estimatedCost) AS avgCost
ORDER BY pr.phaseName, pr.iterations

// Model strategy effectiveness
MATCH (fr:FlowRun)
WHERE fr.status = 'completed'
RETURN fr.modelStrategy, avg(fr.estimatedCost) AS avgCost, avg(fr.totalIterations) AS avgIterations
```

### CLI Command

```
$ specforge benchmark --flow spec-writing --last 20

Flow: spec-writing (last 20 completed runs)

Metric                     | Quick    | Standard | Thorough
---------------------------|----------|----------|----------
Avg cost                   | $4.20    | $14.10   | $22.80
Avg convergence iterations | 1.0      | 2.3      | 1.8
Avg critical findings      | 2.1      | 0.0      | 0.0
Avg coverage               | 72%      | 88%      | 96%
Cost per coverage point    | $0.058   | $0.160   | $0.237
Convergence rate           | 0%       | 87%      | 100%

Recommendation: "standard" preset offers best cost/quality ratio for this project.
```

---

## 10. Enterprise Cost Allocation

For multi-team organizations using SpecForge SaaS, cost attribution is critical for chargebacks.

### Attribution Hierarchy

```
Organization
  └── Team
       └── Project
            └── Flow Run
                 └── Phase
                      └── Agent Session (atomic cost unit)
```

Every `AgentSession` node in the graph carries: `organizationId`, `teamId`, `projectId`, `flowRunId`, `phaseId`, `modelUsed`, `inputTokens`, `outputTokens`, `estimatedCost`.

### Features

- **Per-team budget caps**: `specforge config set team-budget --team backend --monthly-usd 500`
- **Per-project budget caps**: `specforge config set project-budget --project @hex-di/guard --monthly-usd 100`
- **Usage reports**: `specforge usage --team backend --month 2026-02` produces a breakdown by project and flow type
- **Alerts**: webhook notifications when a team hits 80% of their monthly budget
- **Chargeback export**: CSV/JSON export of per-team costs for finance systems

### Dashboard Widget

The web dashboard shows a team-level cost heatmap: rows are teams, columns are weeks, cell color intensity represents cost. Clicking a cell drills into the project-level breakdown.

---

## 11. Smart Compaction Strategy

Auto-compaction (at ~95% context) is a blunt instrument. SpecForge can be smarter about when and how to compact.

### Decision Matrix

| Scenario                                  | Action                                                                                | Rationale                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Agent in review phase, context at 85%     | Switch to 1M context                                                                  | Losing review context causes missed findings; worth the cost premium      |
| Agent in repair cycle, context at 85%     | Compact with focus "preserve failing tests, error messages, and current code changes" | The repair agent only needs the failure context, not the full history     |
| Agent in discovery, context at 85%        | Compact with focus "preserve requirements brief, user decisions, and research notes"  | User conversation context is important; web search results are disposable |
| Budget in orange/red zone, context at 85% | Always compact                                                                        | Cost savings override quality concerns at this budget level               |
| Estimated remaining flow cost > budget    | Compact aggressively at 70%                                                           | Pre-emptive compaction to avoid hitting 1M context pricing                |

### Feature: `CompactionStrategy` per Role

```typescript
interface CompactionConfig {
  readonly trigger: "auto" | "proactive" | "never";
  readonly triggerPercent?: number; // default 95, proactive might use 70-80
  readonly focusDirective?: string;
  readonly prefer1MOver?: number; // switch to 1M if session cost < this threshold
}
```

The orchestrator can configure compaction per agent spawn, injecting the appropriate "Compact Instructions" into the CLAUDE.md-equivalent system prompt.

---

## 12. Historical Learning and Optimization Feedback Loop

The most powerful optimization is closed-loop: the system learns which model/effort/strategy combinations work best for each flow type, codebase profile, and convergence target.

### Data Collection

Every completed flow run produces:

- Model used per agent session
- Effort level per session
- Token consumption per session
- Convergence outcome (converged vs max-iterations)
- Iterations required
- Findings produced per iteration
- Cost per phase and total

This data is already stored in Neo4j per the existing spec. The learning layer queries it.

### Learning Signals

1. **Convergence efficiency**: For a given flow+codebase profile, which model strategy converges in the fewest iterations? Fewer iterations = lower total cost even if per-iteration cost is higher.
2. **Finding detection rate**: Does opus find more critical findings per iteration than sonnet? If opus catches a critical issue in iteration 1 that sonnet misses until iteration 3, opus is cheaper overall.
3. **Effort effectiveness**: Does `high` effort produce meaningfully better results than `medium` for the `reviewer` role? If the finding count and quality are similar, `medium` is pure waste.
4. **Compaction impact**: Do sessions that compact produce worse outcomes (more iterations needed, more findings missed) than sessions that use 1M context?

### Recommendation Engine

After accumulating data from 10+ runs of the same flow type, the system can generate recommendations:

```
$ specforge optimize --flow spec-writing --project @hex-di/guard

Based on 12 prior runs:

Current strategy: standard preset (all-opus for author+reviewer, sonnet for others)
  Avg cost: $14.10, Avg iterations: 2.3, Convergence rate: 87%

Recommended strategy: role-adaptive with effort escalation
  Predicted cost: $10.20 (-28%), Predicted iterations: 2.5, Predicted convergence: 85%

Changes:
  - spec-author (scaffold): opus -> sonnet (-$1.20/run)
  - spec-author (revise): opus -> sonnet (-$0.80/run)
  - feedback-synthesizer: sonnet -> haiku (-$0.40/run)
  - reviewer: keep opus, effort medium->high only on stalled iterations (-$0.50/run)
  - dev-agent (repair): opus -> sonnet (-$1.00/run)

Trade-off: 2% lower convergence rate, 28% cost reduction.
Apply? [y/n]
```

### Implementation Approach

This does not require ML infrastructure. The recommendation engine is a rule-based system that analyzes cost and convergence data from Neo4j. The rules encode the heuristics discovered in this research (role affinity matrix, effort escalation, compaction decisions) and the data provides the evidence for which rules apply to a specific project/flow combination.

Over time, if the rule-based approach proves insufficient, a lightweight statistical model (logistic regression for convergence prediction, linear regression for cost prediction) could be trained on the accumulated Neo4j data. But the rule-based system should be the starting point.

---

## Summary: Priority Ranking

| Feature                                 | Impact                                             | Complexity                                    | Priority       |
| --------------------------------------- | -------------------------------------------------- | --------------------------------------------- | -------------- |
| Role-adaptive model routing (section 1) | High -- 40%+ cost reduction                        | Medium -- extends existing ModelStrategy      | P0             |
| Effort-level adaptation (section 2)     | Medium -- 10-20% cost reduction                    | Low -- single env var mapping                 | P0             |
| Cost prediction engine (section 3)      | High -- user trust, budget planning                | Medium -- formula + historical data           | P1             |
| Budget-aware orchestration (section 4)  | High -- prevents budget overruns gracefully        | Medium -- zone detection + strategy switching | P1             |
| Token economy dashboard (section 5)     | Medium -- visibility, not optimization             | High -- full dashboard implementation         | P2             |
| Opusplan mapping (section 6)            | Low -- subsumed by role-adaptive                   | Low -- preset configuration                   | P2             |
| 1M context strategy (section 7)         | Medium -- quality preservation for large codebases | Medium -- threshold detection + cost analysis | P1             |
| Effort per iteration (section 8)        | Medium -- iterative cost savings                   | Low -- metrics-driven function                | P1             |
| Cost benchmarking (section 9)           | Medium -- organizational learning                  | Medium -- Cypher queries + CLI output         | P2             |
| Enterprise cost allocation (section 10) | High for SaaS -- billing requirement               | High -- full attribution pipeline             | P3 (SaaS-only) |
| Smart compaction (section 11)           | Medium -- quality vs cost trade-off                | Medium -- per-role configuration              | P2             |
| Historical learning (section 12)        | High long-term -- compound optimization            | High -- data pipeline + recommendation engine | P3             |

### Key Insight

The single most impactful change is recognizing that model selection is not a flow-level or even phase-level decision -- it is a **stage-level, role-level, and iteration-level** decision. The `feedback-synthesizer` should never run on opus. The `reviewer` should never run on haiku. The first iteration of any phase should start cheaper than the last. These are deterministic rules that require no learning, only the wiring to express them in the flow execution engine.
