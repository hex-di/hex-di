# Result Panel Specification

Comprehensive specification for the Result Panel in `@hex-di/devtools-ui`.

The Result Panel provides visual, interactive inspection of `Result<T, E>` and `ResultAsync<T, E>` values flowing through a hex-di container. It combines railway-oriented programming visualization, aggregate flow statistics, an interactive case explorer, and educational features to make error handling visible, understandable, and debuggable.

## Document Map

| File                                                     | Section                   | Purpose                                                               |
| -------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| [01-overview.md](01-overview.md)                         | Overview & Data Models    | Motivation, goals, core TypeScript interfaces (12 types)              |
| [02-instrumentation.md](02-instrumentation.md)           | Instrumentation Layer     | Per-step tracing, compile-time transform, runtime wrapper             |
| [03-views-and-wireframes.md](03-views-and-wireframes.md) | Views & Wireframes        | 7 views with ASCII wireframes and component trees                     |
| [04-railway-pipeline.md](04-railway-pipeline.md)         | Railway Pipeline View     | ROP visualization, two-track model, interactive nodes                 |
| [05-operation-log.md](05-operation-log.md)               | Operation Log View        | Step-by-step log, value inspector, diff mode                          |
| [06-case-explorer.md](06-case-explorer.md)               | Case Explorer View        | Static path analysis, runtime overlay, what-if simulation             |
| [07-sankey-statistics.md](07-sankey-statistics.md)       | Sankey Statistics View    | Aggregate flow visualization, error hotspots, stability scores        |
| [08-async-waterfall.md](08-async-waterfall.md)           | Async Waterfall View      | Temporal execution, duration bars, nesting                            |
| [09-combinator-matrix.md](09-combinator-matrix.md)       | Combinator Matrix View    | all/allSettled/any/collect visualization                              |
| [10-visual-encoding.md](10-visual-encoding.md)           | Visual Encoding           | Colors, shapes, icons, animations, CSS variables, responsive behavior |
| [11-interactions.md](11-interactions.md)                 | Interactions & Navigation | Mouse, keyboard, cross-panel, real-time updates                       |
| [12-educational-features.md](12-educational-features.md) | Educational Features      | Tutorial mode, glossary, what-if simulation, guided walkthroughs      |
| [13-filter-and-search.md](13-filter-and-search.md)       | Filter & Search System    | Filtering by port, error type, status, chain depth                    |
| [14-integration.md](14-integration.md)                   | Integration               | Panel registration, data hooks, playground, export, performance       |
| [15-accessibility.md](15-accessibility.md)               | Accessibility             | ARIA, keyboard, screen readers, motion preferences                    |
| [16-definition-of-done.md](16-definition-of-done.md)     | Definition of Done        | ~408 tests, mutation testing, acceptance criteria                     |

## Design Principles

1. **Railway metaphor as primary mental model** -- Result chains are two-track railroads. Every visualization reinforces this.
2. **Static + runtime fusion** -- Show what _could_ happen (all paths) alongside what _did_ happen (observed executions).
3. **Progressive disclosure** -- Overview first, drill into detail on demand. Never overwhelm.
4. **Educational by default** -- Every operation has an explanation. Users learn Result patterns through exploration.
5. **Zero-config for basics** -- Per-port aggregate stats work without instrumentation. Deep inspection requires opt-in tracing.
