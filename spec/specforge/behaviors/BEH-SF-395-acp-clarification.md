---
id: BEH-SF-395
kind: behavior
title: ACP Clarification Timeout Handling
status: active
id_range: 395--395
invariants: [INV-SF-28, INV-SF-4]
adrs: [ADR-018]
types: [acp]
ports: [ACPServerPort]
---

# 56 — ACP Clarification Timeout Handling

**Feature:** [FEAT-SF-005](../features/FEAT-SF-005-acp-protocol.md)

---

## BEH-SF-395: Clarification Timeout — Apply Default Action on Expiry

> **Invariant:** [INV-SF-4](../invariants/INV-SF-4-token-budget-enforcement.md) — Token Budget Enforcement

When an agent requests human clarification via the ACP await mechanism, the system sets a configurable timeout. If the human does not respond within the timeout window, the system applies the pre-configured default action (skip, use-default-value, or abort) to unblock the agent and prevent indefinite stalling.

### Contract

REQUIREMENT (BEH-SF-395): When an ACP clarification request is created with `awaitHumanInput(question, options)`, the system MUST start a timeout timer with the configured duration (default: 300 seconds). If no human response is received before the timer expires, the system MUST apply the default action specified in the clarification request's `defaultAction` field. The applied default MUST be recorded in the ACP message history as an auto-resolved clarification with `resolution: "timeout"`. The agent MUST be notified of the resolution and MUST continue execution with the default value. If `defaultAction` is `"abort"`, the system MUST cancel the current run with `ClarificationTimeoutError`.

### Verification

- Timeout test: create a clarification request with 1-second timeout; wait without responding; verify the default action is applied.
- Recording test: after timeout, verify the ACP message history contains a `resolution: "timeout"` entry.
- Abort test: set `defaultAction` to `"abort"`; let timeout expire; verify the run is cancelled with `ClarificationTimeoutError`.
- Pre-timeout response test: respond before timeout; verify the human response is used and no default action is applied.
