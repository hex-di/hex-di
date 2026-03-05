# STR-004 Chat Store

## Overview

The Chat Store manages the state of the discovery conversation between the user and the agent. It tracks the message history, processing state, token budget consumption, and discovery-phase status flags. This store is the backbone of the chat panel and its associated status indicators.

## State Shape

```
ChatState
+--------------------------------------------------------------+
| messages        | ChatMessage[]                               |
|                 | Ordered list of conversation messages        |
+-----------------+--------------------------------------------+
| isProcessing    | boolean                                      |
|                 | True while waiting for agent response         |
+-----------------+--------------------------------------------+
| error           | string | null                                |
|                 | Last chat error message, if any              |
+-----------------+--------------------------------------------+
| tokenBudget                                                   |
|   used          | number        (tokens consumed so far)       |
|   total         | number        (max token budget, e.g. 200k)  |
|   percent       | number        (0-100, pre-computed)           |
+-----------------+--------------------------------------------+
| discoveryStatus                                               |
|   briefAccepted | boolean       (user accepted the brief)      |
|   briefReady    | boolean       (agent marked brief as ready)  |
+--------------------------------------------------------------+

ChatMessage
+--------------------------------------------------------------+
| id          | string           (unique message identifier)    |
| role        | "user" | "agent"                                |
| content     | string           (markdown text)                 |
| timestamp   | string           (ISO-8601)                      |
| toolResults | ToolResult[] | undefined                        |
+--------------------------------------------------------------+

ToolResult
+--------------------------------------------------------------+
| type    | string            (e.g. "file-search", "analysis") |
| summary | string            (short description of result)    |
| query   | string | undefined (original query if applicable)  |
+--------------------------------------------------------------+
```

## Selectors

| Selector           | Signature          | Description                                                                             |
| ------------------ | ------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `lastMessage`      | `() => ChatMessage | null`                                                                                   | Returns the most recent message in the conversation, or `null` if the list is empty. |
| `messageCount`     | `() => number`     | Returns the total number of messages in the conversation.                               |
| `budgetRemaining`  | `() => number`     | Returns `tokenBudget.total - tokenBudget.used`, the number of tokens left.              |
| `isBudgetCritical` | `() => boolean`    | Returns `true` when `tokenBudget.percent >= 90`, triggering a visual warning in the UI. |

## Event Flow

| Event                              | Fields Affected                             | Description                                                                  |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `EVT-008-message-sent`             | messages (append), isProcessing, error      | User sends a message. Appended to history, processing starts, error cleared. |
| `EVT-009-message-received`         | messages (append), isProcessing             | Agent response arrives. Appended to history, processing ends.                |
| `EVT-010-chat-error`               | isProcessing, error                         | An error occurred during processing. Processing ends, error is stored.       |
| `EVT-011-budget-updated`           | tokenBudget (used, total, percent)          | Token budget metrics arrive from the backend.                                |
| `EVT-012-discovery-status-changed` | discoveryStatus (briefAccepted, briefReady) | The discovery phase status is updated by the backend.                        |
| `EVT-013-brief-action`             | discoveryStatus.briefAccepted               | User accepts or rejects the brief.                                           |

## Design Rationale

- **Append-only messages**: Messages are never mutated or removed. The conversation is a log, and the UI renders it top-to-bottom. This simplifies reasoning about message ordering.
- **Pre-computed percent**: The `tokenBudget.percent` is computed server-side and included in the event payload. This avoids floating-point precision issues and ensures all clients show the same percentage.
- **Separate processing and error**: `isProcessing` and `error` are independent flags. A chat error stops processing, but the user can retry without clearing the error manually -- sending a new message (`EVT-008`) clears the error automatically.
- **Discovery status co-located**: The `discoveryStatus` sub-object lives in the chat store rather than a separate store because it is tightly coupled to the conversation flow. The brief is a chat artifact, and its acceptance is a chat-panel action.
- **Tool results on messages**: Agent messages can carry structured `toolResults` that the message-list component renders as expandable cards, giving the user visibility into what the agent did behind the scenes.
