_Previous: [14-integration.md](14-integration.md) | Next: [16-definition-of-done.md](16-definition-of-done.md)_

# 15. Accessibility

WCAG 2.1 AA compliance for all Result Panel views, with specific guidance for the unique visualizations (railway diagrams, Sankey charts, waterfall timelines).

## 15.1 ARIA Roles and Labels

### Panel-Level

| Element               | Role                   | ARIA Label                                  |
| --------------------- | ---------------------- | ------------------------------------------- |
| Result Panel root     | `role="region"`        | `aria-label="Result Panel"`                 |
| View switcher toolbar | `role="tablist"`       | `aria-label="Result Panel views"`           |
| Each view button      | `role="tab"`           | `aria-label="{view name}"`, `aria-selected` |
| Active view area      | `role="tabpanel"`      | `aria-labelledby="{active tab id}"`         |
| Status bar            | `role="status"`        | `aria-live="polite"`                        |
| Educational sidebar   | `role="complementary"` | `aria-label="Educational content"`          |

### Railway Pipeline

| Element           | Role                   | ARIA Label                                                                  |
| ----------------- | ---------------------- | --------------------------------------------------------------------------- |
| Canvas SVG        | `role="img"`           | `aria-label="Railway pipeline for {chainLabel}"`                            |
| Ok track          | --                     | `aria-hidden="true"` (decorative, info in nodes)                            |
| Err track         | --                     | `aria-hidden="true"` (decorative, info in nodes)                            |
| Operation node    | `role="button"`        | `aria-label="{method}({label}), {inputTrack} to {outputTrack}, {duration}"` |
| Switch indicator  | --                     | Included in node label: "switched from Ok to Err"                           |
| Node detail panel | `role="complementary"` | `aria-label="Details for {method}({label})"`                                |
| Playback controls | `role="toolbar"`       | `aria-label="Playback controls"`                                            |
| Play button       | `role="button"`        | `aria-label="Play animation"` / `aria-label="Pause animation"`              |
| Minimap           | `role="img"`           | `aria-label="Pipeline minimap"`                                             |

### Operation Log

| Element         | Role              | ARIA Label                                                  |
| --------------- | ----------------- | ----------------------------------------------------------- |
| Step list       | `role="grid"`     | `aria-label="Operation steps for execution #{executionId}"` |
| Step row        | `role="row"`      | `aria-rowindex`                                             |
| Step cells      | `role="gridcell"` | --                                                          |
| Selected step   | --                | `aria-selected="true"`                                      |
| Value inspector | `role="region"`   | `aria-label="Value inspector for step {index}"`             |
| JSON tree node  | `role="treeitem"` | `aria-expanded`, `aria-level`                               |
| Filter toggles  | `role="checkbox"` | `aria-checked`, `aria-label="{filter name}"`                |

### Case Explorer

| Element              | Role                   | ARIA Label                                                               |
| -------------------- | ---------------------- | ------------------------------------------------------------------------ |
| Path tree            | `role="tree"`          | `aria-label="Possible paths through {chainLabel}"`                       |
| Branch node          | `role="treeitem"`      | `aria-expanded`, `aria-label="{method}: {track}, {frequency}%"`          |
| Leaf node (path end) | `role="treeitem"`      | `aria-label="Path {classification}: {frequency}%, {observedCount} runs"` |
| Path detail panel    | `role="complementary"` | `aria-label="Path details"`                                              |
| What-If controls     | `role="toolbar"`       | `aria-label="What-If simulation controls"`                               |
| Force Ok/Err buttons | `role="radio"`         | `aria-checked`, within `role="radiogroup"`                               |

### Sankey Statistics

| Element       | Role            | ARIA Label                                            |
| ------------- | --------------- | ----------------------------------------------------- |
| Sankey SVG    | `role="img"`    | `aria-label="Flow statistics for {chainLabel}"`       |
| Ok node       | `role="button"` | `aria-label="Ok at {step}: {count} ({percentage}%)"`  |
| Err node      | `role="button"` | `aria-label="Err at {step}: {count} ({percentage}%)"` |
| Flow link     | --              | `aria-hidden="true"` (info accessible via nodes)      |
| Hotspot table | `role="table"`  | `aria-label="Error hotspot ranking"`                  |
| Sparkline     | `role="img"`    | `aria-label="Stability timeline: current {score}%"`   |

### Async Waterfall

| Element      | Role            | ARIA Label                                               |
| ------------ | --------------- | -------------------------------------------------------- |
| Timeline SVG | `role="img"`    | `aria-label="Async execution timeline for {chainLabel}"` |
| Duration bar | `role="button"` | `aria-label="{method}: {duration}ms, {track}"`           |
| Time axis    | --              | `aria-hidden="true"` (decorative)                        |
| Summary      | `role="region"` | `aria-label="Duration breakdown"`                        |

### Combinator Matrix

| Element          | Role              | ARIA Label                                                       |
| ---------------- | ----------------- | ---------------------------------------------------------------- |
| Matrix container | `role="grid"`     | `aria-label="{combinator} matrix, {inputCount} inputs"`          |
| Input cell       | `role="gridcell"` | `aria-label="Input {index}: {label}, {track}({valuePreview})"`   |
| Combinator box   | `role="gridcell"` | `aria-label="{combinator}: {inputCount} inputs, output {track}"` |
| Output box       | `role="gridcell"` | `aria-label="Output: {track}({valuePreview})"`                   |

### Overview Dashboard

| Element                  | Role            | ARIA Label                             |
| ------------------------ | --------------- | -------------------------------------- |
| Stat card                | `role="button"` | `aria-label="{metric}: {value}"`       |
| Error distribution chart | `role="img"`    | `aria-label="Error type distribution"` |
| Stability timeline       | `role="img"`    | `aria-label="Stability over time"`     |
| Top errors table         | `role="table"`  | `aria-label="Top errors"`              |

## 15.2 Keyboard Navigation

### Tab Order

Focus flows through the panel in this order:

1. View switcher tabs
2. Chain selector dropdown
3. Execution selector dropdown (if applicable)
4. View-specific controls (filters, playback)
5. Active view content (nodes, steps, cells)
6. Detail/sidebar panels (when open)
7. Status bar

### View-Specific Keyboard Controls

#### Railway Pipeline

| Key       | Action                                                 |
| --------- | ------------------------------------------------------ |
| `Tab`     | Cycle focus between operation nodes (left to right)    |
| `Enter`   | Select focused node, open detail panel                 |
| `Escape`  | Close detail panel, deselect node                      |
| `Space`   | Toggle playback                                        |
| `←` / `→` | Step backward / forward (during playback or step mode) |
| `+` / `-` | Zoom in / out                                          |
| `0`       | Fit to view                                            |

#### Operation Log

| Key       | Action                                            |
| --------- | ------------------------------------------------- |
| `↑` / `↓` | Move step selection                               |
| `Enter`   | Expand/collapse JSON tree node in value inspector |
| `←` / `→` | Collapse/expand JSON tree node                    |
| `d`       | Toggle diff mode                                  |
| `Tab`     | Move focus between log list and value inspector   |

#### Case Explorer

| Key       | Action                              |
| --------- | ----------------------------------- |
| `↑` / `↓` | Move focus between tree nodes       |
| `←`       | Collapse branch / move to parent    |
| `→`       | Expand branch / move to first child |
| `Enter`   | Select path, open detail panel      |
| `s`       | Open What-If Simulator              |

#### Sankey Statistics

| Key      | Action                                                    |
| -------- | --------------------------------------------------------- |
| `Tab`    | Cycle between Ok/Err nodes (left to right, top to bottom) |
| `Enter`  | Select node, show detail popover                          |
| `Escape` | Close popover                                             |

#### Overview Dashboard

| Key     | Action                                   |
| ------- | ---------------------------------------- |
| `Tab`   | Cycle between stat cards                 |
| `Enter` | Activate card (navigate to related view) |

### Global Keyboard Shortcuts

| Key       | Action                                |
| --------- | ------------------------------------- |
| `1` - `7` | Switch to numbered view               |
| `?`       | Toggle educational sidebar            |
| `f`       | Open filter controls                  |
| `/`       | Open global search                    |
| `Escape`  | Close any open panel/overlay/dropdown |

## 15.3 Screen Reader Announcements

Live regions announce state changes:

| Event                         | Announcement                                                        |
| ----------------------------- | ------------------------------------------------------------------- |
| View switched                 | "Switched to {view name} view"                                      |
| Chain selected                | "Selected chain {label}, {okRate}% Ok, {runCount} executions"       |
| Execution selected            | "Execution #{id}, {finalTrack}, {duration}"                         |
| Step selected (log)           | "Step {index}: {method}, {inputTrack} to {outputTrack}, {duration}" |
| Switch detected               | "Track switch at step {index}: {inputTrack} to {outputTrack}"       |
| Path selected (case explorer) | "Path: {classification}, {frequency}%, {observedCount} runs"        |
| Simulation changed            | "Simulated path: {trackSequence}"                                   |
| Filter applied                | "Filter applied. Showing {N} of {M} items"                          |
| Filter cleared                | "All filters cleared"                                               |
| Playback started              | "Playback started"                                                  |
| Playback paused               | "Playback paused at step {index}"                                   |
| Playback ended                | "Playback complete. Final result: {track}"                          |
| Connection lost               | "Connection to container lost. Showing stale data."                 |
| Connection restored           | "Connection restored. Data updated."                                |
| Educational hint              | Announced via `aria-live="polite"` region                           |

## 15.4 Color Independence

Color is never the sole indicator of any state. All color-encoded information has a redundant non-color indicator:

| Information         | Color Signal      | Redundant Signal                              |
| ------------------- | ----------------- | --------------------------------------------- |
| Ok track            | Green             | `●` filled circle + "Ok" text label           |
| Err track           | Red               | `○` empty circle + "Err" text label           |
| Track switch        | Amber ⚡          | ⚡ lightning bolt icon + "switched" text      |
| Bypassed operation  | Dimmed opacity    | Dashed border + strikethrough text            |
| Duration severity   | Green/amber/red   | Duration text always visible + p50/p90 labels |
| Stability zone      | Green/amber/red   | Percentage text + zone label                  |
| Path classification | Varies            | Distinct icon per classification + text label |
| Category            | Color icon        | Icon shape + text label in tooltip            |
| Recovery            | Green glow        | ⚡ icon + "recovery" label                    |
| Error hotspot       | Red emphasis      | Rank number + percentage text                 |
| Sankey link         | Track-based color | Width proportional to count + count labels    |

### Pattern Overlays for Charts

- Sankey links: Ok→Err and Err→Ok links use diagonal stripe pattern in addition to gradient
- Duration bars: p50-p90 bars use diagonal hatch pattern overlay
- Sparkline zones: amber zone has dotted underline, red zone has solid underline

## 15.5 Focus Management

| Trigger                       | Focus Target                              |
| ----------------------------- | ----------------------------------------- |
| Select operation node         | Detail panel first interactive element    |
| Close detail panel            | Previously focused node                   |
| Open educational sidebar      | Sidebar heading                           |
| Close educational sidebar     | `[?]` toggle button                       |
| Open filter controls          | First filter input                        |
| Close filter controls         | Filter toggle button                      |
| Walkthrough step advance      | Highlighted element (if interactive)      |
| Global search open            | Search input                              |
| Global search result selected | Target element in navigated view          |
| What-If Simulator open        | First operation's Auto/Ok/Err radio group |
| View switch                   | First interactive element in new view     |

## 15.6 Motion and Animation

### prefers-reduced-motion: reduce

When the user has requested reduced motion:

| Animation                   | Standard                      | Reduced Motion                 |
| --------------------------- | ----------------------------- | ------------------------------ |
| Particle flow (playback)    | Smooth CSS offset-path motion | Instant step-by-step highlight |
| Track switch connector      | Animated SVG draw             | Instant appearance             |
| Terminal burst              | Scale + fade animation        | 2-second border highlight      |
| Node hover elevation        | 150ms shadow transition       | Instant shadow                 |
| View crossfade              | 200ms opacity transition      | Instant swap                   |
| Panel slide-in              | 250ms translateX              | Instant appearance             |
| Sankey link highlight       | 150ms opacity transition      | Instant opacity change         |
| Walkthrough spotlight pulse | Continuous pulse animation    | Static highlight border        |
| ⚡ icon pulse               | 300ms scale animation         | Static display                 |
| Filter result update        | 150ms opacity transition      | Instant opacity                |

### Testing Reduced Motion

All components must be tested with `prefers-reduced-motion: reduce` applied. Tests should verify:

- No CSS animations are present (duration: 0ms)
- Playback mode uses step-by-step instead of continuous motion
- All information is still conveyed without animation

## 15.7 Text Sizing and Readability

| Element          | Min Size | Font                                    | Line Height |
| ---------------- | -------- | --------------------------------------- | ----------- |
| Method name      | 12px     | monospace                               | 1.4         |
| Track label      | 11px     | sans-serif                              | 1.3         |
| Duration text    | 10px     | monospace                               | 1.3         |
| Tooltip text     | 12px     | sans-serif                              | 1.5         |
| Educational body | 14px     | sans-serif                              | 1.6         |
| Walkthrough body | 14px     | sans-serif                              | 1.6         |
| Status bar       | 12px     | sans-serif                              | 1.4         |
| Table header     | 11px     | sans-serif, uppercase                   | 1.3         |
| Table cell       | 12px     | monospace (values), sans-serif (labels) | 1.4         |

All text scales with the browser's font size preference. No fixed px values that override user preferences.

## 15.8 Contrast Requirements

All text meets WCAG AA contrast ratios:

| Context               | Foreground           | Background               | Minimum Ratio         |
| --------------------- | -------------------- | ------------------------ | --------------------- |
| Primary text on panel | `--hex-text-primary` | `--hex-bg-primary`       | 4.5:1                 |
| Muted text            | `--hex-text-muted`   | `--hex-bg-primary`       | 4.5:1                 |
| Ok badge text         | `--hex-result-ok`    | `--hex-result-ok-muted`  | 4.5:1                 |
| Err badge text        | `--hex-result-err`   | `--hex-result-err-muted` | 4.5:1                 |
| Category icon         | Category color       | `--hex-bg-secondary`     | 3:1 (decorative icon) |
| Tooltip text          | `--hex-text-primary` | `--hex-bg-tertiary`      | 4.5:1                 |

## 15.9 Touch Target Sizes

For touch-capable devices:

| Element                   | Minimum Target Size                           |
| ------------------------- | --------------------------------------------- |
| Operation node (Railway)  | 44x44px (node is 120x56px, exceeds minimum)   |
| Step row (Operation Log)  | 44px height                                   |
| View tab button           | 44x44px                                       |
| Playback button           | 44x44px                                       |
| Dropdown option           | 44px height                                   |
| JSON tree expand/collapse | 44x44px tap area (visual triangle is smaller) |
| Filter checkbox           | 44x44px tap area                              |

## 15.10 High Contrast Mode

When `forced-colors: active` (Windows High Contrast Mode):

- Track lines use system `ButtonText` color
- Ok/Err distinction maintained through solid vs dashed line patterns
- Switch indicators use `Highlight` color
- All fills revert to `Canvas` background
- Badges use `ButtonText` on `Canvas` background
- Focus indicators use `Highlight` color, 3px outline

_Previous: [14-integration.md](14-integration.md) | Next: [16-definition-of-done.md](16-definition-of-done.md)_
