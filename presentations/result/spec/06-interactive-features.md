# Result Presentation - Interactive Features

## Overview

The presentation includes interactive elements that transform it from a passive slide deck into a hands-on experience. These features demonstrate HexDI concepts while the audience engages with them.

---

## Feature 1: Live Result Playground

**Appears on**: Slides 13-16 (Foundation section), available as overlay on any slide

### Description

A small interactive panel where the audience can write Result expressions and see the output in real-time. Think of it as a mini REPL embedded in the presentation.

### Behavior

- Toggle with keyboard shortcut (`P` for playground)
- Panel slides in from the right side (400px wide)
- Pre-populated with context-appropriate code based on current slide
- Editable textarea with syntax highlighting
- Output panel below shows:
  - The Result value (`Ok(42)` or `Err({ _tag: "NotFound", id: "123" })`)
  - The TypeScript type (`Result<number, NotFound>`)
  - Whether it's Ok or Err (green/red indicator)

### Sandbox Constraints

- Only `@hex-di/result` imports available
- No network access, no filesystem
- Execution timeout: 1 second
- Output capped at 500 characters

### Pre-populated Examples per Slide

| Slide             | Pre-populated Code                                                   |
| ----------------- | -------------------------------------------------------------------- |
| 13 (Creating)     | `const r = ok(42); r`                                                |
| 14 (Checking)     | `const r = ok(42); r.isOk()`                                         |
| 15 (Transforming) | `ok(5).map(n => n * 2)`                                              |
| 16 (Extracting)   | `ok(5).match(v => \`got ${v}\`, e => \`err: ${e}\`)`                 |
| 23 (Combining)    | `all(ok(1), ok(2), ok(3))`                                           |
| 27 (safeTry)      | `safeTry(function* () { const a = yield* ok(1); return ok(a + 1) })` |

---

## Feature 2: Container Inspector

**Appears on**: Slide 32 ("The Live Demo")

### Description

Shows the presentation's own HexDI container state in real-time. The audience sees:

1. **Dependency Graph**: Visual node-graph of all ports and adapters
2. **Resolution State**: Which services are instantiated, which are lazy
3. **Tracing Timeline**: Recent spans from slide navigation

### Implementation

Uses `@hex-di/runtime` inspection API:

- Container snapshot for current state
- Port list with adapter bindings
- Resolution cache status

Uses `@hex-di/tracing` for timeline:

- Recent spans (last 10)
- Span name, duration, parent relationship
- Ok/Err outcome for Result-returning operations

### Visual Layout

```
+------------------------------------------------------------------+
| Container Inspector                                        [close]|
|------------------------------------------------------------------|
| [Graph]  [Instances]  [Traces]                                   |
|                                                                   |
| Graph tab:                                                        |
|                                                                   |
|  NavigationPort ──> NavigationAdapter (Flow)                     |
|  SlidesPort ──────> SlidesAdapter (Store)                        |
|  CodeExamplesPort > CodeExamplesAdapter (Query)                  |
|  ThemePort ───────> ThemeAdapter (Store)                         |
|  AnalyticsPort ──> AnalyticsAdapter (Tracing)                   |
|                                                                   |
| Instances tab:                                                    |
|                                                                   |
|  NavigationAdapter  [resolved]  singleton                        |
|  SlidesAdapter      [resolved]  singleton                        |
|  CodeExamplesAdapter [resolved] singleton                        |
|  ThemeAdapter       [resolved]  singleton                        |
|  AnalyticsAdapter   [resolved]  singleton                        |
|                                                                   |
| Traces tab:                                                       |
|                                                                   |
|  12:03:45.123  slide.navigate  slide_14 -> slide_15   2ms  Ok   |
|  12:03:44.891  code.fetch      "callback-pyramid"    45ms  Ok   |
|  12:03:42.003  slide.navigate  slide_13 -> slide_14   1ms  Ok   |
+------------------------------------------------------------------+
```

---

## Feature 3: Error Taxonomy Interactive Diagram

**Appears on**: Slide 8 ("The Taxonomy of Chaos")

### Description

An interactive classification chart where the audience can hover over each anti-pattern category to see the real code example from earlier slides.

### Categories

```
Error Handling Anti-Patterns
├── Silent Failures
│   ├── .catch(() => null)
│   ├── Empty catch blocks
│   └── Returns undefined on error
├── Type Erasure
│   ├── (error as Error).message
│   ├── throw new Error(string)
│   └── catch(e) with unknown type
├── Inconsistent Contracts
│   ├── Some functions throw
│   ├── Some return null
│   └── Some show toast directly
└── Lost Context
    ├── Generic "Failed to X" messages
    ├── Original error details discarded
    └── Stack traces replaced
```

### Interaction

- Hover: Highlights the category and shows a tooltip with the code snippet
- Click: Navigates to the slide where this anti-pattern was shown
- Colors: Each category has a distinct shade of the error red spectrum

---

## Feature 4: Railway Diagram Animation

**Appears on**: Slide 15 ("Transforming Results")

### Description

An animated SVG diagram showing the "railway-oriented programming" metaphor:

- Two parallel tracks: **success track** (green) and **error track** (red)
- Values flow along the success track
- `.map()` transforms the value while staying on the success track
- `.mapErr()` transforms the error while staying on the error track
- `.andThen()` can switch tracks (success -> error)
- `.orElse()` can switch tracks (error -> success)

### Animation Sequence

1. A value enters the success track: `ok(5)`
2. It passes through `.map(n => n * 2)`: value becomes `10`
3. It passes through `.andThen(validate)`: stays on success
4. Another example: value enters, hits `.andThen(validate)`, switches to error track
5. Error passes through `.mapErr(enhance)`: error transformed
6. Error hits `.orElse(recover)`: switches back to success track

### Controls

- Play/Pause button
- Step forward/backward
- Speed control (0.5x, 1x, 2x)
- Current state shown below: `Ok(10)` or `Err({ _tag: "Invalid" })`

---

## Feature 5: Before/After Code Diff

**Appears on**: Slides 17-22 (Fixing Real Code section)

### Description

Interactive code comparison with features beyond static side-by-side:

### Interactions

1. **Highlight corresponding lines**: Hover a line in "before", the related transformation in "after" lights up
2. **Toggle annotations**: Show/hide inline annotations explaining each change
3. **Type tooltip**: Hover any variable to see its inferred type
4. **Line count comparison**: Footer shows line count for each side
5. **Problem count**: "Before" footer shows count of anti-patterns; "After" shows "0 issues"

### Visual Treatment

- Before panel: subtle red tint on background (`rgba(215, 43, 63, 0.03)`)
- After panel: subtle green tint on background (`rgba(7, 148, 85, 0.03)`)
- Connecting lines between before/after for key transformations (optional, toggleable)
- Anti-pattern annotations in before: red inline marks
- Improvement annotations in after: green inline marks

---

## Feature 6: HexDI Ecosystem Map

**Appears on**: Slide 30 ("The Self-Aware Application")

### Description

An interactive diagram showing all HexDI packages and how they connect.

### Layout

Center: `@hex-di/core` (the DI container)
Surrounding ring: All library packages positioned by category

```
                    @hex-di/tracing
                         |
    @hex-di/logger ──── CORE ──── @hex-di/result
                       / | \
              @hex-di/  |   @hex-di/
               store  flow    query
                       |
                  @hex-di/saga
```

### Interactions

- Hover a package: Show its description and key feature
- Click a package: Expand to show its ports and adapters
- Hover `@hex-di/result`: All connections to Result light up (every package uses it)
- Animation: Data flows through connections showing how libraries communicate

### Result Connections Highlight

When Result is highlighted, show arrows from Result to every other package with labels:

- Core: "Container resolution returns Result"
- Graph: "Validation returns Result"
- Runtime: "Service creation returns Result"
- Store: "Async derived values return Result"
- Query: "Fetch operations return Result"
- Saga: "Step execution returns Result"
- Flow: "Effect execution returns Result"

---

## Feature 7: Presenter Notes Panel

**Available on**: All slides, toggled with `N` key

### Description

A collapsible panel at the bottom showing notes for the current slide. Useful when the presentation is given live.

### Content per Slide

Each slide definition includes optional `presenterNotes` field containing:

- Key talking points
- Timing suggestions ("spend ~2 minutes here")
- Audience engagement prompts ("ask if anyone has seen this pattern")
- Transition cues ("pause before revealing the next point")

### Visual

- Panel: 200px height, slides up from bottom
- Background: `neutral-50`
- Text: `neutral-700`, smaller font
- Only visible to presenter (not on projected screen if using display mode)

---

## Feature 8: Keyboard Shortcuts

| Key               | Action                                             |
| ----------------- | -------------------------------------------------- |
| `Right` / `Space` | Next slide                                         |
| `Left`            | Previous slide                                     |
| `Home`            | First slide                                        |
| `End`             | Last slide                                         |
| `1-9`             | Jump to slide 1-9                                  |
| `G` then number   | Go to slide N (e.g., `G` `2` `5` goes to slide 25) |
| `P`               | Toggle playground                                  |
| `N`               | Toggle presenter notes                             |
| `D`               | Toggle dark/light mode                             |
| `F`               | Toggle fullscreen                                  |
| `O`               | Overview (grid of all slides)                      |
| `Escape`          | Close any open panel / exit overview               |

---

## Feature 9: Slide Overview Grid

**Toggled with**: `O` key

### Description

A zoomed-out view showing all 36 slides as thumbnails in a grid. Allows quick navigation to any slide.

### Layout

- 6 columns x 6 rows
- Each thumbnail: 200px x 112px (16:9 ratio)
- Current slide: purple border (`brand-base`)
- Act sections separated by divider rows with act labels
- Click any thumbnail to navigate to that slide

### Visual

- Background: semi-transparent dark overlay
- Thumbnails: actual miniature renders of slide content
- Hover: slight scale-up (1.05x) with shadow
- Active: purple ring

---

## Implementation Priority

1. **Must have**: Keyboard navigation, slide transitions, code blocks with highlighting
2. **Should have**: Before/after comparison, presenter notes, overview grid
3. **Nice to have**: Live playground, container inspector, railway animation
4. **Stretch**: Interactive ecosystem map, code diff hover connections
