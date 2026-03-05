# CMP-022: Connection Status Banner

**ID:** CMP-022-connection-status-banner
**Context:** Graph view (PG-009-graph), banner showing graph database connection status.

---

## Overview

The Connection Status Banner is a compact inline-flex banner that communicates whether the application is connected to the knowledge graph database. In the connected state it shows an accent-colored dot with "Connected to graph" text on a subtle accent background. In the disconnected state it shows a red dot with a warning message on a subtle red background.

---

## ASCII Mockup

### Connected State

```
 ┌──────────────────────────────────────┐
 │  [*] Connected to graph              │
 │  accent dot, muted text              │
 │  bg: rgba(0, 240, 255, 0.06)        │
 └──────────────────────────────────────┘
```

### Disconnected State

```
 ┌────────────────────────────────────────────────────┐
 │  [!] Disconnected — data may be stale              │
 │  red dot (#FF3B3B), red text                       │
 │  bg: rgba(255, 59, 59, 0.08)                      │
 └────────────────────────────────────────────────────┘
```

### Layout Detail

```
 ┌───────────────────────────────────────────────┐
 │                                               │
 │  ┌───┐                                        │
 │  │ o │  status-text                           │
 │  └───┘                                        │
 │  6px    13px text                             │
 │  dot    gap: 8px                              │
 │                                               │
 │  padding: 6px 12px                            │
 │  border-radius: 6px                           │
 │  display: inline-flex                         │
 │  align-items: center                          │
 │                                               │
 └───────────────────────────────────────────────┘
```

---

## Layout

- **Container:** `inline-flex`, horizontally centered items, gap 8px, padding 6px 12px, border-radius 6px.
- **Dot (ELM-070):** 6px circle, colored based on connection state.
- **Text:** 13px, color varies by state.
- **Background:** Subtle tinted background, color depends on state.

---

## States

| State        | Dot Color     | Text                                | Text Color        | Background                |
| ------------ | ------------- | ----------------------------------- | ----------------- | ------------------------- |
| connected    | `--sf-accent` | "Connected to graph"                | `--sf-text-muted` | `rgba(0, 240, 255, 0.06)` |
| disconnected | `#FF3B3B`     | "Disconnected -- data may be stale" | `#FF3B3B`         | `rgba(255, 59, 59, 0.08)` |

---

## Status Dot (ELM-070)

| Property      | Value             |
| ------------- | ----------------- |
| Width         | 6px               |
| Height        | 6px               |
| Border-radius | 50%               |
| Flex-shrink   | 0                 |
| Background    | (varies by state) |

Same visual pattern as ELM-005-status-dot but scoped to graph connection rather than session status.

---

## Token Usage

| Token             | Usage                |
| ----------------- | -------------------- |
| `--sf-accent`     | Connected dot color  |
| `--sf-text-muted` | Connected text color |

---

## Cross-References

- **Store:** STR-011-graph-store (isConnected)
- **Elements:** ELM-070-connection-status-dot
- **Sibling:** CMP-020-graph-node-list, CMP-021-graph-edge-list
- **Page:** PG-009-graph (parent page)
- **Related:** ELM-005-status-dot (similar dot pattern for session status)
