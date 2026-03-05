---
id: BEH-SF-121
kind: behavior
title: Human-in-the-Loop
status: active
id_range: "121--126"
invariants: [INV-SF-1, INV-SF-22]
adrs: [ADR-007]
types: [acp, acp]
ports: [MessageExchangePort, OrchestratorPort]
---

# 17 — Human-in-the-Loop

**Related:** [BEH-SF-233](./BEH-SF-229-acp-messaging.md) (Human Feedback via Await), [BEH-SF-232](./BEH-SF-229-acp-messaging.md) (Clarification via Await)

## BEH-SF-121: Human Feedback Message Kind — `human-feedback` on ACP Session with Highest Priority

Human feedback is injected into a running flow as ACP messages with `role: "user"` and `priority: "highest"` metadata. This ensures human feedback is surfaced above all agent-generated findings when the `feedback-synthesizer` processes the ACP session history. See also [BEH-SF-233](./BEH-SF-229-acp-messaging.md).

### Contract

REQUIREMENT (BEH-SF-121): The system MUST support human feedback as `ACPMessage` with `role: "user"` and `priority: "highest"` in metadata. Human feedback MUST be posted via `MessageExchangeService.postMessage()`. Human feedback MUST appear in the session history delta read by agents on their next iteration. The `HumanFeedbackPosted` event MUST be emitted when human feedback is posted.

### Verification

- Message kind test: post a `human-feedback` message; verify it is persisted on the ACP session with `kind: 'human-feedback'`.
- Priority test: verify human feedback messages carry `priority: 'highest'`.
- Delta test: post human feedback during a flow; verify the next agent iteration receives it in its ACP session delta.
- Event test: verify a `HumanFeedbackPosted` event is emitted when human feedback is posted.

---

## BEH-SF-122: CLI Feedback Command — `specforge feedback <flow-run-id> "message"`

The CLI provides `specforge feedback` to inject human feedback into a running flow. The message is posted to the flow's ACP session as a `human-feedback` message kind.

### Contract

REQUIREMENT (BEH-SF-122): `specforge feedback <flow-run-id> "<message>"` MUST post a user `ACPMessage` with `priority: "highest"` metadata to the ACP session of the specified flow run. The command MUST fail with exit code 1 if the flow run is not active. The command MUST output confirmation of the posted feedback. `--file <path>` MUST allow reading feedback from a file instead of an inline argument.

### Verification

- Post test: run `specforge feedback <id> "fix the API naming"`; verify the message appears on the ACP session.
- Active flow test: attempt feedback on a completed flow; verify exit code 1.
- File test: run with `--file feedback.md`; verify the file contents are posted as feedback.
- Confirmation test: verify stdout confirms the feedback was posted with a message ID.

---

## BEH-SF-123: Synthesizer Priority — Human Feedback Ranked Above Agent Findings

The `feedback-synthesizer` treats `human-feedback` messages as higher priority than agent-generated findings. When synthesizing action items, human feedback appears first in the prioritized list, regardless of agent finding severity.

### Contract

REQUIREMENT (BEH-SF-123): When the `feedback-synthesizer` processes the ACP session history, it MUST rank user messages (with `priority: "highest"`) above all agent findings, including `critical` severity findings. The synthesized feedback document MUST list human feedback action items before any agent-generated items. Human feedback MUST NOT be deduplicated against agent findings — it always appears as a distinct action item.

### Verification

- Priority test: post human feedback alongside critical agent findings; verify human feedback appears first in the synthesized document.
- Distinct test: post human feedback that overlaps with an agent finding; verify both appear in the synthesis (no deduplication).
- Multiple feedback test: post two human feedback messages; verify both appear before agent findings, ordered chronologically.

---

## BEH-SF-124: Phase Intervention — Force-Converge or Force-Iterate a Running Phase

Humans can intervene in a running phase by forcing convergence (skip remaining iterations) or forcing another iteration (even if convergence criteria are met).

### Contract

REQUIREMENT (BEH-SF-124): `specforge converge <flow-run-id>` MUST force the current phase to converge immediately, skipping remaining iterations. The phase status MUST be `converged` with a `forced: true` flag. `specforge iterate <flow-run-id>` MUST force one additional iteration even if convergence criteria are already met. Both commands MUST fail with exit code 1 if no phase is currently running. Forced convergence MUST be recorded as an event in the ACP session.

### Verification

- Force converge test: run `specforge converge <id>` during an active phase; verify the phase completes with `forced: true`.
- Force iterate test: run `specforge iterate <id>` after convergence criteria are met; verify one more iteration executes.
- No active phase test: attempt intervention when no phase is running; verify exit code 1.
- Event test: verify forced convergence is recorded as a `PhaseForceConverged` event in the ACP session.

---

## BEH-SF-125: Approval Gates — Per-Phase `requiresApproval` Pauses for Human Sign-Off

Phases can be configured with `requiresApproval: true`, causing the phase to pause after convergence and wait for explicit human approval before the flow proceeds to the next phase.

### Contract

REQUIREMENT (BEH-SF-125): When a `PhaseDefinition` has `requiresApproval: true`, the phase MUST pause after convergence (or max iterations) by entering an ACP await state. It MUST wait for human approval via `specforge approve <flow-run-id>` (which resumes the awaiting run) before proceeding to the next phase. `specforge reject <flow-run-id> --reason "<reason>"` MUST cancel the flow with the rejection reason recorded. The web dashboard MUST display a prominent approval prompt. The phase status during the wait MUST be `awaiting-approval`.

### Verification

- Approval gate test: configure `requiresApproval: true` on a phase; run the flow; verify the phase pauses with `awaiting-approval` status.
- Approve test: run `specforge approve <id>`; verify the flow proceeds to the next phase.
- Reject test: run `specforge reject <id> --reason "incomplete"`; verify the flow is cancelled with the reason recorded.
- Dashboard test: verify the web dashboard shows an approval prompt when a phase is awaiting approval.

---

## BEH-SF-126: Web Dashboard Feedback — Input Box on Flow Monitor View

The web dashboard flow monitor view includes a feedback input box for posting human feedback without switching to the CLI.

### Contract

REQUIREMENT (BEH-SF-126): The web dashboard flow monitor view MUST include a text input area for posting human feedback to the active flow run. Submitting feedback MUST call the same `MessageExchangeService.postMessage()` with `role: "user"` and `priority: "highest"` metadata as the CLI command. The feedback input MUST be disabled when no flow is active. Posted feedback MUST appear immediately in the flow monitor's event stream via WebSocket.

### Verification

- Input test: verify the flow monitor view displays a feedback input area when a flow is active.
- Post test: submit feedback via the dashboard; verify it appears on the ACP session as `human-feedback`.
- Disabled test: verify the input is disabled when no flow is active.
- Real-time test: submit feedback; verify it appears in the event stream without page refresh.
