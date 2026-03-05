# CMP-009 Message List

**ID:** CMP-009-message-list
**Context:** Chat view -- scrollable message container between the discovery status bar and the chat input area.

---

## Overview

The Message List is the primary scrollable container for chat messages. It renders user messages right-aligned and agent messages left-aligned, with timestamps and optional tool result cards. The list auto-scrolls to the bottom when new messages arrive, unless the user has manually scrolled up.

## ASCII Mockup

```
 Message List (flex-grow, overflow-y: auto)
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                    padding: 16px│
 │                                                                 │
 │  ELM-036 Agent Bubble (left-aligned, max-width 85%)             │
 │  ┌──────────────────────────────────────┐                       │
 │  │ Welcome! I'll help you discover the  │                       │
 │  │ requirements for your spec.          │                       │
 │  └──────────────────────────────────────┘                       │
 │  10:32 AM                                  ELM-037 Timestamp    │
 │                                                                 │
 │  gap: 12px                                                      │
 │                                                                 │
 │                   ELM-035 User Bubble (right-aligned, max 75%)  │
 │                       ┌─────────────────────────────────────┐   │
 │                       │ I need an auth module with RBAC     │   │
 │                       │ and session management.             │   │
 │                       └─────────────────────────────────────┘   │
 │                                               10:33 AM          │
 │                                                                 │
 │  ELM-036 Agent Bubble                                           │
 │  ┌──────────────────────────────────────┐                       │
 │  │ Let me analyze that. Running a few   │                       │
 │  │ discovery tools...                   │                       │
 │  └──────────────────────────────────────┘                       │
 │                                                                 │
 │  ELM-038 Tool Result Card                                       │
 │  ┌──────────────────────────────────────┐                       │
 │  │ [ELM-039 Badge: file-scan]           │                       │
 │  │ Scanned 14 files in src/auth/        │                       │
 │  │ Found 3 existing interfaces          │                       │
 │  └──────────────────────────────────────┘                       │
 │  10:33 AM                                                       │
 │                                                                 │
 │  ELM-042 Processing Indicator (when isProcessing = true)        │
 │  ┌──────────────────────────────────────┐                       │
 │  │ [. . .]  Thinking...                 │                       │
 │  └──────────────────────────────────────┘                       │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘

 Empty state:
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │                                                                 │
 │            Start a conversation to begin discovery.             │
 │                        (italic, muted)                          │
 │                                                                 │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

## Layout

| Property       | Value  | Notes                                              |
| -------------- | ------ | -------------------------------------------------- |
| display        | flex   | Vertical message stack                             |
| flex-direction | column | Messages flow top to bottom                        |
| gap            | 12px   | Consistent spacing between messages                |
| overflow-y     | auto   | Scrollable when content exceeds height             |
| padding        | 16px   | Inner padding around message area                  |
| flex-grow      | 1      | Fills available space between status bar and input |

## Message Alignment

| Sender | Alignment    | Max Width | Notes                                               |
| ------ | ------------ | --------- | --------------------------------------------------- |
| User   | `flex-end`   | 75%       | Right-aligned user messages                         |
| Agent  | `flex-start` | 85%       | Left-aligned agent messages, wider for tool results |

## Children

| Element                           | Role                                       | Visibility        |
| --------------------------------- | ------------------------------------------ | ----------------- |
| ELM-035-message-bubble-user       | User message bubble (right-aligned)        | Per user message  |
| ELM-036-message-bubble-agent      | Agent message bubble (left-aligned)        | Per agent message |
| ELM-037-message-timestamp         | Timestamp below each message bubble        | Per message       |
| ELM-038-tool-result-card          | Expandable card for tool execution results | Per tool result   |
| ELM-039-tool-result-type-badge    | Badge showing tool type inside result card | Per tool result   |
| ELM-042-chat-processing-indicator | Animated "thinking" indicator              | When isProcessing |

## Auto-Scroll Behavior

The message list automatically scrolls to the bottom when a new message is appended. This behavior is suppressed when the user has manually scrolled up more than 100px from the bottom, to avoid disrupting reading of older messages.

| Trigger              | Behavior | Anchor | Skip Condition                       |
| -------------------- | -------- | ------ | ------------------------------------ |
| New message appended | smooth   | bottom | User scrolled up > 100px from bottom |

When the user scrolls back to the bottom (within 100px), auto-scroll resumes for subsequent messages.

## Empty State

When the `messages` array is empty, the list displays a centered, italicized, muted message:

> _Start a conversation to begin discovery._

Styled with `--sf-text-muted` color, centered text, and 48px vertical padding.

## Processing Indicator

When `isProcessing` is `true`, the ELM-042-chat-processing-indicator is appended as the last item in the list. It displays an animated typing/thinking indicator at the agent's alignment (left-aligned).

## Token Usage

| Token              | Usage                          |
| ------------------ | ------------------------------ |
| `--sf-text`        | Message text color             |
| `--sf-text-muted`  | Timestamps, empty state        |
| `--sf-surface`     | User bubble background         |
| `--sf-surface-alt` | Agent bubble background        |
| `--sf-accent`      | Tool result card accent border |
| `--sf-font-body`   | Message text font              |
| `--sf-font-mono`   | Code blocks within messages    |

## Cross-References

- **Element:** ELM-035-message-bubble-user (user messages)
- **Element:** ELM-036-message-bubble-agent (agent messages)
- **Element:** ELM-037-message-timestamp (timestamps)
- **Element:** ELM-038-tool-result-card (tool results)
- **Element:** ELM-039-tool-result-type-badge (tool type badges)
- **Element:** ELM-042-chat-processing-indicator (typing indicator)
- **Component:** CMP-010-chat-input-area (input below)
- **Component:** CMP-008-discovery-status-bar (status bar above)
