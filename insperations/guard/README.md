# Guard Design Inspirations — Index

4 design explorations for the `@hex-di/guard` documentation website at `guard.hexdi.dev`. All share a unified dark design system documented in [`design-system.md`](./design-system.md).

**Key reference files:**

- [`design-system.md`](./design-system.md) — all shared CSS tokens, color palette, typography, components, animations
- [`logo-shield.svg`](./logo-shield.svg) — amber shield logo (navbar, hero, favicon)
- Each individual doc has a collapsible `HTML Starter Boilerplate` section with the exact layout shell for that variant

---

## Quick Reference

| File                                                    | Type    | Layout                      | Unique Features                                                                            |
| ------------------------------------------------------- | ------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| [01-landing-clean](./01-landing-clean.md)               | Landing | Vertical scroll, 3 sections | Minimal baseline — centered hero, 6-card features, ecosystem CTA                           |
| [02-landing-policy-tree](./02-landing-policy-tree.md)   | Landing | Vertical scroll, 5 sections | Policy composition tree SVG in hero, code example section, before/after comparison         |
| [03-landing-api-showcase](./03-landing-api-showcase.md) | Landing | Vertical scroll, 6 sections | API-first — 10 policy kind code cards, composition, evaluation trace, React integration    |
| [04-landing-tactical](./04-landing-tactical.md)         | Landing | Vertical scroll, 5 sections | HUD aesthetic — corner brackets, grid bg, floating evaluation trace card, scanline overlay |

---

## Design System

**[design-system.md](./design-system.md)** — Complete shared design tokens:

- Color palette (amber `#F59E0B` accent on `#020408` dark, red `#EF4444` for deny)
- Typography scale (Rajdhani / Inter / Fira Code)
- Feature card spec
- CTA button variants (primary + outline)
- Install command box
- Mono label pattern
- Policy badge + Decision badges (allow/deny)
- Animation definitions (`fade-in-up`, stagger timing)
- Scrollbar styling
- Navbar and footer conventions

---

## Variant Comparison

| Feature         | 01 Clean         | 02 Policy Tree                  | 03 API                           | 04 Tactical              |
| --------------- | ---------------- | ------------------------------- | -------------------------------- | ------------------------ |
| Hero visual     | None (text only) | Policy tree SVG diagram         | Code window                      | Floating HUD card        |
| Code examples   | None             | 1 composition block             | 10 policy cards + 3 large blocks | 1 terminal window        |
| Comparison      | None             | Before/After                    | None                             | Red HUD vs Amber HUD     |
| Corner brackets | No               | No                              | No                               | Yes (full HUD style)     |
| Grid background | No               | No                              | No                               | Yes (40px, 0.03 opacity) |
| SVG animation   | No               | Tree draw-in + glow propagation | No                               | Float 3D tilt            |
| Sections        | 3                | 5                               | 6                                | 5                        |
| Complexity      | Low              | Medium                          | Medium                           | High                     |

---

## Color Identity

| Token      | Value                  | vs Core HexDI               | vs Result                     |
| ---------- | ---------------------- | --------------------------- | ----------------------------- |
| Accent     | `#F59E0B` (amber)      | Replaces `#00F0FF` (cyan)   | Replaces `#A6E22E` (lime)     |
| Secondary  | `#EF4444` (red — deny) | Replaces `#FF5E00` (orange) | Replaces `#F92672` (pink/red) |
| Allow      | `#22C55E` (green)      | N/A                         | N/A                           |
| Background | `#020408`              | Same                        | Same                          |
| Surface    | `#08101C`              | Same                        | Same                          |

---

## Guard Concepts Coverage

| Concept                      | 01 Clean     | 02 Policy Tree         | 03 API                      | 04 Tactical            |
| ---------------------------- | ------------ | ---------------------- | --------------------------- | ---------------------- |
| Permission tokens            | Feature card | Feature card           | Dedicated card              | Feature card           |
| Role DAG inheritance         | Feature card | Feature card           | Feature card                | Feature card           |
| 10 policy kinds              | Feature card | Feature card           | **Full section (10 cards)** | Feature card           |
| Policy composition           | —            | **SVG + code example** | **Composition section**     | Code preview           |
| Evaluation / Decision traces | Feature card | —                      | **Evaluation section**      | **HUD card visual**    |
| GxP / audit trails           | Feature card | Feature card           | Feature card                | Feature card           |
| React integration            | —            | —                      | **React section**           | —                      |
| Before/After comparison      | —            | **Comparison section** | —                           | **Comparison section** |

---

## Recommended Starting Point

- **For a quick MVP:** Start with **01 (Clean)** — minimal effort, professional look
- **For visual storytelling:** Use **02 (Policy Tree)** — the SVG metaphor explains policy composition instantly
- **For developer conversion:** Use **03 (API Showcase)** — code-first, shows all 10 policy kinds
- **For brand consistency with core HexDI:** Use **04 (Tactical)** — carries forward the HUD language
