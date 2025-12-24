# HexDI Documentation Website - Design Specifications

> Comprehensive design mockups and wireframes for the HexDI Docusaurus documentation website

**Version:** 1.0
**Date:** 2025-12-15
**Designer:** UI/UX Documentation Specialist

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Wireframes](#wireframes)
   - [Homepage](#homepage-wireframe)
   - [Documentation Page](#documentation-page-wireframe)
   - [API Reference](#api-reference-wireframe)
5. [Component Specifications](#component-specifications)
6. [Responsive Breakpoints](#responsive-breakpoints)
7. [Accessibility Guidelines](#accessibility-guidelines)
8. [Animation & Interaction](#animation--interaction)

---

## Design Philosophy

### Core Principles

1. **Developer-First Experience**
   - Code examples are primary, not secondary
   - Syntax highlighting optimized for TypeScript
   - Copy-to-clipboard on all code blocks
   - Clear visual hierarchy for technical content

2. **Type-Safety Visual Language**
   - Use strong contrast to convey reliability
   - Geometric shapes to suggest structure
   - Precise spacing to mirror compile-time guarantees
   - Color-coded lifetime scopes for immediate recognition

3. **Modern & Professional**
   - Clean, minimalist design
   - Generous white space
   - Professional color palette
   - Subtle animations for delight

4. **Performance & Accessibility**
   - Fast load times
   - WCAG 2.1 AA compliance
   - Keyboard navigation
   - Screen reader optimized

---

## Color Palette

### Primary Colors

```
Primary Brand Color (HexDI Purple)
├─ Primary 900: #1A0B2E  (Darkest - headers, emphasis)
├─ Primary 700: #2D1B4E  (Dark - navigation)
├─ Primary 600: #4527A0  (Main brand color)
├─ Primary 500: #5E35B1  (Interactive elements)
├─ Primary 400: #7E57C2  (Hover states)
├─ Primary 300: #9575CD  (Light accents)
├─ Primary 200: #B39DDB  (Subtle backgrounds)
├─ Primary 100: #D1C4E9  (Very light backgrounds)
└─ Primary 50:  #EDE7F6  (Lightest - code block backgrounds)
```

### Accent Colors

```
TypeScript Blue (Code & Technical)
├─ TS 700: #1976D2  (TypeScript blue - code highlights)
├─ TS 500: #2196F3  (Links, interactive code)
├─ TS 300: #64B5F6  (Hover states)
└─ TS 100: #BBDEFB  (Light backgrounds)

Success Green (Working Code, Tips)
├─ Success 700: #388E3C  (Dark green)
├─ Success 500: #4CAF50  (Main success)
├─ Success 300: #81C784  (Light success)
└─ Success 100: #C8E6C9  (Background)

Warning Orange (Warnings, Deprecation)
├─ Warning 700: #F57C00  (Dark orange)
├─ Warning 500: #FF9800  (Main warning)
├─ Warning 300: #FFB74D  (Light warning)
└─ Warning 100: #FFE0B2  (Background)

Error Red (Errors, Breaking Changes)
├─ Error 700: #D32F2F  (Dark red)
├─ Error 500: #F44336  (Main error)
├─ Error 300: #E57373  (Light error)
└─ Error 100: #FFCDD2  (Background)
```

### Lifetime Scope Colors

```
Singleton (Shared - Teal)
├─ Singleton 600: #00897B  (Primary)
├─ Singleton 400: #26A69A  (Light)
└─ Singleton 100: #B2DFDB  (Background)

Scoped (Contextual - Amber)
├─ Scoped 600: #FF8F00  (Primary)
├─ Scoped 400: #FFA726  (Light)
└─ Scoped 100: #FFECB3  (Background)

Request (Transient - Purple)
├─ Request 600: #7B1FA2  (Primary)
├─ Request 400: #AB47BC  (Light)
└─ Request 100: #E1BEE7  (Background)
```

### Neutral Colors

```
Light Mode
├─ Background:     #FFFFFF
├─ Surface:        #F8F9FA
├─ Surface Hover:  #F1F3F5
├─ Border:         #E1E4E8
├─ Border Light:   #EAECEF
├─ Text Primary:   #24292E
├─ Text Secondary: #586069
├─ Text Tertiary:  #6A737D
└─ Code Block BG:  #F6F8FA

Dark Mode
├─ Background:     #0D1117
├─ Surface:        #161B22
├─ Surface Hover:  #21262D
├─ Border:         #30363D
├─ Border Light:   #21262D
├─ Text Primary:   #C9D1D9
├─ Text Secondary: #8B949E
├─ Text Tertiary:  #6E7681
└─ Code Block BG:  #161B22
```

### Semantic Colors

```
Info (Documentation Notes)
├─ Info 500: #0288D1  (Light Blue)
└─ Info 100: #B3E5FC

Tip (Best Practices)
├─ Tip 500: #00897B   (Teal)
└─ Tip 100: #B2DFDB

Caution (Important Notes)
├─ Caution 500: #F57C00  (Orange)
└─ Caution 100: #FFE0B2

Danger (Critical Warnings)
├─ Danger 500: #D32F2F  (Red)
└─ Danger 100: #FFCDD2
```

---

## Typography

### Font Families

```css
/* Primary Font - Sans Serif */
--font-primary:
  "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial,
  sans-serif;

/* Code Font - Monospace */
--font-code:
  "Fira Code", "JetBrains Mono", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", Courier,
  monospace;

/* Headings Font - Geometric Sans */
--font-headings: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### Type Scale

```css
/* Display */
--text-display: 3.75rem; /* 60px - Hero headlines */
--text-display-line: 1.1;
--text-display-weight: 800;

/* Heading 1 */
--text-h1: 2.5rem; /* 40px - Page titles */
--text-h1-line: 1.2;
--text-h1-weight: 700;

/* Heading 2 */
--text-h2: 2rem; /* 32px - Major sections */
--text-h2-line: 1.3;
--text-h2-weight: 700;

/* Heading 3 */
--text-h3: 1.5rem; /* 24px - Subsections */
--text-h3-line: 1.4;
--text-h3-weight: 600;

/* Heading 4 */
--text-h4: 1.25rem; /* 20px - Minor sections */
--text-h4-line: 1.5;
--text-h4-weight: 600;

/* Heading 5 */
--text-h5: 1.125rem; /* 18px - Small sections */
--text-h5-line: 1.5;
--text-h5-weight: 600;

/* Body Large */
--text-body-lg: 1.125rem; /* 18px - Lead paragraphs */
--text-body-lg-line: 1.7;
--text-body-lg-weight: 400;

/* Body */
--text-body: 1rem; /* 16px - Default text */
--text-body-line: 1.7;
--text-body-weight: 400;

/* Body Small */
--text-body-sm: 0.875rem; /* 14px - Secondary text */
--text-body-sm-line: 1.6;
--text-body-sm-weight: 400;

/* Code */
--text-code: 0.875rem; /* 14px - Inline code */
--text-code-line: 1.6;
--text-code-weight: 400;

/* Code Block */
--text-code-block: 0.875rem; /* 14px - Code blocks */
--text-code-block-line: 1.6;
--text-code-block-weight: 400;

/* Caption */
--text-caption: 0.75rem; /* 12px - Captions, labels */
--text-caption-line: 1.5;
--text-caption-weight: 500;
```

### Font Weight System

```css
--weight-light: 300; /* Rarely used */
--weight-regular: 400; /* Body text */
--weight-medium: 500; /* Subtle emphasis */
--weight-semibold: 600; /* Headings h3-h5 */
--weight-bold: 700; /* Headings h1-h2 */
--weight-extrabold: 800; /* Display text */
```

### Typography Usage Guidelines

1. **Headings**
   - Use Manrope for a modern, geometric feel
   - Maintain consistent hierarchy
   - Add bottom margin: h1 (32px), h2 (24px), h3 (20px)

2. **Body Text**
   - Use Inter for excellent readability
   - Line height 1.7 for comfortable reading
   - Max width 65-75 characters per line

3. **Code**
   - Use Fira Code with ligatures enabled
   - Monospace font ensures alignment
   - Slightly smaller than body (14px vs 16px)

4. **Links**
   - Inherit font family from context
   - Use Primary 500 or TS 500 color
   - Underline on hover

---

## Wireframes

### Homepage Wireframe

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              NAVIGATION BAR                                 │
│  ┌──────────┬─────────────────────────────────────────┬─────────────────┐  │
│  │  HexDI   │  Docs  │  API  │  Examples  │  Blog    │  GitHub  Search │  │
│  │  [Logo]  │                                          │  [Icon]  [Icon] │  │
│  └──────────┴─────────────────────────────────────────┴─────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                              HERO SECTION                                   │
│                                                                              │
│                    ┌────────────────────────────┐                           │
│                    │       [HexDI Logo]         │                           │
│                    │    Geometric hexagon       │                           │
│                    └────────────────────────────┘                           │
│                                                                              │
│              Type-Safe Dependency Injection for TypeScript                  │
│                   Catch dependency errors at compile time,                  │
│                          not at runtime.                                    │
│                                                                              │
│         ┌─────────────────────┐  ┌──────────────────────┐                  │
│         │  Get Started        │  │  View Documentation  │                  │
│         │  [Primary Button]   │  │  [Secondary Button]  │                  │
│         └─────────────────────┘  └──────────────────────┘                  │
│                                                                              │
│                  npm install @hex-di/ports @hex-di/graph                    │
│                             @hex-di/runtime                                 │
│                          [Copy to clipboard]                                │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                          KEY FEATURES SECTION                               │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   [Icon: Check]  │  │  [Icon: Zap]     │  │  [Icon: Layers]  │         │
│  │                  │  │                  │  │                  │         │
│  │  Compile-Time    │  │  Zero Runtime    │  │  Type-Safe       │         │
│  │  Validation      │  │  Overhead        │  │  Resolution      │         │
│  │                  │  │                  │  │                  │         │
│  │  Missing deps    │  │  Phantom types   │  │  Full type       │         │
│  │  cause TypeScript│  │  and optional    │  │  inference,      │         │
│  │  errors, not     │  │  features add    │  │  no explicit     │         │
│  │  runtime crashes │  │  no cost         │  │  annotations     │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  [Icon: React]   │  │  [Icon: Tool]    │  │  [Icon: Hexagon] │         │
│  │                  │  │                  │  │                  │         │
│  │  React           │  │  DevTools        │  │  Three Lifetime  │         │
│  │  Integration     │  │  Integration     │  │  Scopes          │         │
│  │                  │  │                  │  │                  │         │
│  │  Typed hooks and │  │  Visualize       │  │  Singleton,      │         │
│  │  providers with  │  │  dependency      │  │  scoped, and     │         │
│  │  automatic scope │  │  graphs and      │  │  request with    │         │
│  │  lifecycle       │  │  trace services  │  │  proper isolation│         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                        QUICK START CODE SECTION                             │
│                                                                              │
│                        See It In Action                                     │
│              A simple example showing HexDI's core concepts                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │ // 1. Define your service interface                               │    │
│  │ interface Logger {                                                 │    │
│  │   log(message: string): void;                                      │    │
│  │ }                                                                   │    │
│  │                                                                     │    │
│  │ // 2. Create a port (contract + runtime token)                     │    │
│  │ const LoggerPort = createPort<Logger>('Logger');         │    │
│  │                                                                     │    │
│  │ // 3. Create an adapter (implementation)                           │    │
│  │ const LoggerAdapter = createAdapter({                              │    │
│  │   provides: LoggerPort,                                            │    │
│  │   requires: [],                                                    │    │
│  │   lifetime: 'singleton',                                           │    │
│  │   factory: () => ({                                                │    │
│  │     log: (msg) => console.log(`[App] ${msg}`)                      │    │
│  │   })                                                                │    │
│  │ });                                                                 │    │
│  │                                                                     │    │
│  │ // 4. Build the graph (validated at compile time)                  │    │
│  │ const graph = GraphBuilder.create()                                │    │
│  │   .provide(LoggerAdapter)                                          │    │
│  │   .build();                                                         │    │
│  │                                                                     │    │
│  │ // 5. Create container and resolve services                        │    │
│  │ const container = createContainer(graph);                          │    │
│  │ const logger = container.resolve(LoggerPort);                      │    │
│  │ logger.log('Hello, HexDI!');                                       │    │
│  │                                                                     │    │
│  │                                           [Copy Code] [TypeScript] │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│                    ┌──────────────────────────┐                             │
│                    │  Explore Full Tutorial   │                             │
│                    │  [Primary Button]        │                             │
│                    └──────────────────────────┘                             │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                      PACKAGE ARCHITECTURE SECTION                           │
│                                                                              │
│                      Package Architecture                                   │
│             HexDI is designed with modularity in mind                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │    Core Packages                  Optional Packages                │    │
│  │                                                                     │    │
│  │    ┌─────────────┐                ┌─────────────┐                 │    │
│  │    │  @hex-di/   │                │  @hex-di/   │                 │    │
│  │    │   ports     │◄───────────────│   react     │                 │    │
│  │    │             │                │             │                 │    │
│  │    │  Port token │                │  React      │                 │    │
│  │    │  system     │                │  integration│                 │    │
│  │    └─────────────┘                └─────────────┘                 │    │
│  │          ▲                               ▲                         │    │
│  │          │                               │                         │    │
│  │    ┌─────────────┐                ┌─────────────┐                 │    │
│  │    │  @hex-di/   │                │  @hex-di/   │                 │    │
│  │    │   graph     │◄───────────────│  devtools   │                 │    │
│  │    │             │                │             │                 │    │
│  │    │  Builder +  │                │  Graph      │                 │    │
│  │    │  validation │                │  visualization                │    │
│  │    └─────────────┘                └─────────────┘                 │    │
│  │          ▲                               ▲                         │    │
│  │          │                               │                         │    │
│  │    ┌─────────────┐                ┌─────────────┐                 │    │
│  │    │  @hex-di/   │                │  @hex-di/   │                 │    │
│  │    │  runtime    │◄───────────────│  testing    │                 │    │
│  │    │             │                │             │                 │    │
│  │    │  Container +│                │  Mocking &  │                 │    │
│  │    │  resolution │                │  utilities  │                 │    │
│  │    └─────────────┘                └─────────────┘                 │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  @hex-di/ports   │  │  @hex-di/graph   │  │  @hex-di/runtime │         │
│  │                  │  │                  │  │                  │         │
│  │  Port token      │  │  GraphBuilder    │  │  Container       │         │
│  │  system for      │  │  with compile-   │  │  creation and    │         │
│  │  service         │  │  time dependency │  │  service         │         │
│  │  contracts       │  │  validation      │  │  resolution      │         │
│  │                  │  │                  │  │                  │         │
│  │  [View Docs →]   │  │  [View Docs →]   │  │  [View Docs →]   │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │  @hex-di/react   │  │  @hex-di/devtools│  │  @hex-di/testing │         │
│  │                  │  │                  │  │                  │         │
│  │  React hooks     │  │  Dependency      │  │  Testing         │         │
│  │  and providers   │  │  graph           │  │  utilities and   │         │
│  │  with automatic  │  │  visualization   │  │  mock helpers    │         │
│  │  scope lifecycle │  │  and tracing     │  │                  │         │
│  │                  │  │                  │  │                  │         │
│  │  [View Docs →]   │  │  [View Docs →]   │  │  [View Docs →]   │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                      LIFETIME SCOPES SECTION                                │
│                                                                              │
│                       Understanding Lifetime Scopes                         │
│         Control service lifecycle with three distinct scopes               │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ [Teal Badge]     │  │ [Amber Badge]    │  │ [Purple Badge]   │         │
│  │  Singleton       │  │  Scoped          │  │  Request         │         │
│  │                  │  │                  │  │                  │         │
│  │  Created once    │  │  Once per scope  │  │  Every time      │         │
│  │  per container   │  │                  │  │                  │         │
│  │                  │  │                  │  │                  │         │
│  │  • Configuration │  │  • User sessions │  │  • Notifications │         │
│  │  • Shared        │  │  • HTTP requests │  │  • Fresh         │         │
│  │    resources     │  │  • DB            │  │    instances     │         │
│  │  • Stateless     │  │    transactions  │  │  • Isolated      │         │
│  │    services      │  │                  │  │    state         │         │
│  │                  │  │                  │  │                  │         │
│  │  [Code Example]  │  │  [Code Example]  │  │  [Code Example]  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         WHY HEXDI SECTION                                   │
│                                                                              │
│                        Why Choose HexDI?                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  "Most DI libraries fail at runtime. HexDI catches errors at       │    │
│  │   compile time with TypeScript's type system."                     │    │
│  │                                                                     │    │
│  │   ┌─────────────────────────────────────────────┐                  │    │
│  │   │ // Missing dependency? Compile error!       │                  │    │
│  │   │ const graph = GraphBuilder.create()         │                  │    │
│  │   │   .provide(UserServiceAdapter) // needs DB  │                  │    │
│  │   │   .build();                                 │                  │    │
│  │   │ //     ^^^^^ Error: Missing dependency      │                  │    │
│  │   └─────────────────────────────────────────────┘                  │    │
│  │                                                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐        │
│  │  Effect-TS Inspired Design   │  │  Framework Agnostic          │        │
│  │                              │  │                              │        │
│  │  Immutable builder pattern   │  │  Core packages work          │        │
│  │  enables safe composition    │  │  anywhere - React is         │        │
│  │  and graph branching          │  │  optional, not required      │        │
│  └──────────────────────────────┘  └──────────────────────────────┘        │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         GETTING STARTED CTA                                 │
│                                                                              │
│                       Ready to Get Started?                                 │
│                  Build type-safe applications today                         │
│                                                                              │
│              ┌──────────────────────┐  ┌────────────────────┐              │
│              │  Read Documentation  │  │  View Examples     │              │
│              │  [Primary Button]    │  │  [Secondary Button]│              │
│              └──────────────────────┘  └────────────────────┘              │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                                 FOOTER                                      │
│                                                                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐            │
│  │ Documentation│   Community  │   Resources  │     Legal    │            │
│  │              │              │              │              │            │
│  │ Getting      │ GitHub       │ Blog         │ License      │            │
│  │ Started      │ Discussions  │ Changelog    │ Privacy      │            │
│  │              │              │              │              │            │
│  │ API          │ Discord      │ Roadmap      │ Terms        │            │
│  │ Reference    │              │              │              │            │
│  │              │ Twitter      │ Brand Assets │              │            │
│  │ Guides       │              │              │              │            │
│  │              │ Stack        │              │              │            │
│  │ Examples     │ Overflow     │              │              │            │
│  └──────────────┴──────────────┴──────────────┴──────────────┘            │
│                                                                              │
│                    ┌────────────────────────────────┐                       │
│                    │  Built with Docusaurus         │                       │
│                    │  MIT License                   │                       │
│                    │  © 2025 HexDI Contributors     │                       │
│                    └────────────────────────────────┘                       │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Documentation Page Wireframe

````
┌────────────────────────────────────────────────────────────────────────────┐
│                              NAVIGATION BAR                                 │
│  ┌──────────┬─────────────────────────────────────────┬─────────────────┐  │
│  │  HexDI   │  Docs  │  API  │  Examples  │  Blog    │  GitHub  Search │  │
│  │  [Logo]  │  [Active]                                │  [Icon]  [Icon] │  │
│  └──────────┴─────────────────────────────────────────┴─────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘

┌───────────────┬────────────────────────────────────────────┬──────────────┐
│               │                                            │              │
│   SIDEBAR     │           MAIN CONTENT AREA                │   TOC        │
│   (250px)     │           (Flexible width)                 │  (250px)     │
│               │                                            │              │
├───────────────┼────────────────────────────────────────────┼──────────────┤
│               │                                            │              │
│ Getting       │  ┌──────────────────────────────────────┐ │ On this page │
│ Started       │  │ Home > Getting Started > Introduction│ │              │
│ ► Introduction│  └──────────────────────────────────────┘ │ - Overview   │
│   Installation│                                            │ - Why HexDI? │
│   Quick Start │  # Introduction to HexDI                  │ - Key        │
│   Core        │                                            │   Concepts   │
│   Concepts    │  HexDI is a type-safe dependency          │ - Next Steps │
│               │  injection library...                      │              │
│ Core          │                                            │              │
│ Packages      │  ## Why HexDI?                            │              │
│ ► Ports       │                                            │              │
│ ► Graph       │  Most dependency injection libraries...   │              │
│ ► Runtime     │                                            │              │
│               │  ┌────────────────────────────────────┐   │              │
│ Optional      │  │ INFO                               │   │              │
│ Packages      │  │ HexDI requires TypeScript 5.0+     │   │              │
│ ► React       │  │ with strict mode enabled.          │   │              │
│ ► DevTools    │  └────────────────────────────────────┘   │              │
│ ► Testing     │                                            │              │
│               │  ## Key Concepts                           │              │
│ Guides        │                                            │              │
│ ► Patterns    │  ### Ports                                 │              │
│ ► Best        │                                            │              │
│   Practices   │  Ports are typed tokens...                 │              │
│ ► React       │                                            │              │
│   Integration │  ```typescript                             │ [Scroll spy  │
│ ► Testing     │  import { createPort } from '@hex-di/...  │  highlights  │
│   Strategies  │  ```                                       │  current     │
│               │                                            │  section]    │
│ API           │  ### Adapters                              │              │
│ Reference     │                                            │              │
│ ► @hex-di/    │  Adapters implement ports...               │              │
│   ports       │                                            │              │
│ ► @hex-di/    │  ```typescript                             │              │
│   graph       │  const UserAdapter = createAdapter({      │              │
│ ► @hex-di/    │    provides: UserServicePort,             │              │
│   runtime     │    requires: [LoggerPort],                │              │
│ ► @hex-di/    │    lifetime: 'scoped',                    │              │
│   react       │    factory: (deps) => ({ ... })           │              │
│ ► @hex-di/    │  });                                       │              │
│   devtools    │  ```                                       │              │
│ ► @hex-di/    │                                            │              │
│   testing     │  ┌────────────────────────────────────┐   │              │
│               │  │ TIP                                │   │              │
│ Examples      │  │ Use descriptive port names that    │   │              │
│ ► Basic Setup │  │ match your domain language.        │   │              │
│ ► React App   │  └────────────────────────────────────┘   │              │
│ ► Testing     │                                            │              │
│               │  ## Next Steps                             │              │
│               │                                            │              │
│ [Dark Mode]   │  - Continue with [Installation →]         │              │
│ [GitHub]      │  - Explore [Core Concepts →]               │              │
│               │  - See [Quick Start →]                     │              │
│               │                                            │              │
│               │  ┌────────────────┬───────────────────┐   │              │
│               │  │ ← Previous     │      Next →       │   │              │
│               │  │   Home         │   Installation    │   │              │
│               │  └────────────────┴───────────────────┘   │              │
│               │                                            │              │
└───────────────┴────────────────────────────────────────────┴──────────────┘
````

**Sidebar Navigation Details:**

```
┌─────────────────────────────────┐
│ SIDEBAR NAVIGATION              │
├─────────────────────────────────┤
│                                 │
│ [Search Bar]                    │
│ [🔍 Search docs...]             │
│                                 │
│ Getting Started                 │
│ ► Introduction                  │
│   Installation                  │
│   Quick Start                   │
│   Core Concepts                 │
│   Migration Guide               │
│                                 │
│ Core Packages                   │
│ ▼ Ports                         │
│   • Overview                    │
│   • Creating Ports              │
│   • Port Types                  │
│ ► Graph                         │
│ ► Runtime                       │
│                                 │
│ Optional Packages               │
│ ▼ React                         │
│   • Overview                    │
│   • Typed Hooks                 │
│   • Providers                   │
│   • Scope Lifecycle             │
│ ► DevTools                      │
│ ► Testing                       │
│                                 │
│ Guides                          │
│ ► Architecture Patterns         │
│ ► Best Practices                │
│ ► Performance                   │
│ ► Error Handling                │
│                                 │
│ API Reference                   │
│ ► @hex-di/ports                 │
│ ► @hex-di/graph                 │
│ ► @hex-di/runtime               │
│ ► @hex-di/react                 │
│ ► @hex-di/devtools              │
│ ► @hex-di/testing               │
│                                 │
│ Examples                        │
│ • Basic Setup                   │
│ • React Application             │
│ • Express Backend               │
│ • Testing Strategies            │
│                                 │
└─────────────────────────────────┘
```

**Table of Contents (Right Sidebar) Details:**

```
┌─────────────────────────────────┐
│ ON THIS PAGE                    │
├─────────────────────────────────┤
│                                 │
│ Overview                        │
│   ├─ What is HexDI?             │
│   └─ Design Goals               │
│                                 │
│ Why HexDI? [Active]             │
│   ├─ Compile-Time Safety        │
│   ├─ Type Inference             │
│   └─ Zero Overhead              │
│                                 │
│ Key Concepts                    │
│   ├─ Ports                      │
│   ├─ Adapters                   │
│   ├─ Graph                      │
│   └─ Container                  │
│                                 │
│ Next Steps                      │
│                                 │
├─────────────────────────────────┤
│ [Edit this page]                │
│ [Report an issue]               │
└─────────────────────────────────┘
```

---

### API Reference Wireframe

````
┌────────────────────────────────────────────────────────────────────────────┐
│                              NAVIGATION BAR                                 │
│  ┌──────────┬─────────────────────────────────────────┬─────────────────┐  │
│  │  HexDI   │  Docs  │  API  │  Examples  │  Blog    │  GitHub  Search │  │
│  │  [Logo]  │          [Active]                        │  [Icon]  [Icon] │  │
│  └──────────┴─────────────────────────────────────────┴─────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘

┌───────────────┬────────────────────────────────────────────┬──────────────┐
│   SIDEBAR     │           MAIN CONTENT AREA                │   TOC        │
├───────────────┼────────────────────────────────────────────┼──────────────┤
│               │                                            │              │
│ @hex-di/ports │  ┌──────────────────────────────────────┐ │ On this page │
│ ► Overview    │  │ API > @hex-di/graph > createAdapter │ │              │
│ ► createPort  │  └──────────────────────────────────────┘ │ - Signature  │
│               │                                            │ - Parameters │
│ @hex-di/graph │  # createAdapter                          │ - Returns    │
│ ▼ Overview    │                                            │ - Examples   │
│   createAdapter│  Creates an adapter that implements a     │ - See Also   │
│   GraphBuilder│  port with its dependencies.              │              │
│               │                                            │              │
│ @hex-di/      │  ## Signature                              │              │
│ runtime       │                                            │              │
│ ► Overview    │  ```typescript                             │              │
│ ► create      │  function createAdapter<                   │              │
│   Container   │    TProvides extends AnyPort,              │              │
│ ► Scope       │    TRequires extends ReadonlyArray<Any...│              │
│ ► Errors      │    TLifetime extends Lifetime,             │              │
│               │  >(config: AdapterConfig<TProvides, TRe...│              │
│ @hex-di/react │  ```                                       │              │
│ ► Overview    │                                            │              │
│ ► createTyped │  ## Parameters                             │              │
│   Hooks       │                                            │              │
│ ► Providers   │  ### config                                │              │
│               │  Type: `AdapterConfig<TProvides, TRequ...` │              │
│ @hex-di/      │                                            │              │
│ devtools      │  ┌────────────────────────────────────┐   │              │
│ ► Overview    │  │ Property     Type       Required   │   │              │
│ ► DevTools    │  ├────────────────────────────────────┤   │              │
│   Floating    │  │ provides     TProvides  ✓          │   │              │
│ ► Export      │  │ requires     TRequires  ✓          │   │              │
│   Functions   │  │ lifetime     TLifetime  ✓          │   │              │
│               │  │ factory      Function   ✓          │   │              │
│ @hex-di/      │  │ onDispose?   Function              │   │              │
│ testing       │  └────────────────────────────────────┘   │              │
│ ► Overview    │                                            │              │
│ ► Test        │  #### provides                             │              │
│   GraphBuilder│                                            │              │
│ ► createMock  │  The port this adapter implements.         │              │
│   Adapter     │                                            │              │
│               │  - Type: `Port<string, unknown>`           │              │
│               │  - Required: ✓                             │              │
│               │                                            │              │
│               │  #### requires                             │              │
│               │                                            │              │
│               │  Array of ports this adapter depends on.   │              │
│               │                                            │              │
│               │  - Type: `ReadonlyArray<Port>`             │              │
│               │  - Required: ✓                             │              │
│               │  - Default: `[]`                           │              │
│               │                                            │              │
│               │  #### lifetime                             │              │
│               │                                            │              │
│               │  Service lifetime scope.                   │              │
│               │                                            │              │
│               │  - Type: `'singleton' | 'scoped' | '...`   │              │
│               │  - Required: ✓                             │              │
│               │                                            │              │
│               │  ┌────────────────────────────────────┐   │              │
│               │  │ INFO                               │   │              │
│               │  │ See [Lifetime Scopes](../guide...  │   │              │
│               │  │ for detailed information.          │   │              │
│               │  └────────────────────────────────────┘   │              │
│               │                                            │              │
│               │  #### factory                              │              │
│               │                                            │              │
│               │  Function that creates service instance.   │              │
│               │                                            │              │
│               │  - Type: `(deps: DependencyMap) => T`      │              │
│               │  - Required: ✓                             │              │
│               │                                            │              │
│               │  ```typescript                             │              │
│               │  // Factory receives typed dependencies    │              │
│               │  factory: (deps) => {                      │              │
│               │    // deps.Logger is typed automatically   │              │
│               │    deps.Logger.log('Creating service');    │              │
│               │    return { ... };                         │              │
│               │  }                                          │              │
│               │  ```                                       │              │
│               │                                            │              │
│               │  ## Returns                                │              │
│               │                                            │              │
│               │  Type: `Adapter<TProvides, TRequires, ...` │              │
│               │                                            │              │
│               │  An adapter object that can be used with   │              │
│               │  GraphBuilder.provide().                   │              │
│               │                                            │              │
│               │  ## Examples                               │              │
│               │                                            │              │
│               │  ### Basic Adapter                         │              │
│               │                                            │              │
│               │  ```typescript                             │              │
│               │  const LoggerAdapter = createAdapter({     │              │
│               │    provides: LoggerPort,                   │              │
│               │    requires: [],                           │              │
│               │    lifetime: 'singleton',                  │              │
│               │    factory: () => ({                       │              │
│               │      log: (msg) => console.log(msg)        │              │
│               │    })                                       │              │
│               │  });                                        │              │
│               │  ```                                       │              │
│               │                                            │              │
│               │  ### Adapter with Dependencies             │              │
│               │                                            │              │
│               │  ```typescript                             │              │
│               │  const UserServiceAdapter = createAdap...  │              │
│               │    provides: UserServicePort,              │              │
│               │    requires: [LoggerPort, DatabasePort],   │              │
│               │    lifetime: 'scoped',                     │              │
│               │    factory: (deps) => ({                   │              │
│               │      getUser: async (id) => {              │              │
│               │        deps.Logger.log(`Getting ${id}`);   │              │
│               │        return deps.Database.query(...);    │              │
│               │      }                                      │              │
│               │    })                                       │              │
│               │  });                                        │              │
│               │  ```                                       │              │
│               │                                            │              │
│               │  ┌────────────────────────────────────┐   │              │
│               │  │ TIP                                │   │              │
│               │  │ Dependencies are fully typed -     │   │              │
│               │  │ no need for type annotations!      │   │              │
│               │  └────────────────────────────────────┘   │              │
│               │                                            │              │
│               │  ## See Also                               │              │
│               │                                            │              │
│               │  - [createPort](../ports/createPort)       │              │
│               │  - [GraphBuilder](./GraphBuilder)          │              │
│               │  - [Lifetime Scopes](../guides/lifetim...│              │
│               │                                            │              │
└───────────────┴────────────────────────────────────────────┴──────────────┘
````

---

## Component Specifications

### 1. Navigation Bar

**Desktop Layout:**

```
┌────────────────────────────────────────────────────────────────────┐
│ Height: 64px                                                       │
│ Background: #FFFFFF (light) / #161B22 (dark)                       │
│ Border-bottom: 1px solid #E1E4E8 / #30363D                         │
│ Box-shadow: 0 1px 2px rgba(0,0,0,0.05)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Logo]  Docs  API  Examples  Blog              [GitHub] [Search] │
│  40x40    16px spacing between items            24px icons         │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Specifications:**

- **Height:** 64px
- **Background:** White (light) / #161B22 (dark)
- **Border:** 1px solid #E1E4E8 (light) / #30363D (dark)
- **Shadow:** Subtle drop shadow on scroll
- **Sticky:** Fixed to top on scroll
- **Max width:** 1440px (centered)
- **Padding:** 0 24px

**Logo:**

- Size: 40x40px
- Format: SVG
- Colors: Primary 600 + Accent gradient

**Navigation Links:**

- Font: Manrope Medium, 16px
- Color: #24292E (light) / #C9D1D9 (dark)
- Hover: Primary 600 with underline
- Active: Primary 600, bold, 2px bottom border
- Spacing: 24px between items

**Action Buttons:**

- GitHub icon: 24x24px
- Search icon: 24x24px with kbd shortcut hint
- Color: Text Secondary
- Hover: Text Primary

---

### 2. Code Blocks

**Standard Code Block:**

```
┌──────────────────────────────────────────────────────────────┐
│ File: example.ts                              [Copy] [TypeScript] │
├──────────────────────────────────────────────────────────────┤
│  1 │ import { createPort } from '@hex-di/ports';            │
│  2 │                                                         │
│  3 │ const LoggerPort = createPort<Logger>(       │
│  4 │   'Logger'                                              │
│  5 │ );                                                      │
│    │                                                         │
└──────────────────────────────────────────────────────────────┘
```

**Specifications:**

- **Background:** #F6F8FA (light) / #161B22 (dark)
- **Border:** 1px solid #E1E4E8 (light) / #30363D (dark)
- **Border radius:** 8px
- **Padding:** 16px
- **Font:** Fira Code, 14px
- **Line height:** 1.6
- **Tab size:** 2 spaces

**Header Bar:**

- Height: 40px
- Background: #F1F3F5 (light) / #21262D (dark)
- Font: Inter Medium, 13px
- Display: filename + language + copy button

**Line Numbers:**

- Width: 40px
- Font: Fira Code, 13px
- Color: #6A737D (muted)
- Right padding: 16px
- Text align: right
- User-select: none

**Syntax Highlighting (TypeScript):**

```css
--syntax-keyword: #d73a49 (light) / #ff7b72 (dark) /* import, const, function */
  --syntax-string: #032f62 (light) / #a5d6ff (dark) /* 'strings' */ --syntax-function: #6f42c1
  (light) / #d2a8ff (dark) /* functionName() */ --syntax-variable: #24292e (light) / #c9d1d9 (dark)
  /* variables */ --syntax-type: #005cc5 (light) / #79c0ff (dark) /* TypeName */
  --syntax-comment: #6a737d (light) / #8b949e (dark) /* // comments */ --syntax-operator: #d73a49
  (light) / #ff7b72 (dark) /* =, <, > */ --syntax-punctuation: #24292e (light) / #c9d1d9 (dark)
  /* {}, [], () */;
```

**Copy Button:**

- Size: 32x32px
- Background: Transparent
- Hover: #E1E4E8 (light) / #30363D (dark)
- Icon: 16x16px clipboard
- Success state: Checkmark with "Copied!" tooltip
- Position: Absolute top-right (8px, 8px)

---

### 3. Callout Boxes

**Info Callout:**

```
┌────────────────────────────────────────────────────────┐
│ [i] INFO                                               │
├────────────────────────────────────────────────────────┤
│ HexDI requires TypeScript 5.0+ with strict mode       │
│ enabled for compile-time validation to work.          │
└────────────────────────────────────────────────────────┘
```

**Specifications:**

**Info (Blue):**

- Background: #E7F5FF (light) / rgba(2, 136, 209, 0.1) (dark)
- Border-left: 4px solid #0288D1
- Icon color: #0288D1
- Text color: #01579B (light) / #90CAF9 (dark)

**Tip (Teal):**

- Background: #E0F2F1 (light) / rgba(0, 137, 123, 0.1) (dark)
- Border-left: 4px solid #00897B
- Icon color: #00897B
- Text color: #004D40 (light) / #80CBC4 (dark)

**Warning (Orange):**

- Background: #FFF3E0 (light) / rgba(245, 124, 0, 0.1) (dark)
- Border-left: 4px solid #F57C00
- Icon color: #F57C00
- Text color: #E65100 (light) / #FFCC80 (dark)

**Danger (Red):**

- Background: #FFEBEE (light) / rgba(211, 47, 47, 0.1) (dark)
- Border-left: 4px solid #D32F2F
- Icon color: #D32F2F
- Text color: #B71C1C (light) / #EF9A9A (dark)

**General Callout Specs:**

- Border radius: 6px
- Padding: 16px 16px 16px 48px
- Font: Inter Regular, 15px
- Line height: 1.6
- Icon: 20x20px, positioned at 16px from left
- Margin: 24px 0

---

### 4. Feature Cards

**Feature Card Layout:**

```
┌─────────────────────────────┐
│         [Icon]              │
│                             │
│    Compile-Time Validation  │
│                             │
│  Missing dependencies cause │
│  TypeScript errors, not     │
│  runtime crashes.           │
│                             │
└─────────────────────────────┘
```

**Specifications:**

- **Width:** Flexible (grid: 3 columns on desktop)
- **Background:** #FFFFFF (light) / #161B22 (dark)
- **Border:** 1px solid #E1E4E8 (light) / #30363D (dark)
- **Border radius:** 12px
- **Padding:** 32px
- **Box shadow:** 0 2px 8px rgba(0,0,0,0.04)
- **Hover shadow:** 0 4px 16px rgba(0,0,0,0.08)
- **Transition:** all 0.2s ease

**Icon:**

- Size: 48x48px
- Background: Gradient (Primary 600 to Primary 400)
- Border radius: 12px
- Padding: 12px (icon is 24x24px)
- Margin bottom: 16px

**Title:**

- Font: Manrope SemiBold, 20px
- Color: Text Primary
- Margin: 0 0 12px 0

**Description:**

- Font: Inter Regular, 15px
- Color: Text Secondary
- Line height: 1.6
- Margin: 0

**Grid Layout:**

```css
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin: 48px 0;
}
```

---

### 5. Package Cards

**Package Card Layout:**

```
┌──────────────────────────────────────┐
│  @hex-di/graph                       │
│  [Badge: Core]                       │
│                                      │
│  GraphBuilder with compile-time      │
│  dependency validation               │
│                                      │
│  • Immutable builder pattern         │
│  • Type-safe composition             │
│  • Graph validation                  │
│                                      │
│  [View Documentation →]              │
└──────────────────────────────────────┘
```

**Specifications:**

- **Background:** Gradient from Primary 50 to Primary 100
- **Border:** 2px solid Primary 300
- **Border radius:** 16px
- **Padding:** 28px
- **Hover:** Transform scale(1.02), shadow increase
- **Transition:** all 0.3s ease

**Package Name:**

- Font: Fira Code Medium, 18px
- Color: Primary 700
- Margin: 0 0 8px 0

**Badge:**

- Background: Primary 600 (Core) / TS 500 (Optional)
- Color: White
- Padding: 4px 12px
- Border radius: 12px
- Font: Inter SemiBold, 12px
- Display: inline-block
- Margin: 0 0 16px 0

**Description:**

- Font: Inter Regular, 15px
- Color: Text Primary
- Line height: 1.6
- Margin: 0 0 16px 0

**Feature List:**

- Font: Inter Regular, 14px
- Color: Text Secondary
- List style: Custom checkmark
- Margin: 16px 0

**Link Button:**

- Font: Inter Medium, 15px
- Color: Primary 600
- Arrow: →
- Hover: Underline + color Primary 500
- Transition: color 0.2s ease

---

### 6. Lifetime Scope Badges

**Badge Specifications:**

```
[Singleton]  [Scoped]  [Request]
```

**General Specs:**

- **Display:** inline-flex
- **Align items:** center
- **Padding:** 6px 12px
- **Border radius:** 16px
- **Font:** Inter SemiBold, 13px
- **Letter spacing:** 0.3px
- **Text transform:** uppercase

**Singleton Badge:**

- Background: linear-gradient(135deg, #00897B, #26A69A)
- Color: White
- Icon: Single circle (•)

**Scoped Badge:**

- Background: linear-gradient(135deg, #FF8F00, #FFA726)
- Color: White
- Icon: Nested circles (⊙)

**Request Badge:**

- Background: linear-gradient(135deg, #7B1FA2, #AB47BC)
- Color: White
- Icon: Multiple circles (∴)

**Light Background Variant:**

- Singleton: Background #B2DFDB, Color #004D40
- Scoped: Background #FFECB3, Color #E65100
- Request: Background #E1BEE7, Color #4A148C

---

### 7. Search Component

**Search Bar (Desktop):**

```
┌──────────────────────────────────────┐
│ [🔍] Search documentation...    ⌘K   │
└──────────────────────────────────────┘
```

**Specifications:**

- **Width:** 280px
- **Height:** 40px
- **Background:** #F6F8FA (light) / #21262D (dark)
- **Border:** 1px solid #E1E4E8 (light) / #30363D (dark)
- **Border radius:** 8px
- **Padding:** 0 12px 0 40px
- **Font:** Inter Regular, 14px

**Icon:**

- Size: 18x18px
- Position: 12px from left
- Color: Text Tertiary

**Keyboard Shortcut:**

- Font: Inter Medium, 12px
- Background: #E1E4E8 (light) / #30363D (dark)
- Border: 1px solid #D1D5DA (light) / #484F58 (dark)
- Border radius: 4px
- Padding: 2px 6px
- Position: Absolute right 8px

**Focus State:**

- Border: 1px solid Primary 500
- Box shadow: 0 0 0 3px rgba(94, 53, 177, 0.1)
- Outline: none

**Search Modal:**

- Max width: 640px
- Background: White (light) / #161B22 (dark)
- Border radius: 12px
- Box shadow: 0 8px 32px rgba(0,0,0,0.24)
- Padding: 0
- Overlay: rgba(0,0,0,0.5)

---

### 8. Sidebar Navigation

**Specifications:**

- **Width:** 280px (fixed)
- **Background:** #FFFFFF (light) / #0D1117 (dark)
- **Border-right:** 1px solid #E1E4E8 (light) / #30363D (dark)
- **Padding:** 24px 16px
- **Height:** calc(100vh - 64px)
- **Position:** Sticky, top: 64px
- **Overflow-y:** auto

**Section Header:**

- Font: Manrope SemiBold, 13px
- Color: Text Tertiary
- Text transform: uppercase
- Letter spacing: 0.5px
- Margin: 24px 0 8px 0

**Navigation Item:**

- Font: Inter Medium, 14px
- Color: Text Secondary
- Padding: 8px 12px
- Border radius: 6px
- Transition: all 0.15s ease
- Cursor: pointer

**Navigation Item States:**

- **Hover:** Background #F6F8FA (light) / #21262D (dark)
- **Active:** Background Primary 50, Color Primary 600, Bold
- **Expanded:** Chevron rotated 90deg

**Nested Items:**

- Padding-left: +16px per level
- Font size: 13px (nested level 1)
- Border-left: 1px solid #E1E4E8 (visual hierarchy)

**Chevron Icon:**

- Size: 16x16px
- Color: Text Tertiary
- Transition: transform 0.2s ease
- Expanded: rotate(90deg)

---

### 9. Table of Contents (Right Sidebar)

**Specifications:**

- **Width:** 280px (fixed)
- **Background:** Transparent
- **Padding:** 24px 16px
- **Height:** fit-content
- **Position:** Sticky, top: 88px
- **Max height:** calc(100vh - 88px - 24px)
- **Overflow-y:** auto

**Header:**

- Font: Manrope SemiBold, 13px
- Color: Text Tertiary
- Text transform: uppercase
- Margin: 0 0 16px 0

**TOC Link:**

- Font: Inter Regular, 13px
- Color: Text Secondary
- Padding: 6px 0 6px 12px
- Border-left: 2px solid transparent
- Transition: all 0.15s ease
- Line height: 1.5

**TOC Link States:**

- **Hover:** Color Text Primary
- **Active:**
  - Border-left: 2px solid Primary 600
  - Color: Primary 600
  - Font weight: Medium

**Nested TOC Items:**

- Padding-left: +12px per level
- Font size: 12px for level 2+

**Scroll Spy:**

- Active section highlighted automatically
- Smooth scroll on click
- Offset for fixed header

---

### 10. Buttons

**Primary Button:**

```
┌─────────────────────┐
│  Get Started        │
└─────────────────────┘
```

**Specifications:**

- **Background:** Primary 600
- **Color:** White
- **Padding:** 12px 24px
- **Border radius:** 8px
- **Font:** Inter SemiBold, 16px
- **Border:** none
- **Box shadow:** 0 2px 4px rgba(69, 39, 160, 0.2)
- **Transition:** all 0.2s ease
- **Cursor:** pointer

**States:**

- **Hover:** Background Primary 500, Shadow 0 4px 8px rgba(69, 39, 160, 0.3)
- **Active:** Transform scale(0.98)
- **Focus:** Outline 2px solid Primary 300, Outline offset 2px
- **Disabled:** Background Primary 200, Color Primary 100, Cursor not-allowed

**Secondary Button:**

- **Background:** Transparent
- **Color:** Primary 600
- **Border:** 2px solid Primary 600
- **Hover:** Background Primary 50
- **Active:** Background Primary 100

**Ghost Button:**

- **Background:** Transparent
- **Color:** Text Primary
- **Border:** 1px solid Border
- **Hover:** Background Surface Hover

**Small Button:**

- Padding: 8px 16px
- Font size: 14px

**Large Button:**

- Padding: 16px 32px
- Font size: 18px

---

### 11. Breadcrumbs

```
Home > Getting Started > Introduction
```

**Specifications:**

- **Font:** Inter Regular, 14px
- **Color:** Text Secondary
- **Margin:** 0 0 24px 0
- **Display:** flex
- **Align items:** center
- **Gap:** 8px

**Link:**

- Color: Text Secondary
- Hover: Color Primary 600, Underline
- Transition: color 0.15s ease

**Separator:**

- Character: >
- Color: Text Tertiary
- Font size: 12px
- Margin: 0 4px

**Current Page:**

- Color: Text Primary
- Font weight: Medium
- Not a link

---

### 12. Previous/Next Navigation

```
┌────────────────┬───────────────┐
│ ← Previous     │    Next →     │
│   Home         │  Installation │
└────────────────┴───────────────┘
```

**Specifications:**

- **Display:** Grid (2 columns)
- **Gap:** 16px
- **Margin:** 48px 0 0 0

**Navigation Card:**

- **Background:** #F6F8FA (light) / #161B22 (dark)
- **Border:** 1px solid #E1E4E8 (light) / #30363D (dark)
- **Border radius:** 8px
- **Padding:** 16px
- **Transition:** all 0.2s ease
- **Cursor:** pointer

**States:**

- **Hover:** Border Primary 600, Background Primary 50 (light) / rgba(94, 53, 177, 0.1) (dark)
- **Active:** Transform translateY(1px)

**Label (Previous/Next):**

- Font: Inter Medium, 13px
- Color: Text Tertiary
- Margin: 0 0 4px 0

**Page Title:**

- Font: Inter SemiBold, 16px
- Color: Text Primary

**Arrow:**

- Size: 16x16px
- Color: Primary 600
- Vertical align: middle

---

## Responsive Breakpoints

```css
/* Mobile First Approach */

/* Extra Small Devices (phones, <640px) */
@media (max-width: 639px) {
  --nav-height: 56px;
  --sidebar-width: 100%;
  --content-padding: 16px;
  --font-scale: 0.9;
}

/* Small Devices (tablets, ≥640px) */
@media (min-width: 640px) {
  --nav-height: 64px;
  --sidebar-width: 240px;
  --content-padding: 24px;
  --font-scale: 0.95;
}

/* Medium Devices (tablets landscape, ≥768px) */
@media (min-width: 768px) {
  --sidebar-width: 260px;
  --content-padding: 32px;
  --font-scale: 1;
}

/* Large Devices (laptops/desktops, ≥1024px) */
@media (min-width: 1024px) {
  --sidebar-width: 280px;
  --toc-width: 240px;
  --content-max-width: 800px;
}

/* Extra Large Devices (large desktops, ≥1280px) */
@media (min-width: 1280px) {
  --toc-width: 280px;
  --content-max-width: 900px;
}
```

**Responsive Behavior:**

1. **Mobile (<768px):**
   - Sidebar: Hidden, accessible via hamburger menu
   - TOC: Hidden, accessible via button
   - Navigation: Collapsed with hamburger
   - Code blocks: Horizontal scroll
   - Feature cards: 1 column
   - Package cards: 1 column

2. **Tablet (768px-1023px):**
   - Sidebar: Toggleable, overlay
   - TOC: Hidden
   - Navigation: Full
   - Feature cards: 2 columns
   - Package cards: 2 columns

3. **Desktop (≥1024px):**
   - Sidebar: Always visible, fixed
   - TOC: Visible on right
   - Three-column layout
   - Feature cards: 3 columns
   - Package cards: 3 columns

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

1. **Color Contrast:**
   - Text on background: Minimum 4.5:1 ratio
   - Large text (18px+): Minimum 3:1 ratio
   - Interactive elements: Minimum 3:1 ratio
   - Test all color combinations

2. **Keyboard Navigation:**
   - All interactive elements focusable
   - Visible focus indicators (2px outline)
   - Skip to main content link
   - Logical tab order
   - No keyboard traps

3. **Screen Readers:**
   - Semantic HTML (nav, main, aside, article)
   - ARIA labels where needed
   - Alt text for all images
   - Proper heading hierarchy (h1 > h2 > h3)
   - Live regions for dynamic content

4. **Focus Management:**
   - Focus visible: 2px outline, Primary 600
   - Focus offset: 2px
   - Skip navigation link
   - Return focus after modal close
   - Trap focus in modals

5. **Text & Readability:**
   - Minimum font size: 14px
   - Line height: 1.5-1.7
   - Max line length: 75 characters
   - Text resize: Up to 200% without loss of functionality
   - No text in images (except logos)

6. **Motion:**
   - Respect prefers-reduced-motion
   - Disable animations if requested
   - Provide static alternatives

---

## Animation & Interaction

### Timing Functions

```css
/* Easing curves */
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--ease-in: cubic-bezier(0.32, 0, 0.67, 0);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Durations */
--duration-instant: 100ms;
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
--duration-slower: 500ms;
```

### Animation Patterns

**1. Hover Effects:**

```css
/* Cards */
transition:
  transform 0.2s ease-out,
  box-shadow 0.2s ease-out;
transform: translateY(-2px);
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);

/* Buttons */
transition:
  background 0.15s ease-out,
  transform 0.1s ease-out;
transform: scale(0.98); /* on active */

/* Links */
transition: color 0.15s ease-out;
```

**2. Focus Indicators:**

```css
outline: 2px solid var(--primary-600);
outline-offset: 2px;
transition: outline-offset 0.1s ease-out;
```

**3. Page Transitions:**

```css
/* Fade in */
animation: fadeIn 0.3s ease-out;

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide up */
animation: slideUp 0.3s ease-out;

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**4. Loading States:**

```css
/* Skeleton loader */
background: linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

**5. Reduced Motion:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Dark Mode Implementation

### Color Switching

```css
/* CSS Custom Properties Approach */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #24292e;
  --text-secondary: #586069;
  /* ... all colors */
}

[data-theme="dark"] {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --text-primary: #c9d1d9;
  --text-secondary: #8b949e;
  /* ... all colors */
}
```

### Toggle Implementation

**Toggle Button:**

```
┌─────────┐
│ ☀️ ┃ 🌙 │  (Sun active in light, Moon active in dark)
└─────────┘
```

**Specifications:**

- Width: 60px
- Height: 32px
- Border radius: 16px
- Background: #E1E4E8 (light) / #30363D (dark)
- Transition: background 0.3s ease
- Toggle circle: 28x28px, white
- Position in navbar: Right side, before GitHub icon

**Persistence:**

- Save preference to localStorage
- Respect system preference on first visit
- Smooth transition between modes

---

## Layout Specifications

### Homepage Layout

```
┌──────────────────────────────────────────────────┐
│                   Navigation                      │ 64px
├──────────────────────────────────────────────────┤
│                     Hero                          │ 600px
│                  (Centered)                       │
├──────────────────────────────────────────────────┤
│                  Features                         │ Auto
│              (Max width: 1200px)                  │
├──────────────────────────────────────────────────┤
│                 Code Example                      │ Auto
│              (Max width: 900px)                   │
├──────────────────────────────────────────────────┤
│              Package Architecture                 │ Auto
│              (Max width: 1200px)                  │
├──────────────────────────────────────────────────┤
│               Lifetime Scopes                     │ Auto
│              (Max width: 1200px)                  │
├──────────────────────────────────────────────────┤
│                  Why HexDI                        │ Auto
│              (Max width: 900px)                   │
├──────────────────────────────────────────────────┤
│                     CTA                           │ 300px
│                  (Centered)                       │
├──────────────────────────────────────────────────┤
│                   Footer                          │ Auto
└──────────────────────────────────────────────────┘
```

### Documentation Layout

```
┌──────────────────────────────────────────────────┐
│                   Navigation                      │ 64px
├─────────┬────────────────────────────┬───────────┤
│ Sidebar │      Main Content          │    TOC    │
│ 280px   │    (Flexible, max 900px)   │   280px   │
│         │                            │           │
│ Fixed   │    Scrollable              │  Sticky   │
│         │                            │           │
│         │                            │           │
└─────────┴────────────────────────────┴───────────┘
```

**Container Widths:**

- Max content width: 1600px
- Main content: Max 900px (60-75 chars per line)
- Homepage sections: Max 1200px

**Spacing System:**

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
--space-4xl: 96px;
```

---

## Logo Design Specifications

### HexDI Logo Concept

```
     ╱╲
    ╱  ╲
   ╱ DI ╲
  ╱      ╲
 ╱────────╲

Hexagon with "DI" text
Geometric, modern, technical
```

**Logo Specifications:**

**Full Logo (Horizontal):**

```
┌─────────────────────────────────┐
│  [Hexagon Icon]  HexDI          │
└─────────────────────────────────┘
```

**Icon Only (Square):**

- Size: 40x40px (nav), 80x80px (hero), 200x200px (og:image)
- Shape: Regular hexagon
- Colors:
  - Primary: Gradient from Primary 600 to Primary 400
  - Accent: TS Blue for inner element
- Style: Flat design with subtle shadow

**Wordmark:**

- Font: Manrope ExtraBold
- Size: 24px (nav), 48px (hero)
- Color: Primary 700
- Letter spacing: -0.5px
- "Hex" in Primary 700, "DI" in TS Blue (optional variant)

**Favicon:**

- 16x16, 32x32, 180x180, 192x192, 512x512
- SVG version for modern browsers
- Simple hexagon shape
- Primary 600 background, white "DI"

---

## Iconography

### Icon System

**Icon Library:** Lucide Icons (consistent, modern, clean)

**Icon Sizes:**

```css
--icon-xs: 16px; /* Inline with text */
--icon-sm: 20px; /* Buttons, small UI */
--icon-md: 24px; /* Navigation, features */
--icon-lg: 32px; /* Feature highlights */
--icon-xl: 48px; /* Hero sections */
```

**Icon Usage:**

**Feature Icons:**

- Check (Compile-time validation)
- Zap (Zero runtime overhead)
- Layers (Type-safe resolution)
- ReactIcon (React integration)
- Tool (DevTools)
- Hexagon (Three lifetime scopes)

**Navigation Icons:**

- ChevronRight (Sidebar expansion)
- ChevronDown (Dropdowns)
- Search (Search functionality)
- Menu (Mobile hamburger)
- X (Close modals)

**Action Icons:**

- Copy (Copy code)
- Check (Copied confirmation)
- ExternalLink (External links)
- GitHub (GitHub link)
- Sun/Moon (Dark mode toggle)

**Status Icons:**

- Info (Info callouts)
- AlertTriangle (Warning callouts)
- AlertCircle (Error callouts)
- Lightbulb (Tip callouts)

---

## Export Formats

### Design Assets to Export

1. **Logo Files:**
   - SVG (vector, preferred)
   - PNG (40x40, 80x80, 200x200, 512x512)
   - Favicon (ICO, multiple sizes)

2. **Color Palette:**
   - JSON file with all color values
   - CSS custom properties file
   - Figma/Sketch palette file

3. **Typography:**
   - Font files (WOFF2, WOFF)
   - CSS @font-face declarations
   - Type scale documentation

4. **Component Library:**
   - React components (if using Docusaurus with custom components)
   - CSS modules for each component
   - Storybook stories (optional)

5. **Icons:**
   - SVG sprite sheet
   - Individual SVG files
   - Icon font (if needed)

---

## Implementation Notes

### Docusaurus Configuration

**1. Theme Configuration:**

```js
// docusaurus.config.js
module.exports = {
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      logo: {
        alt: "HexDI Logo",
        src: "img/logo.svg",
        srcDark: "img/logo-dark.svg",
      },
      items: [
        { to: "/docs/intro", label: "Docs", position: "left" },
        { to: "/api", label: "API", position: "left" },
        { to: "/examples", label: "Examples", position: "left" },
        { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://github.com/your-org/hex-di",
          position: "right",
          className: "header-github-link",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        /* footer links */
      ],
      copyright: `© ${new Date().getFullYear()} HexDI Contributors. Built with Docusaurus.`,
    },
  },
};
```

**2. Custom CSS:**

```css
/* src/css/custom.css */
:root {
  /* Color palette */
  --ifm-color-primary: #5e35b1;
  --ifm-color-primary-dark: #4527a0;
  --ifm-color-primary-darker: #2d1b4e;
  --ifm-color-primary-darkest: #1a0b2e;
  --ifm-color-primary-light: #7e57c2;
  --ifm-color-primary-lighter: #9575cd;
  --ifm-color-primary-lightest: #b39ddb;

  /* Fonts */
  --ifm-font-family-base: "Inter", system-ui, -apple-system, sans-serif;
  --ifm-font-family-monospace: "Fira Code", "Monaco", monospace;
  --ifm-heading-font-family: "Manrope", var(--ifm-font-family-base);

  /* Typography scale */
  --ifm-font-size-base: 16px;
  --ifm-line-height-base: 1.7;

  /* Spacing */
  --ifm-spacing-horizontal: 24px;
  --ifm-spacing-vertical: 24px;

  /* Code blocks */
  --ifm-code-font-size: 14px;
  --ifm-code-padding-horizontal: 16px;
  --ifm-code-padding-vertical: 16px;
  --ifm-code-border-radius: 8px;
}
```

**3. Syntax Highlighting Theme:**

- Use Prism theme: Dracula (dark) / GitHub (light)
- Customize colors to match brand palette
- Enable line numbers
- Enable copy button plugin

**4. Plugins:**

```js
plugins: [
  "@docusaurus/plugin-content-docs",
  "@docusaurus/plugin-content-blog",
  "@docusaurus/plugin-sitemap",
  "docusaurus-plugin-sass", // If using SCSS
];
```

---

## Version History

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| 1.0     | 2025-12-15 | Initial design specifications |

---

## Design Checklist

- [ ] Color palette defined with light/dark modes
- [ ] Typography scale established
- [ ] Homepage wireframe complete
- [ ] Documentation layout wireframe complete
- [ ] API reference layout wireframe complete
- [ ] All components specified
- [ ] Responsive breakpoints defined
- [ ] Accessibility guidelines documented
- [ ] Animation patterns defined
- [ ] Dark mode implementation planned
- [ ] Logo design specified
- [ ] Icon system selected
- [ ] Layout specifications complete
- [ ] Export formats identified
- [ ] Docusaurus configuration outlined

---

## ADDENDUM: Hexagonal Architecture Visual Language

### Overview

HexDI is built on hexagonal/ports-and-adapters architecture principles. This addendum extends the design specifications to incorporate hexagonal architecture visual inspiration throughout the documentation website, reinforcing the library's core architectural philosophy.

---

### 1. Logo Redesign Concept

**Hexagon-Based Logo:**

The logo should use an actual hexagon shape as the primary visual element, representing the application core in hexagonal architecture.

```
     ╱──────╲
    ╱   DI   ╲
   ╱    ⬢⬢    ╲
  │  ⬢      ⬢  │
   ╲    ⬢⬢    ╱
    ╲________╱

Hexagon with ports (small circles)
around the edges
```

**Logo Elements:**

1. **Central Hexagon:**
   - Represents the "application core" / domain logic
   - Fill: Gradient from Primary 700 (center) to Primary 400 (edges)
   - Size: 40x40px (nav), 80x80px (hero), 200x200px (social)
   - Border: 2px solid Primary 600

2. **Port Indicators:**
   - Small circles or connectors around hexagon edges
   - Size: 6px diameter (at nav size)
   - Color: TypeScript Blue (TS 500)
   - Position: At each of the 6 vertices
   - Represent ports/interfaces

3. **DI Typography:**
   - Position: Inside the hexagon or beside it
   - Font: Manrope ExtraBold
   - Color: White (inside) or Primary 700 (beside)
   - Size: Scales with hexagon

4. **Gradient Concept:**
   - Center (domain): Primary 700 (darkest)
   - Middle: Primary 600
   - Edges (adapters): Primary 400 (lighter)
   - Symbolizes: Core → Ports → Adapters flow

**Logo Variations:**

```css
/* Full logo with wordmark */
.logo-full {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Icon only (mobile/small contexts) */
.logo-icon {
  width: 40px;
  height: 40px;
}

/* Hero size */
.logo-hero {
  width: 120px;
  height: 120px;
}
```

---

### 2. Homepage Hero Section

**Animated Hexagon Diagram:**

Replace or enhance the existing hero section with a large, interactive hexagonal architecture diagram as the central visual element.

```
┌────────────────────────────────────────────────────────────┐
│                    Type-Safe Dependency Injection          │
│                         for TypeScript                     │
│                                                             │
│              ┌──────────┐                                  │
│      UI ────→│          │←──── Logger                      │
│              │  Domain  │                                  │
│    Tests ───→│   Core   │←──── Database                    │
│              │          │                                  │
│      CLI ───→│  (HexDI) │←──── External API                │
│              └──────────┘                                  │
│               ↑  ↑  ↑  ↑                                   │
│            Ports & Adapters                                │
│                                                             │
│        [Get Started]  [View Documentation]                 │
└────────────────────────────────────────────────────────────┘
```

**Interactive Hexagon Features:**

1. **Central Hexagon (Application Core):**
   - Large hexagon in center (300px width on desktop)
   - Gradient: Primary 700 to Primary 500
   - Label: "Domain / Business Logic"
   - Subtle pulse animation

2. **Left Side Ports (Driving/Primary):**
   - 3 ports on left vertices
   - Labels: "UI", "CLI", "Tests"
   - Color: Success Green
   - Animation: Fade in from left
   - Hover: Show tooltip explaining "Driving adapters initiate actions"

3. **Right Side Ports (Driven/Secondary):**
   - 3 ports on right vertices
   - Labels: "Logger", "Database", "External API"
   - Color: Warning Orange
   - Animation: Fade in from right
   - Hover: Show tooltip explaining "Driven adapters are called by domain"

4. **Adapter Connection Animation:**
   - On page load: Adapters "plug in" to ports sequentially
   - Lines connect from adapters to port circles
   - Subtle glow effect on connection
   - Dotted lines show data flow direction

5. **Interactive Behavior:**
   - Hover on hexagon: Highlight all connected ports
   - Click on port: Show code example for that adapter type
   - Hover on connection line: Show dependency flow
   - Respects prefers-reduced-motion

**Technical Specifications:**

```css
.hero-hexagon-diagram {
  width: 100%;
  max-width: 800px;
  height: 500px;
  margin: 48px auto;
  position: relative;
}

.hexagon-core {
  width: 300px;
  height: 300px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: linear-gradient(135deg, var(--primary-700), var(--primary-500));
  animation: pulse 3s ease-in-out infinite;
}

.port-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--ts-500);
  background: white;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.port-circle:hover {
  transform: scale(1.2);
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.5);
}

.adapter-connection {
  stroke: var(--ts-500);
  stroke-width: 2;
  stroke-dasharray: 5, 5;
  animation: dash 20s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

@keyframes dash {
  to {
    stroke-dashoffset: -1000;
  }
}
```

---

### 3. Architecture Diagram Component

**Reusable Hexagon Diagram:**

Create a standardized hexagon diagram component used throughout documentation to show architectural concepts.

**Component Structure:**

```
┌──────────────────────────────────────────────┐
│                                              │
│    Driving Adapters        Driven Adapters  │
│         (UI)                 (Infrastructure)│
│          ↓                        ↑          │
│    ┌──────────┐            ┌──────────┐     │
│    │  Port    │            │  Port    │     │
│    │ (Blue)   │            │ (Blue)   │     │
│    └────┬─────┘            └─────┬────┘     │
│         │                        │          │
│    ┌────▼──────────────────▼────┐           │
│    │   Application Core         │           │
│    │   (Purple Hexagon)         │           │
│    │   Domain Logic              │           │
│    └────────────────────────────┘           │
│                                              │
└──────────────────────────────────────────────┘
```

**Layer Color Coding:**

1. **Core (Inner Hexagon):**
   - Color: Primary 600 (Purple brand color)
   - Represents: Business logic, domain entities
   - Label font: Manrope Bold, 16px

2. **Ports (Edge Interfaces):**
   - Color: TypeScript Blue (TS 500)
   - Represents: createPort, usePort APIs
   - Style: Thin rectangles or circles at edges
   - Label font: Fira Code Medium, 14px

3. **Driving Adapters (Left/Top):**
   - Color: Success Green 500
   - Represents: UI, CLI, Tests (initiators)
   - Icon: Arrow pointing toward core
   - Label: "Primary/Driving"

4. **Driven Adapters (Right/Bottom):**
   - Color: Warning Orange 500
   - Represents: Database, API, Logger (called by core)
   - Icon: Arrow pointing away from core
   - Label: "Secondary/Driven"

**Lifetime Scope Integration:**

When showing services in the diagram, color-code by lifetime:

```css
.adapter-singleton {
  border: 3px solid var(--singleton-600); /* Teal */
  background: var(--singleton-100);
}

.adapter-scoped {
  border: 3px solid var(--scoped-600); /* Amber */
  background: var(--scoped-100);
}

.adapter-request {
  border: 3px solid var(--request-600); /* Purple */
  background: var(--request-100);
}
```

**Responsive Sizing:**

```css
@media (max-width: 768px) {
  .architecture-diagram {
    transform: scale(0.7);
  }
  .diagram-labels {
    font-size: 12px;
  }
}
```

---

### 4. Visual Metaphors Throughout

**Hexagon Shapes Integration:**

Use hexagon shapes as a recurring visual motif throughout the website to reinforce the hexagonal architecture concept.

**1. Section Dividers:**

```css
.section-divider {
  position: relative;
  height: 60px;
  margin: 64px 0;
}

.section-divider::before {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
}
```

**2. Icon Backgrounds:**

Replace circular icon backgrounds with hexagonal ones:

```css
.feature-icon-background {
  width: 64px;
  height: 64px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
  display: flex;
  align-items: center;
  justify-content: center;
}

.feature-icon-background svg {
  width: 32px;
  height: 32px;
  color: white;
}
```

**3. Card Decorations:**

Add subtle hexagon decorations to feature cards:

```css
.feature-card::before {
  content: "";
  position: absolute;
  top: -10px;
  right: -10px;
  width: 80px;
  height: 80px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--primary-100);
  opacity: 0.3;
  z-index: -1;
}
```

**4. Loading Spinners:**

Hexagon-based loading animation:

```css
.loading-hexagon {
  width: 60px;
  height: 60px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
  animation: rotate-hexagon 2s linear infinite;
}

@keyframes rotate-hexagon {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

**5. Background Patterns:**

Subtle hexagon grid pattern for hero sections:

```css
.hero-background {
  position: relative;
  background-color: var(--bg-primary);
}

.hero-background::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 50px,
      var(--primary-100) 50px,
      var(--primary-100) 51px
    ),
    repeating-linear-gradient(
      60deg,
      transparent,
      transparent 50px,
      var(--primary-100) 50px,
      var(--primary-100) 51px
    ),
    repeating-linear-gradient(
      120deg,
      transparent,
      transparent 50px,
      var(--primary-100) 50px,
      var(--primary-100) 51px
    );
  opacity: 0.1;
  z-index: -1;
}
```

**6. Port/Adapter Iconography:**

**Ports (Interface Icons):**

- Visual: Plug/socket icons
- Style: Outlined, 24x24px
- Color: TypeScript Blue
- Usage: In API documentation, port creation examples

```html
<!-- Port icon example -->
<svg class="port-icon" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8" stroke="currentColor" fill="none" />
  <circle cx="12" cy="12" r="4" fill="currentColor" />
</svg>
```

**Adapters (Connector Icons):**

- Visual: Connector/bridge icons
- Style: Filled, 24x24px
- Color: Varies by lifetime scope
- Usage: In adapter creation examples

```html
<!-- Adapter icon example -->
<svg class="adapter-icon" viewBox="0 0 24 24">
  <path d="M4 12 L10 12 L10 8 L14 12 L10 16 L10 12" stroke="currentColor" />
  <path d="M14 12 L20 12" stroke="currentColor" />
</svg>
```

---

### 5. Interactive Elements

**Hexagon Interaction Patterns:**

**1. Hover on Hexagon Vertices:**

```javascript
// Show port descriptions on vertex hover
const vertices = document.querySelectorAll(".hexagon-vertex");

vertices.forEach(vertex => {
  vertex.addEventListener("mouseenter", e => {
    const portName = e.target.dataset.port;
    showTooltip(portName, getPortDescription(portName));
  });
});
```

**Tooltip Styling:**

```css
.port-tooltip {
  position: absolute;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 200px;
  z-index: 1000;
}

.port-tooltip-title {
  font: var(--font-headings);
  font-size: 14px;
  font-weight: 600;
  color: var(--ts-500);
  margin-bottom: 4px;
}

.port-tooltip-description {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}
```

**2. Click to Expand Adapter Details:**

```javascript
// Click handler for adapter cards
document.querySelectorAll(".adapter-card").forEach(card => {
  card.addEventListener("click", e => {
    const adapter = e.currentTarget;
    adapter.classList.toggle("expanded");

    // Animate expansion
    const details = adapter.querySelector(".adapter-details");
    details.style.maxHeight = adapter.classList.contains("expanded")
      ? `${details.scrollHeight}px`
      : "0";
  });
});
```

**Expanded Card Styling:**

```css
.adapter-card {
  transition: all 0.3s ease;
  cursor: pointer;
}

.adapter-card.expanded {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 10;
}

.adapter-details {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.adapter-card.expanded .adapter-details {
  padding-top: 16px;
  border-top: 1px solid var(--border);
  margin-top: 16px;
}
```

**3. Animated Data Flow:**

Visual representation of dependency injection flow:

```css
.dependency-flow-line {
  stroke: var(--ts-500);
  stroke-width: 2;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-line 2s ease-in-out forwards;
}

@keyframes draw-line {
  to {
    stroke-dashoffset: 0;
  }
}

.dependency-flow-particle {
  fill: var(--primary-500);
  animation: flow-particle 3s ease-in-out infinite;
}

@keyframes flow-particle {
  0% {
    opacity: 0;
    offset-distance: 0%;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    offset-distance: 100%;
  }
}
```

---

### 6. Color Meaning in Hexagonal Context

**Extended Color Semantics:**

Map existing color palette to hexagonal architecture concepts:

**1. Inside/Core (Purple - Primary 600):**

- **Represents:** Business logic, domain entities, use cases
- **Usage:**
  - Core hexagon fill
  - Domain model code examples
  - Business rule callouts
- **Example:**
  ```typescript
  // Domain logic (Purple)
  interface UserDomain {
    validateEmail(email: string): boolean;
  }
  ```

**2. Ports (Blue - TypeScript Blue 500):**

- **Represents:** Interfaces, contracts, port definitions
- **Usage:**
  - Port circle borders
  - createPort() API examples
  - Interface definitions
- **Example:**
  ```typescript
  // Port definition (Blue)
  const UserServicePort = createPort<UserService>("UserService");
  ```

**3. Driving Adapters (Green - Success Green 500):**

- **Represents:** UI, CLI, Controllers, Tests (initiators)
- **Usage:**
  - Left-side adapter cards
  - Primary adapter examples
  - User-facing code
- **Example:**
  ```typescript
  // Driving adapter (Green)
  const UserController = createAdapter({
    provides: ControllerPort,
    requires: [UserServicePort],
  });
  ```

**4. Driven Adapters (Orange - Warning Orange 500):**

- **Represents:** Database, APIs, Logger, External services (called by core)
- **Usage:**
  - Right-side adapter cards
  - Infrastructure code examples
  - External integration sections
- **Example:**
  ```typescript
  // Driven adapter (Orange)
  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [],
  });
  ```

**Visual Hierarchy:**

```
Core (Purple) → Most important, business value
  ↓
Ports (Blue) → Contracts, stable interfaces
  ↓
Adapters (Green/Orange) → Implementations, changeable
```

**Color Application in Documentation:**

```css
/* Code block highlights by layer */
.code-layer-core {
  background: rgba(94, 53, 177, 0.1); /* Purple */
  border-left: 4px solid var(--primary-600);
}

.code-layer-port {
  background: rgba(33, 150, 243, 0.1); /* Blue */
  border-left: 4px solid var(--ts-500);
}

.code-layer-driving {
  background: rgba(76, 175, 80, 0.1); /* Green */
  border-left: 4px solid var(--success-500);
}

.code-layer-driven {
  background: rgba(245, 124, 0, 0.1); /* Orange */
  border-left: 4px solid var(--warning-500);
}
```

---

### 7. Documentation Visual Aids

**Context-Aware Mini Hexagons:**

Every documentation page includes a small hexagon showing where the current concept fits in the architecture.

**1. Mini Hexagon Component:**

```
┌─────────────────────────────┐
│  You are here:              │
│                             │
│      ╱──────╲               │
│     ╱   📍   ╲  ← Port      │
│    ╱  Core   ╲              │
│   └──────────┘              │
│                             │
└─────────────────────────────┘
```

**Implementation:**

```html
<div class="context-hexagon">
  <svg viewBox="0 0 200 200" class="mini-hex">
    <!-- Core hexagon -->
    <polygon points="100,20 170,60 170,140 100,180 30,140 30,60" class="hex-core" />

    <!-- Port indicator (highlighted if current page is about ports) -->
    <circle cx="100" cy="20" r="10" class="hex-port active" />

    <!-- Label -->
    <text x="100" y="105" text-anchor="middle" class="hex-label">Ports</text>
  </svg>

  <p class="context-label">
    You're learning about <strong>Ports</strong> - the contract layer between core and adapters
  </p>
</div>
```

**Styling:**

```css
.context-hexagon {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin: 24px 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.mini-hex {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.hex-core {
  fill: var(--primary-100);
  stroke: var(--primary-600);
  stroke-width: 2;
}

.hex-port {
  fill: var(--ts-100);
  stroke: var(--ts-500);
  stroke-width: 2;
}

.hex-port.active {
  fill: var(--ts-500);
  stroke: var(--ts-700);
  stroke-width: 3;
  animation: pulse-port 2s ease-in-out infinite;
}

@keyframes pulse-port {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.context-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.context-label strong {
  color: var(--ts-500);
  font-weight: 600;
}
```

**2. Breadcrumb-Style Hexagon:**

Visual flow showing architectural progression:

```
┌──────────────────────────────────────────────────┐
│  Port → Adapter → Graph → Container → Resolution │
│   ⬢  →   ⬢   →   ⬢   →     ⬢     →      ⬢       │
│  YOU ARE HERE ↑                                   │
└──────────────────────────────────────────────────┘
```

**Implementation:**

```html
<div class="architecture-breadcrumb">
  <div class="arch-step completed">
    <div class="arch-hex"></div>
    <span>Port</span>
  </div>

  <div class="arch-arrow">→</div>

  <div class="arch-step completed">
    <div class="arch-hex"></div>
    <span>Adapter</span>
  </div>

  <div class="arch-arrow">→</div>

  <div class="arch-step active">
    <div class="arch-hex"></div>
    <span>Graph</span>
    <div class="you-are-here">You are here</div>
  </div>

  <div class="arch-arrow">→</div>

  <div class="arch-step">
    <div class="arch-hex"></div>
    <span>Container</span>
  </div>

  <div class="arch-arrow">→</div>

  <div class="arch-step">
    <div class="arch-hex"></div>
    <span>Resolution</span>
  </div>
</div>
```

**Styling:**

```css
.architecture-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: var(--surface);
  border-radius: 12px;
  margin: 32px 0;
  overflow-x: auto;
}

.arch-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.arch-hex {
  width: 40px;
  height: 40px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: var(--border);
  transition: all 0.3s ease;
}

.arch-step.completed .arch-hex {
  background: var(--success-500);
}

.arch-step.active .arch-hex {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-400));
  animation: pulse 2s ease-in-out infinite;
}

.arch-step span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.arch-step.active span {
  color: var(--primary-600);
  font-weight: 600;
}

.arch-arrow {
  font-size: 20px;
  color: var(--border);
  margin: 0 4px;
}

.you-are-here {
  position: absolute;
  top: -24px;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary-600);
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .architecture-breadcrumb {
    justify-content: flex-start;
  }

  .arch-hex {
    width: 32px;
    height: 32px;
  }

  .arch-step span {
    font-size: 11px;
  }
}
```

**3. Concept Location Indicator:**

Small badge showing architectural layer:

```html
<div class="concept-badge badge-port">
  <svg class="badge-icon" viewBox="0 0 20 20">
    <polygon points="10,2 18,6 18,14 10,18 2,14 2,6" />
  </svg>
  <span>Port Layer</span>
</div>
```

```css
.concept-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-port {
  background: var(--ts-100);
  color: var(--ts-700);
}

.badge-core {
  background: var(--primary-100);
  color: var(--primary-700);
}

.badge-driving {
  background: var(--success-100);
  color: var(--success-700);
}

.badge-driven {
  background: var(--warning-100);
  color: var(--warning-700);
}

.badge-icon {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
```

---

### Implementation Priority

**Phase 1: Essential Hexagon Elements**

- [ ] Update logo to hexagon-based design
- [ ] Add hexagon icon backgrounds to feature cards
- [ ] Implement color-coding by architectural layer in code examples
- [ ] Add context hexagon component to documentation pages

**Phase 2: Interactive Hero**

- [ ] Build animated hexagon diagram for homepage hero
- [ ] Implement hover interactions on ports
- [ ] Add data flow animations
- [ ] Make diagram responsive

**Phase 3: Visual Polish**

- [ ] Add hexagon section dividers
- [ ] Implement hexagon loading spinner
- [ ] Add subtle hexagon background patterns
- [ ] Create port/adapter icon set

**Phase 4: Advanced Features**

- [ ] Build architecture breadcrumb component
- [ ] Add expandable adapter detail cards
- [ ] Implement concept location badges
- [ ] Create interactive architecture diagram component

---

### Accessibility Considerations

**Hexagon Visual Elements:**

1. **Ensure Sufficient Contrast:**
   - Hexagon gradients must maintain 4.5:1 contrast ratio
   - Text inside hexagons: White on Primary 600 minimum

2. **Alternative Text:**
   - All hexagon SVGs include `<title>` and `aria-label`
   - Decorative hexagons: `aria-hidden="true"`

3. **Animation Controls:**
   - Respect `prefers-reduced-motion`
   - Provide pause button for continuous animations
   - Ensure static alternatives exist

4. **Keyboard Navigation:**
   - Interactive hexagons focusable via keyboard
   - Clear focus indicators (2px outline)
   - Tooltips accessible via keyboard

```css
@media (prefers-reduced-motion: reduce) {
  .hexagon-core,
  .port-circle,
  .dependency-flow-line {
    animation: none !important;
  }

  .adapter-card {
    transition: none !important;
  }
}
```

---

### Version History

| Version | Date       | Changes                                      |
| ------- | ---------- | -------------------------------------------- |
| 1.1     | 2025-12-15 | Added Hexagonal Architecture visual addendum |

---

**End of Addendum**

_This addendum extends the design specifications with hexagonal architecture visual inspiration. The hexagon motif should be applied thoughtfully throughout the website to reinforce HexDI's architectural principles while maintaining clean, modern aesthetics and excellent user experience._

---

**End of Design Specifications**

_This document provides comprehensive visual design specifications for the HexDI documentation website. All measurements, colors, and specifications should be used as guidelines and can be adjusted during implementation to achieve optimal visual harmony and user experience._

---

## AI-Friendly Design Language

HexDI's explicit, type-safe architecture naturally makes code more comprehensible—not just for AI coding agents, but for all developers. This section outlines how to communicate the AI-friendliness benefit as part of the broader value proposition.

### 1. Key Messaging Pillars

**Primary Headlines (Broader Focus):**

- "Type-Safe Dependency Injection for Modern TypeScript"
- "Explicit Contracts. Compile-Time Safety. Zero Runtime Surprises."
- "Hexagonal Architecture for TypeScript Applications"

**AI-Friendly as Supporting Benefit:**

- Position AI-friendliness as a natural consequence of good architecture
- Use as a secondary tagline: "So clear, even AI understands it"
- Frame as validation of code quality: "If AI can understand it, your team definitely can"

**Value Propositions (Balanced):**

1. **Explicit Contracts** - No hidden dependencies, no magic. Clear for humans, comprehensible for AI agents.
2. **Compile-Time Validation** - Catch errors before runtime. TypeScript's type system ensures correctness.
3. **Self-Documenting Types** - Branded types and type-level programming create code that documents itself.
4. **Deterministic Behavior** - No global state means predictable, testable execution.
5. **Observable Architecture** - DevTools and tracing provide visibility into your dependency graph.
6. **Hexagonal Architecture** - True port-adapter pattern for maintainable, testable applications.

### 2. Visual Elements for AI-Friendliness

**AI Agent Iconography (Subtle Use):**

- Use sparingly, as one feature among many
- Robot/AI assistant icon for AI-specific callouts only
- Avoid overuse that makes it seem like an "AI-only" library

**"AI-Friendly" Badge (Optional):**

```
┌─────────────────────────┐
│ 🤖 AI-FRIENDLY          │
│ Clear for humans & AI   │
└─────────────────────────┘
```

- Use only in dedicated AI section or blog posts
- Badge color: Gradient purple to blue
- Icon: Robot face or AI symbol

**Comparison Diagrams (Focus on Clarity):**
Show before/after comparisons emphasizing developer experience:

- Traditional DI: Implicit dependencies (confusing to everyone)
- HexDI: Explicit contracts (clear to everyone, including AI)

```
BEFORE (Traditional DI):
┌────────────────────────────────┐
│  class UserService {           │
│    constructor() {             │
│      this.db = ServiceLocator  │  ← "Where does this come from?"
│        .get('database');       │  ← "What type is this?"
│    }                           │  ← "Hidden dependency!"
│  }                             │
└────────────────────────────────┘
       ❌ Unclear to developers, AI, and tooling

AFTER (HexDI):
┌────────────────────────────────┐
│  const UserServiceAdapter =    │
│    createAdapter({             │
│      provides: UserServicePort,│  ← Provides UserService
│      requires: [DatabasePort], │  ← Depends on Database
│      lifetime: 'scoped',       │  ← One instance per scope
│      factory: (deps) => ({     │  ← Typed dependencies
│        getUser: (id) =>        │
│          deps.Database.find(id)│
│      })                        │
│    });                         │
└────────────────────────────────┘
       ✅ Crystal clear to everyone
```

### 3. Homepage Section: "Built for Clarity" (Not Just AI)

**Section Layout:**

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    Built for Clarity & Safety                       │
│                                                                     │
│      HexDI brings compile-time validation, explicit contracts,     │
│      and hexagonal architecture to TypeScript applications.        │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ [Icon: Contract] │  │ [Icon: Shield]   │  │ [Icon: Brain]    │ │
│  │                  │  │                  │  │                  │ │
│  │ Explicit         │  │ Compile-Time     │  │ Self-Documenting │ │
│  │ Contracts        │  │ Validation       │  │ Types            │ │
│  │                  │  │                  │  │                  │ │
│  │ Dependencies     │  │ Catch errors     │  │ Branded types    │ │
│  │ declared in      │  │ before runtime   │  │ make the type    │ │
│  │ one place, not   │  │ with TypeScript's│  │ system your      │ │
│  │ scattered.       │  │ type system.     │  │ documentation.   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ [Icon: Hexagon]  │  │ [Icon: Eye]      │  │ [Icon: Zap]      │ │
│  │                  │  │                  │  │                  │ │
│  │ Hexagonal        │  │ Observable       │  │ Zero Runtime     │ │
│  │ Architecture     │  │ Architecture     │  │ Overhead         │ │
│  │                  │  │                  │  │                  │ │
│  │ True port-adapter│  │ DevTools let you │  │ Type-safe with   │ │
│  │ pattern for      │  │ visualize and    │  │ no reflection or │ │
│  │ maintainable     │  │ debug your       │  │ decorators.      │ │
│  │ applications.    │  │ dependency graph.│  │                  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│          Bonus: Works great with AI coding assistants too!          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### 4. Testimonial/Quote Section (Balanced)

**Potential Quotes (mixed benefits):**

```
"HexDI made our codebase so much clearer. Our team onboards faster,
and even AI tools understand the architecture."
— Engineering lead

"Finally, dependency injection that TypeScript can actually validate.
The compile-time errors save us hours."
— Senior developer

"The hexagonal architecture pattern just makes sense with HexDI.
Clear boundaries, testable code, no magic."
— Full-stack developer
```

### 5. llms.txt Integration (Optional Feature Section)

**Feature on documentation (as a bonus, not primary feature):**

- Include in "Developer Experience" or "Tooling" section
- Position as evidence of clarity, not the main feature
- Show how AI agents use this for better comprehension

**Visual:**

```
┌────────────────────────────────────────┐
│  📄 AI-Friendly Documentation          │
│                                        │
│  HexDI provides llms.txt files that    │
│  help AI coding assistants quickly     │
│  understand the library's patterns.    │
│                                        │
│  This is the same clarity your team    │
│  benefits from—just packaged for AI.   │
│                                        │
│  [Learn more about our docs →]         │
└────────────────────────────────────────┘
```

### 6. "Context Engineering" Visual (Frame as Developer Benefit)

Show how HexDI reduces cognitive load for everyone:

```
Traditional Codebase:                    HexDI Codebase:
┌─────────────────────┐                  ┌─────────────────────┐
│ To understand       │                  │ To understand       │
│ UserService:        │                  │ UserService:        │
│                     │                  │                     │
│ • Read 5+ files     │                  │ • Read adapter      │
│ • Trace imports     │       →          │   definition        │
│ • Find injection    │                  │                     │
│ • Guess dependencies│                  │ Dependencies are    │
│ • Hope for the best │                  │ explicit in one     │
│                     │                  │ place               │
│ Cognitive load: HIGH│                  │ Cognitive load: LOW │
└─────────────────────┘                  └─────────────────────┘

Clear for developers. Clear for AI. Clear for everyone.
```

### 7. Color Associations for Key Concepts

| Concept                 | Color         | Hex Code | Usage                      |
| ----------------------- | ------------- | -------- | -------------------------- |
| Explicit                | Green         | #22C55E  | Clarity labels, checkmarks |
| Implicit (anti-pattern) | Red           | #EF4444  | Warnings about hidden deps |
| Compile-time            | Purple        | #8B5CF6  | Type validation indicators |
| Runtime                 | Orange        | #F97316  | Runtime resolution         |
| Ports                   | Blue          | #3B82F6  | Port/contract visuals      |
| Adapters                | Teal          | #14B8A6  | Adapter implementation     |
| AI/Tooling (secondary)  | Electric Blue | #00D4FF  | AI-specific callouts only  |

### 8. Interactive Demo Ideas

**"Clarity Test":**
Show side-by-side:

- Left: Traditional DI code snippet
- Right: HexDI equivalent
- Below: Highlight the explicit vs implicit parts
- Note: "Clearer for humans. Clearer for tools. Clearer for AI."

**"Try It Yourself":**
Provide copy-paste code snippets:

1. "See how explicit the contracts are"
2. "Try breaking the type safety—TypeScript catches it"
3. "Ask your AI assistant what it does—watch it explain perfectly"

### 9. Documentation Callout Boxes

**New callout type: CLARITY-TIP**

```
┌─────────────────────────────────────────────────────────┐
│ 💡 CLARITY TIP                                          │
│                                                         │
│ Always define ports before adapters. This gives you     │
│ (and your tools) the contract first, making             │
│ implementations clearer and more accurate.              │
└─────────────────────────────────────────────────────────┘
```

- Background: Light blue gradient
- Border: Blue (#3B82F6)
- Icon: Lightbulb or clarity symbol

**Optional: AI-specific tips (use sparingly)**

```
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI BONUS                                             │
│                                                         │
│ HexDI's explicit contracts work great with AI coding    │
│ assistants. They can understand your architecture       │
│ without needing to trace through multiple files.        │
└─────────────────────────────────────────────────────────┘
```

### 10. Footer Note (Subtle Mention)

Add to footer (among other features):

```
┌────────────────────────────────────────────────────────┐
│  Type-Safe • Hexagonal Architecture • DevTools         │
│  Zero Runtime Overhead • AI-Friendly                   │
└────────────────────────────────────────────────────────┘
```

### 11. Dedicated AI Section (Blog/Features Page)

For users specifically interested in AI aspects, create a dedicated page or blog post:

**"HexDI and AI Coding Assistants"**

This page can go deeper into:

- How explicit contracts help AI understand code
- Examples of AI-generated HexDI code
- llms.txt integration
- Tips for using Cursor, Claude Code, or Copilot with HexDI

Keep this separate from the main marketing to avoid over-emphasizing AI.

### 12. Messaging Hierarchy

**Primary messaging (80% of content):**

1. Type-safe dependency injection
2. Compile-time validation
3. Hexagonal architecture pattern
4. Explicit contracts
5. Observable architecture

**Secondary messaging (20% of content):** 6. Developer experience 7. DevTools 8. Performance 9. AI-friendly as a bonus

**Avoid:**

- Making AI-friendliness the hero feature
- Implying it's primarily for AI-assisted development
- Overusing AI iconography or terminology

---

**End of AI-Friendly Design Language Addendum**

_This addendum extends the design specifications with AI-friendly messaging and visual elements. These concepts should be integrated thoughtfully as part of HexDI's broader value proposition—positioning AI-friendliness as a natural consequence of clean architecture and explicit contracts, not as the primary selling point._
