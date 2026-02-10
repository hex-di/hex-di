# Result Presentation - Technical Architecture

## Overview

The presentation is a React SPA that uses HexDI libraries to manage its own state, navigation, data fetching, and error handling. This makes the presentation a living example of the ecosystem it introduces.

---

## Application Structure

```
presentations/result/
  spec/                          # This specification
  app/
    package.json
    vite.config.ts
    tsconfig.json
    src/
      main.tsx                   # Entry point
      app.tsx                    # Root component with providers

      # Ports (what the app needs)
      ports/
        navigation.port.ts       # Slide navigation capability
        slides.port.ts           # Slide content access
        code-examples.port.ts    # Code snippet fetching
        theme.port.ts            # Theme/design token access
        analytics.port.ts        # Presentation usage tracking

      # Adapters (how capabilities are provided)
      adapters/
        navigation.adapter.ts    # Flow-based slide state machine
        slides.adapter.ts        # Store-based slide registry
        code-examples.adapter.ts # Query-based code fetching
        theme.adapter.ts         # Store-based theme state
        analytics.adapter.ts     # Tracing-based analytics

      # Graph (wiring)
      graph/
        presentation.graph.ts    # Complete dependency graph

      # Content (slide data)
      content/
        slides.ts                # All slide definitions
        code-examples/           # Code snippets for before/after
          silent-swallower.before.ts
          silent-swallower.after.ts
          generic-thrower.before.ts
          generic-thrower.after.ts
          unsafe-cast.before.ts
          unsafe-cast.after.ts
          callback-pyramid.before.ts
          callback-pyramid.after.ts
          success-that-wasnt.before.ts
          success-that-wasnt.after.ts

      # Components
      components/
        slides/
          title-slide.tsx
          content-slide.tsx
          code-slide.tsx
          split-slide.tsx
          diagram-slide.tsx
          impact-slide.tsx
        code/
          code-block.tsx          # Syntax-highlighted code display
          code-annotation.tsx     # Inline annotation overlay
          code-comparison.tsx     # Side-by-side before/after
          live-demo.tsx           # Interactive Result demo
        navigation/
          slide-progress.tsx      # Bottom progress bar
          keyboard-handler.tsx    # Keyboard navigation
        layout/
          slide-container.tsx     # Full-viewport slide wrapper
          presenter-notes.tsx     # Optional presenter notes panel
        diagrams/
          railway-diagram.tsx     # Railway-oriented programming visual
          ecosystem-diagram.tsx   # HexDI package relationship visual
          error-taxonomy.tsx      # Error pattern classification visual

      # Hooks (React integration)
      hooks/
        use-navigation.ts        # Access navigation port
        use-slides.ts            # Access slide content
        use-code-example.ts      # Fetch code examples
        use-theme.ts             # Access theme tokens
        use-keyboard.ts          # Keyboard event binding
```

---

## HexDI Integration Architecture

### Ports

Each presentation concern is modeled as a port:

**NavigationPort**

```typescript
// What the app needs for slide navigation
interface NavigationPort {
  readonly currentSlide: number;
  readonly totalSlides: number;
  readonly currentAct: "act1" | "act2" | "act3";
  next(): void;
  previous(): void;
  goTo(slide: number): void;
  canGoNext(): boolean;
  canGoPrevious(): boolean;
}
```

**SlidesPort**

```typescript
// What the app needs for slide content
interface SlidesPort {
  getSlide(index: number): SlideDefinition;
  getSlidesByAct(act: string): readonly SlideDefinition[];
  readonly allSlides: readonly SlideDefinition[];
}
```

**CodeExamplesPort**

```typescript
// What the app needs for code snippets
interface CodeExamplesPort {
  getExample(id: string): ResultAsync<CodeExample, CodeExampleError>;
  getComparison(id: string): ResultAsync<CodeComparison, CodeExampleError>;
}
```

**ThemePort**

```typescript
// What the app needs for theming
interface ThemePort {
  readonly mode: "light" | "dark" | "mixed";
  readonly tokens: DesignTokens;
  setMode(mode: "light" | "dark" | "mixed"): void;
}
```

**AnalyticsPort**

```typescript
// What the app needs for tracking
interface AnalyticsPort {
  trackSlideView(slideIndex: number): void;
  trackInteraction(type: string, detail: string): void;
  getSessionSummary(): PresentationSessionSummary;
}
```

### Adapters

**NavigationAdapter** (implements NavigationPort using `@hex-di/flow`)

- Slide navigation modeled as a state machine
- States: one per slide (or grouped by act)
- Transitions: `NEXT`, `PREVIOUS`, `GO_TO`
- Guards: prevent navigation past boundaries
- Activities: track time spent on each slide

**SlidesAdapter** (implements SlidesPort using `@hex-di/store`)

- Slide definitions stored as reactive atoms
- Derived values for filtered views (by act, by type)
- Content is static but reactively accessed for consistency

**CodeExamplesAdapter** (implements CodeExamplesPort using `@hex-di/query`)

- Code snippets loaded on demand (lazy)
- Cached after first load
- Returns `ResultAsync` - demonstrates the library in action
- Query keys based on example ID

**ThemeAdapter** (implements ThemePort using `@hex-di/store`)

- Theme mode as a reactive atom
- Design tokens derived from mode
- Persisted to localStorage

**AnalyticsAdapter** (implements AnalyticsPort using `@hex-di/tracing`)

- Each slide view creates a tracing span
- Interactions recorded as span events
- Session summary derived from trace data

### Graph

```typescript
// presentation.graph.ts
import { buildGraph } from "@hex-di/graph";

const presentationGraph = buildGraph()
  .addPort(navigationPort)
  .addPort(slidesPort)
  .addPort(codeExamplesPort)
  .addPort(themePort)
  .addPort(analyticsPort)
  .addAdapter(navigationAdapter)
  .addAdapter(slidesAdapter)
  .addAdapter(codeExamplesAdapter)
  .addAdapter(themeAdapter)
  .addAdapter(analyticsAdapter)
  .build();
```

### Container

```typescript
// main.tsx
import { createContainer } from "@hex-di/runtime";

const container = createContainer(presentationGraph);
```

### React Provider

```typescript
// app.tsx
import { HexDIProvider } from '@hex-di/react'

function App() {
  return (
    <HexDIProvider container={container}>
      <SlideContainer />
    </HexDIProvider>
  )
}
```

---

## State Machine for Navigation

The slide navigation is a proper state machine using `@hex-di/flow`:

```
                    NEXT
  [slide_1] ──────────────> [slide_2] ──> ... ──> [slide_36]
            <──────────────
                  PREVIOUS

            ────────────────────────────────────>
                         GO_TO(n)
```

**States**: `slide_1` through `slide_36`
**Events**: `NEXT`, `PREVIOUS`, `GO_TO { slide: number }`
**Guards**:

- `canGoNext`: current slide < total slides
- `canGoPrevious`: current slide > 1
- `isValidSlide`: target slide is within bounds

**Context**:

```typescript
interface NavigationContext {
  readonly currentSlide: number;
  readonly history: readonly number[]; // breadcrumb trail
  readonly actTransitions: readonly number[]; // slide numbers where acts change
}
```

**Activities**:

- `trackSlideTime`: Records duration on each slide via tracing

---

## Code Example Loading

Code examples are loaded via `@hex-di/query` with the Result pattern:

```typescript
// code-examples.adapter.ts
const fetchCodeExample = (id: string): ResultAsync<CodeExample, CodeExampleError> =>
  fromPromise(import(`../content/code-examples/${id}.ts`), error => ({
    _tag: "LoadFailed" as const,
    id,
    cause: String(error),
  })).map(module => ({
    id,
    code: module.code,
    language: module.language ?? "typescript",
    highlights: module.highlights ?? [],
    annotations: module.annotations ?? [],
  }));
```

This creates a recursive demonstration: the presentation uses Result to load the code examples that teach Result.

---

## Slide Type Definitions

```typescript
type SlideType = "title" | "content" | "code" | "split" | "diagram" | "impact";

interface SlideDefinition {
  readonly index: number;
  readonly type: SlideType;
  readonly act: "act1" | "act2" | "act3";
  readonly title: string;
  readonly subtitle?: string;
  readonly content: SlideContent;
  readonly presenterNotes?: string;
  readonly background: "dark" | "light";
}

type SlideContent =
  | { readonly _tag: "text"; readonly paragraphs: readonly string[] }
  | {
      readonly _tag: "code";
      readonly exampleId: string;
      readonly annotations: readonly Annotation[];
    }
  | { readonly _tag: "comparison"; readonly beforeId: string; readonly afterId: string }
  | { readonly _tag: "diagram"; readonly diagramId: string }
  | { readonly _tag: "bullets"; readonly items: readonly BulletItem[] }
  | { readonly _tag: "mixed"; readonly sections: readonly SlideSection[] };
```

---

## Interactive Elements

### Live Result Demo (Slide 32)

An interactive panel where the audience can:

1. See the presentation's own container graph
2. Watch tracing spans appear as they navigate
3. See Result values flowing through the system
4. Toggle between Ok/Err states to see different UI responses

Implementation:

- Uses `@hex-di/runtime` inspection API to show container state
- Uses `@hex-di/tracing` to display recent spans
- A small interactive code editor where users can type Result chains and see output

### Code Execution Sandbox

Selected slides include a "Run" button that executes code snippets:

- Uses a sandboxed evaluation context
- Shows Result output with proper formatting
- Displays type information inline
- Error cases show the Err value with its \_tag

---

## Build & Deployment

- **Build tool**: Vite
- **Framework**: React 18+
- **Language**: TypeScript (strict mode)
- **Styling**: CSS Modules or Vanilla Extract (no runtime CSS-in-JS)
- **Code highlighting**: Shiki (build-time theme generation)
- **Deployment**: Static files, deployable to any CDN
- **Bundle target**: ESM, modern browsers only

### Dependencies

**HexDI packages (workspace links)**:

- `@hex-di/core`
- `@hex-di/graph`
- `@hex-di/runtime`
- `@hex-di/result`
- `@hex-di/react`
- `@hex-di/flow`
- `@hex-di/flow-react`
- `@hex-di/store`
- `@hex-di/store-react`
- `@hex-di/query`
- `@hex-di/query-react`
- `@hex-di/tracing`
- `@hex-di/logger`

**External dependencies**:

- `react` + `react-dom`
- `shiki` (syntax highlighting)
- Font: Work Sans (Google Fonts fallback)
- Font: JetBrains Mono (monospace)

---

## Performance Considerations

- Slides are lazy-loaded by act (3 chunks)
- Code examples are fetched on demand and cached
- Syntax highlighting is done at build time where possible
- No heavy animation libraries - CSS transitions only
- Total bundle size target: < 500KB gzipped (excluding fonts)
