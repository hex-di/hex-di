# WF-002: Discovery Conversation

## Overview

The Discovery Conversation workflow traces the user's interaction with the AI agent in the Chat view (PG-002). It covers the full conversation cycle from the first message through tool-result exchanges, budget tracking, and culminates in the generation and acceptance (or rejection) of a discovery brief. This workflow is a sub-journey of WF-001 (Session Lifecycle) and occurs entirely within the Chat page.

---

## Journey Map

### Step 1 -- Enter Chat View

The user arrives at PG-002-chat after selecting a session from the Home view (see WF-001). The chat store (STR-004) initializes with an empty message list, `isProcessing: false`, and the token budget at its starting allocation. The discovery status bar (CMP-008) shows "not-started."

### Step 2 -- Send First Message

The user types a message in the chat input area (CMP-010) and presses Enter or clicks the send button. ACT-011 (send message) fires, dispatching EVT-008-message-sent. The chat store appends the user message, sets `isProcessing: true`, and clears any previous error.

### Step 3 -- Agent Processing

While the agent processes the message, the chat input area shows a loading indicator. The message list (CMP-009) may show a typing indicator or skeleton message placeholder. The discovery status bar transitions to "in-progress."

### Step 4 -- Agent Response

The agent responds with a message that may include tool results (file reads, code analysis, dependency scans). EVT-009-message-received fires. The chat store appends the agent message and sets `isProcessing: false`.

**Decision Point:** If the agent message includes tool results, each result renders as a collapsible section within the message bubble showing the tool type, summary, and optional query. If no tool results, the message renders as plain text.

### Step 5 -- Budget Update

After each exchange, EVT-011-budget-updated fires with the current token usage. The token budget bar (CMP-007) updates its fill level and color.

**Decision Point:** Budget zone thresholds:

- **Safe (0-60%):** Green fill, no special indicators
- **Warning (60-85%):** Yellow fill, warning text appears below the bar
- **Critical (85-95%):** Orange fill, input area shows caution overlay
- **Exhausted (95-100%):** Red pulsing fill, input area disabled with exhausted message

### Step 6 -- Conversation Loop

Steps 2-5 repeat as the user and agent exchange messages. Each cycle deepens the discovery: the agent asks clarifying questions, the user provides context, and the agent uses tools to analyze the codebase.

### Step 7 -- Brief Ready

When the agent determines sufficient information has been gathered, EVT-012-discovery-status-changed fires with `briefReady: true`. The discovery status bar (CMP-008) transitions to "brief-ready" with an accent-colored indicator. A brief preview or summary may appear in the message list.

### Step 8 -- Brief Decision

The user reviews the generated brief and makes a decision:

- **Accept (ACT-013):** EVT-013-brief-action fires with `accepted: true`. The discovery status transitions to "brief-accepted." The pipeline can now advance to the next phase.
- **Reject (ACT-014):** EVT-013-brief-action fires with `accepted: false`. The conversation continues for refinement. Discovery status reverts to "in-progress."
- **Request Early (ACT-015):** The user explicitly asks for a brief before the agent would naturally generate one. The agent attempts to produce a brief with the information gathered so far.

---

## ASCII Flow Diagram

```
+-------------------------+
| PG-002 Chat View        |
| CMP-008 Discovery Bar   |  status: not-started
| CMP-009 Message List    |  messages: []
| CMP-007 Token Budget    |  percent: 0%, zone: safe
| CMP-010 Chat Input      |  enabled: true
+------------+------------+
             |
             v  ACT-011 (send message)
+------------+------------+
| EVT-008 message-sent    |
| chat store appends msg  |
| isProcessing = true     |
+------------+------------+
             |
             v
+------------+------------+
| Agent processes...       |
| typing indicator shows   |
+------------+------------+
             |
             v
+------------+------------+
| EVT-009 message-received |
| chat store appends resp  |
| isProcessing = false     |
+------------+-------------+
             |
             v
+------------+------------+
| EVT-011 budget-updated  |
| CMP-007 updates bar     |
+------------+------------+
             |
     +-------+-------+
     |               |
     v               v
  [budget OK]    [budget warning/critical]
     |               |
     v               v
  Continue        Show warning
  conversation    in CMP-007
     |               |
     +-------+-------+
             |
             v  (loop back to ACT-011)
        +----+----+
        |         |
        v         v
   [more Q&A]  [discovery complete]
        |         |
        |         v
        |    EVT-012 discovery-status-changed
        |    briefReady = true
        |         |
        |    +----+----+----+
        |    |         |    |
        |    v         v    v
        | ACT-013   ACT-014  ACT-015
        | Accept    Reject   Request
        | Brief     Brief    Early
        |    |         |       |
        |    v         |       |
        | EVT-013      |       |
        | accepted=t   |       |
        |    |         |       |
        |    v         v       v
        | [pipeline  [resume  [generate
        |  advances]  convo]   brief]
        |              |       |
        +--------------+-------+
```

---

## State Transitions Across Stores

### STR-004 (Chat Store)

```
Discovery Status State Machine:
  not-started --> in-progress  (first EVT-008)
  in-progress --> brief-ready  (EVT-012 { briefReady: true })
  brief-ready --> brief-accepted (EVT-013 { accepted: true })
  brief-ready --> in-progress  (EVT-013 { accepted: false })

Message Flow:
  messages: []
    --> EVT-008 --> messages: [..., userMessage]
    --> EVT-009 --> messages: [..., agentMessage]

Processing State:
  isProcessing: false
    --> EVT-008 --> isProcessing: true
    --> EVT-009 --> isProcessing: false
    --> EVT-010 --> isProcessing: false, error: <message>

Token Budget:
  { used: 0, total: 200000, percent: 0 }
    --> EVT-011 --> { used: N, total: T, percent: P }
```

### STR-002 (Active Session Store)

```
status: "active"
  --> EVT-004 { status: "discovery" } --> status: "discovery"
  --> EVT-005 { error } --> status: "error", error: <message>
```

---

## Budget Zone Visual States

| Zone      | Percent Range | Bar Color                | Text Indicator       | Input State          |
| --------- | ------------- | ------------------------ | -------------------- | -------------------- |
| safe      | 0 - 60%       | `#22C55E` (green)        | None                 | Enabled              |
| warning   | 60 - 85%      | `#FFD600` (yellow)       | "Budget running low" | Enabled              |
| critical  | 85 - 95%      | `#FF5E00` (orange)       | "Budget critical"    | Enabled with caution |
| exhausted | 95 - 100%     | `#FF3B3B` (red, pulsing) | "Budget exhausted"   | Disabled             |

---

## Key Decision Points and Branches

| Step | Condition            | Outcome A                 | Outcome B                        | Outcome C                    |
| ---- | -------------------- | ------------------------- | -------------------------------- | ---------------------------- |
| 4    | Tool results present | Collapsible tool sections | Plain text message               | --                           |
| 5    | Budget zone          | Safe: continue normally   | Warning/Critical: show indicator | Exhausted: disable input     |
| 7    | Brief decision       | Accept: pipeline advances | Reject: resume conversation      | Request early: attempt brief |

---

## Design Rationale

1. **Single-page workflow:** The entire discovery conversation happens within PG-002-chat. This keeps the user focused on the conversational flow without page-switching interruptions.

2. **Progressive budget feedback:** The four budget zones provide escalating visual urgency. The user is never surprised by budget exhaustion because warnings appear well before the limit.

3. **Tool result transparency:** Showing tool results inline gives the user visibility into what the agent is doing. The collapsible design keeps the conversation readable while allowing deep inspection when needed.

4. **Brief as a gate:** The brief-accept/reject mechanism ensures the user explicitly approves the discovery output before the pipeline advances. This prevents the system from generating specs based on incomplete or incorrect understanding.

5. **Error recovery in context:** Chat errors (EVT-010) appear in the same conversation thread where they occurred. The user can read the error, adjust their approach, and continue without losing context.

---

## Cross-References

- **Parent workflow:** WF-001-session-lifecycle (steps 6-7)
- **Stores:** STR-004 (chat), STR-002 (active session)
- **Actions:** ACT-011, ACT-013, ACT-014, ACT-015
- **Events:** EVT-008 through EVT-013
- **Components:** CMP-007 (token budget bar), CMP-008 (discovery status bar), CMP-009 (message list), CMP-010 (chat input area)
