# Result Design Inspirations — Index

4 design explorations for the `@hex-di/result` documentation website at `result.hexdi.dev`. All share a unified dark design system documented in [`design-system.md`](./design-system.md).

**Key reference files:**

- [`design-system.md`](./design-system.md) — all shared CSS tokens, color palette, typography, components, animations
- Each individual doc has a collapsible `HTML Starter Boilerplate` section with the exact layout shell for that variant

---

## Quick Reference

| File                                                    | Type    | Layout                      | Unique Features                                                              |
| ------------------------------------------------------- | ------- | --------------------------- | ---------------------------------------------------------------------------- |
| [01-landing-clean](./01-landing-clean.md)               | Landing | Vertical scroll, 3 sections | Minimal baseline — centered hero, 6-card features, ecosystem CTA             |
| [02-landing-railway](./02-landing-railway.md)           | Landing | Vertical scroll, 5 sections | Railway track SVG in hero, code example section, before/after comparison     |
| [03-landing-api-showcase](./03-landing-api-showcase.md) | Landing | Vertical scroll, 6 sections | API-first — code cards for constructors, chaining, combinators, async+option |
| [04-landing-tactical](./04-landing-tactical.md)         | Landing | Vertical scroll, 5 sections | HUD aesthetic — corner brackets, grid bg, floating 3D card, scanline overlay |

---

## Design System

**[design-system.md](./design-system.md)** — Complete shared design tokens:

- Color palette (lime `#A6E22E` accent on `#020408` dark)
- Typography scale (Rajdhani / Inter / Fira Code)
- Feature card spec
- CTA button variants (primary + outline)
- Install command box
- Mono label pattern
- Animation definitions (`fade-in-up`, stagger timing)
- Scrollbar styling
- Navbar and footer conventions

---

## Variant Comparison

| Feature         | 01 Clean         | 02 Railway          | 03 API       | 04 Tactical              |
| --------------- | ---------------- | ------------------- | ------------ | ------------------------ |
| Hero visual     | None (text only) | Railway SVG diagram | Code window  | Floating HUD card        |
| Code examples   | None             | 1 pipeline block    | 12 API cards | 1 terminal window        |
| Comparison      | None             | Before/After        | None         | Red HUD vs Lime HUD      |
| Corner brackets | No               | No                  | No           | Yes (full HUD style)     |
| Grid background | No               | No                  | No           | Yes (40px, 0.03 opacity) |
| SVG animation   | No               | Path draw-in + dot  | No           | Float 3D tilt            |
| Sections        | 3                | 5                   | 6            | 5                        |
| Complexity      | Low              | Medium              | Medium       | High                     |

---

## Color Identity

| Token      | Value                | vs Core HexDI               |
| ---------- | -------------------- | --------------------------- |
| Accent     | `#A6E22E` (lime)     | Replaces `#00F0FF` (cyan)   |
| Err color  | `#F92672` (pink/red) | Replaces `#FF5E00` (orange) |
| Background | `#020408`            | Same                        |
| Surface    | `#08101C`            | Same                        |

---

## Recommended Starting Point

- **For a quick MVP:** Start with **01 (Clean)** — minimal effort, professional look
- **For visual storytelling:** Use **02 (Railway)** — the SVG metaphor explains the library instantly
- **For developer conversion:** Use **03 (API Showcase)** — code-first, shows full API surface
- **For brand consistency with core HexDI:** Use **04 (Tactical)** — carries forward the HUD language
