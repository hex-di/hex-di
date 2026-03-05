# Chat Elements

**IDs:** ELM-029 through ELM-043
**Context:** Chat view -- token budget, discovery controls, message bubbles, tool results, input area, and error handling.

---

## ASCII Mockup

```
 Chat View
 ┌──────────────────────────────────────────────────────────────────┐
 │                                                                  │
 │  Token Budget                                                    │
 │  ELM-029  [==================--------]  ELM-030  "72k / 100k"  │
 │           accent fill (safe zone)        11px muted             │
 │                                                                  │
 │  Discovery                                                       │
 │  ELM-031  [In Progress]   ELM-034 [Request Brief]              │
 │           accent pill     accent-dim bg                          │
 │                                                                  │
 │  -- OR when brief is ready --                                   │
 │  ELM-031  [Brief Ready]   ELM-032 [Accept]  ELM-033 [Reject]  │
 │           orange pill      accent bg          secondary          │
 │                                                                  │
 ├──────────────────────────────────────────────────────────────────┤
 │                                                                  │
 │  ELM-043  Chat Error Banner (if error)                          │
 │  ┌───────────────────────────────────────────────── [x] ──────┐ │
 │  │  Error: Connection lost to agent session                    │ │
 │  └────────────────────────────────────────────────────────────┘ │
 │                                                                  │
 │  Messages                                                        │
 │                                                                  │
 │  ELM-036  ┌─────────────────────────┐                           │
 │           │ Agent: I found 3 specs  │                           │
 │           │ matching your query...  │                           │
 │           └─────────────────────────┘                           │
 │  ELM-037  10:32 AM                                              │
 │                                                                  │
 │  ELM-038  ┌─ ELM-039 [web-search] ──────────┐                  │
 │           │  Found 3 results for "auth"      │                  │
 │           │  > Click to expand details       │                  │
 │           └──────────────────────────────────┘                  │
 │                                                                  │
 │                          ┌──────────────────────┐  ELM-035      │
 │                          │ Can you show me the  │               │
 │                          │ guard policies too?  │               │
 │                          └──────────────────────┘               │
 │                                            10:33 AM  ELM-037   │
 │                                                                  │
 │  ELM-042  ...  (processing indicator)                           │
 │                                                                  │
 ├──────────────────────────────────────────────────────────────────┤
 │                                                                  │
 │  ELM-040                                           ELM-041      │
 │  ┌────────────────────────────────────────────┐   ┌────┐       │
 │  │ Type a message...                          │   │ -> │       │
 │  │                                            │   │    │       │
 │  └────────────────────────────────────────────┘   └────┘       │
 │  Enter = send, Shift+Enter = newline            36x36 accent   │
 │                                                                  │
 └──────────────────────────────────────────────────────────────────┘
```

## Visual States

### ELM-029 Token Budget Progress

| Zone      | Threshold | Fill Color    | Animation  |
| --------- | --------- | ------------- | ---------- |
| Safe      | < 70%     | `--sf-accent` | None       |
| Warning   | 70-89%    | `#FF8C00`     | None       |
| Critical  | 90-99%    | `#FF3B3B`     | None       |
| Exhausted | >= 100%   | `#FF3B3B`     | Pulse 1.5s |

- 4px height progress bar, rounded. Width represents percentage of budget used.
- Binds to STR-004 tokenBudget (used/total).

### ELM-030 Token Budget Label

- "X / Y tokens" format, 11px muted text.
- Updates reactively from STR-004 tokenBudget.

### ELM-031 Discovery Status Indicator

| Phase          | Color             | Background               |
| -------------- | ----------------- | ------------------------ |
| Not Started    | `--sf-text-muted` | `rgba(255,255,255,0.05)` |
| In Progress    | `--sf-accent`     | `--sf-accent-dim`        |
| Brief Ready    | `#FF8C00`         | `rgba(255,140,0,0.1)`    |
| Brief Accepted | `#22C55E`         | `rgba(34,197,94,0.1)`    |

- Pill badge, 11px text, 10px border-radius.

### ELM-032 Accept Brief Button

- Primary action button. Accent background, dark text, 600 weight.
- Only visible when `briefReady && !briefAccepted`.

### ELM-033 Reject Brief Button

- Secondary styling: transparent background, muted text, subtle border.
- Hover: slightly brighter.

### ELM-034 Request Brief Button

- Accent-dim background, accent text. Hover: brighter background.

### ELM-035 Message Bubble (User)

- Right-aligned, max-width 75%.
- `--sf-accent-dim` background. Rounded corners with bottom-right corner tight (2px).

### ELM-036 Message Bubble (Agent)

- Left-aligned, max-width 75%.
- `--sf-surface` background. Rounded corners with bottom-left corner tight (2px).

### ELM-037 Message Timestamp

- 10px muted text below each message bubble. Displays relative or absolute time.

### ELM-038 Tool Result Card

- Inline expandable card within agent messages.
- Subtle border, click to expand/collapse.
- Contains type badge (ELM-039) and summary text.

### ELM-039 Tool Result Type Badge

| Type        | Color         | Background              |
| ----------- | ------------- | ----------------------- |
| web-search  | `--sf-accent` | `--sf-accent-dim`       |
| graph-query | `#A78BFA`     | `rgba(167,139,250,0.1)` |

- Small pill badge, 10px text.

### ELM-040 Chat Input Textarea

- Multi-line input, grows from 40px up to 120px (4 lines).
- Enter sends, Shift+Enter inserts newline.
- Focus: accent border.

### ELM-041 Chat Send Button

- 36x36px accent button.
- Disabled when textarea is empty or `isProcessing === true`.

### ELM-042 Chat Processing Indicator

- Animated bouncing dots (3 dots, 6px each, accent color).
- Visible only when `isProcessing === true`.

### ELM-043 Chat Error Banner

- Red-tinted banner at top of chat area.
- `rgba(255, 59, 59, 0.08)` background with red border.
- Dismissible via close button. Binds to STR-004 error field.

## Token Usage

| Token                | Usage                                        |
| -------------------- | -------------------------------------------- |
| `--sf-accent`        | Progress safe, discovery in-progress, badges |
| `--sf-accent-dim`    | User bubble bg, badge backgrounds            |
| `--sf-accent-bright` | Button hover states                          |
| `--sf-text`          | Message text, expanded tool content          |
| `--sf-text-muted`    | Timestamps, labels, placeholder, summaries   |
| `--sf-surface`       | Agent bubble bg, textarea bg                 |
| `--sf-bg-deep`       | Button text on accent backgrounds            |
| `--sf-font-body`     | All text font family                         |

## Cross-References

- **Store:** STR-004 (chat state: tokenBudget, error, isProcessing)
- **Action:** ACT-011-send-message (send button / Enter key)
- **Action:** ACT-013-accept-brief (accept brief button)
- **Action:** ACT-014-reject-brief (reject brief button)
- **Action:** ACT-015-request-brief (request brief button)
