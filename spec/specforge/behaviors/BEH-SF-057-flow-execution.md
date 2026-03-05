---
id: BEH-SF-057
kind: behavior
title: Flow Execution
status: active
id_range: "057--064"
invariants: [INV-SF-13, INV-SF-15, INV-SF-21, INV-SF-3, INV-SF-4, INV-SF-9]
adrs: [ADR-007]
types: [flow, flow]
ports:
  [
    OrchestratorPort,
    FlowEnginePort,
    SchedulerPort,
    ConvergencePort,
    AnalyticsPort,
    CachePort,
    EventBusPort,
    FileSystemPort,
    HealthCheckPort,
    LoggerPort,
    MetricsPort,
    SerializerPort,
    ValidationPort,
  ]
---

# 08 — Flow Execution

## BEH-SF-057: Convergence Evaluation — `isConverged(metrics)` Checked after Each Iteration

> **Invariant:** [INV-SF-3](../invariants/INV-SF-3-convergence-bound.md) — Convergence Bound

Each phase has a convergence function that is evaluated after every iteration. The function receives the current `PhaseMetrics` and returns a boolean indicating whether the phase has converged.

### Contract

REQUIREMENT (BEH-SF-057): After each iteration of a phase, the system MUST compute the current `PhaseMetrics` and MUST call the phase's `isConverged(metrics)` function. If the function returns `true`, the phase MUST be marked as converged and MUST proceed to the next phase. If `false`, another iteration MUST be executed (subject to `maxIterations`).

### Verification

- Convergence test: define a convergence function that returns `true` when `criticalFindings === 0`; run a phase where findings are resolved; verify the phase converges.
- Non-convergence test: define a convergence that never returns `true`; verify the phase runs until `maxIterations`.
- Metrics pass-through test: verify the `PhaseMetrics` object passed to `isConverged` contains accurate, up-to-date values.

---

## BEH-SF-058: Phase Termination — Converged Leads to Next Phase; Max Iterations Leads to Proceed with Warning

> **Invariant:** [INV-SF-3](../invariants/INV-SF-3-convergence-bound.md) — Convergence Bound

A phase terminates in one of two ways: convergence (criteria satisfied, proceed to next phase) or max iterations exceeded (proceed to next phase with a warning recorded). Max-iterations-exceeded is a warning, not a failure.

### Contract

REQUIREMENT (BEH-SF-058): When `isConverged()` returns `true`, the phase MUST terminate with status `converged` and the flow MUST proceed to the next phase. When `maxIterations` is reached without convergence, the phase MUST terminate with status `max-iterations`, the flow MUST proceed to the next phase, and a warning MUST be recorded as a finding in the ACP session. No phase MUST run indefinitely.

### Verification

- Converged termination test: verify a converged phase reports status `converged` in `PhaseResult`.
- Max iterations test: verify a non-converging phase terminates after `maxIterations` with status `max-iterations`.
- Warning test: verify a `max-iterations` termination produces a warning finding in the ACP session.
- No-infinite-loop test: set `maxIterations: 1`; verify the phase terminates after exactly 1 iteration.

---

## BEH-SF-059: Progressive Execution — Flow Pauses after Each Phase for User Review (Default)

In the default progressive execution mode, the flow pauses after every phase, allowing the user to review phase outputs before proceeding. Within a phase, all iterations run without pausing.

### Contract

REQUIREMENT (BEH-SF-059): In progressive execution mode (the default), the system MUST pause the flow after each phase completes, MUST emit a phase-pause notification to the desktop app or CLI, and MUST wait for an explicit resume action (`resumeFlow`) before proceeding to the next phase. Iterations within a phase MUST NOT pause.

### Verification

- Pause test: run a flow in progressive mode; verify it pauses after the first phase.
- Resume test: pause after a phase; call `resumeFlow`; verify the next phase starts.
- Intra-phase test: verify iterations within a phase execute continuously without pausing.

---

## BEH-SF-060: Batch Execution — Phases Run without Pausing (Opt-In via --batch)

Batch execution mode runs all phases sequentially without pausing between them. It is enabled via the `--batch` CLI flag or `executionMode: "batch"` in the flow definition.

### Contract

REQUIREMENT (BEH-SF-060): When batch execution mode is enabled, the system MUST execute all phases sequentially without pausing between them. The flow MUST complete (or fail) without requiring user interaction. Batch mode MUST be activatable via `--batch` CLI flag or `FlowOptions.batch = true`.

### Verification

- Batch test: run a flow with `--batch`; verify all phases execute without pausing.
- CI test: run in a headless environment with `--batch`; verify the flow completes with an exit code.
- Default test: run without `--batch`; verify the flow pauses (progressive mode is default).

---

## BEH-SF-061: Metric Computation — Findings Counted, Coverage Computed from Graph

Phase metrics are computed after each iteration. Finding counts come from the ACP session messages (filtered by severity and status `open`). Coverage is computed from the graph (`requirementsCovered / totalRequirements * 100`). Test results come from `TestRunnerPort`.

### Contract

REQUIREMENT (BEH-SF-061): After each iteration, the system MUST compute `PhaseMetrics` where: `criticalFindings` = count of open critical findings, `majorFindings` = count of open major findings, `minorFindings` = count of open minor findings, `coveragePercent` = (`requirementsCovered` / `totalRequirements`) \* 100 (a requirement is "covered" if it has at least one `TRACES_TO` task with `status != "blocked"`), `testsPass`/`testsFail` from `TestRunnerPort.getResults()`. Phases without test execution MUST report 0/0 for test metrics.

### Verification

- Finding count test: add findings with various severities; verify counts in `PhaseMetrics` match expected values.
- Coverage test: create requirements with varying traceability; verify `coveragePercent` is computed correctly.
- Test metrics test: run tests; verify `testsPass` and `testsFail` match `TestRunResult`.
- No-test phase test: verify phases without test execution report 0/0 for test metrics.

---

## BEH-SF-062: Stage DAG Scheduling — Stages Execute Sequentially within Phase; Concurrent within Stage if Marked

> **Invariant:** [INV-SF-4](../invariants/INV-SF-4-dependency-respecting-execution.md) — Dependency-Respecting Execution

Stages within a phase execute sequentially in their defined order. Within a stage marked `concurrent: true`, multiple agent roles run in parallel. No stage begins before its predecessor completes.

### Contract

REQUIREMENT (BEH-SF-062): The scheduler MUST execute stages in the order defined by the phase definition. A stage MUST NOT begin until the previous stage has completed. Within a stage with `concurrent: true`, the system MUST run all agent roles in parallel up to the concurrency limit. Within a stage with `concurrent: false` (or unset), agents MUST run sequentially.

### Verification

- Sequential test: define stages A, B, C; verify B does not start until A completes.
- Concurrent test: define a stage with `concurrent: true` and two agent roles; verify both run simultaneously.
- Non-concurrent test: define a stage without `concurrent`; verify agents run sequentially.

---

## BEH-SF-063: Concurrency Limit — Max Concurrent Agents Configurable (Default 4)

The maximum number of agent subprocesses running simultaneously is configurable per flow run (default: 4). This controls the parallelism within `concurrent: true` stages.

### Contract

REQUIREMENT (BEH-SF-063): When a `concurrent: true` stage has more agent roles than the concurrency limit, the system MUST run at most `concurrency` agents simultaneously, queuing the rest. The concurrency limit MUST default to 4 and MUST be configurable via `FlowOptions.concurrency` or `--concurrency` CLI flag.

### Verification

- Limit test: set concurrency to 2, run a stage with 4 agents; verify at most 2 run simultaneously.
- Default test: run without specifying concurrency; verify the default is 4.
- Override test: set concurrency via CLI flag; verify the new limit is respected.

---

## BEH-SF-064: Concurrent Agent Failure — Failed Agent Error Recorded, Other Agents in Stage Complete

When one concurrent agent fails (crash, error), other agents in the same stage complete their current LLM turn. The failed agent's error is recorded as a finding in the ACP session. The phase then evaluates convergence normally.

### Contract

REQUIREMENT (BEH-SF-064): When an agent fails within a `concurrent: true` stage, the system MUST allow other agents in the same stage to complete their current LLM turn (in-flight request finishes, no new turns dispatched to the failed stage). The failure MUST be recorded as a finding in the ACP session with error details. The phase MUST then evaluate convergence normally — the failure may or may not prevent convergence depending on the criteria.

### Verification

- Failure isolation test: fail one agent in a concurrent stage; verify other agents complete their current turn.
- Error recording test: verify the failed agent's error appears as a finding in the ACP session.
- Convergence test: verify the phase evaluates convergence after the stage completes, including the failure finding.

---

## Budget Zone Transitions

> **Invariant [INV-SF-15]**: Token budget zones (Green -> Yellow -> Orange -> Red) must transition monotonically within a single flow run.

**BEH-SF-303:** Budget zone transitions MUST be atomic with respect to token accounting — no concurrent token update can observe an intermediate state.

**BEH-SF-304:** Race conditions between concurrent token updates from parallel agents MUST be resolved by optimistic locking with retry.

**BEH-SF-305:** Budget zone MUST reset to Green at the start of each new phase (not mid-phase).

---

## Schema Validation Enforcement (INV-SF-13)

> **Invariant [INV-SF-13]**: Structured output from agents MUST be validated against registered schema before acceptance.

**BEH-SF-306:** Structured output received from agent sessions MUST be validated against the registered JSON schema before the output is accepted into the flow pipeline.

---

## Flow Error Handling

**BEH-SF-315:** Attempting to start a flow that is already running MUST return `FlowAlreadyRunningError` with the existing `flowRunId`.

**BEH-SF-316:** Starting a flow with an unknown flow name MUST return `FlowNotFoundError` with the requested name and a list of available flow names.

**BEH-SF-317:** Phase execution failure MUST return `PhaseError` wrapping the underlying cause, including the phase name, iteration number, and elapsed time.

---

## Convergence Evaluation

**BEH-SF-367:** Convergence evaluation MUST compute three metrics: finding deltas (new findings since last iteration), coverage changes (% of requirements addressed), and trend direction (improving/stable/degrading).

**BEH-SF-368:** Convergence MUST be evaluated after each phase iteration completes, before deciding whether to repeat the phase or advance.

**BEH-SF-369:** A phase converges when: finding delta is zero AND coverage trend is stable or improving for 2 consecutive iterations.

---

## Phase Scheduling

**BEH-SF-381:** Phase scheduling MUST respect declared phase dependencies — a phase cannot start until all its prerequisites have completed.

**BEH-SF-382:** Parallel-eligible phases (no mutual dependencies) MUST execute concurrently when sufficient agent pool resources are available.

**BEH-SF-383:** The scheduler MUST enforce maximum iteration counts per phase to prevent infinite loops (default: 10 iterations).

---

## Analytics and Metrics

**BEH-SF-384:** Flow metrics (total tokens, duration, finding counts, convergence iterations) MUST be computed and persisted at flow completion.

**BEH-SF-385:** Quality trends MUST aggregate metrics across the last 10 flow runs for the same project, providing trend direction for each metric.

**BEH-SF-386:** Analytics data MUST be queryable via the GraphQueryPort for dashboard consumption.

---

## Infrastructure Port Behaviors

### CacheService

**BEH-SF-337:** Cache entries MUST have a configurable TTL (default: 300 seconds). Expired entries are evicted lazily on next access.

**BEH-SF-338:** Cache MUST support invalidation by key pattern (glob matching) for bulk cache clearing.

### EventBusService

**BEH-SF-339:** Event publication MUST be fire-and-forget — publisher is not blocked by subscriber processing time.

**BEH-SF-340:** Subscriber errors MUST NOT propagate to the event publisher. Failed subscriptions are logged and the event continues to remaining subscribers.

### FileSystemService

**BEH-SF-341:** File write operations MUST use atomic write (write to temp file, then rename) to prevent partial writes on crash.

**BEH-SF-342:** Path traversal attempts (e.g., `../../etc/passwd`) MUST be rejected with `FileAccessError`.

### HealthCheckService

**BEH-SF-343:** Health check MUST probe all critical ports (GraphStore, MessageExchange, SessionManager) within a 5-second timeout per check.

**BEH-SF-344:** Health status MUST be one of: `healthy` (all checks pass), `degraded` (non-critical check fails), `unhealthy` (critical check fails).

### LoggerService

**BEH-SF-345:** Log entries MUST include structured fields: `timestamp`, `level`, `message`, `correlationId` (flowRunId or sessionId).

**BEH-SF-346:** Sensitive data (API keys, tokens, credentials) MUST be redacted from log output via configurable patterns.

### MetricsService

**BEH-SF-347:** Metrics MUST support three types: counters (monotonically increasing), gauges (point-in-time values), and histograms (distribution of values).

**BEH-SF-348:** Metrics export MUST support Prometheus exposition format.

### SerializerService

**BEH-SF-349:** Serialization MUST be deterministic — the same input always produces the same byte output (sorted keys, stable formatting).

**BEH-SF-350:** Deserialization MUST validate against the expected schema and return `SerializationError` on mismatch.

### ValidationService

**BEH-SF-351:** Input validation MUST run before any domain logic processes the input — fail-fast on invalid data.

**BEH-SF-352:** Validation errors MUST include the field path, expected constraint, and actual value for debugging.

---
