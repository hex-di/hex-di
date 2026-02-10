# Task Breakdown: Result Presentation App

## Overview

A 36-slide interactive React presentation that introduces HexDI through the Result library, built as a self-dogfooding HexDI application. The app lives at `presentations/result/app/` within the monorepo.

**Total Task Groups**: 12
**Estimated Total Tasks**: ~85 atomic sub-tasks

---

## Execution Order

```
Phase 1: Foundation
  Task Group 1  - Project Scaffolding & Toolchain
  Task Group 2  - Design Tokens & Global Styles
  Task Group 3  - Slide Engine Core

Phase 2: HexDI Integration Layer
  Task Group 4  - Ports & Adapters (DI Wiring)
  Task Group 5  - Navigation State Machine (Flow)

Phase 3: Content & Components
  Task Group 6  - Slide Type Components
  Task Group 7  - Code Display System (Shiki)
  Task Group 8  - Slide Content Authoring (All 36 Slides)
  Task Group 9  - Code Examples (6 Named Before/After Pairs)

Phase 4: Interactive Features
  Task Group 10 - Must-Have Interactive Features
  Task Group 11 - Should-Have & Nice-to-Have Features

Phase 5: Verification & Polish
  Task Group 12 - Final Verification, Performance & Accessibility
```

---

## Phase 1: Foundation

### Task Group 1: Project Scaffolding & Toolchain

**Dependencies:** None

- [ ] 1.0 Complete project scaffolding
  - [ ] 1.1 Initialize Vite + React + TypeScript project at `presentations/result/app/`
    - `pnpm create vite` with React-TS template
    - Configure `vite.config.ts` with proper base path and build target (ESM, modern browsers)
    - Configure `tsconfig.json` extending root config with `strict: true`
    - Add `eslint.config.js` extending the monorepo shared config
  - [ ] 1.2 Add workspace-linked HexDI dependencies to `package.json`
    - `@hex-di/core`, `@hex-di/graph`, `@hex-di/runtime`, `@hex-di/react`
    - `@hex-di/result`
    - `@hex-di/flow`, `@hex-di/flow-react`
    - `@hex-di/store`, `@hex-di/store-react`
    - `@hex-di/query`, `@hex-di/query-react`
    - `@hex-di/tracing`, `@hex-di/logger`
    - All linked via `workspace:*` protocol
  - [ ] 1.3 Add external dependencies
    - `react`, `react-dom` (if not already from template)
    - `shiki` for syntax highlighting
  - [ ] 1.4 Configure font loading
    - Add Google Fonts link for Work Sans (400, 700) and JetBrains Mono (400) to `index.html`
    - Add `<link rel="preload">` for fonts to prevent FOUT
    - Define CSS font-family fallback stack: `"Sanofi Sans", "Work Sans", "Raleway", "Roboto", sans-serif` for body and `"JetBrains Mono", "Fira Code", "Source Code Pro", monospace` for code
  - [ ] 1.5 Create the basic directory structure under `src/`
    - `ports/`, `adapters/`, `graph/`, `content/`, `content/code-examples/`
    - `components/slides/`, `components/code/`, `components/navigation/`, `components/layout/`, `components/diagrams/`
    - `hooks/`
  - [ ] 1.6 Create minimal `main.tsx` and `app.tsx` entry points
    - `main.tsx`: renders `<App />` into root
    - `app.tsx`: placeholder component that renders "Result Presentation"
  - [ ] 1.7 Verify dev server starts and builds cleanly
    - `pnpm install` succeeds
    - `pnpm dev` starts the dev server without errors
    - `pnpm build` produces a production build with zero TypeScript errors
    - `pnpm lint` passes with zero warnings

**Acceptance Criteria (DoD 8):**

- `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint` all succeed
- TypeScript strict mode with zero errors
- All workspace HexDI packages linked correctly
- Fonts load without FOUT

---

### Task Group 2: Design Tokens & Global Styles

**Dependencies:** Task Group 1

- [ ] 2.0 Complete design system implementation
  - [ ] 2.1 Create CSS custom properties file with all design tokens
    - Primary brand colors: `brand-base` (#7A00E6) through `brand-lightest` (#FAF5FF)
    - Neutral scale: `neutral-white` (#FFFFFF) through `neutral-black` (#000000)
    - Semantic colors: success (#079455), error (#D72B3F), info (#1570EF), warning (#EE7404) -- each with light and dark variants
    - Code theme colors for both light and dark themes (background, text, keywords, strings, types, errors, comments, functions, numbers, line numbers, highlight backgrounds)
    - Type scale variables: slide-title (3rem/700), section-title (2rem/700), subtitle (1.25rem/400), body (1.125rem/400), code (0.9375rem/400), annotation (0.875rem/400), caption (0.75rem/400)
    - Layout constants: max-width (1200px), vertical padding (64px top, 48px bottom), horizontal padding (80px)
    - Transition durations: slide (200ms), code-highlight (300ms), element-reveal (250ms)
  - [ ] 2.2 Create global reset and base styles
    - CSS reset (box-sizing, margin, padding)
    - `html, body, #root` full viewport setup (`100vw x 100vh`, overflow hidden)
    - Base font-family assignment (body and code)
    - Base line-height and color assignments
  - [ ] 2.3 Implement `prefers-reduced-motion` media query support
    - When active: all transitions set to `0ms`
    - Applied globally via CSS custom properties override
  - [ ] 2.4 Create Shiki custom theme definition file
    - Two theme objects: `sanofi-light` and `sanofi-dark`
    - Map each token scope to the code theme colors from the spec (keywords = brand purple, strings = success green, types = info blue, errors = error red, comments = neutral-500, functions = brand-darker, numbers = warning)
    - Export as JSON-compatible objects for Shiki's `createHighlighter`
  - [ ] 2.5 Verify design tokens render correctly
    - Create a temporary token showcase page that displays all colors, typography sizes, and a sample code block
    - Visually confirm brand colors, semantic colors, and type scale match the spec
    - Confirm WCAG AA contrast for all text-on-background combinations

**Acceptance Criteria (DoD 2):**

- Sanofi purple (#7A00E6) is the primary brand color throughout
- Dark/light slide backgrounds use correct hex values
- Success/error/info semantic colors applied correctly
- Type scale matches spec exactly
- All text meets WCAG AA contrast requirements
- `prefers-reduced-motion` disables all animations

---

### Task Group 3: Slide Engine Core

**Dependencies:** Task Group 2

- [ ] 3.0 Complete slide engine
  - [ ] 3.1 Write 4-6 focused tests for the slide engine
    - Test: `SlideContainer` renders a slide at full viewport (100vw x 100vh)
    - Test: content area is constrained to max-width 1200px with correct padding
    - Test: slide transition animates horizontally (200ms) when slide index changes
    - Test: transition is instant when `prefers-reduced-motion` is active
    - Test: `SlideProgress` renders correct number of dots grouped by act
    - Test: current slide dot is highlighted with brand-base color
  - [ ] 3.2 Create `SlideContainer` layout component
    - Full viewport wrapper (`100vw x 100vh`)
    - Inner content area: max-width 1200px, centered, with 64px/48px/80px padding
    - All content left-aligned
    - Accepts a `slideIndex` prop and renders the appropriate slide component
  - [ ] 3.3 Implement slide transition animation
    - Horizontal slide animation (200ms ease-out) on slide index change
    - Direction-aware: sliding left for "next", right for "previous"
    - Respects `prefers-reduced-motion` (instant transition)
    - No jank or flicker: use CSS transforms, not layout properties
  - [ ] 3.4 Create `SlideProgress` bottom bar component
    - Fixed bottom bar, 48px height
    - One dot per slide, grouped by act (Act 1: slides 1-12, Act 2: 13-28, Act 3: 29-36)
    - Current slide: filled circle in `brand-base` color
    - Other slides: circle outline in `neutral-300`
    - Act labels above each dot group
    - Current slide number display at far right: "slide / total"
    - Keyboard shortcut hint at far left (arrows icon)
  - [ ] 3.5 Define `SlideDefinition` and `SlideContent` TypeScript types
    - `SlideType`: `'title' | 'content' | 'code' | 'split' | 'diagram' | 'impact'`
    - `SlideDefinition`: index, type, act, title, subtitle, content, presenterNotes, background
    - `SlideContent` discriminated union with tags: `text`, `code`, `comparison`, `diagram`, `bullets`, `mixed`
    - Export from `content/slides.ts` (empty array placeholder for now)
  - [ ] 3.6 Create slide type router component
    - Given a `SlideDefinition`, renders the correct slide type component
    - Dispatches to: `TitleSlide`, `ContentSlide`, `CodeSlide`, `SplitSlide`, `DiagramSlide`, `ImpactSlide`
    - All components are placeholder stubs at this stage (render title + type label)
  - [ ] 3.7 Ensure slide engine tests pass
    - Run only the 4-6 tests from 3.1
    - Verify transitions, layout, and progress bar work as specified

**Acceptance Criteria (DoD 1.1, 1.3):**

- Slides fill viewport, content constrained to 1200px
- Horizontal slide transition at 200ms with reduced-motion support
- Progress indicator shows current position with act groupings
- All slide types dispatch to the correct component
- Tests from 3.1 pass

---

## Phase 2: HexDI Integration Layer

### Task Group 4: Ports, Adapters & DI Wiring

**Dependencies:** Task Group 3

- [ ] 4.0 Complete HexDI integration layer
  - [ ] 4.1 Write 4-6 focused tests for the DI layer
    - Test: container resolves `NavigationPort` successfully
    - Test: container resolves `SlidesPort` and returns slide data
    - Test: container resolves `ThemePort` with default `mixed` mode
    - Test: container resolves `CodeExamplesPort` and returns `ResultAsync`
    - Test: all five ports are resolvable from the graph without circular dependency errors
  - [ ] 4.2 Define all five ports
    - `navigation.port.ts`: `NavigationPort` interface (currentSlide, totalSlides, currentAct, next, previous, goTo, canGoNext, canGoPrevious)
    - `slides.port.ts`: `SlidesPort` interface (getSlide, getSlidesByAct, allSlides)
    - `code-examples.port.ts`: `CodeExamplesPort` interface (getExample returning `ResultAsync<CodeExample, CodeExampleError>`, getComparison returning `ResultAsync<CodeComparison, CodeExampleError>`)
    - `theme.port.ts`: `ThemePort` interface (mode, tokens, setMode)
    - `analytics.port.ts`: `AnalyticsPort` interface (trackSlideView, trackInteraction, getSessionSummary)
    - Each port created using `@hex-di/core` port factory
  - [ ] 4.3 Implement `SlidesAdapter` using `@hex-di/store`
    - Slide definitions stored as a reactive store atom
    - `getSlide(index)` reads from the atom
    - `getSlidesByAct(act)` derives a filtered view
    - `allSlides` exposes the full readonly array
  - [ ] 4.4 Implement `ThemeAdapter` using `@hex-di/store`
    - Theme mode as a store atom with initial value `'mixed'`
    - `DesignTokens` derived from mode (light tokens, dark tokens, or mixed)
    - Persist mode to `localStorage` on change, read on init
  - [ ] 4.5 Implement `CodeExamplesAdapter` using `@hex-di/query` and `@hex-di/result`
    - Lazy-load code example modules via dynamic `import()`
    - Wrap import in `fromPromise` returning `ResultAsync<CodeExample, CodeExampleError>`
    - `CodeExampleError` tagged union: `{ _tag: 'LoadFailed'; id: string; cause: string }`
    - Query cache: example cached after first load
    - `getComparison` loads both before and after files for a given example ID
  - [ ] 4.6 Implement `AnalyticsAdapter` using `@hex-di/tracing`
    - `trackSlideView` creates a tracing span for each slide view
    - `trackInteraction` records interactions as span events
    - `getSessionSummary` derives summary from trace data
  - [ ] 4.7 Build the dependency graph using `@hex-di/graph`
    - `presentation.graph.ts`: wire all 5 ports to their adapters
    - Build and validate the graph (no circular dependencies, all ports satisfied)
  - [ ] 4.8 Create the container and wire React provider
    - `main.tsx`: create container from graph using `@hex-di/runtime`
    - `app.tsx`: wrap app in `<HexDIProvider container={container}>` from `@hex-di/react`
  - [ ] 4.9 Create React hooks for port access
    - `use-navigation.ts`: resolves `NavigationPort` from container
    - `use-slides.ts`: resolves `SlidesPort` from container
    - `use-code-example.ts`: resolves `CodeExamplesPort`, returns `ResultAsync` for a given example ID
    - `use-theme.ts`: resolves `ThemePort` from container
  - [ ] 4.10 Integrate `@hex-di/logger` for presentation event logging
    - Configure logger port and adapter
    - Add to the dependency graph
    - Console shows structured log entries during development
  - [ ] 4.11 Ensure DI layer tests pass
    - Run only the 4-6 tests from 4.1
    - Verify all ports resolve, container bootstraps, and hooks return expected shapes

**Acceptance Criteria (DoD 4):**

- `@hex-di/core` ports define all capabilities (4.7 checked: ports, graph)
- `@hex-di/graph` wires the dependency graph without errors
- `@hex-di/runtime` creates the container
- `@hex-di/react` provides the HexDIProvider
- All hooks resolve services through the container
- `@hex-di/store` manages slide definitions and theme
- `@hex-di/query` loads code examples with `ResultAsync`
- `@hex-di/result` used for code example loading (no try/catch in app code)
- `@hex-di/tracing` records slide navigation spans
- `@hex-di/logger` produces structured console log entries
- Tests from 4.1 pass

---

### Task Group 5: Navigation State Machine (Flow)

**Dependencies:** Task Group 4

- [ ] 5.0 Complete navigation state machine
  - [ ] 5.1 Write 4-6 focused tests for navigation
    - Test: initial state is `slide_1` with `currentSlide: 1`
    - Test: `NEXT` event transitions from `slide_1` to `slide_2` and increments currentSlide
    - Test: `PREVIOUS` event at `slide_1` does not transition (guard prevents)
    - Test: `NEXT` event at `slide_36` does not transition (guard prevents)
    - Test: `GO_TO` event with `{ slide: 15 }` transitions to `slide_15`
    - Test: `GO_TO` event with `{ slide: 99 }` does not transition (guard: isValidSlide)
  - [ ] 5.2 Define the navigation state machine using `@hex-di/flow`
    - 36 states: `slide_1` through `slide_36`
    - Events: `NEXT`, `PREVIOUS`, `GO_TO { slide: number }`
    - Guards: `canGoNext` (current < 36), `canGoPrevious` (current > 1), `isValidSlide` (1 <= target <= 36)
    - Context: `{ currentSlide: number; history: number[]; actTransitions: [13, 29] }`
    - Context updated on each transition (increment/decrement currentSlide, push to history)
  - [ ] 5.3 Implement `NavigationAdapter` using the Flow machine
    - Wraps the state machine runner
    - Exposes `NavigationPort` interface: currentSlide, totalSlides (36), currentAct (derived from currentSlide), next, previous, goTo, canGoNext, canGoPrevious
    - `currentAct` computed: slides 1-12 = `'act1'`, 13-28 = `'act2'`, 29-36 = `'act3'`
  - [ ] 5.4 Connect navigation to `SlideContainer`
    - `SlideContainer` reads `currentSlide` from `useNavigation()` hook
    - Renders the slide at that index
    - Transition direction determined by comparing previous and current slide index
  - [ ] 5.5 Implement `KeyboardHandler` component
    - Listens for keyboard events on `window`
    - Right arrow / Space: dispatches `NEXT`
    - Left arrow: dispatches `PREVIOUS`
    - Home: dispatches `GO_TO { slide: 1 }`
    - End: dispatches `GO_TO { slide: 36 }`
    - `G` then digits then Enter/timeout: dispatches `GO_TO { slide: N }`
    - Mounted once at the app root level
  - [ ] 5.6 Ensure navigation tests pass
    - Run only the 4-6 tests from 5.1
    - Verify keyboard navigation works end-to-end in the browser

**Acceptance Criteria (DoD 1.2, 4.1):**

- Slide navigation is a `@hex-di/flow` state machine with 36 states
- NEXT, PREVIOUS, GO_TO transitions work
- Guards prevent navigation past first/last slide
- Context tracks currentSlide, history, actTransitions
- Keyboard navigation functional: arrows, space, home, end, G+number
- Tests from 5.1 pass

---

## Phase 3: Content & Components

### Task Group 6: Slide Type Components

**Dependencies:** Task Group 5

- [ ] 6.0 Complete all slide type components
  - [ ] 6.1 Write 6 focused tests for slide type components
    - Test: `TitleSlide` renders title centered with dark gradient background and white text
    - Test: `ContentSlide` renders title at top, body content below with 24px gap, light background
    - Test: `CodeSlide` renders title at top, code block filling most of the slide
    - Test: `SplitSlide` renders two columns with "BEFORE" (red) and "AFTER" (green) labels
    - Test: `ImpactSlide` renders large centered text on dark gradient background
    - Test: `DiagramSlide` renders title at top with centered diagram area on white background
  - [ ] 6.2 Implement `TitleSlide` component
    - Background: gradient from `brand-dark` (#3C217B) to `brand-darkest` (#23004C)
    - Title: vertically centered, white, 3rem/700
    - Subtitle: below title, lighter weight (400), `brand-light` color
    - Used for slides 1, 12, 29
  - [ ] 6.3 Implement `ContentSlide` component
    - Background: `brand-lightest` (#FAF5FF) or `neutral-white`
    - Title at top in `neutral-900`
    - Content area below with 24px gap
    - Supports: paragraphs of text, bullet lists, mixed content sections
    - Element reveal animation: slide up with fade (250ms, staggered 50ms per item)
  - [ ] 6.4 Implement `CodeSlide` component
    - Background: `neutral-white`
    - Shorter title at top
    - Code block fills remaining vertical space
    - Optional annotation bar below code block
    - Integrates with `CodeBlock` component (built in Task Group 7)
  - [ ] 6.5 Implement `SplitSlide` (Before/After) component
    - Title at top
    - Two equal columns with vertical divider (`neutral-200`)
    - Left column: "BEFORE" badge in error-base red, code block with subtle red tint (`rgba(215, 43, 63, 0.03)`)
    - Right column: "AFTER" badge in success-base green, code block with subtle green tint (`rgba(7, 148, 85, 0.03)`)
    - Each column contains its own code block
  - [ ] 6.6 Implement `ImpactSlide` (quote/impact) component
    - Background: `brand-dark` gradient
    - Large text (2rem), centered vertically, white
    - Used for key takeaway lines (slides 10, 22, 35)
  - [ ] 6.7 Implement `DiagramSlide` component
    - Background: white
    - Title at top
    - SVG/diagram area centered in remaining space
    - Minimal text -- diagram does the talking
    - Used for slides 8, 15, 30
  - [ ] 6.8 Ensure slide type component tests pass
    - Run only the 6 tests from 6.1

**Acceptance Criteria (DoD 1.1, 2.1, 2.2):**

- All six slide types render with correct backgrounds, typography, and layout
- Title slides have dark gradient, content slides have light background
- Split slides show two columns with red/green tinting and labels
- Impact slides have centered large text on dark gradient
- Staggered element reveal animation works on content slides
- Tests from 6.1 pass

---

### Task Group 7: Code Display System (Shiki)

**Dependencies:** Task Group 6

- [ ] 7.0 Complete code display system
  - [ ] 7.1 Write 4-6 focused tests for code display
    - Test: `CodeBlock` renders syntax-highlighted code with line numbers
    - Test: `CodeBlock` applies the custom Sanofi dark theme colors
    - Test: `CodeBlock` highlights specific lines with distinct background
    - Test: `CodeAnnotation` renders inline annotation with correct semantic color (error=red, ok=green, info=blue)
    - Test: `CodeComparison` renders two code blocks side by side with BEFORE/AFTER labels
  - [ ] 7.2 Initialize Shiki highlighter with custom Sanofi themes
    - Create a singleton Shiki highlighter instance (lazy-initialized)
    - Register both `sanofi-light` and `sanofi-dark` themes from Task Group 2.4
    - Register `typescript` and `tsx` languages at minimum
    - Expose an async function: `highlightCode(code: string, lang: string, theme: string) => ResultAsync<string, HighlightError>`
  - [ ] 7.3 Create `CodeBlock` component
    - Props: code string, language, optional filename, optional highlighted line numbers, optional annotations
    - Renders: file name tab at top left, optional action buttons (copy) at top right
    - Line numbers in subdued color (`neutral-200` / `neutral-700`)
    - Highlighted lines with `rgba(122, 0, 230, 0.08)` background (light) or `rgba(179, 168, 230, 0.12)` (dark)
    - Code font: JetBrains Mono at 15px minimum
    - Dark theme by default for code blocks
  - [ ] 7.4 Create `CodeAnnotation` component
    - Inline annotation overlays for code lines
    - Error annotations: red-tinted background with inline text
    - Ok annotations: green-tinted background with inline text
    - Info annotations: blue-tinted background (for type annotations)
    - Left border: 3px solid in semantic color
    - Text: 0.875rem, `neutral-700`
  - [ ] 7.5 Create `CodeComparison` component
    - Side-by-side code blocks (wraps two `CodeBlock` instances)
    - Left header: "BEFORE" badge in error-base
    - Right header: "AFTER" badge in success-base
    - Matching line numbers where possible
    - Line count comparison in footer
    - "Before" footer: count of anti-patterns; "After" footer: "0 issues"
  - [ ] 7.6 Ensure code display tests pass
    - Run only the 4-6 tests from 7.1

**Acceptance Criteria (DoD 2.3):**

- Shiki renders syntax highlighting with custom Sanofi theme
- Line numbers displayed, file name tab present
- Highlighted lines have distinct background
- Error/Ok/Info annotations render with correct semantic colors
- Before/after comparisons show two panels side by side with labels
- Code readable at 15px minimum font size
- Tests from 7.1 pass

---

### Task Group 8: Slide Content Authoring (All 36 Slides)

**Dependencies:** Task Groups 6, 7

- [ ] 8.0 Complete all 36 slide definitions
  - [ ] 8.1 Author Act 1 slides 1-2 (Opening Hook)
    - Slide 1 (title): "When `catch` Isn't Enough" with subtitle, dark background
    - Slide 2 (content): "What happens when your application fails?" with three animated options
  - [ ] 8.2 Author Act 1 slides 3-7 (The Crime Scene -- problem code slides)
    - Slide 3 (code): "The Silent Swallower" -- `.catch(() => null)` pattern with error annotations
    - Slide 4 (code): "The Generic Thrower" -- `throw new Error(error.message.toString())` with annotations
    - Slide 5 (code): "The Unsafe Cast" -- `(error as Error).message` with annotations
    - Slide 6 (code): "The Callback Pyramid" -- nested callbacks with annotations
    - Slide 7 (code): "The Success That Wasn't" -- success toast despite failure with annotations
    - Each slide references its before code example by ID
    - Anti-pattern annotations are red-tinted inline marks
  - [ ] 8.3 Author Act 1 slides 8-10 (The Cost)
    - Slide 8 (diagram): "The Taxonomy of Chaos" -- error classification diagram
      - Four categories: silent failures, type erasure, inconsistent contracts, lost context
      - Display audit metrics from impact analysis: 797 throws, 257 silent failures, 134 unsafe casts, 595 catch blocks
      - Present as data supporting the narrative, not raw tables
    - Slide 9 (content): "Why This Happens" -- TypeScript's throw/catch type gap explanation
    - Slide 10 (impact): "The Real Question" -- transition beat slide with rhetorical questions
  - [ ] 8.4 Author Act 1 slides 11-12 (The Bridge)
    - Slide 11 (content): "Errors as Values" -- Rust Result, Go multiple returns, Haskell Either brief history
    - Slide 12 (title/code): "Meet Result" -- first `ok(42)` / `err('oops')` snippet, transition into Act 2
  - [ ] 8.5 Author Act 2 slides 13-16 (Foundation)
    - Slide 13 (code): "Creating Results" -- `ok()`, `err()`, `fromThrowable()`, `fromNullable()`, `fromPromise()` one-liners
    - Slide 14 (code): "Checking Results" -- `isOk()`, `isErr()`, `_tag` discriminator, type narrowing
    - Slide 15 (diagram): "Transforming Results" -- `map`, `mapErr`, `mapBoth` with railway metaphor diagram
    - Slide 16 (code): "Extracting Values" -- `match()`, `unwrapOr()`, `toNullable()`, `intoTuple()`
  - [ ] 8.6 Author Act 2 slides 17-22 (Fixing Real Code)
    - Slide 17 (split): "Fixing the Silent Swallower" -- before/after comparison (Example 1)
    - Slide 18 (split): "Fixing the Generic Thrower" -- before/after comparison (Example 2)
    - Slide 19 (split): "Fixing the Unsafe Cast" -- before/after comparison (Example 3)
    - Slide 20 (split): "Fixing the Callback Pyramid" -- before/after comparison (Example 4)
    - Slide 21 (split): "Fixing the Success That Wasn't" -- before/after comparison (Example 5)
    - Slide 22 (impact): "The Pattern" -- 5-step transformation pattern recap
    - Each split slide references both before and after code example IDs
  - [ ] 8.7 Author Act 2 slides 23-28 (Advanced Patterns)
    - Slide 23 (code): "Combining Results" -- `all()`, `allSettled()`, `collect()` with form validation use case
    - Slide 24 (code): "Error Recovery" -- `orElse`, `andThrough` with retry/fallback use case
    - Slide 25 (code): "Tagged Errors" -- `createError()` factory, discriminated unions, `assertNever`
    - Slide 26 (code): "Async Pipelines" -- `ResultAsync` chaining, mixed sync/async
    - Slide 27 (code): "Generator Magic: safeTry" -- deep dive into generator protocol, `yield*`
    - Slide 28 (code): "Testing with Result" -- `toBeOk()`, `toBeErr()`, `toBeOkWith()`, `toBeErrSatisfying()` matchers
    - No API feature used on a slide before it has been introduced (progressive disclosure)
  - [ ] 8.8 Author Act 3 slides 29-33 (The Ecosystem)
    - Slide 29 (title): "Result Doesn't Live Alone" -- transition into HexDI ecosystem
    - Slide 30 (diagram): "The Self-Aware Application" -- HexDI package relationship map (layers: structure, runtime, behavior)
    - Slide 31 (code): "Result + Container" -- `container.resolveResult(port)` returning `Result<T, ResolutionError>`, uses real `@hex-di/runtime` API
    - Slide 32 (content/interactive): "The Live Demo" -- container inspector placeholder (interactive feature in Task Group 11)
    - Slide 33 (content): "Ports and Adapters" -- hexagonal architecture brief, ports declare capability, adapters provide it, Result connects them
  - [ ] 8.9 Author Act 3 slides 34-36 (Closing)
    - Slide 34 (content): "The Migration Path" -- 5-step incremental migration strategy, reference migration phases from impact analysis (Phase 1: API client layer, Phase 2: service layer with safeTry, Phase 3: controller/UI boundary, Phase 4: utility functions)
    - Slide 35 (impact): "What Changes" -- concrete before/after pairs from impact analysis, not generic claims
    - Slide 36 (title): closing statement with links (documentation, GitHub, getting started)
    - Compound impact benefits (onboarding, refactoring safety, cross-team consistency, testing) woven into slides 33-35
  - [ ] 8.10 Add presenter notes for every slide
    - Key talking points per slide
    - Timing suggestions (target ~1 minute per slide average)
    - Audience engagement prompts where appropriate ("Ask: has anyone seen this pattern?")
    - Transition cues at act boundaries (slides 10, 12, 29)
  - [ ] 8.11 Verify all 36 slides render without errors
    - Navigate through all 36 slides sequentially
    - Confirm no blank slides, no missing content, no rendering errors
    - Confirm each slide type renders with the correct component

**Acceptance Criteria (DoD 3, 10):**

- All 36 slides render without errors (DoD 1.1)
- Act 1 (1-12) builds recognition with real code pain, audit metrics on slides 8-9
- Act 2 (13-28) delivers resolution, every Act 1 problem gets a fix
- Act 3 (29-36) expands vision with ecosystem overview and migration path
- Slides 3/17, 4/18, 5/19, 6/20, 7/21 are paired problem-solution
- Progressive disclosure: ok/err first, then map/match, then safeTry, then advanced
- No API feature used before introduction
- Presenter notes on every slide with talking points and timing
- Audit numbers from impact analysis displayed accurately on slides 8-9
- Migration phases from impact analysis reflected on slide 34

---

### Task Group 9: Code Examples (6 Named Before/After Pairs)

**Dependencies:** Task Group 7

- [ ] 9.0 Complete all 6 named code examples
  - [ ] 9.1 Write 6 focused tests for code examples
    - Test: each of the 6 "after" code example files exports valid TypeScript that compiles with strict mode
    - Test: no `any`, `as` casts, or `!` non-null assertions in any "after" example
    - Test: every "after" example imports only from `@hex-di/result`
    - Test: `CodeExamplesAdapter.getComparison('silent-swallower')` returns `Ok` with both before and after code
    - Test: `CodeExamplesAdapter.getExample('nonexistent')` returns `Err` with `LoadFailed` tag
    - Test: all 6 comparisons load successfully via the adapter
  - [ ] 9.2 Create Example 1: "The Silent Swallower"
    - `content/code-examples/silent-swallower.before.ts`: photo fetch hook with `.catch(() => null)`, `setPhotoUrl(null)` on all error paths
    - `content/code-examples/silent-swallower.after.ts`: `ResultAsync<string, PhotoError>` with 4-variant tagged union (AuthExpired, NetworkError, NotFound, Cancelled), `match` handler
    - Export: `code` string, `language`, `highlights` (lines to emphasize), `annotations` (inline callouts)
  - [ ] 9.3 Create Example 2: "The Generic Thrower"
    - `content/code-examples/generic-thrower.before.ts`: API function with `throw new Error(error.message.toString())`
    - `content/code-examples/generic-thrower.after.ts`: `ResultAsync<SurveyTemplate, SurveyError>` with `safeTry` generator, `createError` factories (NotFound, ApiError, NetworkError), exhaustive `match`
    - Highlight: `yield*` as TypeScript's Rust `?` operator
  - [ ] 9.4 Create Example 3: "The Unsafe Cast"
    - `content/code-examples/unsafe-cast.before.ts`: controller catch with `(err as Error)?.message`, duplicated `instanceof NotFoundException` checks
    - `content/code-examples/unsafe-cast.after.ts`: service returns `ResultAsync<MetadataRecord, MetadataError>`, controller uses `match` with `_tag` discrimination, no casts
  - [ ] 9.5 Create Example 4: "The Callback Pyramid"
    - `content/code-examples/callback-pyramid.before.ts`: 3-level nested callbacks (createAsset -> updateAsset -> POST), 200+ line structure
    - `content/code-examples/callback-pyramid.after.ts`: flat `safeTry` with 6 `yield*` steps, 6-variant `SubmitError` tagged union, exhaustive `match`
    - This is the most dramatic transformation -- highlight the nesting elimination
  - [ ] 9.6 Create Example 5: "The Success That Wasn't"
    - `content/code-examples/success-that-wasnt.before.ts`: download with `.catch()` swallowing errors, `Promise.allSettled` results discarded, success toast regardless
    - `content/code-examples/success-that-wasnt.after.ts`: `ResultAsync<DownloadReport, DownloadError>`, `match` gating toast on actual outcome
  - [ ] 9.7 Create Example 6: "The Boolean Trap"
    - `content/code-examples/boolean-trap.before.ts`: `verifySignature` returning `Promise<boolean>`, catch-all `return false`
    - `content/code-examples/boolean-trap.after.ts`: `ResultAsync<true, VerifyError>` with 4-variant union (InvalidCertUrl, CertFetchFailed, SignatureInvalid, VerificationCrash), `fromPredicate` usage
  - [ ] 9.8 Verify code example quality gates
    - All "after" code compiles with strict TypeScript
    - No `any`, `as`, `!` in any "after" example
    - Every "after" example uses only `@hex-di/result` imports
    - `safeTry` examples demonstrate `yield*` correctly
    - Error type definitions use `createError` factory pattern
    - All `match` handlers are exhaustive (verified by TypeScript compiler)
    - Before/after comparisons align related lines where possible
  - [ ] 9.9 Ensure code example tests pass
    - Run only the 6 tests from 9.1

**Acceptance Criteria (DoD 3.2):**

- All 6 named examples present and correctly rendered:
  - Example 1: "The Silent Swallower" (slides 3+17)
  - Example 2: "The Generic Thrower" (slides 4+18)
  - Example 3: "The Unsafe Cast" (slides 5+19)
  - Example 4: "The Callback Pyramid" (slides 6+20)
  - Example 5: "The Success That Wasn't" (slides 7+21)
  - Example 6: "The Boolean Trap" (supplementary)
- All "after" examples compile with strict TypeScript, no `any`/`as`/`!`
- Every "after" uses only `@hex-di/result` imports
- `safeTry` + `yield*` demonstrated correctly
- `createError` factory pattern used throughout
- All `match` handlers exhaustive
- Code examples load successfully through the adapter with caching

---

## Phase 4: Interactive Features

### Task Group 10: Must-Have Interactive Features

**Dependencies:** Task Groups 5, 6, 7

- [ ] 10.0 Complete must-have interactive features
  - [ ] 10.1 Write 4-6 focused tests for interactive features
    - Test: `F` key toggles fullscreen mode
    - Test: `N` key toggles presenter notes panel visibility
    - Test: `O` key opens slide overview grid
    - Test: clicking a thumbnail in overview grid navigates to that slide and closes the grid
    - Test: `Escape` closes any open panel (notes, overview)
  - [ ] 10.2 Implement fullscreen toggle
    - `F` key enters/exits browser fullscreen via Fullscreen API
    - Graceful fallback if Fullscreen API not available
  - [ ] 10.3 Implement `PresenterNotes` panel
    - `N` key toggles a 200px bottom panel
    - Background: `neutral-50`, text: `neutral-700`, smaller font (annotation size)
    - Displays `presenterNotes` field from current slide definition
    - Slide-up animation (250ms)
    - `Escape` closes the panel
  - [ ] 10.4 Implement `SlideOverviewGrid`
    - `O` key opens a semi-transparent dark overlay
    - 6 columns x 6 rows grid of slide thumbnails (200px x 112px, 16:9)
    - Each thumbnail shows a miniature representation of the slide (title text + type indicator at minimum)
    - Current slide: purple border (`brand-base`)
    - Act sections separated by visual grouping with act labels
    - Hover: slight scale-up (1.05x) with shadow
    - Click: navigate to that slide and close grid
    - `Escape` closes the grid
  - [ ] 10.5 Implement dark/light mode toggle
    - `D` key cycles through theme modes: `mixed` -> `light` -> `dark` -> `mixed`
    - Theme mode change dispatched through `useTheme()` hook -> `ThemePort` -> `ThemeAdapter`
    - In `mixed` mode: title and impact slides use dark background, content and code slides use light
    - In `light` mode: all slides use light background
    - In `dark` mode: all slides use dark background
    - Code blocks always use dark theme regardless of slide mode
  - [ ] 10.6 Add all keyboard shortcuts to `KeyboardHandler`
    - Extend the handler from Task Group 5.5 with: `F` (fullscreen), `N` (notes), `D` (dark/light), `O` (overview), `Escape` (close panels), `P` (playground, placeholder for now)
    - Digits 1-9 for direct slide jump
    - Keyboard shortcuts should not fire when a text input or textarea is focused
  - [ ] 10.7 Ensure interactive feature tests pass
    - Run only the 4-6 tests from 10.1

**Acceptance Criteria (DoD 5.1):**

- Keyboard navigation fully functional (all shortcuts working)
- Code blocks render with syntax highlighting
- Before/after comparisons show both panels side by side
- Presenter notes toggle with `N` key
- Fullscreen toggle with `F` key
- Slide overview grid with `O` key
- `Escape` closes any open panel
- Dark/light/mixed mode toggle with `D` key
- Tests from 10.1 pass

---

### Task Group 11: Should-Have & Nice-to-Have Features

**Dependencies:** Task Group 10

- [ ] 11.0 Complete stretch interactive features (prioritized)
  - [ ] 11.1 **(Should-have)** Implement `RailwayDiagram` animated SVG for slide 15
    - Two parallel tracks: success (green) and error (red)
    - Animated value flowing along tracks through `map`, `andThen`, `orElse` junctions
    - Animation sequence: ok(5) -> map(n \* 2) -> andThen(validate) -> shows result state
    - Second sequence: value switches to error track at andThen, passes through mapErr, recovers at orElse
    - Controls: play/pause, step forward/backward, speed (0.5x/1x/2x)
    - Current state displayed below: `Ok(10)` or `Err({ _tag: "Invalid" })`
    - Pure CSS animations + SVG, no heavy animation library
  - [ ] 11.2 **(Should-have)** Implement `ErrorTaxonomy` interactive diagram for slide 8
    - Tree structure showing 4 categories: silent failures, type erasure, inconsistent contracts, lost context
    - Each leaf shows the specific anti-pattern text
    - Hover: highlights category and shows tooltip with code snippet from the relevant slide
    - Click: navigates to the slide where this anti-pattern was shown
    - Each category has a distinct shade of error red
    - Display audit metric totals per category
  - [ ] 11.3 **(Should-have)** Implement `EcosystemDiagram` for slide 30
    - Interactive SVG showing `@hex-di/core` at center, libraries in surrounding ring
    - Hover a package: show description tooltip
    - Click a package: expand to show its relationship to Result
    - Hover `@hex-di/result`: all connections light up with labels (Container resolution, Graph validation, Store async derived, Query fetch, Saga step execution, Flow effect execution)
    - Animated data flow along connections
  - [ ] 11.4 **(Nice-to-have)** Implement `LivePlayground` Result REPL
    - `P` key toggles a 400px right-side panel
    - Textarea with syntax highlighting (using Shiki or a lightweight editor)
    - Pre-populated with context-appropriate code based on current slide (slide 13: `ok(42)`, slide 15: `ok(5).map(n => n * 2)`, etc.)
    - Sandboxed execution: only `@hex-di/result` imports available, no network, 1-second timeout
    - Output panel: Result value, TypeScript type, Ok/Err indicator (green/red)
    - Output capped at 500 characters
  - [ ] 11.5 **(Nice-to-have)** Implement Container Inspector for slide 32
    - Three-tab panel: Graph, Instances, Traces
    - Graph tab: lists all 5 port-to-adapter bindings with library labels (Flow, Store, Query, Tracing)
    - Instances tab: shows resolution status (resolved/lazy) and lifetime (singleton) for each adapter
    - Traces tab: shows last 10 tracing spans from slide navigation (timestamp, span name, duration, Ok/Err)
    - Uses `@hex-di/runtime` inspection API for container state
    - Uses `@hex-di/tracing` for timeline data
  - [ ] 11.6 **(Nice-to-have)** Add hover line-mapping to `CodeComparison`
    - When hovering a line in "before" panel, highlight the corresponding transformed line in "after" panel
    - Connecting lines between before/after for key transformations (toggleable)
    - Type tooltips: hover any variable to see its inferred type annotation

**Acceptance Criteria (DoD 5.2, 5.3):**

- Should-have: railway diagram animates on slide 15, error taxonomy is interactive on slide 8, ecosystem diagram renders on slide 30
- Nice-to-have: playground opens with `P` key, container inspector displays on slide 32, code diff hover connections work
- All interactive features degrade gracefully (presentation works without them)

---

## Phase 5: Verification & Polish

### Task Group 12: Final Verification, Performance & Accessibility

**Dependencies:** Task Groups 1-11

- [ ] 12.0 Complete final verification
  - [ ] 12.1 Review all tests from Task Groups 3, 4, 5, 6, 7, 9, 10
    - Gather all tests (~30-40 tests total from groups 3.1, 4.1, 5.1, 6.1, 7.1, 9.1, 10.1)
    - Run the full feature test suite
    - Identify and fix any regressions
  - [ ] 12.2 Write up to 8 additional integration tests to fill critical gaps
    - Test: navigating from slide 1 through 36 and back renders every slide without error
    - Test: code example loading returns Ok for all 6 examples, loading a non-existent example returns Err
    - Test: theme toggle persists to localStorage and restores on reload
    - Test: presenter notes are present for all 36 slides
    - Test: the presentation app has zero try/catch blocks except at system boundaries (Result used throughout)
    - Test: bundle size of production build is under 500KB gzipped (excluding fonts)
    - Test: no `any` types in non-test source files
    - Test: no `as` type casts in non-test source files
  - [ ] 12.3 Performance verification
    - Initial load under 3 seconds on fast connection
    - Slide transitions under 200ms
    - Code block rendering under 100ms
    - No visible layout shift during navigation
    - Bundle size under 500KB gzipped (excluding fonts)
    - Lazy loading working: code examples and heavy diagrams load on demand
  - [ ] 12.4 Accessibility verification
    - All content keyboard-navigable (tab through interactive elements)
    - Color is never the sole indicator (icons + labels + color used together)
    - Code annotations include text descriptions
    - Contrast ratios meet WCAG AA (verify with automated checker)
    - `prefers-reduced-motion` results in instant transitions
    - Focus indicators visible on all interactive elements
  - [ ] 12.5 Responsive behavior verification
    - 1920x1080 (Full HD): all content visible, ideal layout
    - 1440x900 (Laptop): code block font reduces to 14px, layout adjusts
    - 1280x720 (720p): reduced padding, smaller type scale
    - No content clipping or overflow at any tested resolution
  - [ ] 12.6 Presentation readiness check
    - Runs offline after initial load (all assets bundled, no external API calls required)
    - Works correctly at 1920x1080 resolution
    - Presenter notes provide talking points for every slide (spot-check 10 random slides)
    - Slide overview grid enables quick jump to any section
    - Full navigation walkthrough: start to finish in presentation mode
  - [ ] 12.7 Narrative coherence review
    - Act 1 (1-12): verify audience recognition pattern (code pain -> taxonomy -> "why" -> bridge)
    - Act 2 (13-28): verify every Act 1 problem has a corresponding fix, progressive API introduction
    - Act 3 (29-36): verify ecosystem vision, migration path, closing with clear next steps
    - Verify transition beat slides work at act boundaries (slides 10, 12, 29)
    - Verify no "before" example is left unresolved and no "after" appears without context
  - [ ] 12.8 Build and lint final verification
    - `pnpm install` succeeds
    - `pnpm dev` starts without errors
    - `pnpm build` produces production build: zero TypeScript errors
    - `pnpm lint` passes with zero warnings
    - Production build serves correctly via `pnpm preview`

**Acceptance Criteria (DoD 6, 7, 8, 9, 10):**

- All feature tests pass (approximately 38-48 tests total)
- Performance: initial load <3s, transitions <200ms, code rendering <100ms, bundle <500KB gzipped
- Accessibility: WCAG AA contrast, keyboard-navigable, reduced-motion support, focus indicators
- Responsive: works at 1920x1080, degrades gracefully at 1440x900 and 1280x720
- Presentation-ready: offline capable, presenter notes complete, overview grid functional
- Narrative: three-act structure coherent, all problem-solution pairs resolved, progressive disclosure maintained
- Build: TypeScript strict with zero errors, ESLint zero warnings, all HexDI packages linked

---

## Summary

| Phase                         | Task Groups | Focus                                                 |
| ----------------------------- | ----------- | ----------------------------------------------------- |
| Phase 1: Foundation           | 1-3         | Scaffolding, design tokens, slide engine              |
| Phase 2: HexDI Integration    | 4-5         | Ports/adapters/DI, navigation state machine           |
| Phase 3: Content & Components | 6-9         | Slide types, code display, 36 slides, 6 code examples |
| Phase 4: Interactive Features | 10-11       | Keyboard shortcuts, panels, diagrams, playground      |
| Phase 5: Verification         | 12          | Tests, performance, accessibility, narrative review   |
