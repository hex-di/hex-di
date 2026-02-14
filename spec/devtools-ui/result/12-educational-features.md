_Previous: [11-interactions.md](11-interactions.md) | Next: [13-filter-and-search.md](13-filter-and-search.md)_

# 12. Educational Features

The Result Panel is designed to teach users about `Result<T, E>` patterns through exploration. Every visual element has an explanation, and guided walkthroughs demonstrate concepts hands-on.

## 12.1 Educational Sidebar

A collapsible sidebar on the right side of the panel, toggled by the `[?]` button in the toolbar or the `?` keyboard shortcut.

```
+===[Result Panel View Area]==================+===[Educational Sidebar]===+
|                                              |                           |
|  (active view content)                       |  [Glossary] [Walkthrough] |
|                                              |                           |
|                                              |  ── Currently Viewing ──  |
|                                              |                           |
|                                              |  andThen (monadic bind)   |
|                                              |                           |
|                                              |  Like a railroad switch   |
|                                              |  that can divert from Ok  |
|                                              |  to Err. The callback     |
|                                              |  receives the Ok value    |
|                                              |  and returns a new Result.|
|                                              |  If it returns Err, the   |
|                                              |  chain switches to Err.   |
|                                              |                           |
|                                              |  Equivalent to:           |
|                                              |  flatMap / >>= / bind     |
|                                              |                           |
|                                              |  ── Railway Metaphor ──   |
|                                              |  [switch diagram]         |
|                                              |                           |
|                                              |  ── Code Example ──       |
|                                              |  ok(42)                   |
|                                              |    .andThen(validate)     |
|                                              |  // Ok(42) → Err("bad")   |
|                                              |                           |
+===[Status Bar]===============================+===========================+
```

### Sidebar Tabs

| Tab             | Content                                                   |
| --------------- | --------------------------------------------------------- |
| **Glossary**    | Alphabetical list of all Result methods with descriptions |
| **Walkthrough** | Guided tours for learning Result patterns                 |

### Context-Aware Content

The sidebar automatically updates based on user interaction:

| User Action                          | Sidebar Shows                                          |
| ------------------------------------ | ------------------------------------------------------ |
| Hover/select a Railway Pipeline node | That operation's educational content                   |
| Select a step in Operation Log       | That operation's educational content                   |
| View the Case Explorer               | Explanation of path analysis and coverage              |
| View the Sankey Statistics           | Explanation of aggregate flow and error hotspots       |
| View the Combinator Matrix           | That combinator's semantics and comparison with others |
| No specific element selected         | General "Getting Started" content                      |

## 12.2 Method Glossary

A searchable, filterable reference for all Result methods.

### Glossary Entry Structure

Each entry contains:

```
+─── andThen ──────────────────────────────────────+
│                                                   │
│  Category: chaining                               │
│  Signature: andThen<U>(fn: (v: T) => Result<U, E>)│
│  Input track: Ok                                  │
│  Can switch: Yes (Ok → Err)                       │
│  Side effect: No                                  │
│  Terminal: No                                     │
│                                                   │
│  ── Description ──                                │
│  Passes the Ok value to a function that returns   │
│  a new Result. If the function returns Err, the   │
│  chain switches from Ok track to Err track.       │
│  If the chain is on Err track, andThen is         │
│  bypassed entirely.                               │
│                                                   │
│  ── Railway Diagram ──                            │
│  Ok ═══════╗                                      │
│            ║ andThen(fn)                           │
│  Err ──────╨───── (if fn returns Err)             │
│                                                   │
│  ── Equivalents ──                                │
│  Haskell: >>= (bind)                             │
│  Scala: flatMap                                   │
│  Rust: and_then                                   │
│  fp-ts: chain                                     │
│                                                   │
│  ── Common Patterns ──                            │
│  Validation chains:                               │
│    ok(input)                                      │
│      .andThen(validateEmail)                      │
│      .andThen(validateAge)                        │
│      .andThen(validateName)                       │
│                                                   │
│  ── Common Mistakes ──                            │
│  Using map when you need andThen:                 │
│    .map(validate) // Returns Result<Result<T,E>,E>│
│    .andThen(validate) // Returns Result<T, E>     │
│                                                   │
│  [Try in Playground]                              │
+───────────────────────────────────────────────────+
```

### Glossary Filtering

| Filter      | Type         | Description                                            |
| ----------- | ------------ | ------------------------------------------------------ |
| Search      | Text input   | Case-insensitive substring match on method name        |
| Category    | Multi-select | Filter by category (constructor, transformation, etc.) |
| Can switch  | Toggle       | Show only methods that can switch tracks               |
| Input track | Radio        | Show methods for Ok, Err, or both tracks               |

### Glossary Grouping

Methods are grouped by category with collapsible sections:

```
▸ Constructors (6 methods)
▾ Transformations (6 methods)
    map, mapErr, mapBoth, flatten, flip, asyncMap
▸ Chaining (3 methods)
▸ Recovery (1 method)
▸ Observation (4 methods)
▸ Extraction (4 methods)
▸ Conversion (6 methods)
▸ Combinators (4 methods)
▸ Generators (1 method)
```

## 12.3 Guided Walkthroughs

Interactive step-by-step tours that teach Result concepts using the panel's own visualizations.

### Available Walkthroughs

| #   | Title                              | Steps | Prerequisites                       |
| --- | ---------------------------------- | ----- | ----------------------------------- |
| 1   | **Your First Result Chain**        | 8     | None                                |
| 2   | **Understanding Track Switches**   | 6     | Chain with a switch point           |
| 3   | **Error Recovery with orElse**     | 5     | Chain with recovery                 |
| 4   | **Exploring All Possible Paths**   | 7     | Case Explorer with 3+ paths         |
| 5   | **Reading the Sankey Diagram**     | 6     | Sankey with 100+ executions         |
| 6   | **Async Chains and Timing**        | 5     | Async chain with waterfall data     |
| 7   | **Combinators: all vs allSettled** | 8     | Chain with combinator               |
| 8   | **What-If Simulation**             | 5     | Case Explorer                       |
| 9   | **Finding Error Hotspots**         | 6     | Sankey with error hotspots          |
| 10  | **Path Coverage Analysis**         | 5     | Case Explorer with unobserved paths |

### Walkthrough UI

Each walkthrough step:

```
+─── Step 3 of 8: Understanding Track Switches ──+
│                                                   │
│  Look at step 2 in the Operation Log.            │
│                                                   │
│  The track changed from Ok → Err here.           │
│  This means andThen's callback returned           │
│  an Err value. The ⚡ icon marks where            │
│  the switch happened.                             │
│                                                   │
│  Notice how steps 3+ show "bypassed" for         │
│  operations that only process the Ok track.       │
│                                                   │
│  ► HIGHLIGHT: step 2 in Operation Log             │
│  ► HIGHLIGHT: ⚡ switch indicator                  │
│  ► HIGHLIGHT: bypassed steps                      │
│                                                   │
│  [← Previous]  [Step 3/8]  [Next →]  [Skip]     │
+───────────────────────────────────────────────────+
```

### Walkthrough Behavior

1. **Spotlight**: The current step highlights relevant UI elements with a pulsing border
2. **Auto-navigate**: Steps can automatically switch views (e.g., "now look at the Case Explorer")
3. **Interactive**: Some steps wait for user action (e.g., "click on the andThen node")
4. **Dismissible**: "Skip" button exits the walkthrough at any point
5. **Resumable**: Progress is saved to localStorage; re-opening continues where left off
6. **Contextual**: Walkthroughs only appear when the required data is available

### Walkthrough Step Schema

```typescript
interface WalkthroughStep {
  /** Step number (1-based). */
  readonly stepNumber: number;

  /** Total steps in this walkthrough. */
  readonly totalSteps: number;

  /** Title of this step. */
  readonly title: string;

  /** Body text explaining the concept. */
  readonly body: string;

  /** Elements to highlight (CSS selectors or testid references). */
  readonly highlights: readonly string[];

  /** View to auto-navigate to, if any. */
  readonly navigateToView?:
    | "railway"
    | "log"
    | "cases"
    | "sankey"
    | "waterfall"
    | "combinator"
    | "overview";

  /** Whether this step waits for user interaction before advancing. */
  readonly waitForAction?: {
    readonly type: "click" | "hover" | "select";
    readonly target: string;
  };
}
```

## 12.4 Inline Tooltips

Every operation node in the Railway Pipeline and every step in the Operation Log shows a tooltip on hover:

### Tooltip Content

```
+─── map ──────────────────────────────+
│  Transform the Ok value.             │
│  Leaves Err values unchanged.        │
│                                      │
│  Category: transformation            │
│  Track: Ok only                      │
│  Can switch: No                      │
│                                      │
│  Like repainting cargo on the        │
│  Ok track without changing tracks.   │
+──────────────────────────────────────+
```

Tooltip appears after 300ms hover delay. Hides on mouse leave or after 5s.

### Tooltip for Switch Points

When hovering over a ⚡ switch indicator:

```
+─── Track Switch ─────────────────────+
│  The Result switched from Ok to Err  │
│  at this step.                       │
│                                      │
│  Input: Ok(43)                       │
│  Output: Err(ValidationError)        │
│                                      │
│  andThen can switch when its         │
│  callback returns an Err value.      │
+──────────────────────────────────────+
```

## 12.5 Operation Comparison Cards

When users might confuse similar operations, the educational sidebar shows comparison cards:

### map vs andThen

```
+─── map vs andThen ───────────────────────────────+
│                                                   │
│  map(fn):                                        │
│    fn returns a VALUE → always stays on Ok track │
│    fn: (value: T) => U                           │
│    Result<T, E> → Result<U, E>                   │
│                                                   │
│  andThen(fn):                                    │
│    fn returns a RESULT → can switch tracks       │
│    fn: (value: T) => Result<U, E>                │
│    Result<T, E> → Result<U, E>                   │
│                                                   │
│  Rule of thumb:                                  │
│    Can it fail? → andThen                        │
│    Pure transformation? → map                    │
│                                                   │
│  Railway diagram:                                │
│    map:     Ok ══════ Ok  (always straight)      │
│    andThen: Ok ══╗                               │
│                  ╚═══ Err (possible switch)      │
│                                                   │
+───────────────────────────────────────────────────+
```

### Similar Comparisons

| Card              | Operations          | When Shown                   |
| ----------------- | ------------------- | ---------------------------- |
| map vs andThen    | `map`, `andThen`    | User views either operation  |
| inspect vs andTee | `inspect`, `andTee` | User views either operation  |
| orElse vs mapErr  | `orElse`, `mapErr`  | User views either operation  |
| match vs unwrapOr | `match`, `unwrapOr` | User views either operation  |
| all vs allSettled | `all`, `allSettled` | User views Combinator Matrix |
| any vs all        | `any`, `all`        | User views Combinator Matrix |

## 12.6 Pattern Recognition

When the panel detects common patterns in a chain, it labels and explains them:

### Recognized Patterns

| Pattern          | Detection Rule                                                                                                                                                                       | Label                       | Description                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Validation chain | 2+ `andThen` operations with no intervening `orElse` or terminal. Non-switch operations (`map`, `inspect`, `andTee`) between `andThen`s are permitted and do not break the sequence. | "Validation Pipeline"       | "This chain validates input through multiple steps. Each andThen can reject with a specific error." |
| Recovery         | An `orElse` operation that is preceded (with 0 or more non-switch operations in between) by an `andThen` or `andThrough`.                                                            | "Error Recovery"            | "If the previous step fails, orElse provides a fallback. This is the railway 'recovery switch'."    |
| Tap and continue | 1+ consecutive `inspect`, `inspectErr`, `andTee`, or `orTee` operations between two non-observation operations.                                                                      | "Side Effect Observer"      | "These operations observe the value for logging/metrics without changing the flow."                 |
| Fallback chain   | 2+ `orElse` operations with no intervening `andThen`. Non-switch operations between `orElse`s are permitted.                                                                         | "Fallback Cascade"          | "Multiple recovery attempts. If the first recovery fails, the next one tries."                      |
| Async pipeline   | A `fromPromise` or `fromAsyncThrowable` constructor followed by at least one of `asyncAndThen`, `asyncMap`, or `andThen` (in any order, possibly with intervening `map`/`inspect`).  | "Async Processing Pipeline" | "Promise result is processed through async transformations."                                        |
| Type narrowing   | An `andThrough` immediately followed by `andThen` (with 0 or more `inspect`/`andTee` in between).                                                                                    | "Guard and Process"         | "andThrough validates without changing the value, then andThen processes it."                       |
| Safe extraction  | The terminal (last) operation in the chain is `match`.                                                                                                                               | "Exhaustive Handling"       | "match handles both Ok and Err cases, ensuring no unhandled errors."                                |

### Pattern Annotations

Patterns are shown as labeled regions in the Railway Pipeline view:

```
          ┌─── Validation Pipeline ───────────┐
Ok ═══════╡ andThen(email) → andThen(age) → andThen(name) ╞════ Ok
Err ──────╡                                                ╞──── Err
          └───────────────────────────────────┘
                        ┌─ Recovery ─┐
Ok ═════════════════════╡ orElse(fb) ╞════ Ok
Err ════════════════════╡            ╞──── Err
                        └────────────┘
```

## 12.7 "Try in Playground" Links

Every glossary entry and every comparison card includes a "Try in Playground" link:

- Opens the hex-di Playground with a pre-built example demonstrating the concept
- Example chains are annotated with comments explaining each step
- The playground auto-runs the example and opens the Result Panel to show the visualization

### Playground Example Template

```typescript
// Example: andThen - Validation that can fail
const result = ok({ email: "test@example.com", age: 25 })
  .andThen(validateEmail) // Can switch to Err if email is invalid
  .andThen(validateAge) // Can switch to Err if age is invalid
  .match(
    user => `Welcome, ${user.email}!`,
    error => `Validation failed: ${error.message}`
  );
```

## 12.8 First-Time Experience

When the Result Panel is opened for the first time (no localStorage flag):

### Welcome Overlay

```
+─── Welcome to the Result Panel ──────────────────────+
│                                                       │
│  The Result Panel helps you visualize how             │
│  Result<T, E> values flow through your code.          │
│                                                       │
│  🚂 Railway Pipeline                                  │
│     See your Result chains as two-track railroads     │
│                                                       │
│  📋 Operation Log                                     │
│     Step through each operation with value inspection │
│                                                       │
│  🗺 Case Explorer                                     │
│     Discover all possible paths through your chains   │
│                                                       │
│  📊 More Views                                        │
│     Sankey diagrams, async waterfalls, combinators    │
│                                                       │
│  [Start Guided Tour]  [Explore on My Own]  [?]        │
│                                                       │
│  □ Don't show this again                              │
+───────────────────────────────────────────────────────+
```

- "Start Guided Tour" launches Walkthrough #1 ("Your First Result Chain")
- "Explore on My Own" dismisses the overlay
- Checkbox persists the dismissal to localStorage

## 12.9 Contextual Learning Prompts

Non-intrusive prompts that appear when the panel detects a learning opportunity:

| Trigger                                                        | Prompt                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User views a chain with 0% coverage on one path                | "There's an unobserved path in this chain. Want to learn about path coverage? [Learn More]" |
| User views a chain where orElse recovered 90%+                 | "orElse is recovering most errors here. Learn about the recovery pattern? [Learn More]"     |
| User views a Sankey diagram for the first time                 | "This Sankey diagram shows how Results flow across many executions. [Quick Guide]"          |
| User selects a `map` node after previously selecting `andThen` | "Noticed you're comparing map and andThen? [See Comparison]"                                |
| First async chain viewed                                       | "This chain has async operations. Check the Waterfall view for timing! [View Waterfall]"    |

### Prompt UI

- Small banner at the bottom of the active view
- Dismissible with `×` button
- "Don't show hints" option persists to localStorage
- Maximum one prompt visible at a time
- Auto-dismiss after 10 seconds if not interacted with

_Previous: [11-interactions.md](11-interactions.md) | Next: [13-filter-and-search.md](13-filter-and-search.md)_
