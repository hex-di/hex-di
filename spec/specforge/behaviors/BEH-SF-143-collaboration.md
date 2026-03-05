---
id: BEH-SF-143
kind: behavior
title: Collaboration
status: active
id_range: "143--150"
invariants: [INV-SF-7, INV-SF-16]
adrs: [ADR-010]
types: [auth, auth]
ports: [EventBusPort, AuthPort]
---

# 21 — Collaboration

## BEH-SF-143: Shared Flow Observation — Multiple Users View Same Flow via Web Dashboard

Multiple users can observe the same flow run simultaneously via the web dashboard. Each connected client receives the same real-time event stream.

### Contract

REQUIREMENT (BEH-SF-143): When multiple browser clients connect to the web dashboard for the same flow run, the SpecForge Server MUST stream the same events to all clients via WebSocket. Each client MUST see identical flow progress, agent activity, and convergence metrics. Joining an in-progress flow MUST replay the current state (phase status, findings count, token usage) before streaming live events.

### Verification

- Multi-client test: connect two browsers to the same flow run; verify both receive the same events.
- Late join test: start a flow, connect a second client mid-flow; verify it receives the current state before live events.
- Isolation test: verify clients watching different flow runs do not receive cross-flow events.
- Disconnect test: disconnect one client; verify the other continues receiving events.

---

## BEH-SF-144: Comment Threads on Findings and Spec Sections

Users can create comment threads on findings and spec document sections. Comments are persisted in the knowledge graph and associated with the relevant node.

### Contract

REQUIREMENT (BEH-SF-144): The system MUST support comment threads on `Finding` nodes and `SpecFile` section nodes. `CommentPort.createThread(targetNodeId, comment)` MUST create a new thread. `CommentPort.reply(threadId, comment)` MUST add a reply. Comments MUST include `authorUserId`, `content`, and `createdAt`. Comments MUST be visible in both the web dashboard findings view and VS Code findings panel.

### Verification

- Create thread test: create a comment thread on a finding; verify it is persisted in the graph.
- Reply test: reply to a thread; verify the reply is associated with the correct thread.
- Finding view test: verify comments are visible on findings in the web dashboard.
- VS Code test: verify comments are visible in the VS Code findings panel.

---

## BEH-SF-145: Approval Workflows — Multi-User Approval for Phase Gates

Phase approval gates (from BEH-SF-125) support multi-user approval in SaaS mode. A phase can require approval from N of M designated approvers before proceeding.

### Contract

REQUIREMENT (BEH-SF-145): When a `PhaseDefinition` has `requiresApproval: true` and `approvers` is specified, the system MUST wait for the required number of approvals before proceeding. `approvers` MUST specify a list of user IDs or roles and the minimum approval count. Each approver MUST approve independently via CLI (`specforge approve`) or web dashboard. The approval status MUST be visible to all connected clients.

### Verification

- Multi-approval test: configure 2 of 3 approvers; verify the phase does not proceed until 2 approvals are received.
- Single approval test: configure 1 approver; verify the phase proceeds after 1 approval.
- Dashboard visibility test: verify all clients see which approvers have approved.
- CLI approval test: verify approvals work via both CLI and web dashboard.

---

## BEH-SF-146: Multi-Project Switching

Users can switch between projects in the web dashboard and VS Code extension. The active project determines which knowledge graph is queried.

### Contract

REQUIREMENT (BEH-SF-146): The web dashboard MUST provide a project switcher showing all accessible projects. Switching projects MUST update all views (flow monitor, graph explorer, findings, cost tracker) to reflect the selected project's data. The VS Code extension MUST provide a `specforge.switchProject` command. Project state MUST be persisted across browser/VS Code sessions.

### Verification

- Switch test: switch projects in the dashboard; verify all views update to the new project.
- Persistence test: switch projects, close browser, reopen; verify the selected project is restored.
- VS Code test: run `specforge.switchProject`; verify the extension updates to the new project.
- Data isolation test: verify data from the previous project is not visible after switching.

---

## BEH-SF-147: Session Ownership and Handoff

Flow runs have an owner (the user who started them). Ownership can be handed off to another user, transferring control of intervention commands (feedback, converge, approve).

### Contract

REQUIREMENT (BEH-SF-147): Each flow run MUST have an `ownerId` set to the user who started it. The owner MUST be the only user who can execute intervention commands (`feedback`, `converge`, `iterate`, `approve`, `reject`, `cancel`) unless ownership is transferred. `specforge run handoff <flow-run-id> <user-id>` MUST transfer ownership. In solo mode, ownership is implicit (single user).

### Verification

- Owner test: start a flow; verify the `ownerId` is set to the starting user.
- Intervention test: attempt an intervention command from a non-owner; verify it is rejected.
- Handoff test: hand off ownership; verify the new owner can execute intervention commands.
- Solo mode test: verify all intervention commands work without ownership checks in solo mode.

---

## BEH-SF-148: Real-Time Presence Indicators — Web Dashboard

The web dashboard shows which users are currently viewing each flow run, providing awareness of who is observing.

### Contract

REQUIREMENT (BEH-SF-148): The web dashboard MUST show presence indicators (avatar/name badges) for all users currently viewing the same flow run. Presence MUST be tracked via WebSocket heartbeats. Users MUST appear within 2 seconds of opening a flow view and disappear within 10 seconds of closing it. Presence indicators MUST be visible on the flow monitor view.

### Verification

- Presence test: open a flow view; verify the user's presence indicator appears for other viewers.
- Disappear test: close the flow view; verify the presence indicator is removed within 10 seconds.
- Multiple users test: connect 3 users; verify all 3 presence indicators are visible.
- Heartbeat test: simulate a network drop; verify the user's presence is removed after timeout.

---

## BEH-SF-149: VS Code Shared Findings View

The VS Code extension findings panel shows findings from all users' flow runs in the current project, enabling team-wide visibility of discovered issues.

### Contract

REQUIREMENT (BEH-SF-149): The VS Code extension findings panel MUST display findings from all flow runs in the current project, not just the current user's runs. Findings MUST be grouped by flow run and sortable by severity. Each finding MUST show the originating user and flow run. `--mine` filter MUST show only the current user's findings.

### Verification

- All findings test: verify findings from other users' flow runs appear in the VS Code panel.
- Grouping test: verify findings are grouped by flow run.
- Attribution test: verify each finding shows the originating user.
- Filter test: apply `--mine` filter; verify only the current user's findings are shown.

---

## BEH-SF-150: Event Streaming to All Connected Clients

All orchestrator events are streamed to all connected clients (web dashboard and VS Code extensions) for the active project.

### Contract

REQUIREMENT (BEH-SF-150): The SpecForge Server MUST maintain a WebSocket connection per connected client (web dashboard or VS Code extension). All orchestrator events (`flow-started`, `phase-completed`, `finding-added`, `agent-spawned`, `budget-warning`, `flow-completed`, `human-feedback-posted`) MUST be broadcast to all clients subscribed to the relevant project. Clients MUST be able to subscribe to specific event types via a filter message.

### Verification

- Broadcast test: emit a `flow-started` event; verify all connected clients receive it.
- Project scoping test: verify clients only receive events for their active project.
- Filter test: subscribe to `finding-added` only; verify other event types are not received.
- VS Code test: verify the VS Code extension receives events via its WebSocket connection.
- Reconnect test: disconnect and reconnect; verify event streaming resumes without missing events.
