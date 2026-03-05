# CMP-002 Status Bar

**ID:** CMP-002-status-bar
**Context:** Bottom status bar spanning the main content area of the application shell.

---

## Overview

The Status Bar is a persistent 32px-high horizontal bar anchored to the bottom of the application shell, to the right of the nav rail. It displays session connection status, session identifier, session lifecycle state, and accumulated cost. The component has no props of its own -- it reads all display data directly from stores.

## ASCII Mockup

```
 Status Bar (grid-column: 2, bottom of shell)
 ┌──────────────────────────────────────────────────────────────────────┐
 │ 16px │                                                       │ 16px │
 │ pad  │  [*]  sess_abc123def4     running          $2.47      │ pad  │
 │      │  dot   session-id         status           cost       │      │
 │      │  6px   ELM-006            ELM-007          ELM-008    │      │
 │      │  ELM-005                                              │      │
 │      │       <--------- 16px gap between items --------->    │      │
 └──────────────────────────────────────────────────────────────────────┘
  height: 32px

 State variations:

 Connected + running session:
 ┌──────────────────────────────────────────────────────────────────────┐
 │  [*]  sess_abc123def4         running              $2.47            │
 │  accent  muted text          accent text          muted text        │
 └──────────────────────────────────────────────────────────────────────┘

 Idle (no session):
 ┌──────────────────────────────────────────────────────────────────────┐
 │  [o]  none                    idle                 $0.00            │
 │  muted  muted text           muted text           muted text        │
 └──────────────────────────────────────────────────────────────────────┘

 Failed session:
 ┌──────────────────────────────────────────────────────────────────────┐
 │  [*]  sess_abc123def4         failed               $1.83            │
 │  accent  muted text          error text           muted text        │
 └──────────────────────────────────────────────────────────────────────┘

 Paused session:
 ┌──────────────────────────────────────────────────────────────────────┐
 │  [*]  sess_abc123def4         paused               $0.92            │
 │  accent  muted text          warning text         muted text        │
 └──────────────────────────────────────────────────────────────────────┘
```

## Children

| Element                     | Role                             | Data Source               |
| --------------------------- | -------------------------------- | ------------------------- |
| ELM-005 Status Dot          | 6px circle, connection indicator | STR-002 isSessionActive   |
| ELM-006 Session ID Text     | Session identifier string        | STR-002 sessionId         |
| ELM-007 Session Status Text | Lifecycle status label           | STR-002 status            |
| ELM-008 Cost Text           | Formatted total cost             | STR-010 summary.totalCost |

## Layout Rules

| Property       | Value                             | Notes                                   |
| -------------- | --------------------------------- | --------------------------------------- |
| height         | 32px                              | Fixed height                            |
| display        | flex                              | Row layout                              |
| flex-direction | row                               | Children arranged horizontally          |
| align-items    | center                            | Vertically centered within the 32px bar |
| gap            | 16px                              | Space between child elements            |
| padding        | 0 16px                            | Horizontal padding only                 |
| font-size      | 11px                              | Inherited by all child text elements    |
| grid-column    | 2                                 | Positioned in the main content column   |
| background     | var(--sf-surface)                 | Dark surface background                 |
| border-top     | 1px solid rgba(0, 240, 255, 0.08) | Subtle accent top divider               |

## Store Bindings

| Store                        | Field             | Bound Element | Mapping                                           |
| ---------------------------- | ----------------- | ------------- | ------------------------------------------------- |
| STR-002 active-session-store | isSessionActive   | ELM-005       | true -> connected (accent), false -> idle (muted) |
| STR-002 active-session-store | sessionId         | ELM-006       | Display raw value, fallback "none"                |
| STR-002 active-session-store | status            | ELM-007       | Display raw value, color mapped per status        |
| STR-010 cost-tracker-store   | summary.totalCost | ELM-008       | Format as "$X.XX"                                 |

## Token Usage

| Token             | Usage                              |
| ----------------- | ---------------------------------- |
| `--sf-surface`    | Status bar background              |
| `--sf-accent`     | Connected dot, running status text |
| `--sf-text-muted` | Default text, idle state           |
| `--sf-warning`    | Paused status text                 |
| `--sf-success`    | Completed status text              |
| `--sf-error`      | Failed status text                 |
| `--sf-font-body`  | All child text font family         |

## Cross-References

- **Elements:** ELM-005 through ELM-008 (status dot, session id, session status, cost)
- **Store:** STR-002 active-session-store (session data)
- **Store:** STR-010 cost-tracker-store (cost data)
- **Page:** All pages include the status bar as part of the shell layout
