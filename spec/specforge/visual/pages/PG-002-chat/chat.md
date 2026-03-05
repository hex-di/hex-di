# PG-002 Chat

**ID:** PG-002-chat
**Route:** `#chat`
**Layout:** single-column (vertical split: messages area + input area)

---

## Overview

The Chat page provides the discovery conversation interface. It is a vertically-split single-column layout with four stacked regions: a token budget bar at the very top, a discovery status bar below it, a scrollable message list that takes all remaining vertical space, and a chat input area pinned to the bottom.

This page requires an active session. If `STR-002.sessionId` is null, the page redirects to `#home` or displays a no-session prompt.

---

## ASCII Wireframe

```
+------------------------------------------------------------------------+
|                        PG-002 Chat (full width)                        |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-007 Token Budget Bar                                        |  |
|  |  Token Budget: 45% used (90,000 / 200,000)                      |  |
|  |  [==========================                              ]  45% |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-008 Discovery Status Bar                                    |  |
|  |  Discovery Phase  |  Brief: [Ready]  |  Accepted: [No]           |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-009 Message List (scrollable, flex-grow: 1)                 |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  |  [Agent]  Welcome! I'll help you discover the spec...      |  |  |
|  |  |           2026-02-27 10:00                                 |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  |  [User]   I want to define a guard policy system.          |  |  |
|  |  |           2026-02-27 10:01                                 |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  |  [Agent]  Great. Let me analyze the codebase...            |  |  |
|  |  |           2026-02-27 10:01                                 |  |  |
|  |  |  +-- Tool Results --+                                      |  |  |
|  |  |  | codeSearch: found 12 files matching "guard"             |  |  |
|  |  |  +------------------+                                      |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  |  +------------------------------------------------------------+  |  |
|  |  |  [Agent]  (processing indicator...)                        |  |  |
|  |  +------------------------------------------------------------+  |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-010 Chat Input Area (fixed at bottom)                      |  |
|  |  +------------------------------------------------------+  [>] |  |
|  |  | Type your message...                                 |       |  |
|  |  +------------------------------------------------------+       |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

### No-Session State Wireframe

```
+------------------------------------------------------------------------+
|                      PG-002 Chat (no session)                          |
|                                                                        |
|                                                                        |
|                                                                        |
|                    No active session selected.                         |
|                                                                        |
|                  [Go to Home to select a session]                      |
|                                                                        |
|                                                                        |
|                                                                        |
+------------------------------------------------------------------------+
```

### Empty State Wireframe

```
+------------------------------------------------------------------------+
|                      PG-002 Chat (empty)                               |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-007 Token Budget Bar       0% used (0 / 200,000)           |  |
|  |  [                                                        ]  0%  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-008 Discovery Status Bar                                    |  |
|  |  Discovery Phase  |  Brief: [Not Ready]  |  Accepted: [No]      |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-009 Message List                                            |  |
|  |                                                                  |  |
|  |              Start a conversation to begin discovery.            |  |
|  |                                                                  |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+  |
|  |  CMP-010 Chat Input Area                                        |  |
|  |  +------------------------------------------------------+  [>] |  |
|  |  | Type your message...                                 |       |  |
|  |  +------------------------------------------------------+       |  |
|  +------------------------------------------------------------------+  |
|                                                                        |
+------------------------------------------------------------------------+
```

---

## Component Inventory

| Component ID | Name                 | Position            | Description                                       |
| ------------ | -------------------- | ------------------- | ------------------------------------------------- |
| CMP-007      | Token Budget Bar     | Top (fixed)         | Progress bar showing token usage with zone colors |
| CMP-008      | Discovery Status Bar | Below budget bar    | Shows brief ready/accepted status indicators      |
| CMP-009      | Message List         | Main content (grow) | Scrollable list of chat messages                  |
| CMP-010      | Chat Input Area      | Bottom (fixed)      | Text input with send button, pinned to bottom     |

---

## States

### No-Session State

- **Condition:** `STR-002.sessionId === null`
- **Behavior:** All four components are hidden. A centered prompt message is displayed: "No active session selected." with a link/button that navigates to `#home`. The route guard may also redirect automatically.

### Empty State

- **Condition:** `STR-004.messages.length === 0` and `STR-004.isProcessing === false`
- **Behavior:** Token budget bar shows 0% (empty bar). Discovery status bar shows initial state. Message list area shows a centered prompt: "Start a conversation to begin discovery." Input area is active and ready for the first message.

### Loading State (Processing)

- **Condition:** `STR-004.isProcessing === true`
- **Behavior:** A processing indicator appears as the last item in the message list (animated dots or spinner). The chat input is disabled during processing. The send button is grayed out.

### Error State

- **Condition:** `STR-004.error !== null`
- **Behavior:** An error banner appears above the input area, displaying the error message with `--sf-error` styling. The input area remains usable so the user can retry. A "Retry" button may appear in the error banner.

### Active State

- **Condition:** `STR-004.messages.length > 0` and `STR-004.isProcessing === false`
- **Behavior:** Messages are displayed in chronological order. Agent messages may include tool result sections. The message list auto-scrolls to the latest message. Token budget bar reflects current usage. The input area is ready for the next message.

---

## Token / Design Token Usage

| Token                   | Usage                                         |
| ----------------------- | --------------------------------------------- |
| `--sf-bg`               | Page background                               |
| `--sf-surface`          | Message bubbles, input area background        |
| `--sf-surface-alt`      | Budget bar track, tool result sections        |
| `--sf-surface-elevated` | Agent message background                      |
| `--sf-text`             | Primary message text                          |
| `--sf-text-muted`       | Timestamps, placeholder text, status labels   |
| `--sf-accent`           | User message accent, send button, budget safe |
| `--sf-accent-dim`       | Discovery status badges                       |
| `--sf-error`            | Error banner, budget exhausted zone           |
| `--sf-warning`          | Budget warning zone color (#FF8C00)           |
| `--sf-font-body`        | Message text, input text                      |
| `--sf-font-mono`        | Tool result content                           |

---

## Interaction Flow

1. **Page Guard:** On navigation to `#chat`, the guard checks `STR-002.sessionId`. If null, redirect to `#home`.
2. **Initial Load:** If the session has no prior messages, the empty state prompt is shown. The input is focused automatically.
3. **Send Message:** User types in CMP-010 and presses Enter or clicks Send. Dispatches `EVT-008-message-sent`. The user message appears in the list immediately. `isProcessing` becomes true. Input is disabled.
4. **Receive Response:** Agent response arrives via `EVT-009-message-received`. The agent message (possibly with tool results) is appended. `isProcessing` becomes false. Input is re-enabled. Budget is updated via `EVT-011-budget-updated`.
5. **Error Recovery:** If the agent call fails, `EVT-010-chat-error` fires. The error banner appears. The user can edit their message and retry.
6. **Discovery Status Update:** As the conversation progresses, `EVT-012-discovery-status-changed` updates the status bar. When the brief is ready, the user can accept or reject it via `EVT-013-brief-action`.
7. **Budget Monitoring:** Token budget bar updates on each `EVT-011-budget-updated`. Colors change as usage crosses zone thresholds (safe/warning/critical/exhausted). At exhausted (95%+), the bar pulses.
8. **Auto-Scroll:** When a new message arrives, the message list scrolls to the bottom unless the user has manually scrolled up.

---

## Cross-References

- **Components:** CMP-007 (token-budget-bar), CMP-008 (discovery-status-bar), CMP-009 (message-list), CMP-010 (chat-input-area)
- **Stores:** STR-004 (chat-store), STR-002 (active-session-store)
- **Events:** EVT-008 (message-sent), EVT-009 (message-received), EVT-010 (chat-error), EVT-011 (budget-updated), EVT-012 (discovery-status-changed), EVT-013 (brief-action)
- **Guard:** Requires STR-002.sessionId to be non-null
- **Navigation:** Redirects to PG-001-home if no active session
