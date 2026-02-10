# Result Presentation - Definition of Done

## Overview

This document defines the acceptance criteria for the presentation application. Each criterion must be met before the presentation is considered ready for delivery.

---

## 1. Core Slide Engine

### 1.1 Slide Rendering

- [ ] All 36 slides render without errors
- [ ] Each slide type (title, content, code, split, diagram, impact) has its own component
- [ ] Slides fill the viewport (100vw x 100vh)
- [ ] Content is constrained to max-width 1200px with proper padding
- [ ] Text is legible at 1080p resolution on a projector

### 1.2 Navigation

- [ ] Right arrow / Space advances to next slide
- [ ] Left arrow goes to previous slide
- [ ] Home/End go to first/last slide
- [ ] `G` + number combo navigates to specific slide
- [ ] Progress indicator shows current position
- [ ] Navigation is managed by `@hex-di/flow` state machine
- [ ] Cannot navigate past first or last slide (guards)

### 1.3 Transitions

- [ ] Slides transition with horizontal slide animation (200ms)
- [ ] Transitions respect `prefers-reduced-motion`
- [ ] No jank or flicker during transitions

---

## 2. Design System

### 2.1 Colors

- [ ] Sanofi purple (`#7A00E6`) is the primary brand color throughout
- [ ] Dark slides use `#3C217B` / `#23004C` gradient backgrounds
- [ ] Light slides use `#FAF5FF` / `#FFFFFF` backgrounds
- [ ] Success color (`#079455`) used for Ok/after states
- [ ] Error color (`#D72B3F`) used for Err/before states
- [ ] Info color (`#1570EF`) used for type annotations
- [ ] All text meets WCAG AA contrast requirements

### 2.2 Typography

- [ ] Primary font: Work Sans (or Sanofi Sans if available)
- [ ] Code font: JetBrains Mono
- [ ] Type scale matches spec (48px H1 down to 12px caption)
- [ ] Fonts loaded from Google Fonts or local assets
- [ ] No FOUT (flash of unstyled text) - fonts preloaded

### 2.3 Code Blocks

- [ ] Syntax highlighting uses Shiki with custom Sanofi theme
- [ ] Line numbers displayed
- [ ] File name tab at top of code block
- [ ] Highlighted lines have distinct background color
- [ ] Error annotations: red-tinted background with inline text
- [ ] Ok annotations: green-tinted background with inline text
- [ ] Code is readable at presentation distance (15px minimum)

---

## 3. Content Accuracy

### 3.1 Act 1 - The Problem

- [ ] All "before" code examples compile (TypeScript, even with anti-patterns)
- [ ] Code examples are properly anonymized (no Sanofi-specific business names)
- [ ] Anti-pattern annotations are accurate and clearly visible
- [ ] Error taxonomy diagram correctly classifies all shown patterns
- [ ] Audit metrics from `08-impact-analysis.md` displayed accurately on slides 8-9:
  - [ ] Combined throw count (797) sourced and shown
  - [ ] Silent failure count (257) sourced and shown
  - [ ] Unsafe cast count (134) sourced and shown
  - [ ] Catch block count (595) sourced and shown
  - [ ] Per-codebase breakdown available (frontend vs backend)
- [ ] Metrics are presented as data points supporting the narrative, not raw dumps

### 3.2 Act 2 - The Solution: Named Code Examples

All 6 before/after examples from `05-code-examples.md` are present, compilable, and correctly rendered:

- [ ] **Example 1 - "The Silent Swallower"** (slides 3 + 17): `.catch(() => null)` → `ResultAsync<PhotoUrl, PhotoError>` with 4-variant tagged union
- [ ] **Example 2 - "The Generic Thrower"** (slides 4 + 18): `throw new Error(msg)` → `ResultAsync<SurveyTemplate, SurveyError>` with `safeTry` generator
- [ ] **Example 3 - "The Unsafe Cast"** (slides 5 + 19): `(err as Error).message` → `match()` with `_tag` discrimination, no casts
- [ ] **Example 4 - "The Callback Pyramid"** (slides 6 + 20): 3-level nested callbacks → flat `safeTry` with 6 `yield*` steps
- [ ] **Example 5 - "The Success That Wasn't"** (slides 7 + 21): success toast despite failed download → `match()` gating toast on actual outcome
- [ ] **Example 6 - "The Boolean Trap"** (supplementary): `return false` catch-all → `ResultAsync<true, VerifyError>` with 4-variant union

Code quality gates for all examples:

- [ ] All "after" code examples compile with strict TypeScript
- [ ] No `any`, `as`, `!` (non-null assertion) in any "after" example
- [ ] Every "after" example uses only `@hex-di/result` imports
- [ ] Before/after comparisons align related lines where possible
- [ ] `safeTry` examples demonstrate `yield*` correctly
- [ ] Error type definitions use `createError` factory pattern
- [ ] All `match` handlers are exhaustive

### 3.3 Act 3 - The Vision

- [ ] HexDI ecosystem overview is accurate (all 29 packages represented)
- [ ] Container integration example uses real `@hex-di/runtime` API
- [ ] Package relationships in ecosystem diagram are correct
- [ ] Migration path is realistic and actionable
- [ ] Migration phases from `08-impact-analysis.md` reflected on slide 34:
  - [ ] Phase 1: API client layer (highest leverage)
  - [ ] Phase 2: Service layer with `safeTry`
  - [ ] Phase 3: Controller/UI boundary mapping
  - [ ] Phase 4: Utility functions

### 3.4 Impact Narrative Coherence

- [ ] Slide 8 ("Taxonomy of Chaos") groups anti-patterns into the 4 categories from the analysis: silent failures, type erasure, inconsistent contracts, lost context
- [ ] Slide 9 ("Why This Happens") explains the TypeScript throw/catch type gap
- [ ] Slide 10 ("The Real Question") bridges naturally into Act 2
- [ ] Slide 22 ("The Pattern") summarizes the 5-step transformation pattern
- [ ] Slide 35 ("What Changes") uses concrete before/after pairs from the analysis, not generic claims
- [ ] The "compound impact" benefits (onboarding, refactoring safety, cross-team consistency, testing) from `08-impact-analysis.md` are woven into Act 3 slides

---

## 4. HexDI Integration

### 4.1 State Machine (Flow)

- [ ] Slide navigation is implemented as a `@hex-di/flow` state machine
- [ ] State machine has 36 states (one per slide)
- [ ] Transitions: NEXT, PREVIOUS, GO_TO
- [ ] Guards prevent invalid navigation
- [ ] Context tracks current slide, history, and act transitions

### 4.2 State Management (Store)

- [ ] Slide definitions stored as `@hex-di/store` atoms
- [ ] Theme mode managed as store atom with persistence
- [ ] Derived values for filtered slide views

### 4.3 Data Fetching (Query)

- [ ] Code examples loaded via `@hex-di/query`
- [ ] Examples cached after first load
- [ ] Loading states shown while fetching
- [ ] Error states handled with Result pattern (meta!)

### 4.4 Error Handling (Result)

- [ ] Code example loading returns `ResultAsync`
- [ ] Error states render with proper error UI
- [ ] No try/catch in the presentation app itself (except at boundaries)

### 4.5 Logging (Logger)

- [ ] `@hex-di/logger` used for presentation event logging
- [ ] Console shows structured log entries during development

### 4.6 Tracing

- [ ] `@hex-di/tracing` records slide navigation spans
- [ ] Spans visible in container inspector (slide 32)

### 4.7 Dependency Injection

- [ ] `@hex-di/core` ports define all capabilities
- [ ] `@hex-di/graph` wires the dependency graph
- [ ] `@hex-di/runtime` creates the container
- [ ] `@hex-di/react` provides the HexDIProvider
- [ ] All hooks resolve services through the container

---

## 5. Interactive Features

### 5.1 Must Have

- [ ] Keyboard navigation fully functional
- [ ] Code blocks render with syntax highlighting
- [ ] Before/after comparisons show both panels side by side
- [ ] Presenter notes toggle with `N` key
- [ ] Fullscreen toggle with `F` key
- [ ] Slide overview grid with `O` key

### 5.2 Should Have

- [ ] Dark/light mode toggle with `D` key
- [ ] Railway diagram animation on slide 15
- [ ] Error taxonomy interactive hover
- [ ] HexDI ecosystem diagram on slide 30

### 5.3 Nice to Have

- [ ] Live Result playground with `P` key
- [ ] Container inspector on slide 32
- [ ] Code diff hover connections between before/after

---

## 6. Performance

- [ ] Initial load < 3 seconds on fast connection
- [ ] Slide transitions < 200ms
- [ ] Code block rendering < 100ms
- [ ] No visible layout shift during navigation
- [ ] Bundle size < 500KB gzipped (excluding fonts)
- [ ] Lazy loading for code examples and heavy diagrams

---

## 7. Accessibility

- [ ] All content keyboard-navigable
- [ ] Color never sole indicator (icons + labels + color)
- [ ] Code annotations include text descriptions
- [ ] Contrast ratios meet WCAG AA
- [ ] `prefers-reduced-motion` respected
- [ ] Focus indicators visible on all interactive elements

---

## 8. Build & Development

- [ ] `pnpm install` installs all dependencies
- [ ] `pnpm dev` starts development server
- [ ] `pnpm build` produces production build
- [ ] `pnpm preview` serves production build locally
- [ ] TypeScript strict mode - zero errors
- [ ] ESLint - zero warnings
- [ ] All workspace HexDI packages linked correctly

---

## 9. Presentation Readiness

- [ ] Runs offline after initial load (all assets bundled)
- [ ] Works at 1920x1080 resolution (primary target)
- [ ] Degrades gracefully at 1440x900 and 1280x720
- [ ] No external API calls required during presentation
- [ ] Presenter notes provide talking points for every slide
- [ ] Slide overview grid enables quick jump to any section

---

## 10. Narrative & Storytelling Flow

The presentation is a story, not a slide deck. These criteria verify the narrative lands.

### 10.1 Act Structure

- [ ] Act 1 (slides 1-12) builds recognition: audience sees their own code patterns
- [ ] Act 2 (slides 13-28) delivers resolution: every Act 1 problem gets a concrete fix
- [ ] Act 3 (slides 29-36) expands vision: Result connects to the full HexDI ecosystem
- [ ] Each act transition has a clear beat slide (slides 10, 12, 29)

### 10.2 Problem-Solution Pairing

Every "before" example shown in Act 1 has a corresponding "after" in Act 2:

- [ ] Slide 3 (Silent Swallower) resolved by slide 17
- [ ] Slide 4 (Generic Thrower) resolved by slide 18
- [ ] Slide 5 (Unsafe Cast) resolved by slide 19
- [ ] Slide 6 (Callback Pyramid) resolved by slide 20
- [ ] Slide 7 (Success That Wasn't) resolved by slide 21
- [ ] No "before" example is left unresolved
- [ ] No "after" example appears without its "before" context

### 10.3 Progressive Disclosure

- [ ] Result API introduced incrementally: `ok`/`err` first (slide 12), then `map`/`match` (13-16), then `safeTry` (20, 27)
- [ ] No API feature used in a slide before it's been introduced
- [ ] Advanced features (`allSettled`, `collect`, `fromPredicate`, `andThrough`) appear only after basics are established (slides 23+)

### 10.4 Audience Engagement

- [ ] Opening hook (slide 1-2) creates curiosity without requiring prior knowledge
- [ ] Presenter notes include audience prompts ("Ask: has anyone seen this pattern?")
- [ ] At least one interactive moment per act (playground, diagram hover, container inspector)
- [ ] Closing (slide 36) provides clear next steps, not just a summary

### 10.5 Data-Driven Credibility

- [ ] Audit numbers from real codebases cited where they strengthen the narrative (slides 8-9)
- [ ] Numbers are sourced from `08-impact-analysis.md` and verifiable
- [ ] The "quantified improvement" tables from the analysis are distilled into visual slide content, not shown as raw tables
- [ ] No inflated claims -- every metric has a corresponding code search behind it
