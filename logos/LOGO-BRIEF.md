# HexDI Logo Design Brief

## Brand Context

**Project:** HexDI - A type-safe dependency injection framework for TypeScript built on hexagonal architecture principles.

**Design Language:** Dark cyberpunk/tactical HUD aesthetic. The visual identity draws from fighter-jet heads-up displays, sci-fi terminal interfaces, and precision engineering. The overall feeling is: _precise, structural, glowing, minimal, and engineered_.

**Core Visual DNA (from 18 inspiration files):**

- **Primary color:** `#00F0FF` (cyan) - borders, accents, glows
- **Secondary accent:** `#FF5E00` (orange) - CTAs, warnings, energy
- **Background:** `#020408` (near-black) - logos should work on dark backgrounds
- **Typography spirit:** Rajdhani (display), Fira Code (mono) - angular, uppercase, tracked
- **Motifs:** Hexagons, corner brackets (HUD frames), glowing edges, grid patterns, scan lines, circuit-like connections, dot nodes on vertices

**Logo Requirements (all packages):**

- SVG format, 200x200 viewBox
- Single-color friendly (must work as monochrome)
- Must be recognizable at 32x32 (favicon size)
- No text in the logo - symbol/icon only
- Clean geometry - no gradients, no photorealism
- Should feel like part of a cohesive family while being individually distinct
- The hexagon is the unifying shape across the family (used differently per logo)

**Family Cohesion Rules:**

- Every logo incorporates a hexagonal element (outline, filled, partial, tessellated)
- Consistent stroke weight: 4-8px range
- Consistent node/dot size: 8-12px radius
- Corner bracket motif (`::before`/`::after` HUD corners) can appear as logo frame elements
- Each package gets a signature color for its filled/accent elements

## Color Family Overview

| Package                    | Primary Color           | Hex Code              | Meaning             |
| -------------------------- | ----------------------- | --------------------- | ------------------- |
| `hex-di`                   | Violet                  | `#6D28D9`             | Brand identity      |
| `@hex-di/result`           | Emerald + Orange        | `#10B981` + `#F97316` | Ok/Err duality      |
| `@hex-di/result-testing`   | Emerald + Orange + Cyan | +`#00F0FF`            | Result + inspection |
| `@hex-di/result-react`     | Emerald + Orange + Sky  | +`#0EA5E9`            | Result + React      |
| `@hex-di/core`             | Royal Blue              | `#1D4ED8`             | Foundation          |
| `@hex-di/graph`            | Teal                    | `#0D9488`             | Validation          |
| `@hex-di/runtime`          | Violet                  | `#7C3AED`             | Execution           |
| `@hex-di/testing`          | Amber                   | `#EAB308`             | Testing             |
| `@hex-di/react`            | Sky Blue                | `#0EA5E9`             | React integration   |
| `@hex-di/guard`            | Red                     | `#DC2626`             | Security            |
| `@hex-di/guard-testing`    | Red + Amber             | `#DC2626` + `#EAB308` | Guard + Testing     |
| `@hex-di/guard-react`      | Red + Sky Blue          | `#DC2626` + `#0EA5E9` | Guard + React       |
| `@hex-di/guard-validation` | Violet                  | `#7C3AED`             | Governance          |

## Visual Relationships

```
Standalone identities:
  hex-di ........... hexagon + entering dot (violet)
  core ............. circuit-board hexagon with 6 port nodes (blue)
  graph ............ hex frame + internal DAG + checkmark (teal)
  runtime .......... hex frame + curly braces + center dot (violet)
  result ........... split hexagon: green check / orange X
  guard ............ shield-hexagon + keyhole (red)
  testing .......... dashed-hex + swap motif (amber)
  react ............ filled hex nucleus + orbital rings (sky blue)

Derived (parent + modifier):
  result-testing ... result + cyan inspection lens
  result-react ..... result + orbital rings
  guard-testing .... guard shield + dashed + crosshair
  guard-react ...... guard shield + orbital rings
  guard-validation . double-hex seal + checkmark certificate
```

## Technical Specifications

- **Format:** SVG with `viewBox="0 0 200 200"` and `width="200" height="200"`
- **Stroke caps:** `stroke-linecap="round"` and `stroke-linejoin="round"` throughout
- **No gradients, no filters, no shadows** - pure geometry only
- **Maximum elements:** Keep under 15 SVG elements per logo for clarity
- **Accessibility:** Each SVG should have a descriptive comment as the first child element
- **File naming:** `{package-short-name}.svg` (e.g., `core.svg`, `result.svg`, `guard-react.svg`)

## Individual Briefs

Each package has its own detailed brief file:

| File                                                     | Package                    |
| -------------------------------------------------------- | -------------------------- |
| [hex-di.brief.md](./hex-di.brief.md)                     | `hex-di` (umbrella)        |
| [core.brief.md](./core.brief.md)                         | `@hex-di/core`             |
| [graph.brief.md](./graph.brief.md)                       | `@hex-di/graph`            |
| [runtime.brief.md](./runtime.brief.md)                   | `@hex-di/runtime`          |
| [result.brief.md](./result.brief.md)                     | `@hex-di/result`           |
| [result-testing.brief.md](./result-testing.brief.md)     | `@hex-di/result-testing`   |
| [result-react.brief.md](./result-react.brief.md)         | `@hex-di/result-react`     |
| [testing.brief.md](./testing.brief.md)                   | `@hex-di/testing`          |
| [react.brief.md](./react.brief.md)                       | `@hex-di/react`            |
| [guard.brief.md](./guard.brief.md)                       | `@hex-di/guard`            |
| [guard-testing.brief.md](./guard-testing.brief.md)       | `@hex-di/guard-testing`    |
| [guard-react.brief.md](./guard-react.brief.md)           | `@hex-di/guard-react`      |
| [guard-validation.brief.md](./guard-validation.brief.md) | `@hex-di/guard-validation` |
