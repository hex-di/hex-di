# CMP-010 Chat Input Area

**ID:** CMP-010-chat-input-area
**Context:** Chat view -- fixed at the bottom of the chat view, below the message list.

---

## Overview

The Chat Input Area is the primary message composition component. It contains a textarea that grows up to 4 lines, a send button, and an optional error banner. Enter sends the message, Shift+Enter inserts a newline. The entire area is disabled when the agent is processing.

## ASCII Mockup

```
 Chat Input Area (sticky bottom, full width)
 ┌─────────────────────────────────────────────────────────────────┐
 │  border-top: 1px solid --sf-border                              │
 │                                                                 │
 │  ELM-043 Error Banner (conditional, when error !== null)        │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │ [!] Failed to send message. Please try again.              ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  gap: 8px                                                       │
 │                                                                 │
 │  Input Row (flex row)                                           │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  ELM-040 Textarea (flex-grow)     ELM-041 Send Button      ││
 │  │  ┌──────────────────────────────┐ ┌──────────┐             ││
 │  │  │ Type a message...            │ │   Send   │             ││
 │  │  │                              │ │          │             ││
 │  │  └──────────────────────────────┘ └──────────┘             ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘

 Multi-line input (textarea grows up to 4 lines):
 ┌─────────────────────────────────────────────────────────────────┐
 │  ┌──────────────────────────────┐ ┌──────────┐                 │
 │  │ Line 1 of message            │ │          │                 │
 │  │ Line 2 of message            │ │   Send   │                 │
 │  │ Line 3 of message            │ │          │                 │
 │  │ Line 4 of message            │ │          │                 │
 │  └──────────────────────────────┘ └──────────┘                 │
 └─────────────────────────────────────────────────────────────────┘

 Disabled state (isProcessing = true):
 ┌─────────────────────────────────────────────────────────────────┐
 │  ┌──────────────────────────────┐ ┌──────────┐                 │
 │  │ (disabled, dimmed)           │ │  (dim)   │                 │
 │  └──────────────────────────────┘ └──────────┘                 │
 └─────────────────────────────────────────────────────────────────┘
```

## Layout

### Outer Container

| Property       | Value                        | Notes                              |
| -------------- | ---------------------------- | ---------------------------------- |
| display        | flex                         | Vertical stack                     |
| flex-direction | column                       | Error banner above input row       |
| gap            | 8px                          | Between error banner and input row |
| padding        | 12px 16px                    | Inner padding                      |
| width          | 100%                         | Full width                         |
| position       | sticky                       | Fixed to bottom of chat view       |
| bottom         | 0                            | Pinned to bottom edge              |
| background     | `var(--sf-surface)`          | Opaque background over messages    |
| border-top     | `1px solid var(--sf-border)` | Visual separator from messages     |

### Input Row

| Property       | Value    | Notes                               |
| -------------- | -------- | ----------------------------------- |
| display        | flex     | Horizontal layout                   |
| flex-direction | row      | Textarea + send button              |
| gap            | 8px      | Between textarea and button         |
| align-items    | flex-end | Button aligns to bottom of textarea |

## Textarea Behavior

| Property  | Value    | Notes                                         |
| --------- | -------- | --------------------------------------------- |
| min-rows  | 1        | Single line by default                        |
| max-rows  | 4        | Grows to 4 lines, then scrolls internally     |
| resize    | vertical | User can resize vertically within constraints |
| flex-grow | 1        | Takes available width                         |

## Keyboard Shortcuts

| Key           | Action                                          |
| ------------- | ----------------------------------------------- |
| Enter         | Sends message (if not empty and not processing) |
| Shift + Enter | Inserts a newline in the textarea               |

## Children

| Element                     | Role                          | Visibility            |
| --------------------------- | ----------------------------- | --------------------- |
| ELM-040-chat-input-textarea | Multi-line text input         | Always                |
| ELM-041-chat-send-button    | Send button to the right      | Always                |
| ELM-043-chat-error-banner   | Error message above input row | When `error !== null` |

## Disabled State

When `isProcessing` is `true`:

- The textarea is disabled (no typing allowed, visually dimmed).
- The send button is disabled (not clickable, visually dimmed).
- Enter key has no effect.

## Error Display

When the `error` prop is not null, the ELM-043-chat-error-banner appears above the input row, displaying the error message. It uses error styling (`--sf-error` color) and is dismissible.

## Token Usage

| Token             | Usage                        |
| ----------------- | ---------------------------- |
| `--sf-surface`    | Container background         |
| `--sf-border`     | Top border separator         |
| `--sf-text`       | Textarea text color          |
| `--sf-text-muted` | Placeholder text             |
| `--sf-accent`     | Send button background       |
| `--sf-error`      | Error banner text and border |
| `--sf-font-body`  | Textarea and button text     |

## Cross-References

- **Element:** ELM-040-chat-input-textarea (text input)
- **Element:** ELM-041-chat-send-button (send action)
- **Element:** ELM-043-chat-error-banner (error display)
- **Component:** CMP-009-message-list (message list above)
