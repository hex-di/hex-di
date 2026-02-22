_Previous: [04-railway-pipeline.md](04-railway-pipeline.md) | Next: [06-case-explorer.md](06-case-explorer.md)_

# 5. Operation Log View

A Redux DevTools-style step-by-step log of a Result chain execution. Provides granular inspection of intermediate values at each operation.

## 5.1 Layout

Split panel: operation list on the left, value inspector on the right.

```
+====[Operation List]===============+====[Value Inspector]===============+
| # | Method     | Track   | Dur   |                                     |
| --|------------|---------|-------|  Step 2: andThen(validate)           |
| 0 | ok         | → Ok    | --    |                                     |
| 1 | map(incr)  | Ok → Ok | <1μs  |  Input (Ok):                       |
|>2 | andThen(v) | Ok→Err  | 20μs  |    { email: "bad@",                |
| 3 | orElse(h)  | Err→Ok  | <1μs  |      name: "Alice",               |
| 4 | match      | Ok → ■  | <1μs  |      age: 30 }                    |
|   |            |         |       |                                     |
|   |            |         |       |  Output (Err):                      |
|   |            |         |       |    { _tag: "ValidationError",       |
|   |            |         |       |      field: "email",               |
|   |            |         |       |      message: "invalid format" }   |
|   |            |         |       |                                     |
+===================================+=====================================+
```

## 5.2 Operation List

### Columns

| Column   | Width | Content                                        |
| -------- | ----- | ---------------------------------------------- |
| `#`      | 32px  | Zero-based step index                          |
| Method   | flex  | Method name with optional label in parentheses |
| Track    | 80px  | Input → Output track with color indicators     |
| Duration | 64px  | Formatted duration                             |

### Row States

| State        | Visual                                                  |
| ------------ | ------------------------------------------------------- |
| Default      | Normal background                                       |
| Selected     | Accent background, border indicator (`>` prefix)        |
| Switch point | Amber background tint, ⚡ icon after track column       |
| Error output | Red tint on Err output indicator                        |
| Recovery     | Green tint on Ok output indicator (when input was Err)  |
| Bypassed     | Dimmed text (0.4 opacity), strikethrough on method name |
| Terminal     | Bold text, `■` instead of output track                  |

### Track Indicators

Color-coded inline badges:

- `→ Ok` = Green dot + "Ok" (entry with Ok)
- `→ Err` = Red dot + "Err" (entry with Err)
- `Ok → Ok` = Green→Green (stayed on Ok)
- `Ok → Err` = Green→Red (switched to Err) + ⚡
- `Err → Ok` = Red→Green (recovery) + ⚡
- `Err → Err` = Red→Red (stayed on Err)
- `Ok → ■` / `Err → ■` = Terminal extraction

## 5.3 Value Inspector

Displays the input and output values for the selected step using the existing `JsonTree` component.

### Sections

1. **Step Header**: Method name, category badge, source location link
2. **Input Value**: Collapsible JSON tree showing the value before the operation
3. **Output Value**: Collapsible JSON tree showing the value after the operation
4. **Diff Mode**: Toggle to show structural diff between input and output

### Value Display Rules

| Scenario               | Display                                        |
| ---------------------- | ---------------------------------------------- |
| Primitive value        | Inline: `42`, `"hello"`, `true`, `null`        |
| Object                 | Collapsible JSON tree with syntax highlighting |
| Array                  | Collapsible with item count badge              |
| Error object           | Special rendering: tag, message, and fields    |
| Truncated value        | "(truncated)" label with original type name    |
| `captureValues: false` | "(values not captured)" placeholder            |
| Circular reference     | `[Circular]` badge                             |
| Function reference     | `[Function: name]` badge                       |

## 5.4 Diff Mode

When enabled, the inspector shows a structural diff between the input and output:

```
Diff (Input → Output):

  Track: Ok → Err  (SWITCHED)

  Value diff:
  - (type changed: number → object)
  + {
  +   _tag: "ValidationError",
  +   field: "email",
  +   message: "invalid format"
  + }
```

### Diff Rules

| Change Type                 | Visual                                   |
| --------------------------- | ---------------------------------------- |
| Same value, same track      | "No change" message                      |
| Same track, different value | Standard diff with +/- lines             |
| Track switch                | Bold "SWITCHED" label with old→new track |
| Type change                 | "type changed: X → Y" header             |
| Added properties            | Green `+` prefix                         |
| Removed properties          | Red `-` prefix                           |
| Changed properties          | Yellow `~` prefix with old→new           |

## 5.5 Execution Selector

Dropdown at the top listing recent executions for the selected chain:

```
+─── Execution Selector ────────────────────+
│ #847  Ok   2024-01-15 14:23:05  0.08ms    │
│ #846  Err  2024-01-15 14:22:58  0.12ms    │
│ #845  Ok   2024-01-15 14:22:51  0.07ms    │
│ #844  Ok   2024-01-15 14:22:44  0.09ms    │
│ ...                                        │
+────────────────────────────────────────────+
```

Each entry shows:

- Execution number (most recent first)
- Final result badge (Ok/Err)
- Timestamp
- Total duration

## 5.6 Filtering

| Filter          | Type         | Description                                             |
| --------------- | ------------ | ------------------------------------------------------- |
| Switch only     | Toggle       | Show only steps where a track switch occurred           |
| Err steps only  | Toggle       | Show only steps where the output track is Err           |
| Method filter   | Multi-select | Show only specific methods (e.g., only `andThen` steps) |
| Duration filter | Range slider | Show only steps exceeding a duration threshold          |

## 5.7 Cross-View Navigation

- **"View in Pipeline"**: Opens the Railway Pipeline view with this execution and scrolls to the selected step
- **"View Cases"**: Opens the Case Explorer view with the path of this execution highlighted
- **"View Waterfall"**: Opens the Async Waterfall view for async chains

_Previous: [04-railway-pipeline.md](04-railway-pipeline.md) | Next: [06-case-explorer.md](06-case-explorer.md)_
