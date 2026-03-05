---
id: BEH-SF-408
kind: behavior
title: Session Replay
status: active
id_range: 408--415
invariants: [INV-SF-11, INV-SF-42]
adrs: [ADR-006]
types: [acp, flow]
ports: [SessionSnapshotStorePort]
---

# 62 — Session Replay

**Feature:** [FEAT-SF-035](../features/FEAT-SF-035-session-replay.md)

---

## BEH-SF-408: Session Snapshot Persistence — Full State Capture

Every session execution is captured as an immutable snapshot containing the complete state: context assembly, tool calls with inputs/outputs, token usage, convergence signals, and agent reasoning traces. Snapshots are persisted for later replay and analysis.

### Contract

REQUIREMENT (BEH-SF-408): `SessionSnapshotStorePort.persist(sessionId, snapshot)` MUST store an immutable snapshot containing: `contextChunks` (assembled context), `toolCalls` (array of {tool, input, output, durationMs, tokensUsed}), `agentOutputs` (raw agent responses), `convergenceSignals` (evaluation results per iteration), and `metadata` (timestamps, agentRole, phaseId, flowId). Once persisted, the snapshot MUST NOT be modifiable (INV-SF-11). `SessionSnapshotStorePort.get(sessionId)` MUST return the snapshot or `SnapshotNotFoundError`.

### Verification

- Persistence test: execute a session; call `persist`; call `get`; verify all fields are present and match.
- Immutability test: attempt to modify a persisted snapshot; verify the operation is rejected or has no effect.
- Not-found test: call `get` with a non-existent sessionId; verify `SnapshotNotFoundError`.

---

## BEH-SF-409: Step-Through Replay — Chronological Tool Call Navigation

Operators can replay a session step by step, navigating through tool calls in chronological order. Each step shows the tool invoked, its input, its output, the tokens consumed, and the elapsed time.

### Contract

REQUIREMENT (BEH-SF-409): `SessionSnapshotStorePort.createReplayIterator(sessionId)` MUST return an iterator that yields tool calls in chronological order. Each yielded step MUST contain: `stepIndex`, `tool`, `input`, `output`, `durationMs`, `tokensUsed`, and `timestamp`. The iterator MUST support `next()`, `previous()`, `seekTo(stepIndex)`, and `reset()` operations. Calling `next()` past the last step MUST return `{ done: true }`.

### Verification

- Forward replay test: iterate through all steps; verify they appear in chronological order.
- Seek test: call `seekTo(3)`; verify the iterator yields step 3 on next `next()` call.
- Boundary test: iterate past the last step; verify `{ done: true }` is returned.

---

## BEH-SF-410: Context Inspection — View Composed Chunks

For any session step, operators can inspect the context that was composed and sent to the agent. This shows which memory chunks, system prompts, and user inputs were assembled.

### Contract

REQUIREMENT (BEH-SF-410): `SessionSnapshotStorePort.getContextAt(sessionId, stepIndex)` MUST return the context state as it existed at the specified step. The context MUST include: `systemPrompt`, `memoryChunks` (array of {source, content, tokenCount}), `userInput`, `toolResults` (accumulated tool outputs), and `totalTokens`. The context MUST reflect the cumulative state at that step, not just the delta.

### Verification

- Context retrieval test: get context at step 5; verify it includes cumulative tool results from steps 0–4.
- Chunk detail test: verify each memory chunk includes source, content, and token count.
- Step 0 test: get context at step 0; verify it contains only the initial system prompt and user input.

---

## BEH-SF-411: Decision Tracing — Follow Agent Action Chain

For each agent action, the system captures the reasoning chain: what input triggered the action, which tool was selected and why, what the tool returned, and how the agent processed the result.

### Contract

REQUIREMENT (BEH-SF-411): `SessionSnapshotStorePort.getDecisionTrace(sessionId, stepIndex)` MUST return a trace containing: `trigger` (the input that caused the agent to act), `toolSelection` (selected tool and selection rationale if available), `toolInput` (exact input sent to the tool), `toolOutput` (exact output received), `agentInterpretation` (how the agent processed the result), and `nextAction` (what the agent decided to do next). If the agent's reasoning is not available (opaque model), `agentInterpretation` MUST be `null`.

### Verification

- Trace retrieval test: get decision trace for a step; verify all fields are populated.
- Opaque model test: when agent reasoning is unavailable; verify `agentInterpretation` is `null`.
- Chain test: follow `nextAction` links across steps; verify they form a connected chain.

---

## BEH-SF-412: Session Diff — Compare Two Sessions Side-by-Side

Operators can compare two sessions (e.g., a successful run vs. a failed run) side-by-side. The diff highlights divergence points: where tool calls differed, where context diverged, and where convergence signals separated.

### Contract

REQUIREMENT (BEH-SF-412): `SessionSnapshotStorePort.diff(sessionIdA, sessionIdB)` MUST return a structured diff containing: `divergencePoint` (the first step index where the sessions differ), `toolCallDiffs` (array of {stepIndex, sessionA, sessionB} for each differing tool call), `contextDiffs` (differences in composed context at each step), and `convergenceDiffs` (where convergence signals diverged). Sessions with different agent roles MUST still be diffable but MUST include a `roleWarning` field.

### Verification

- Identical sessions test: diff two identical sessions; verify empty diff arrays and no divergence point.
- Divergence test: diff two sessions that diverge at step 3; verify `divergencePoint` is 3.
- Cross-role test: diff sessions with different roles; verify `roleWarning` is present.

---

## BEH-SF-413: Token Usage Breakdown — Per Tool Call Token Accounting

Every tool call in a session snapshot includes detailed token usage: prompt tokens, completion tokens, and total tokens. Aggregate views show token consumption per phase, per agent, and per tool.

### Contract

REQUIREMENT (BEH-SF-413): Each tool call in the session snapshot MUST include `tokens: { prompt, completion, total }`. `SessionSnapshotStorePort.getTokenBreakdown(sessionId)` MUST return aggregated token usage: `byTool` (total per tool name), `byPhase` (total per phase), `byAgent` (total per agent role), and `total` (session-wide total). All token counts MUST be non-negative integers. The sum of `byTool` values MUST equal `total`.

### Verification

- Per-call test: verify each tool call in the snapshot contains prompt, completion, and total token counts.
- Aggregation test: call `getTokenBreakdown`; verify `byTool` sums equal `total`.
- Consistency test: verify `byPhase` and `byAgent` aggregations are internally consistent.

---

## BEH-SF-414: Convergence Signal Visualization — See Why Phases Terminated

For each convergence evaluation point in a session, the system records: the evaluation criteria, the current signals, the threshold, and the decision (continue or terminate). This enables operators to understand why a phase ran additional iterations or terminated.

### Contract

REQUIREMENT (BEH-SF-414): `SessionSnapshotStorePort.getConvergenceHistory(sessionId)` MUST return an array of convergence evaluations ordered by iteration. Each evaluation MUST contain: `iteration` (number), `criteria` (the configured convergence criteria), `signals` (current signal values), `threshold` (the configured threshold), `decision` ("continue" or "terminate"), and `reason` (human-readable explanation). The final evaluation in a completed session MUST have `decision: "terminate"`.

### Verification

- History test: execute a 3-iteration phase; verify 3 convergence evaluations are recorded.
- Terminal test: verify the last evaluation has `decision: "terminate"`.
- Signal test: verify each evaluation's `signals` reflect the actual state at that iteration.

---

## BEH-SF-415: Export as Report — Shareable Session Replay

Session replay data can be exported as a self-contained report (HTML or Markdown) that can be shared with team members who don't have access to the SpecForge instance.

### Contract

REQUIREMENT (BEH-SF-415): `SessionSnapshotStorePort.exportReport(sessionId, format)` MUST generate a self-contained report in the specified format (`"html"` or `"markdown"`). The report MUST include: session metadata, chronological tool call log with inputs/outputs, context composition summary, token usage breakdown, and convergence history. HTML reports MUST be a single file with embedded styles (no external dependencies). The export MUST complete within 10 seconds for sessions with up to 100 tool calls.

### Verification

- HTML export test: export as HTML; verify the file is self-contained with embedded styles.
- Markdown export test: export as Markdown; verify all sections are present.
- Content test: verify the report includes tool calls, token breakdown, and convergence history.
