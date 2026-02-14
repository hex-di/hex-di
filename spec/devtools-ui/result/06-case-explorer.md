_Previous: [05-operation-log.md](05-operation-log.md) | Next: [07-sankey-statistics.md](07-sankey-statistics.md)_

# 6. Case Explorer View

Stately-inspired visualization of ALL possible paths through a Result chain, with runtime frequency overlay. Enables "what-if" simulation.

## 6.1 Design Philosophy

A chain of N switch-capable operations has up to 2^N distinct paths. The Case Explorer:

1. **Statically enumerates** all possible paths by analyzing which operations can switch tracks
2. **Overlays runtime data** showing which paths have been observed and how frequently
3. **Highlights unobserved paths** as potential blind spots in testing
4. **Enables simulation** by letting the user force specific operations to Ok or Err

## 6.2 Path Tree

The primary visualization is a binary tree where each switch-capable operation creates a branch:

```
ok(x) ─── map(f) ─┬─ andThen(g): Ok ─┬─ andThrough(v): Ok ─── match: Ok
                   │                   │   Path A: 72.3% (629 runs)
                   │                   │
                   │                   └─ andThrough(v): Err ─── match: Err
                   │                       Path B: 0% (never observed!) ⚠
                   │
                   └─ andThen(g): Err ─┬─ orElse(h): Ok ─── match: Ok
                                       │   Path C: 25.1% (218 runs)
                                       │
                                       └─ orElse(h): Err ─── match: Err
                                           Path D: 2.6% (23 runs)
```

### Tree Node Properties

| Property        | Display                                                |
| --------------- | ------------------------------------------------------ |
| Operation name  | Method name with label                                 |
| Branch label    | "Ok" or "Err" (the output track at this branch)        |
| Frequency       | Percentage and absolute count                          |
| Frequency bar   | Horizontal bar proportional to frequency               |
| Observed status | Green check (observed), amber warning (never observed) |

### Non-Switching Operations

Operations that cannot switch tracks (`map`, `mapErr`, `inspect`, etc.) are collapsed into a single edge between branch points:

```
Instead of:
  ok → map → map → andThen → map → orElse → match

Display:
  ok ── [2 maps] ── andThen ── [1 map] ── orElse ── match
```

The collapsed count badge (`[2 maps]`) is clickable to expand the full sequence.

## 6.3 Path Detail Panel

When a path is selected (clicked on a leaf node or path label):

```
+─── Path C: Err at step 2, recovered at step 3 ──────+
│                                                       │
│  Track sequence: Ok → Ok → Err → Ok → Ok             │
│  Switch points: step 2 (Ok→Err), step 3 (Err→Ok)     │
│                                                       │
│  Frequency: 25.1% (218 / 870 runs)                    │
│  First observed: 2024-01-15 12:00:00                  │
│  Last observed: 2024-01-15 14:22:58                   │
│                                                       │
│  Classification: Recovery path                        │
│  Description: Validation fails but fallback succeeds  │
│                                                       │
│  ── Recent Executions ──                              │
│  #846  { email: "bad@" }  → ValidationError → default │
│  #834  { email: "" }      → ValidationError → default │
│  #821  { email: null }    → ValidationError → default │
│                                                       │
│  [View in Pipeline] [View in Log] [Simulate This]     │
+───────────────────────────────────────────────────────+
```

## 6.4 Path Classification

Each path is automatically classified:

| Classification       | Criteria                       | Icon |
| -------------------- | ------------------------------ | ---- |
| **Happy path**       | All Ok from entry to terminal  | ✅   |
| **Error path**       | Ends on Err track at terminal  | ❌   |
| **Recovery path**    | Has at least one Err→Ok switch | 🔄   |
| **Multi-error path** | Multiple Ok→Err switches       | ⚠️   |
| **Unobserved**       | `observed: false`              | 👻   |
| **Rare path**        | Frequency < 1%                 | 🔍   |

## 6.5 What-If Simulation

The simulator lets users explore hypothetical scenarios by forcing specific operations to produce Ok or Err outputs.

### Simulation Controls

```
+─── What-If Simulator ──────────────────────────────+
│                                                     │
│  Force operation outcomes:                          │
│                                                     │
│  andThen(validate):  [Auto ▼]  [Force Ok] [Force Err] │
│  andThrough(check):  [Auto ▼]  [Force Ok] [Force Err] │
│  orElse(fallback):   [Auto ▼]  [Force Ok] [Force Err] │
│                                                     │
│  Simulated path: Ok → Ok → Err → Ok → Ok           │
│  Classification: Recovery path                      │
│  Matches observed path C (25.1% frequency)          │
│                                                     │
│  [Reset All] [Apply to Pipeline View]               │
+─────────────────────────────────────────────────────+
```

### Simulation Behavior

1. User selects an operation and forces its output to Ok or Err
2. The path tree highlights the resulting path
3. If the path has been observed, show its frequency and example executions
4. If the path has NOT been observed, show a warning: "This path has never been observed. Consider adding a test case."
5. The forced outcome propagates downstream: if `andThen` is forced to Err, subsequent Ok-only operations are bypassed

### "Auto" Mode

When set to "Auto", the simulator uses the most likely outcome based on observed frequencies:

- If `andThen(validate)` produced Ok 72.3% of the time, "Auto" simulates Ok
- Useful for exploring the "typical" path vs. edge cases

## 6.6 Coverage Analysis

The Case Explorer computes path coverage metrics:

```
+─── Path Coverage ─────────────────────────+
│                                            │
│  Total possible paths: 4                   │
│  Observed paths: 3 (75%)                   │
│  Unobserved paths: 1 (25%)                 │
│                                            │
│  ⚠ Unobserved: Path B                     │
│    andThen(g): Ok → andThrough(v): Err     │
│    Suggestion: Test with input that passes  │
│    validation but fails the integrity check │
│                                            │
│  Path entropy: 1.24 bits                   │
│  (Higher = more evenly distributed paths)  │
│                                            │
+────────────────────────────────────────────+
```

### Coverage Metrics

| Metric           | Formula             | Description                                                                    |
| ---------------- | ------------------- | ------------------------------------------------------------------------------ |
| Path coverage    | observed / total    | Fraction of paths seen at runtime                                              |
| Path entropy     | -Σ p(i) log2 p(i)   | Shannon entropy of path distribution. Higher = more diverse execution patterns |
| Dominant path    | max(frequency)      | The most common path and its percentage                                        |
| Error path ratio | error_paths / total | Fraction of paths that end in Err                                              |

## 6.7 Static Analysis

### Path Enumeration Algorithm

1. Start with the chain descriptor's operation list
2. For each operation where `canSwitch === true`, create a branch
3. Compute the full binary tree of possible track sequences
4. Prune impossible paths (e.g., `orElse` can only switch from Err→Ok, not Ok→Err)
5. For each remaining path, generate a `ResultPathDescriptor`

### Pruning Rules

| Operation       | From Ok                | From Err              |
| --------------- | ---------------------- | --------------------- |
| `andThen`       | Can go Ok or Err       | Stays Err (bypassed)  |
| `orElse`        | Stays Ok (bypassed)    | Can go Ok or Err      |
| `andThrough`    | Can go Ok or Err       | Stays Err (bypassed)  |
| `flip`          | Always switches to Err | Always switches to Ok |
| `fromThrowable` | Ok if no throw         | Err if throw          |

### Path Count Bounds

| Switch operations | Max paths | Notes                                  |
| ----------------- | --------- | -------------------------------------- |
| 0                 | 1         | Only the happy path                    |
| 1                 | 2         | One branch point                       |
| 2                 | 3-4       | Depends on operation order             |
| 3                 | 4-8       | Combinatorial growth                   |
| 5+                | Up to 32+ | Tree visualization may need pagination |

For chains with >16 possible paths, the tree shows the top-N most frequent paths and groups the rest under "N more paths...".

_Previous: [05-operation-log.md](05-operation-log.md) | Next: [07-sankey-statistics.md](07-sankey-statistics.md)_
