# CMP-011 Phase Indicator Strip

**ID:** CMP-011-phase-indicator-strip
**Context:** Pipeline view -- horizontal strip showing all pipeline phases, their status, and overall progress.

---

## Overview

The Phase Indicator Strip is a rich horizontal visualization of the pipeline phases. Each phase is represented by a circular node connected by lines. Nodes change appearance based on their status (pending, active, completed, failed), and connectors visually link phases with color and animation matching the source phase state. An overall progress percentage is displayed at the top.

This component addresses a key design gap: transforming the previously minimal phase representation into a fully specified, visually rich pipeline visualization.

## ASCII Wireframe

```
 Phase Indicator Strip (full width)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                                                             │
 │                      Pipeline: 45% complete                                 │
 │                      (12px, muted, centered)                                │
 │                                                                             │
 │  gap: 12px                                                                  │
 │                                                                             │
 │  Phase Row (flex, space-evenly, center-aligned)                             │
 │  ┌─────────────────────────────────────────────────────────────────────────┐│
 │  │                                                                         ││
 │  │    ┌────┐         ┌────┐         ┌────┐         ┌────┐         ┌────┐  ││
 │  │    │ v  │ ------- │ v  │ ======= │ *  │ - - - > │ .  │ - - - > │ .  │  ││
 │  │    └────┘         └────┘         └────┘         └────┘         └────┘  ││
 │  │   Discovery       Shaping     Spec Gen        Task Plan       Implement ││
 │  │   (success)       (success)    (active)       (pending)       (pending) ││
 │  │                                                                         ││
 │  └─────────────────────────────────────────────────────────────────────────┘│
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘

 Legend:

   Node States:
   ┌──────┐
   │  v   │  Completed: solid success border, success fill, checkmark icon
   └──────┘

   ╔══════╗
   ║  *   ║  Active: solid accent border, accent-dim fill, glow pulse animation
   ╚══════╝

   ┌ ─ ─ ┐
   │  .   │  Pending: dashed muted border, transparent fill, dot icon
   └ ─ ─ ┘

   ┌──────┐
   │  x   │  Failed: solid error border, error fill, X icon
   └──────┘

   Connector States:
   ─────────  Completed: solid line, success color
   ═════════  Active (leading to active): solid line, accent color
   - - - - >  Active-to-pending: dashed, animated marching dashes
   - - - - -  Pending: dashed line, muted color

 Detailed Node (40px diameter):
   ┌──────────────────────────────────┐
   │         6px gap                  │
   │      ╭────────╮                  │
   │      │  icon  │  40px circle     │
   │      │  (16px)│  2px border      │
   │      ╰────────╯                  │
   │       Phase Name                 │
   │      (11px, below)               │
   └──────────────────────────────────┘
```

## Layout

### Outer Container

| Property       | Value     | Notes                                 |
| -------------- | --------- | ------------------------------------- |
| display        | flex      | Vertical stack                        |
| flex-direction | column    | Progress text on top, phase row below |
| width          | 100%      | Full width of pipeline view           |
| padding        | 16px 24px | Horizontal breathing room             |
| gap            | 12px      | Between progress text and phase row   |

### Phase Row

| Property        | Value        | Notes                       |
| --------------- | ------------ | --------------------------- |
| display         | flex         | Horizontal layout           |
| flex-direction  | row          | Phases flow left to right   |
| justify-content | space-evenly | Equal spacing between nodes |
| align-items     | center       | Vertically centered nodes   |
| width           | 100%         | Full width                  |

## Overall Progress

Displayed at the top of the strip, centered. Shows the aggregate progress of the entire pipeline.

| Property  | Value                   | Notes                   |
| --------- | ----------------------- | ----------------------- |
| Format    | "Pipeline: X% complete" | Dynamic percentage      |
| Font size | 12px                    | Small, informational    |
| Color     | `--sf-text-muted`       | Subtle, non-competing   |
| Alignment | center                  | Centered over phase row |

## Phase Node Specs (ELM-044)

Each phase is rendered as a circular node with an icon inside and a label below.

| Property       | Value  | Notes                          |
| -------------- | ------ | ------------------------------ |
| Shape          | Circle | `border-radius: 50%`           |
| Diameter       | 40px   | Fixed size for all nodes       |
| Border width   | 2px    | Consistent across states       |
| Icon size      | 16px   | Centered inside the circle     |
| Label position | Below  | 6px gap between node and label |
| Label size     | 11px   | `--sf-font-body`               |

## Phase States

### Pending

The phase has not started yet. Visually muted and de-emphasized.

| Property        | Value                        |
| --------------- | ---------------------------- |
| Node border     | 2px dashed `--sf-text-muted` |
| Node background | transparent                  |
| Icon color      | `--sf-text-muted`            |
| Label color     | `--sf-text-muted`            |
| Icon            | Dot / empty circle           |
| Animation       | None                         |

### Active

The currently running phase. Draws attention with accent color and a subtle glow animation.

| Property        | Value                                |
| --------------- | ------------------------------------ |
| Node border     | 2px solid `--sf-accent`              |
| Node background | `--sf-accent-dim`                    |
| Icon color      | `--sf-accent`                        |
| Label color     | `--sf-accent`                        |
| Icon            | Animated spinner or play icon        |
| Box shadow      | `0 0 12px var(--sf-accent-dim)`      |
| Animation       | `glow-pulse 2s ease-in-out infinite` |

### Completed

The phase finished successfully. Solid success styling with checkmark.

| Property        | Value                     |
| --------------- | ------------------------- |
| Node border     | 2px solid `--sf-success`  |
| Node background | `--sf-success` (filled)   |
| Icon color      | `--sf-surface` (contrast) |
| Label color     | `--sf-success`            |
| Icon            | Checkmark                 |
| Animation       | None                      |

### Failed

The phase encountered an error. Error styling with X icon.

| Property        | Value                     |
| --------------- | ------------------------- |
| Node border     | 2px solid `--sf-error`    |
| Node background | `--sf-error` (filled)     |
| Icon color      | `--sf-surface` (contrast) |
| Label color     | `--sf-error`              |
| Icon            | X / cross mark            |
| Animation       | None                      |

## Connector Specs (ELM-045)

Connectors are horizontal lines drawn between adjacent phase nodes.

| Property  | Value | Notes                     |
| --------- | ----- | ------------------------- |
| Height    | 2px   | Thin connecting line      |
| flex-grow | 1     | Fills space between nodes |
| Margin    | 0 8px | Small gap from node edges |

### Connector Color Rules

The connector between phase N and phase N+1 takes its color from the **source** (left) phase:

| Source State | Target State | Color             | Style  | Animation                       |
| ------------ | ------------ | ----------------- | ------ | ------------------------------- |
| Completed    | Any          | `--sf-success`    | solid  | None                            |
| Active       | Pending      | `--sf-accent`     | dashed | `dash-march 1s linear infinite` |
| Pending      | Pending      | `--sf-text-muted` | dashed | None                            |
| Failed       | Any          | `--sf-error`      | solid  | None                            |

The `dash-march` animation creates a visual "marching ants" effect on the connector between the active phase and the next pending phase, conveying forward momentum.

## Store Bindings

| Store                  | Selector       | Component Prop    |
| ---------------------- | -------------- | ----------------- |
| STR-005 pipeline-store | `phases`       | `phases`          |
| STR-005 pipeline-store | `currentPhase` | `currentPhase`    |
| STR-005 pipeline-store | `progress`     | `overallProgress` |

## Token Usage

| Token             | Usage                                        |
| ----------------- | -------------------------------------------- |
| `--sf-accent`     | Active phase node, connector, label          |
| `--sf-accent-dim` | Active phase background, glow shadow         |
| `--sf-success`    | Completed phase node, connector, label       |
| `--sf-error`      | Failed phase node, connector, label          |
| `--sf-text-muted` | Pending phase styling, overall progress text |
| `--sf-surface`    | Icon contrast on filled nodes                |
| `--sf-font-body`  | Phase labels, progress text                  |

## Cross-References

- **Store:** STR-005-pipeline-store (phase and progress data)
- **Element:** ELM-044-phase-node (individual phase circle)
- **Element:** ELM-045-phase-connector (connecting line between nodes)
