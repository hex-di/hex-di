# Result Presentation - Design System

## Sanofi Brand Integration

The presentation adopts Sanofi's visual identity as its foundation. The design should feel native to Sanofi's internal tools while having the polish of a conference talk.

---

## Color Palette

### Primary - Sanofi Purple

| Token            | Hex       | Usage                                                                     |
| ---------------- | --------- | ------------------------------------------------------------------------- |
| `brand-base`     | `#7A00E6` | Primary actions, links, highlighted code keywords, active slide indicator |
| `brand-light`    | `#B3A8E6` | Hover states, secondary text on dark backgrounds                          |
| `brand-lighter`  | `#8966DB` | Focus rings, code selection highlight                                     |
| `brand-dark`     | `#3C217B` | Slide backgrounds (dark theme), header bars                               |
| `brand-darker`   | `#5718B0` | Emphasized text on dark backgrounds                                       |
| `brand-darkest`  | `#23004C` | Deep background for code blocks on dark slides                            |
| `brand-lightest` | `#FAF5FF` | Light slide backgrounds, card surfaces                                    |

### Neutral Scale

| Token           | Hex       | Usage                                   |
| --------------- | --------- | --------------------------------------- |
| `neutral-white` | `#FFFFFF` | Text on dark backgrounds, card surfaces |
| `neutral-50`    | `#F5F5F5` | Light slide background alternative      |
| `neutral-100`   | `#E4E4E4` | Dividers, borders                       |
| `neutral-200`   | `#C9C9C9` | Disabled text                           |
| `neutral-300`   | `#AEAEAE` | Placeholder text, muted annotations     |
| `neutral-500`   | `#757575` | Secondary text on light backgrounds     |
| `neutral-700`   | `#434343` | Body text on light backgrounds          |
| `neutral-900`   | `#171717` | Primary text on light backgrounds       |
| `neutral-black` | `#000000` | Maximum contrast text                   |

### Semantic Colors

| Role         | Base      | Light     | Dark      | Usage                                             |
| ------------ | --------- | --------- | --------- | ------------------------------------------------- |
| Success (Ok) | `#079455` | `#47CD89` | `#074D31` | Ok results, success states, "after" code          |
| Error (Err)  | `#D72B3F` | `#F97066` | `#912018` | Err results, error states, "before" code problems |
| Info         | `#1570EF` | `#53B1FD` | `#194185` | Informational callouts, type annotations          |
| Warning      | `#EE7404` | `#FDB022` | `#93370D` | Caution notes, deprecation warnings               |

### Code Theme Colors

The code blocks use a custom theme derived from the brand palette:

| Element             | Light Theme               | Dark Theme                  |
| ------------------- | ------------------------- | --------------------------- |
| Background          | `#FAF5FF`                 | `#23004C`                   |
| Text                | `#171717`                 | `#E4E4E4`                   |
| Keywords            | `#7A00E6`                 | `#B3A8E6`                   |
| Strings             | `#079455`                 | `#47CD89`                   |
| Types               | `#1570EF`                 | `#53B1FD`                   |
| Errors/Tags         | `#D72B3F`                 | `#F97066`                   |
| Comments            | `#757575`                 | `#AEAEAE`                   |
| Functions           | `#5718B0`                 | `#8966DB`                   |
| Numbers             | `#EE7404`                 | `#FDB022`                   |
| Line numbers        | `#C9C9C9`                 | `#434343`                   |
| Highlight line bg   | `rgba(122, 0, 230, 0.08)` | `rgba(179, 168, 230, 0.12)` |
| Error annotation bg | `rgba(215, 43, 63, 0.08)` | `rgba(249, 112, 102, 0.12)` |
| Ok annotation bg    | `rgba(7, 148, 85, 0.08)`  | `rgba(71, 205, 137, 0.12)`  |

---

## Typography

### Font Stack

```css
/* Primary - for all text */
font-family: "Sanofi Sans", "Work Sans", "Raleway", "Roboto", sans-serif;

/* Code blocks */
font-family: "JetBrains Mono", "Fira Code", "Source Code Pro", monospace;
```

Since Sanofi Sans is proprietary and may not be available, the presentation should:

1. Attempt to load Sanofi Sans from local fonts or CDN if available
2. Fall back gracefully to Work Sans (Google Fonts) which has similar proportions

### Type Scale

| Role               | Size               | Weight | Line Height |
| ------------------ | ------------------ | ------ | ----------- |
| Slide title (H1)   | `3rem` (48px)      | 700    | 1.1         |
| Section title (H2) | `2rem` (32px)      | 700    | 1.2         |
| Subtitle           | `1.25rem` (20px)   | 400    | 1.4         |
| Body text          | `1.125rem` (18px)  | 400    | 1.5         |
| Code               | `0.9375rem` (15px) | 400    | 1.6         |
| Annotation         | `0.875rem` (14px)  | 400    | 1.4         |
| Caption / Small    | `0.75rem` (12px)   | 400    | 1.4         |

### Emphasis Conventions

- **Bold** for key terms on first introduction
- `code` for API names, types, and variable names inline
- _Italic_ sparingly, for asides and annotations
- ALL CAPS never used except in code (type names)

---

## Layout System

### Slide Container

- Full viewport width and height (`100vw x 100vh`)
- Content area: max-width `1200px`, centered horizontally
- Vertical padding: `64px` top, `48px` bottom
- Horizontal padding: `80px` on each side
- All content left-aligned (no centered paragraphs)

### Slide Types

**1. Title Slide**

- Title vertically centered
- Subtitle below, lighter weight
- Background: gradient from `brand-dark` to `brand-darkest`
- Text: white

**2. Content Slide**

- Title at top
- Content below with `24px` gap
- Background: `brand-lightest` or `neutral-white`
- Text: `neutral-900`

**3. Code Slide**

- Title at top (shorter)
- Code block fills most of the slide
- Optional annotation bar below code
- Background: `neutral-white`
- Code block: dark theme by default

**4. Split Slide (Before/After)**

- Title at top
- Two columns: left (before, red tint), right (after, green tint)
- Each column has its own code block
- Divider: vertical line at center, `neutral-200`
- Labels: "BEFORE" in error red, "AFTER" in success green

**5. Diagram Slide**

- Title at top
- SVG or Canvas diagram centered
- Minimal text, diagram does the talking
- Background: white

**6. Quote/Impact Slide**

- Large text, centered vertically
- Background: `brand-dark` gradient
- Text: white, `2rem`
- Used for key takeaway lines

### Navigation

- Bottom bar: thin line of progress dots
- Current slide: `brand-base` filled circle
- Other slides: `neutral-300` circle outline
- Keyboard: Left/Right arrows, Space for next
- No visible next/prev buttons (keyboard-driven like a real presentation)

### Transitions

- Slide transitions: subtle horizontal slide (200ms ease-out)
- Code highlights: fade in annotation (300ms)
- Element reveals: slide up with fade (250ms, staggered 50ms per item)
- No bouncing, no spinning, no gratuitous animation

---

## Component Library

### Code Block

```
+--------------------------------------------------+
| filename.ts                           [copy] [run]|
|--------------------------------------------------|
|  1 | import { ok, err } from '@hex-di/result'    |
|  2 |                                              |
|  3 | const result = ok(42)                        |
|  4 | //            ^^^^ Ok<number, never>         |
+--------------------------------------------------+
```

- Syntax highlighting per code theme above
- Line numbers: subdued color
- File name tab at top left
- Optional action buttons at top right (copy, run)
- Highlighted lines: subtle background color shift
- Error annotations: inline, red tint
- Ok annotations: inline, green tint
- Type annotations: inline, blue, italic (shown as comments or hover tooltips)

### Annotation Callout

```
+--------------------------------------------------+
|  !  Three different failure modes. One response:  |
|     null. Good luck debugging at 2 AM.           |
+--------------------------------------------------+
```

- Left border: 3px solid, color depends on type (error/info/warning)
- Background: semantic light color at 8% opacity
- Icon: small circle with symbol (!, i, warning triangle)
- Text: `0.875rem`, `neutral-700`

### Before/After Comparison

- Two code blocks side by side
- Left header: "BEFORE" badge in `error-base` color
- Right header: "AFTER" badge in `success-base` color
- Matching line numbers where possible
- Connecting arrows for transformed sections (optional)

### Slide Progress Indicator

- Fixed bottom bar, `48px` height
- Dots for each slide, grouped by act
- Act labels: subtle text above dot groups
- Current slide number: `slide / total` at far right
- Keyboard shortcut hints at far left (arrows icon)

---

## Responsive Behavior

The presentation is designed for **projection/screen sharing** (16:9 ratio) but should degrade gracefully:

- **1920x1080 (Full HD)**: Ideal - all content visible
- **1440x900 (Laptop)**: Code blocks may reduce font size to `14px`
- **1280x720 (720p)**: Reduce padding, smaller type scale
- **Mobile**: Not a priority, but navigation should work (swipe)

---

## Accessibility

- Color is never the only indicator (icons + labels + color)
- Code annotations include text, not just color highlights
- All interactive elements keyboard-accessible
- Slide content readable at 200% zoom
- Contrast ratios meet WCAG AA for all text
- Reduced motion: instant transitions when `prefers-reduced-motion` is set

---

## Dark/Light Mode

The presentation supports both but defaults to **mixed mode**:

- Title and impact slides: dark background (brand purple)
- Content and code slides: light background (white/lightest)
- Configurable via keyboard shortcut (`D` to toggle)
- Code blocks always use dark theme regardless of slide background
