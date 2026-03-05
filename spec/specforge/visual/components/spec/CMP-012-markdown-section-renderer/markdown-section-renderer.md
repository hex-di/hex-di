# CMP-012 Markdown Section Renderer

**ID:** CMP-012-markdown-section-renderer
**Context:** Spec view -- renders the specification markdown content with section-level change highlighting and search support.

---

## Overview

The Markdown Section Renderer parses raw markdown content into discrete sections (split at H2 headings) and renders each section with optional change indicators. Sections that have been modified are visually distinguished with a left accent border. A "show changes only" mode hides unchanged sections. Search queries highlight matching text inline.

## ASCII Mockup

````
 Markdown Section Renderer (full width, vertical stack)
 ┌─────────────────────────────────────────────────────────────────┐
 │  padding: 0 24px                                                │
 │                                                                 │
 │  ELM-048 Section Heading + ELM-046 Section (unchanged)          │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  ## Overview                           (display font, 20px) ││
 │  │                                                             ││
 │  │  This module provides authentication   (body font, 14px)   ││
 │  │  services for the application...                            ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  ELM-048 + ELM-046 + ELM-047 Change Indicator (changed)        │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  ▐  ## API Reference                      ELM-047 accent bar  ││
 │  ▐                                        (3px left border)   ││
 │  ▐  The `authenticate` method now         padding-left: 16px  ││
 │  ▐  supports OAuth2 tokens...                                 ││
 │  ▐                                                             ││
 │  ▐  ```typescript                         (mono font, 13px)   ││
 │  ▐  function authenticate(                                    ││
 │  ▐    token: string                                           ││
 │  ▐  ): Result<Session, AuthError>                             ││
 │  ▐  ```                                                       ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 │  ELM-048 + ELM-046 (unchanged)                                  │
 │  ┌─────────────────────────────────────────────────────────────┐│
 │  │  ## Error Handling                                          ││
 │  │                                                             ││
 │  │  Errors follow the tagged-error pattern...                  ││
 │  └─────────────────────────────────────────────────────────────┘│
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘

 Show Changes Only mode (showChangesOnly = true):
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │  ▐  ## API Reference                      (only changed shown) ││
 │  ▐  The `authenticate` method now...                           ││
 │  ▐  ...                                                        ││
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘

 Search highlighting (searchQuery = "OAuth2"):
 ┌─────────────────────────────────────────────────────────────────┐
 │  ▐  ## API Reference                                           ││
 │  ▐  The `authenticate` method now                              ││
 │  ▐  supports [OAuth2] tokens...          highlight background  ││
 └─────────────────────────────────────────────────────────────────┘
````

## Section Parsing

The raw markdown `content` string is split into sections at each **H2 heading** (`##`). Each section comprises:

1. The H2 heading line (rendered via ELM-048-section-heading)
2. All content lines until the next H2 heading or end of content

Sections are identified by a slugified version of the heading text (e.g., "API Reference" becomes `api-reference`).

## Layout

| Property       | Value  | Notes                            |
| -------------- | ------ | -------------------------------- |
| display        | flex   | Vertical stack of sections       |
| flex-direction | column | Sections flow top to bottom      |
| width          | 100%   | Full width of spec view          |
| gap            | 0      | Sections are visually continuous |
| padding        | 0 24px | Horizontal padding only          |

## Change Indicator (ELM-047)

Sections whose heading ID appears in the `changedSections` array receive a left accent border indicating modification.

| Property     | Value                        |
| ------------ | ---------------------------- |
| Border left  | 3px solid `var(--sf-accent)` |
| Padding left | 16px                         |
| Position     | Left edge of section         |

Unchanged sections have no left border and standard padding.

## Show Changes Only Mode

When `showChangesOnly` is `true`, only sections whose heading ID appears in `changedSections` are rendered. All other sections are hidden. This focuses the reader on what has been modified.

## Search Highlighting

When `searchQuery` is non-empty, all occurrences of the query string within rendered content are wrapped in a highlight span:

| Property      | Value                    |
| ------------- | ------------------------ |
| Background    | `rgba(0, 240, 255, 0.2)` |
| Border radius | 2px                      |

Search is case-insensitive. Highlighting applies to both headings and body text. Code blocks are also searched.

## Typography

### Headings

| Level | Font Family         | Size | Color       |
| ----- | ------------------- | ---- | ----------- |
| H2    | `--sf-font-display` | 20px | `--sf-text` |
| H3    | `--sf-font-display` | 16px | `--sf-text` |
| H4    | `--sf-font-display` | 14px | `--sf-text` |

### Body Text

| Property    | Value            |
| ----------- | ---------------- |
| Font family | `--sf-font-body` |
| Font size   | 14px             |
| Line height | 1.6              |
| Color       | `--sf-text`      |

### Code Blocks

| Property      | Value                   |
| ------------- | ----------------------- |
| Font family   | `--sf-font-mono`        |
| Font size     | 13px                    |
| Background    | `var(--sf-surface-alt)` |
| Border radius | 4px                     |
| Padding       | 12px 16px               |

## Children

| Element                          | Role                                     |
| -------------------------------- | ---------------------------------------- |
| ELM-046-markdown-section         | Container for a single section's content |
| ELM-047-section-change-indicator | Left accent border on changed sections   |
| ELM-048-section-heading          | H2 heading for each section              |

## Store Bindings

| Store                      | Selector               | Component Prop    |
| -------------------------- | ---------------------- | ----------------- |
| STR-006 spec-content-store | `content`              | `content`         |
| STR-006 spec-content-store | `changedSections`      | `changedSections` |
| STR-001 filter-store       | `spec.showChangesOnly` | `showChangesOnly` |
| STR-001 filter-store       | `spec.search`          | `searchQuery`     |

## Token Usage

| Token               | Usage                        |
| ------------------- | ---------------------------- |
| `--sf-text`         | Heading and body text color  |
| `--sf-text-muted`   | Section separator (if any)   |
| `--sf-accent`       | Change indicator left border |
| `--sf-surface-alt`  | Code block background        |
| `--sf-font-display` | Heading font family          |
| `--sf-font-body`    | Body text font family        |
| `--sf-font-mono`    | Code block font family       |

## Cross-References

- **Store:** STR-006-spec-content-store (content and change data)
- **Store:** STR-001-filter-store (show changes only, search query)
- **Element:** ELM-046-markdown-section (section container)
- **Element:** ELM-047-section-change-indicator (change border)
- **Element:** ELM-048-section-heading (section heading)
