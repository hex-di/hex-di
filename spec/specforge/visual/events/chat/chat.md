# Chat Events

## Overview

Chat events manage the conversation between the user and the discovery agent. They handle message sending and receiving, error conditions, token budget tracking, and discovery-phase status transitions. All chat events target the chat store (STR-004), which serves as the single source of truth for the conversation UI.

---

## EVT-008-message-sent

**Trigger:** User submits a message via CMP-010-chat-input-area.

### Payload

| Field     | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| id        | string | yes      | Unique message identifier (UUID)     |
| content   | string | yes      | Markdown text content of the message |
| timestamp | string | yes      | ISO-8601 timestamp                   |

### Event Flow

```
User types message and presses Enter / clicks Send
  |
  v
dispatch EVT-008-message-sent { id, content, timestamp }
  |
  +---> [Store] STR-004-chat-store
  |       append { id, role: "user", content, timestamp } to messages[]
  |       set isProcessing = true
  |       clear error = null
  |
  +---> [Side Effect: api-call]
          POST to DiscoveryOrchestrator with { id, content, sessionId }
          --> On success: backend will push EVT-009 via WebSocket
          --> On failure: backend will push EVT-010 via WebSocket
```

### Store Mutations

| Store              | Field        | Operation | Value                                    |
| ------------------ | ------------ | --------- | ---------------------------------------- |
| STR-004-chat-store | messages     | append    | { id, role: "user", content, timestamp } |
| STR-004-chat-store | isProcessing | set       | true                                     |
| STR-004-chat-store | error        | clear     | null                                     |

### Side Effects

| Type     | Description                                                           |
| -------- | --------------------------------------------------------------------- |
| api-call | Sends the message to the DiscoveryOrchestrator backend for processing |

---

## EVT-009-message-received

**Trigger:** Backend pushes an agent response via WebSocket after processing the user's message.

### Payload

| Field       | Type   | Required | Description                                               |
| ----------- | ------ | -------- | --------------------------------------------------------- |
| id          | string | yes      | Unique message identifier (UUID)                          |
| content     | string | yes      | Markdown text content of the agent response               |
| timestamp   | string | yes      | ISO-8601 timestamp                                        |
| toolResults | array  | no       | Optional array of ToolResult: [{ type, summary, query? }] |

### Event Flow

```
Backend processes message --> pushes response via WebSocket
  |
  v
dispatch EVT-009-message-received { id, content, timestamp, toolResults? }
  |
  +---> [Store] STR-004-chat-store
          append { id, role: "agent", content, timestamp, toolResults } to messages[]
          set isProcessing = false
```

### Store Mutations

| Store              | Field        | Operation | Value                                                  |
| ------------------ | ------------ | --------- | ------------------------------------------------------ |
| STR-004-chat-store | messages     | append    | { id, role: "agent", content, timestamp, toolResults } |
| STR-004-chat-store | isProcessing | set       | false                                                  |

---

## EVT-010-chat-error

**Trigger:** An error occurs during message processing, either from the backend or a network failure.

### Payload

| Field | Type   | Required | Description                  |
| ----- | ------ | -------- | ---------------------------- |
| error | string | yes      | Human-readable error message |

### Event Flow

```
Backend error / network failure
  |
  v
dispatch EVT-010-chat-error { error }
  |
  +---> [Store] STR-004-chat-store
          set isProcessing = false
          set error = payload.error
```

### Store Mutations

| Store              | Field        | Operation | Value         |
| ------------------ | ------------ | --------- | ------------- |
| STR-004-chat-store | isProcessing | set       | false         |
| STR-004-chat-store | error        | set       | payload.error |

---

## EVT-011-budget-updated

**Trigger:** Backend periodically pushes token budget metrics, typically after each agent response.

### Payload

| Field   | Type   | Required | Description                     |
| ------- | ------ | -------- | ------------------------------- |
| used    | number | yes      | Tokens consumed so far          |
| total   | number | yes      | Maximum token budget            |
| percent | number | yes      | Pre-computed percentage (0-100) |

### Event Flow

```
Backend pushes budget metrics after agent response
  |
  v
dispatch EVT-011-budget-updated { used, total, percent }
  |
  +---> [Store] STR-004-chat-store
          set tokenBudget.used = payload.used
          set tokenBudget.total = payload.total
          set tokenBudget.percent = payload.percent
          --> CMP-007-token-budget-bar re-renders
          --> if percent >= 90, isBudgetCritical selector triggers warning UI
```

### Store Mutations

| Store              | Field               | Operation | Value           |
| ------------------ | ------------------- | --------- | --------------- |
| STR-004-chat-store | tokenBudget.used    | set       | payload.used    |
| STR-004-chat-store | tokenBudget.total   | set       | payload.total   |
| STR-004-chat-store | tokenBudget.percent | set       | payload.percent |

---

## EVT-012-discovery-status-changed

**Trigger:** Backend updates the discovery phase status, typically when the agent finishes generating a brief.

### Payload

| Field         | Type    | Required | Description                         |
| ------------- | ------- | -------- | ----------------------------------- |
| briefReady    | boolean | yes      | Agent has marked the brief as ready |
| briefAccepted | boolean | yes      | User has accepted the brief         |

### Event Flow

```
Backend pushes discovery status update
  |
  v
dispatch EVT-012-discovery-status-changed { briefReady, briefAccepted }
  |
  +---> [Store] STR-004-chat-store
          set discoveryStatus.briefReady = payload.briefReady
          set discoveryStatus.briefAccepted = payload.briefAccepted
          --> CMP-008-discovery-status-bar re-renders
          --> If briefReady && !briefAccepted, show accept/reject buttons
```

### Store Mutations

| Store              | Field                         | Operation | Value                 |
| ------------------ | ----------------------------- | --------- | --------------------- |
| STR-004-chat-store | discoveryStatus.briefReady    | set       | payload.briefReady    |
| STR-004-chat-store | discoveryStatus.briefAccepted | set       | payload.briefAccepted |

---

## EVT-013-brief-action

**Trigger:** User clicks the "Accept" or "Reject" button on the discovery brief.

### Payload

| Field   | Type    | Required | Description                                   |
| ------- | ------- | -------- | --------------------------------------------- |
| action  | string  | yes      | "accept" or "reject" -- the user's decision   |
| success | boolean | yes      | Whether the action was successfully processed |

### Event Flow

```
User clicks Accept or Reject on CMP-008-discovery-status-bar
  |
  v
dispatch EVT-013-brief-action { action, success }
  |
  +---> [Store] STR-004-chat-store
          if action === "accept" && success:
            set discoveryStatus.briefAccepted = true
          if action === "reject" && success:
            set discoveryStatus.briefAccepted = false
            set discoveryStatus.briefReady = false
```

### Store Mutations

| Store              | Field                         | Operation | Value                               |
| ------------------ | ----------------------------- | --------- | ----------------------------------- |
| STR-004-chat-store | discoveryStatus.briefAccepted | set       | true (accept) / false (reject)      |
| STR-004-chat-store | discoveryStatus.briefReady    | set       | unchanged (accept) / false (reject) |

---

## Design Rationale

1. **Append-only message history:** Messages are never mutated or removed from the array. The conversation is a log rendered top-to-bottom. This simplifies ordering guarantees and makes the store behave like an event log itself.

2. **Automatic error clearing on send:** EVT-008 clears any previous error, so the user does not need to manually dismiss an error before retrying. Sending a new message is an implicit acknowledgement.

3. **Pre-computed budget percentage:** The percent field arrives pre-computed from the server, avoiding floating-point inconsistencies between clients. All consumers display the same number.

4. **Tool results as optional payload:** Agent messages may or may not carry structured tool results. The optional `toolResults` array allows the message-list component to render expandable cards for agent actions without special-casing the message format.

5. **Brief action carries success flag:** The `success` boolean in EVT-013 allows the UI to distinguish between a successful accept/reject and a failed attempt (e.g., backend rejected the action). Only successful actions mutate the store.

---

## Cross-References

- **Source components:** CMP-010-chat-input-area (EVT-008), CMP-008-discovery-status-bar (EVT-013)
- **Backend triggers:** DiscoveryOrchestrator (EVT-009, EVT-010, EVT-011, EVT-012)
- **Target store:** STR-004-chat-store
- **Consumer components:** CMP-007-token-budget-bar, CMP-008-discovery-status-bar, CMP-009-message-list, CMP-010-chat-input-area
