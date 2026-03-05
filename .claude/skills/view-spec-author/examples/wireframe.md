# Search App

> wireframe | `WF-search-app`

## Page List

| Page | ID        | Route | Description                           |
| ---- | --------- | ----- | ------------------------------------- |
| Home | `PG-home` | `/`   | Landing page with header + search bar |

## Desktop Wireframe (>= 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│ VIEWPORT: 1024px+                                                │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ HEADER (CMP-header)                          height: 64px   │ │
│ │                                                              │ │
│ │  ┌────────────┐                                              │ │
│ │  │  LOGO      │                                              │ │
│ │  │  120x40    │                                              │ │
│ │  └────────────┘                                              │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│                        (vertical center)                         │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ SEARCH BAR (CMP-search-bar)           max-width: 584px      │ │
│ │                                       margin: 0 auto        │ │
│ │  ┌──────────────────────────────────────────┐ ┌───────────┐ │ │
│ │  │ Search Input (ELM-search-input)          │ │  Search   │ │ │
│ │  │ placeholder: "Type to search..."         │ │  Button   │ │ │
│ │  └──────────────────────────────────────────┘ └───────────┘ │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Tablet Wireframe (768px - 1023px)

```
┌──────────────────────────────────────────────┐
│ VIEWPORT: 768px - 1023px                      │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ HEADER                      height: 56px  │ │
│ │  ┌────────────┐                           │ │
│ │  │  LOGO      │                           │ │
│ │  └────────────┘                           │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│                  (center)                     │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ SEARCH BAR            max-width: 100%     │ │
│ │                       padding: 0 24px     │ │
│ │  ┌────────────────────────────┐ ┌───────┐ │ │
│ │  │ Search Input               │ │Search │ │ │
│ │  └────────────────────────────┘ └───────┘ │ │
│ └───────────────────────────────────────────┘ │
│                                               │
└──────────────────────────────────────────────┘
```

## Mobile Wireframe (<= 767px)

```
┌────────────────────────────┐
│ VIEWPORT: <= 767px          │
│                             │
│ ┌─────────────────────────┐ │
│ │ HEADER       h: 48px    │ │
│ │  ┌──────────┐           │ │
│ │  │  LOGO    │           │ │
│ │  └──────────┘           │ │
│ └─────────────────────────┘ │
│                             │
│         (center)            │
│                             │
│ ┌─────────────────────────┐ │
│ │ SEARCH BAR              │ │
│ │  width: 100%            │ │
│ │  padding: 0 16px        │ │
│ │                         │ │
│ │  ┌───────────────────┐  │ │
│ │  │ Search Input      │  │ │
│ │  └───────────────────┘  │ │
│ │  ┌───────────────────┐  │ │
│ │  │  Search Button    │  │ │
│ │  └───────────────────┘  │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
└────────────────────────────┘
```

Note: On mobile the search input and button stack vertically.

## Design Rationale

### Color Palette

| Token        | Value     | Usage                                      |
| ------------ | --------- | ------------------------------------------ |
| `primary`    | `#1A73E8` | Interactive elements, focus rings, CTA     |
| `secondary`  | `#34A853` | Success states, positive feedback          |
| `background` | `#FFFFFF` | Page background                            |
| `surface`    | `#F8F9FA` | Card/container backgrounds, loading states |
| `text`       | `#202124` | Primary body text                          |
| `error`      | `#D93025` | Validation errors, destructive states      |

The palette follows Material Design conventions for familiarity. High contrast
between `text` and `background` (ratio > 15:1) ensures WCAG AAA compliance for
body text. The `primary` blue is the dominant action color, used sparingly to
draw attention to interactive affordances.

### Typography

| Property      | Value                          |
| ------------- | ------------------------------ |
| `font-family` | `Inter, system-ui, sans-serif` |
| `base-size`   | `16px`                         |

Inter was chosen for its high x-height and open apertures, which improve
readability at small sizes on screens. The system-ui fallback ensures near-zero
layout shift on platforms where Inter has not loaded. The 16px base prevents
browser zoom issues on mobile (iOS auto-zooms inputs below 16px).

### Layout Strategy

Single-column centered layout keeps the user focused on one task: searching.
The search bar is horizontally centered and vertically offset toward the upper
third of the viewport (visual center) following the Gutenberg diagram reading
pattern. On mobile, the input and button stack vertically to prevent cramped
touch targets.

## Component Hierarchy

```
WF-search-app
 └─ PG-home
     ├─ CMP-header
     │   └─ ELM-logo
     └─ CMP-search-bar
         ├─ ELM-search-input
         └─ ELM-search-button
```

## Data Flow Overview

```
  User Interaction          Action              Event               Store
  ─────────────────    ──────────────     ─────────────────    ─────────────
  Logo click       --> ACT-navigate   --> EVT-route-changed --> STR-router-store
  Input submit     --> ACT-submit-    --> EVT-search-       --> STR-search-store
  Button click         search             submitted
```
