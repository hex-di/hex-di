# CMP-008 Discovery Status Bar

**ID:** CMP-008-discovery-status-bar
**Context:** Chat view -- positioned between the token budget bar and message list to show discovery phase progression.

---

## Overview

The Discovery Status Bar shows the current state of the discovery conversation phase and provides contextual action buttons. It transitions through four states: not-started, in-progress, brief-ready, and accepted. Each state shows different content and buttons.

## ASCII Mockup

```
 Discovery Status Bar (full width, surface-alt background)
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │  State: not-started                                             │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  [o] Discovery not started          [ Request Brief ]      ││
 │  │  ELM-031 (muted)                     ELM-034               ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  State: in-progress                                             │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  [~] Discovery in progress...                              ││
 │  │  ELM-031 (accent, animated)                                ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  State: brief-ready                                             │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  [!] Brief ready for review    [ Accept ]  [ Reject ]      ││
 │  │  ELM-031 (warning)              ELM-032     ELM-033        ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  State: accepted                                                │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  [v] Brief Accepted                                        ││
 │  │  ELM-031 (success + checkmark)                             ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

## Layout

| Property       | Value                   | Notes                             |
| -------------- | ----------------------- | --------------------------------- |
| display        | flex                    | Horizontal row layout             |
| flex-direction | row                     | Status indicator + buttons        |
| align-items    | center                  | Vertically centered               |
| gap            | 8px                     | Between indicator and buttons     |
| padding        | 8px 12px                | Inner padding                     |
| width          | 100%                    | Full width of chat view           |
| background     | `var(--sf-surface-alt)` | Subtle background differentiation |
| border-radius  | 6px                     | Rounded container                 |

## States

The component transitions through four discrete states based on `discoveryStatus` prop values.

| State       | Condition                         | Indicator Text             | Indicator Color   | Visible Buttons        |
| ----------- | --------------------------------- | -------------------------- | ----------------- | ---------------------- |
| Not Started | `!briefReady && !briefAccepted`   | "Discovery not started"    | `--sf-text-muted` | Request Brief          |
| In Progress | Discovery conversation is ongoing | "Discovery in progress..." | `--sf-accent`     | None                   |
| Brief Ready | `briefReady && !briefAccepted`    | "Brief ready for review"   | `--sf-warning`    | Accept, Reject         |
| Accepted    | `briefAccepted`                   | "Brief Accepted"           | `--sf-success`    | None (shows checkmark) |

## Children

| Element                            | Role                         | Visibility                  |
| ---------------------------------- | ---------------------------- | --------------------------- |
| ELM-031-discovery-status-indicator | Status text with color dot   | Always visible              |
| ELM-032-accept-brief-button        | Accept the generated brief   | Only in "brief-ready" state |
| ELM-033-reject-brief-button        | Reject and request revisions | Only in "brief-ready" state |
| ELM-034-request-brief-button       | Initiate brief generation    | Only in "not-started" state |

## Store Bindings

| Store              | Selector          | Component Prop    |
| ------------------ | ----------------- | ----------------- |
| STR-004 chat-store | `discoveryStatus` | `discoveryStatus` |

## Token Usage

| Token              | Usage                             |
| ------------------ | --------------------------------- |
| `--sf-surface-alt` | Bar background                    |
| `--sf-text-muted`  | Not-started state indicator color |
| `--sf-accent`      | In-progress state indicator color |
| `--sf-warning`     | Brief-ready state indicator color |
| `--sf-success`     | Accepted state indicator color    |
| `--sf-font-body`   | Status text and button labels     |

## Cross-References

- **Store:** STR-004-chat-store (discovery status data)
- **Element:** ELM-031-discovery-status-indicator (status display)
- **Element:** ELM-032-accept-brief-button (accept action)
- **Element:** ELM-033-reject-brief-button (reject action)
- **Element:** ELM-034-request-brief-button (request action)
