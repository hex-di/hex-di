_Previous: [03-views-and-wireframes.md](03-views-and-wireframes.md) | Next: [05-operation-log.md](05-operation-log.md)_

# 4. Railway Pipeline View

The primary visualization. Renders a Result chain as an interactive two-track railroad diagram inspired by Scott Wlaschin's Railway Oriented Programming.

## 4.1 Core Metaphor

A Result chain is a railroad with two parallel tracks:

- **Ok Track** (top, green/emerald): The success path. Cargo flows along this track when the Result is `Ok`.
- **Err Track** (bottom, red/rose): The failure path. Cargo diverts to this track when the Result becomes `Err`.

Each operation in the chain is a **junction** on the railroad:

| Junction Type       | Operations                                                        | Visual                                                           |
| ------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Tunnel**          | `map`, `mapErr`, `inspect`, `inspectErr`                          | Cargo passes through on its own track. Other track bypassed.     |
| **Switch**          | `andThen`, `andThrough`                                           | Can divert cargo from Ok track to Err track.                     |
| **Recovery Switch** | `orElse`                                                          | Can divert cargo from Err track back to Ok track.                |
| **Dual Tunnel**     | `mapBoth`, `flip`                                                 | Processes cargo on whichever track it's on.                      |
| **Side Siding**     | `andTee`, `orTee`                                                 | Cargo enters siding for side effect, then returns to main track. |
| **Terminal**        | `match`, `unwrapOr`, `unwrapOrElse`, `expect`, `toNullable`, etc. | Both tracks converge into a single output.                       |
| **Entry**           | `ok`, `err`, `fromThrowable`, `tryCatch`, etc.                    | Cargo is placed on initial track.                                |

## 4.2 Wireframe: Railway Canvas

```
+===[Chain Selector]=====[Execution Selector]=====[Controls]===============+
| Chain: [validateUser       ▼]  Exec: [#847 (Ok)  ▼]  [◀ ▶] [▶ Play]   |
+==========================================================================+
|                                                                          |
|  ● ─── Ok Track ─────────────────────────────────────────── ●           |
|  ┃          ┃              ┃             ┃            ┃                  |
|  ┃  ┌──────┐┃  ┌──────────┐┃  ┌─────────┐┃  ┌───────┐┃  ┌───────┐     |
|  ╠══│ok(42)│╠══│ map(f)   │╠══│andThen  │╠══│orElse │╠══│ match │     |
|  ┃  └──────┘┃  └──────────┘┃  │  (g)    │┃  │  (h)  │┃  └───────┘     |
|  ┃          ┃              ┃  └────╥─────┘┃  └──╥────┘┃                 |
|  ○ ─── Err Track ──────────────────╨───────────╨────── ○                |
|                                    ⚡              ⚡                      |
|                               switch!         recovery!                  |
|                                                                          |
+==========================================================================+
| Minimap: [·······■···]  Zoom: [- 100% +]  Fit: [⊞]                     |
+==========================================================================+
```

### Canvas Elements

| Element                    | Description                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Ok Track line**          | Horizontal line at y=trackY, colored `--hex-result-ok` (emerald-600). Dashed segments where the Result is on Err track.       |
| **Err Track line**         | Horizontal line at y=trackY+trackGap, colored `--hex-result-err` (rose-600). Dashed segments where the Result is on Ok track. |
| **Operation node**         | Rounded rectangle straddling both tracks. Contains method name and optional label.                                            |
| **Switch indicator**       | Lightning bolt icon (⚡) between tracks at switch points. Animated glow on hover.                                             |
| **Active track highlight** | Thicker, opaque line on the track the Result is currently on. Other track is thin and semi-transparent.                       |
| **Particle animation**     | Small dot flowing along the active track from left to right during playback mode.                                             |
| **Entry node**             | Special node at the far left with constructor name (e.g., `ok(42)`).                                                          |
| **Terminal node**          | Special node at the far right with extraction method (e.g., `match`). Both tracks converge into it.                           |

## 4.3 Operation Node Anatomy

Each operation node in the pipeline is a small card:

```
+---[Category Icon]---+
| method(label)       |
| Ok → Ok             |
+-----[Duration]------+
```

### Node Properties

| Property      | Source                                       | Display                              |
| ------------- | -------------------------------------------- | ------------------------------------ |
| Method name   | `ResultOperationDescriptor.method`           | Bold, mono font                      |
| Label         | `ResultOperationDescriptor.label`            | Normal weight, truncated to 12 chars |
| Category icon | Derived from `ResultOperationCategory`       | Colored icon (see Section 10)        |
| Track flow    | `ResultStepTrace.inputTrack` → `outputTrack` | "Ok → Ok", "Ok → Err", etc.          |
| Duration      | `ResultStepTrace.durationMicros`             | "<0.01ms", "0.02ms", "145ms"         |
| Switch badge  | `ResultStepTrace.switched`                   | ⚡ icon if true                      |

### Node States

| State                    | Visual                                                     |
| ------------------------ | ---------------------------------------------------------- |
| Default                  | Neutral background, normal border                          |
| Hovered                  | Slightly elevated (shadow), tooltip with short description |
| Selected                 | Accent border, detail panel opens                          |
| Active (during playback) | Glowing border, particle at this node                      |
| Bypassed                 | Dimmed (0.3 opacity), dashed border                        |
| Error switch             | Red glow on node, ⚡ badge                                 |
| Recovery switch          | Green glow on node, ⚡ badge                               |

## 4.4 Track Flow Visualization

For a specific execution, the active track is determined step-by-step:

```
Step 0: ok(42)         → Ok track active  ════════
Step 1: map(f)         → Ok track active  ════════
Step 2: andThen(g)     → SWITCH! Err now  ════╗
                                               ║
Step 3: orElse(h)      → SWITCH! Ok now   ═══╗║
                                              ║║
Step 4: match          → Terminal         ════╝║
                                               ║
Err track segments:    ─ ─ ─ ─ ─ ─ ─ ─ ═══════╝─ ─ ─
```

- **Solid thick line**: Active track (the track the Result is currently on)
- **Dashed thin line**: Inactive track (bypassed)
- **Vertical connector at switch**: Diagonal line connecting Ok track to Err track (or vice versa), with ⚡ icon at midpoint

## 4.5 Playback Mode

The `[▶ Play]` button animates a particle flowing through the chain:

1. Particle appears at the entry node
2. Flows along the active track to the next operation
3. Pauses briefly at each node (200ms default, configurable)
4. At switch points, the particle visually crosses between tracks
5. At the terminal node, the particle fades out with a success (green burst) or error (red burst) effect

### Playback Controls

| Control      | Action                                    |
| ------------ | ----------------------------------------- |
| `▶ Play`     | Start/resume animation from the beginning |
| `⏸ Pause`    | Pause animation at current step           |
| `◀ Prev`     | Step backward one operation               |
| `▶ Next`     | Step forward one operation                |
| `⏮ Start`   | Jump to entry node                        |
| Speed slider | 0.5x / 1x / 2x / 4x playback speed        |

## 4.6 No-Execution Mode

When no specific execution is selected, the pipeline shows the **static structure**:

- All tracks drawn as thin neutral lines (no active/inactive distinction)
- Nodes show method names but no track flow or duration
- Switch-capable nodes (andThen, orElse, etc.) show both possible output arrows
- Tooltip says "Select an execution to see the flow"

## 4.7 Node Detail Panel

When a node is selected (clicked), a detail panel slides in from the right:

```
+─── andThen(validate) ─────────────────+
│                                        │
│  Category: chaining                    │
│  Input track: Ok                       │
│  Output track: Err (switched!)         │
│  Can switch: Yes                       │
│  Side effect: No                       │
│  Terminal: No                          │
│                                        │
│  ── Value Inspector ──                 │
│                                        │
│  Input (Ok):                           │
│    ▸ value: 43                         │
│                                        │
│  Output (Err):                         │
│    ▸ _tag: "ValidationError"           │
│      field: "email"                    │
│      message: "invalid format"         │
│                                        │
│  ── Execution Stats ──                 │
│                                        │
│  Times executed: 870                   │
│  Ok→Ok: 629 (72.3%)                   │
│  Ok→Err: 218 (25.1%)                  │
│  Err→Ok: 0 (0%)                       │
│  Err→Err: 23 (2.6%)                   │
│                                        │
│  ── Educational ──                     │
│                                        │
│  andThen (monadic bind):               │
│  Like a railroad switch that can       │
│  divert from Ok to Err. The callback   │
│  receives the Ok value and returns     │
│  a new Result. If it returns Err,      │
│  the chain switches to the Err track.  │
│                                        │
│  Equivalent to: flatMap / >>= / bind   │
│                                        │
│  [View in Operation Log] [View Cases]  │
+────────────────────────────────────────+
```

## 4.8 Multi-Chain Comparison

When multiple chains are selected (via chain selector with multi-select), the pipeline renders in comparison layout.

### Comparison Layout

```
+==[Comparing: validateUser vs validateAdmin]================================+
|                                                                             |
|  validateUser:                                                              |
|  ● ─── Ok ════════════════════════════════════════════════════ ●           |
|  ┃       ┃            ┃              ┃            ┃                        |
|  ╠═[ok]══╬═[map(f)]══╬═[andThen(g)]═╬═[orElse(h)]╬═[match]              |
|  ┃       ┃            ┃              ┃            ┃                        |
|  ○ ─── Err ─────────────────────────────────────────────────── ○           |
|                                                                             |
|  validateAdmin:                                                             |
|  ● ─── Ok ════════════════════════════════════════════════════ ●           |
|  ┃       ┃            ┃              ┃            ┃     ┃                  |
|  ╠═[ok]══╬═[map(f)]══╬═[andThen(g)]═╬═[andThen(r)]╬═[match]             |
|  ┃       ┃            ┃              ┃            ┃     ┃                  |
|  ○ ─── Err ─────────────────────────────────────────────────── ○           |
|                                                  ▲                          |
|                                            DIFFERS: orElse vs andThen      |
|                                                                             |
+=============================================================================+
```

### Alignment Strategy

| Rule             | Description                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Shared prefix    | Operations are aligned column-by-column from the left. Identical operations (same method + label) share a column. |
| Divergence point | The first column where operations differ gets a vertical highlight bar and "DIFFERS" annotation.                  |
| Extra operations | If one chain is longer, the shorter chain shows blank spacers in those columns.                                   |
| Shared entry     | If both chains start with the same constructor (e.g., both `ok()`), a single column is shared.                    |

### Comparison Annotations

| Annotation                           | Trigger                                           |
| ------------------------------------ | ------------------------------------------------- |
| "Same structure, different behavior" | Same operations, but switch rates differ by >10%  |
| "DIFFERS: {methodA} vs {methodB}"    | Operation at same index differs between chains    |
| "{chainA} has N more operations"     | Chains differ in length                           |
| Ok rate delta badge                  | Shows "+3.2%" or "-5.1%" comparing chain ok rates |

### Comparison Constraints

- Maximum 3 chains compared simultaneously (beyond 3, vertical space becomes impractical)
- Each chain retains its own execution selector
- Playback is synchronized across chains when both have a selected execution
- Click on a differing node highlights the corresponding column across all chains

## 4.9 Chain Selector

Dropdown listing all registered chains:

```
+─── Chain Selector ──────────────────────+
│ ⬤ validateUser       Ok: 97%   870 runs │
│ ⬤ fetchPosts         Ok: 89%   450 runs │
│ ⬤ processPayment     Ok: 99%  1200 runs │
│ ◯ parseConfig        Ok: 100%   23 runs │
│ ── Untraced (Level 0 only) ──          │
│ ◇ UserPort           Ok: 96%   500 runs │
│ ◇ DbPort             Ok: 91%   800 runs │
+─────────────────────────────────────────+
```

- **⬤** = Fully traced (Level 1), pipeline available
- **◯** = Fully traced, no errors observed
- **◇** = Port-level stats only (Level 0), no pipeline

## 4.10 Zoom and Pan

- Mouse wheel zooms (centered on cursor)
- Click-drag pans the canvas
- Minimap shows overview with viewport rectangle
- `[⊞ Fit]` button fits the entire chain in view
- Double-click a node to zoom-to-fit that node

_Previous: [03-views-and-wireframes.md](03-views-and-wireframes.md) | Next: [05-operation-log.md](05-operation-log.md)_
