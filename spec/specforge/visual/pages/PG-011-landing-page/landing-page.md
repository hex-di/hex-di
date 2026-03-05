# PG-011 Landing Page

**ID:** PG-011-landing-page
**Route:** `/`
**Layout:** full-bleed
**Context:** Marketing landing page for SpecForge. Standalone, bypasses the app shell.

---

## Overview

The Landing Page is a standalone marketing page for SpecForge that does not render within the app shell (PG-010). It uses a dark cyberpunk aesthetic with a full-bleed scrollable layout. The page consists of seven vertically stacked sections: Hero, Features, How It Works, CLI Demo, Pricing, CTA, and Footer. No authentication or session is required.

The page is fully static content with animated elements (hero hexagon grid, typing terminal animation). It is responsive across desktop, tablet, and mobile viewports.

---

## ASCII Wireframe

```
 Landing Page (full-bleed, 100vw, scrollable)
 bg: #020408
 ┌══════════════════════════════════════════════════════════════════════════════════┐
 ║                                                                                  ║
 ║  SECTION 1: Hero (CMP-023-hero-section)                                         ║
 ║  min-height: 100vh                                                              ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │           ~~~ animated hexagon grid background ~~~                           │║
 ║  │                                                                              │║
 ║  │                                                                              │║
 ║  │                   AI-Powered Specification                                   │║
 ║  │                        Authoring                                             │║
 ║  │                                                                              │║
 ║  │              Rajdhani 48px, gradient accent text                             │║
 ║  │                                                                              │║
 ║  │             Multi-agent collaboration for                                    │║
 ║  │           production-grade software specs                                    │║
 ║  │                                                                              │║
 ║  │              Inter 20px, muted text                                          │║
 ║  │                                                                              │║
 ║  │           [Get Started]   [View Documentation]                               │║
 ║  │            accent bg        ghost/accent                                     │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ║══════════════════════════════════════════════════════════════════════════════════║
 ║                                                                                  ║
 ║  SECTION 2: Features (CMP-024-feature-grid)                                     ║
 ║  padding: 80px 24px                                                             ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │  Section Title: "Why SpecForge?"                                             │║
 ║  │  Rajdhani 32px, --sf-text                                                    │║
 ║  │                                                                              │║
 ║  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │║
 ║  │  │  [pipeline icon] │  │  [graph icon]    │  │  [convo icon]    │           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  │  Multi-Agent     │  │  Knowledge       │  │  Discovery       │           │║
 ║  │  │  Pipeline        │  │  Graph           │  │  Conversations   │           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  │  Orchestrate     │  │  Build and       │  │  AI-guided       │           │║
 ║  │  │  specialized AI  │  │  traverse a      │  │  conversations   │           │║
 ║  │  │  agents through  │  │  living graph... │  │  to understand   │           │║
 ║  │  │  phases...       │  │                  │  │  your domain...  │           │║
 ║  │  └──────────────────┘  └──────────────────┘  └──────────────────┘           │║
 ║  │                                                                              │║
 ║  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │║
 ║  │  │  [compliance]    │  │  [token icon]    │  │  [acp-session]   │           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  │  GxP Compliance  │  │  Token Budget    │  │  Real-time       │           │║
 ║  │  │                  │  │  Management      │  │  ACP Session      │           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  │  Built-in audit  │  │  Intelligent     │  │  Shared board    │           │║
 ║  │  │  trails and      │  │  token alloc     │  │  architecture    │           │║
 ║  │  │  traceability... │  │  across agents...│  │  for inter-agent │           │║
 ║  │  └──────────────────┘  └──────────────────┘  └──────────────────┘           │║
 ║  │                                                                              │║
 ║  │  3-col desktop | 2-col tablet | 1-col mobile                                │║
 ║  │  gap: 24px, max-width: 1080px                                               │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ║══════════════════════════════════════════════════════════════════════════════════║
 ║                                                                                  ║
 ║  SECTION 3: How It Works (CMP-025-how-it-works-flow)                            ║
 ║  padding: 80px 24px                                                             ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │  Section Title: "How It Works"                                               │║
 ║  │  Rajdhani 32px, --sf-text                                                    │║
 ║  │                                                                              │║
 ║  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │║
 ║  │  │             │     │             │     │             │                    │║
 ║  │  │    Step 1   │────>│    Step 2   │────>│    Step 3   │                    │║
 ║  │  │             │     │             │     │             │                    │║
 ║  │  │  Point at   │     │  AI agents  │     │  Review &   │                    │║
 ║  │  │  your code  │     │  collaborate │     │  refine     │                    │║
 ║  │  │             │     │             │     │             │                    │║
 ║  │  └─────────────┘     └─────────────┘     └─────────────┘                    │║
 ║  │                                                                              │║
 ║  │  3-step horizontal flow with connector arrows                                │║
 ║  │  Cards: --sf-surface bg, accent number badges                                │║
 ║  │  Arrows: accent colored, dashed                                              │║
 ║  │  Mobile: vertical stack with downward arrows                                 │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ║══════════════════════════════════════════════════════════════════════════════════║
 ║                                                                                  ║
 ║  SECTION 4: CLI Demo (CMP-026-cli-demo-terminal)                                ║
 ║  padding: 80px 24px                                                             ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │  Section Title: "One Command Away"                                           │║
 ║  │                                                                              │║
 ║  │  ┌──────────────────────────────────────────────────────────────────────┐    │║
 ║  │  │  Terminal Chrome Bar                                                 │    │║
 ║  │  │  [*] [*] [*]   specforge                                            │    │║
 ║  │  ├──────────────────────────────────────────────────────────────────────┤    │║
 ║  │  │                                                                      │    │║
 ║  │  │  $ npx specforge init                                                │    │║
 ║  │  │                                                                      │    │║
 ║  │  │  > Scanning project structure...                                     │    │║
 ║  │  │  > Found 12 source files                                             │    │║
 ║  │  │  > Initializing knowledge graph...                                   │    │║
 ║  │  │  > Starting discovery conversation...                                │    │║
 ║  │  │                                                                      │    │║
 ║  │  │  [cursor blink]                                                      │    │║
 ║  │  │                                                                      │    │║
 ║  │  │  bg: #0A0E14                                                         │    │║
 ║  │  │  font: JetBrains Mono 14px                                           │    │║
 ║  │  │  text: #DAE6F0                                                       │    │║
 ║  │  │  prompt ($): #00F0FF                                                 │    │║
 ║  │  │  output (>): #586E85                                                 │    │║
 ║  │  │                                                                      │    │║
 ║  │  └──────────────────────────────────────────────────────────────────────┘    │║
 ║  │                                                                              │║
 ║  │  max-width: 720px, centered                                                  │║
 ║  │  border-radius: 12px                                                         │║
 ║  │  border: 1px solid rgba(0, 240, 255, 0.1)                                   │║
 ║  │  Typing animation with ~40ms per character delay                             │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ║══════════════════════════════════════════════════════════════════════════════════║
 ║                                                                                  ║
 ║  SECTION 5: Pricing (CMP-027-pricing-table)                                     ║
 ║  padding: 80px 24px                                                             ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │  Section Title: "Pricing"                                                    │║
 ║  │                                                                              │║
 ║  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  │     Solo         │  │     Team         │  │    Enterprise    │           │║
 ║  │  │                  │  │   (recommended)  │  │                  │           │║
 ║  │  │    Free          │  │                  │  │                  │           │║
 ║  │  │                  │  │    $29/mo        │  │    Custom        │           │║
 ║  │  │  - CLI access    │  │                  │  │                  │           │║
 ║  │  │  - 1 project     │  │  - Everything    │  │  - Everything    │           │║
 ║  │  │  - Local only    │  │    in Solo       │  │    in Team       │           │║
 ║  │  │                  │  │  - Dashboard     │  │  - SSO           │           │║
 ║  │  │                  │  │  - 10 projects   │  │  - SLA           │           │║
 ║  │  │                  │  │  - Team collab   │  │  - Unlimited     │           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  │  [Get Started]   │  │  [Start Trial]   │  │  [Contact Us]   │           │║
 ║  │  │                  │  │                  │  │                  │           │║
 ║  │  └──────────────────┘  └──────────────────┘  └──────────────────┘           │║
 ║  │                                                                              │║
 ║  │  3-col desktop | 2-col tablet (enterprise below) | 1-col mobile             │║
 ║  │  Recommended tier: accent border, glow effect                                │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ║══════════════════════════════════════════════════════════════════════════════════║
 ║                                                                                  ║
 ║  SECTION 6: CTA (CMP-028-cta-section)                                           ║
 ║  padding: 80px 24px                                                             ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │                   Ready to Transform Your Specs?                             │║
 ║  │                                                                              │║
 ║  │              Rajdhani 36px, gradient accent text                             │║
 ║  │                                                                              │║
 ║  │                  Start generating production-grade                            │║
 ║  │                specifications in minutes, not weeks.                          │║
 ║  │                                                                              │║
 ║  │                    Inter 18px, muted text                                    │║
 ║  │                                                                              │║
 ║  │                 [Get Started Free]                                            │║
 ║  │                  accent bg, pill shape                                       │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ║══════════════════════════════════════════════════════════════════════════════════║
 ║                                                                                  ║
 ║  SECTION 7: Footer (CMP-029-landing-footer)                                     ║
 ║  padding: 40px 24px                                                             ║
 ║  ┌──────────────────────────────────────────────────────────────────────────────┐║
 ║  │                                                                              │║
 ║  │  SpecForge              Product        Resources       Company               │║
 ║  │                                                                              │║
 ║  │  AI-powered spec        Features       Documentation   About                 │║
 ║  │  authoring for          Pricing        API Reference   Blog                  │║
 ║  │  modern teams.          Changelog      Guides          Careers               │║
 ║  │                         Roadmap        Community       Contact               │║
 ║  │                                                                              │║
 ║  │  ─────────────────────────────────────────────────────────────────────────   │║
 ║  │                                                                              │║
 ║  │  (c) 2026 SpecForge. All rights reserved.        [GitHub] [Twitter] [Discord]│║
 ║  │                                                                              │║
 ║  │  bg: #08101C                                                                 │║
 ║  │  text: --sf-text-muted                                                       │║
 ║  │  link hover: --sf-accent                                                     │║
 ║  │                                                                              │║
 ║  └──────────────────────────────────────────────────────────────────────────────┘║
 ║                                                                                  ║
 ╚══════════════════════════════════════════════════════════════════════════════════╝
```

### Responsive Breakdowns

```
 Desktop (>768px):                    Tablet (768px):
 max-width: 1200px, centered          2-col grids

 ┌────────┬────────┬────────┐         ┌──────────┬──────────┐
 │ Card 1 │ Card 2 │ Card 3 │         │  Card 1  │  Card 2  │
 ├────────┼────────┼────────┤         ├──────────┼──────────┤
 │ Card 4 │ Card 5 │ Card 6 │         │  Card 3  │  Card 4  │
 └────────┴────────┴────────┘         ├──────────┼──────────┤
                                      │  Card 5  │  Card 6  │
                                      └──────────┴──────────┘

 Mobile (<480px):
 single-column stacked

 ┌──────────────────┐
 │     Card 1       │
 ├──────────────────┤
 │     Card 2       │
 ├──────────────────┤
 │     Card 3       │
 ├──────────────────┤
 │     Card 4       │
 ├──────────────────┤
 │     Card 5       │
 ├──────────────────┤
 │     Card 6       │
 └──────────────────┘
```

---

## Component Inventory

| Order | Component         | Ref                       | Role                                |
| ----- | ----------------- | ------------------------- | ----------------------------------- |
| 1     | Hero Section      | CMP-023-hero-section      | Full-viewport hero with CTA buttons |
| 2     | Feature Grid      | CMP-024-feature-grid      | 6 feature cards in responsive grid  |
| 3     | How It Works Flow | CMP-025-how-it-works-flow | 3-step horizontal process flow      |
| 4     | CLI Demo Terminal | CMP-026-cli-demo-terminal | Animated terminal showing CLI usage |
| 5     | Pricing Table     | CMP-027-pricing-table     | 3-tier pricing cards                |
| 6     | CTA Section       | CMP-028-cta-section       | Final call-to-action with button    |
| 7     | Landing Footer    | CMP-029-landing-footer    | Footer with links and copyright     |

---

## States

| State     | Condition                                     | Behavior                                        |
| --------- | --------------------------------------------- | ----------------------------------------------- |
| populated | Default (static content)                      | All 7 sections rendered with content            |
| loading   | Font/asset loading or initial animation delay | Skeleton shimmer for hero text, then animate in |

This page is primarily static. The "loading" state applies only to the brief period during font loading and the initial hero animation kickoff. There is no empty or error state.

---

## Theme Tokens

| Token               | Value            | Usage                               |
| ------------------- | ---------------- | ----------------------------------- |
| `--sf-bg`           | `#020408`        | Page background                     |
| `--sf-surface`      | `#08101C`        | Card backgrounds, footer background |
| `--sf-accent`       | `#00F0FF`        | CTA buttons, links, accent elements |
| `--sf-accent-light` | `#5FFFFF`        | Hover states, gradient ends         |
| `--sf-text`         | `#DAE6F0`        | Primary text                        |
| `--sf-text-muted`   | `#586E85`        | Secondary text, descriptions        |
| `--sf-font-display` | `Rajdhani`       | Headlines, section titles           |
| `--sf-font-body`    | `Inter`          | Body text, descriptions, buttons    |
| `--sf-font-mono`    | `JetBrains Mono` | Terminal text, code snippets        |

---

## Section Details

### Section 1: Hero (CMP-023)

- Full-viewport height (min-height: 100vh)
- Animated hexagon grid background
- Gradient headline text (Rajdhani 48px)
- Muted subheadline (Inter 20px)
- Two CTA buttons: primary (accent bg) and secondary (ghost)
- See CMP-023-hero-section spec for full details

### Section 2: Features (CMP-024)

- 6 feature cards in a 3-column grid
- Each card: icon (32px accent), title (Rajdhani 18px), description (Inter 14px)
- Cards have surface background with subtle border and hover lift
- 80px vertical padding, 24px horizontal padding
- See CMP-024-feature-grid spec for full details

### Section 3: How It Works (CMP-025)

- 3-step horizontal flow with connector arrows
- Each step: number badge (accent), title, description
- Cards use surface background
- Arrows are accent-colored dashed lines
- Mobile: vertical stack with downward arrows

### Section 4: CLI Demo (CMP-026)

- Faux terminal with chrome bar (traffic light dots)
- Dark terminal background (#0A0E14)
- Typing animation showing `npx specforge init`
- Output lines appear sequentially with delay
- JetBrains Mono 14px
- Prompt color: accent. Output color: muted.
- Respects `prefers-reduced-motion` (shows all text immediately)

### Section 5: Pricing (CMP-027)

- 3 pricing tiers: Solo (Free), Team ($29/mo), Enterprise (Custom)
- Team tier is "recommended" with accent border and subtle glow
- Each card: tier name, price, feature list, CTA button
- 3-column desktop, 2-column tablet, single column mobile

### Section 6: CTA (CMP-028)

- Centered text block with gradient headline
- Subheadline in muted text
- Single accent CTA button (pill shape)
- Minimal section, focused on conversion

### Section 7: Footer (CMP-029)

- 4-column layout: Brand, Product links, Resources links, Company links
- Horizontal divider line
- Copyright text and social icons
- Background: surface (#08101C)
- All links: muted by default, accent on hover

---

## Design Token Usage

| Token               | Usage                                                 |
| ------------------- | ----------------------------------------------------- |
| `--sf-bg`           | Page background, hero background, terminal text bg    |
| `--sf-surface`      | Card backgrounds, footer background, terminal bg      |
| `--sf-accent`       | CTA buttons, gradient text, terminal prompt, links    |
| `--sf-accent-light` | Hover states, gradient end, glow effects              |
| `--sf-text`         | Headlines, card titles, body text                     |
| `--sf-text-muted`   | Descriptions, subtitles, footer text, terminal output |
| `--sf-font-display` | Section titles, hero headline (Rajdhani)              |
| `--sf-font-body`    | Body text, descriptions, buttons (Inter)              |
| `--sf-font-mono`    | Terminal text, code snippets (JetBrains Mono)         |

---

## Interaction Notes

1. **No app shell**: This page renders independently of PG-010-app-shell. No nav rail, no status bar.
2. **Smooth scroll**: Internal anchor links (if any) use smooth scrolling behavior.
3. **Reduced motion**: All animations (hexagon grid, typing terminal, hover effects) respect `prefers-reduced-motion: reduce`.
4. **Font loading**: The page uses three font families. A brief FOUT (flash of unstyled text) may occur during initial load. System fallbacks: Rajdhani -> sans-serif, Inter -> system-ui, JetBrains Mono -> monospace.
5. **CTA navigation**: "Get Started" buttons navigate to the app (e.g., `/#home`). "View Documentation" links to external docs.
6. **Footer links**: External links open in new tabs (`target="_blank"` with `rel="noopener"`).
7. **SEO**: The page includes proper meta tags (title, description, og:image) for social sharing and search indexing.

---

## Cross-References

- **Components:** CMP-023 through CMP-029 (hero, features, how-it-works, cli-demo, pricing, cta, footer)
- **Stores:** None (static page, no store dependencies)
- **App Shell:** PG-010-app-shell is NOT used for this page
- **Navigation:** CTA buttons link to the app shell routes (e.g., `/#home`)
