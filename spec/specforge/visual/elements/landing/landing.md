# Landing Elements

**IDs:** ELM-072 through ELM-086
**Context:** Landing page (PG-011-landing-page), displayed across CMP-023-hero-section, CMP-024-feature-grid, CMP-025-how-it-works-flow, CMP-026-cli-demo-terminal, CMP-027-pricing-table, CMP-028-cta-section, and CMP-029-landing-footer.

---

## ASCII Mockup -- Hero Section

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                          │
 │                                                                          │
 │              ELM-072 Hero Headline                                       │
 │         ┌────────────────────────────────────┐                           │
 │         │  Specs that verify themselves.      │  48px display font       │
 │         │  Zero setup.                        │  accent->purple gradient │
 │         └────────────────────────────────────┘                           │
 │                                                                          │
 │              ELM-073 Hero Subheadline                                    │
 │         ┌────────────────────────────────────┐                           │
 │         │  A specification platform built on  │  20px body font          │
 │         │  a knowledge graph and persistent   │  muted color             │
 │         │  AI agent sessions.                 │                          │
 │         └────────────────────────────────────┘                           │
 │                                                                          │
 │         ┌──────────────┐  ┌──────────────┐                              │
 │         │ Get Started   │  │  View Docs   │                              │
 │         │ ELM-074 (pri) │  │ ELM-075 (sec)│                              │
 │         │ accent bg     │  │ ghost style  │                              │
 │         └──────────────┘  └──────────────┘                              │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘
```

## ASCII Mockup -- Feature Grid

```
 ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
 │ ELM-076          │  │ ELM-076          │  │ ELM-076          │
 │                  │  │                  │  │                  │
 │  (icon) ELM-077  │  │  (icon) ELM-077  │  │  (icon) ELM-077  │
 │  32px accent     │  │  32px accent     │  │  32px accent     │
 │                  │  │                  │  │                  │
 │  Feature Title   │  │  Feature Title   │  │  Feature Title   │
 │  16px bold       │  │  16px bold       │  │  16px bold       │
 │                  │  │                  │  │                  │
 │  Description     │  │  Description     │  │  Description     │
 │  text in 13px    │  │  text in 13px    │  │  text in 13px    │
 │  muted color     │  │  muted color     │  │  muted color     │
 │                  │  │                  │  │                  │
 └──────────────────┘  └──────────────────┘  └──────────────────┘
   hover: glow + lift     surface bg + border
```

## ASCII Mockup -- How It Works Flow

```
 ELM-078 How It Works Step
 ┌──────────────────────────────────────────────────┐
 │  (1)   Define your spec                          │
 │   ▲    Describe requirements in markdown or       │
 │   │    import from existing documents.            │
 │   │    ▲ title 16px                               │
 │   │    ▲ description 13px muted                   │
 │   36px circle, accent-dim bg                      │
 └──────────────────────────────────────────────────┘
         :
         : ELM-079 step connector (dotted line)
         :
 ┌──────────────────────────────────────────────────┐
 │  (2)   Run a flow                                │
 │        SpecForge orchestrates AI agents           │
 │        through phases until convergence.          │
 └──────────────────────────────────────────────────┘
         :
         :
 ┌──────────────────────────────────────────────────┐
 │  (3)   Ship with confidence                      │
 │        Every requirement traced through code      │
 │        and tests, verified continuously.          │
 └──────────────────────────────────────────────────┘
```

## ASCII Mockup -- CLI Demo Terminal

```
 ┌──────────────────────────────────────────────────────────────┐
 │  terminal window (dark surface bg, rounded corners)          │
 │                                                              │
 │  ELM-081      ELM-080                                       │
 │  $  specforge init my-project          <- command (typing)   │
 │  Creating project structure...         <- output (green)     │
 │  # Initialize the knowledge graph      <- comment (muted)    │
 │  $  specforge flow start spec-authoring                      │
 │  Phase 1/3: Discovery...              <- output (green)      │
 │  Phase 2/3: Authoring...                                     │
 │  Phase 3/3: Review...                                        │
 │  Flow completed. 0 critical findings.                        │
 │                                                              │
 └──────────────────────────────────────────────────────────────┘
   monospace font, accent prompt, typing animation
```

## ASCII Mockup -- Pricing Table

```
 ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
 │ ELM-082        │  │ ELM-082        │  │ ELM-082        │
 │                │  │ (popular)      │  │                │
 │ Solo           │  │ Team           │  │ Enterprise     │
 │                │  │                │  │                │
 │ $0             │  │ $29            │  │ Custom         │
 │ /month         │  │ /month         │  │ /month         │
 │                │  │ accent border  │  │                │
 │ ELM-083 items: │  │ + glow shadow  │  │                │
 │ [check] Local  │  │                │  │                │
 │ [check] Flows  │  │ [check] Local  │  │ [check] All    │
 │ [cross] Teams  │  │ [check] Flows  │  │ [check] SSO    │
 │ [cross] SSO    │  │ [check] Teams  │  │ [check] Custom │
 │                │  │ [cross] SSO    │  │                │
 │ [Get Started]  │  │ [Get Started]  │  │ [Contact Us]   │
 └────────────────┘  └────────────────┘  └────────────────┘
   included: green check, normal text
   excluded: muted cross, strikethrough
```

## ASCII Mockup -- Bottom CTA Section

```
 ┌──────────────────────────────────────────────────────────────┐
 │                                                              │
 │       ELM-084 CTA Headline                                  │
 │       ┌──────────────────────────────┐                      │
 │       │  Ready to ship with          │  36px display font   │
 │       │  confidence?                 │  primary text        │
 │       └──────────────────────────────┘                      │
 │                                                              │
 │       ┌────────────────────────┐                            │
 │       │  Get Started for Free  │  ELM-085 CTA Button       │
 │       │  accent bg, 18px bold  │  hover: glow + lift        │
 │       └────────────────────────┘                            │
 │                                                              │
 └──────────────────────────────────────────────────────────────┘
```

## ASCII Mockup -- Footer

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  Footer                                                                  │
 │                                                                          │
 │  Product        Resources       Company         Legal                   │
 │  ELM-086        ELM-086         ELM-086         ELM-086                 │
 │  Features       Docs            About           Privacy                 │
 │  Pricing        Blog            Careers         Terms                   │
 │  Changelog      Community       Contact         Licenses               │
 │                                                                          │
 │  13px muted text, hover -> primary text, no underline                   │
 └──────────────────────────────────────────────────────────────────────────┘
```

## Visual States

### ELM-072 Hero Headline

- 48px display font, 800 weight.
- Gradient text: accent (cyan) to `#7C3AED` (purple) at 135 degrees.
- Center-aligned, max-width 720px.

### ELM-073 Hero Subheadline

- 20px body font, muted color, center-aligned, max-width 600px.

### ELM-074 Hero CTA Primary

| State   | Background    | Extra                                 |
| ------- | ------------- | ------------------------------------- |
| Default | `--sf-accent` | Dark text on accent bg                |
| Hover   | `--sf-accent` | `opacity: 0.9`, lift 1px, glow shadow |
| Active  | `--sf-accent` | No lift, no shadow                    |

### ELM-075 Hero CTA Secondary

| State   | Background                | Border        | Extra       |
| ------- | ------------------------- | ------------- | ----------- |
| Default | `transparent`             | `--sf-accent` | Ghost style |
| Hover   | `rgba(0, 240, 255, 0.08)` | `--sf-accent` | Lift 1px    |
| Active  | `rgba(0, 240, 255, 0.08)` | `--sf-accent` | No lift     |

### ELM-076 Feature Card

| State   | Border Color             | Extra                 |
| ------- | ------------------------ | --------------------- |
| Default | `--sf-border`            | Surface bg            |
| Hover   | `rgba(0, 240, 255, 0.2)` | Glow shadow, lift 2px |

### ELM-077 Feature Icon

- 32px icon, accent color. Decorative.

### ELM-078 How It Works Step

- Number circle: 36px, accent-dim bg, accent text, display font.
- Title: 16px bold.
- Description: 13px muted.

### ELM-079 Step Connector

- 2px dotted border using `--sf-border`, aligned to step circle center.

### ELM-080 CLI Demo Line

| Variant | Color             | Animation                       |
| ------- | ----------------- | ------------------------------- |
| Command | `--sf-text`       | Typing animation (steps)        |
| Output  | `#22C55E`         | Appears after command completes |
| Comment | `--sf-text-muted` | None                            |

### ELM-081 CLI Demo Prompt

- Accent colored "$" or ">" symbol, monospace font.

### ELM-082 Pricing Tier Card

| Variant | Border Color  | Extra                       |
| ------- | ------------- | --------------------------- |
| Default | `--sf-border` | Standard surface card       |
| Popular | `--sf-accent` | Accent border + glow shadow |

### ELM-083 Pricing Feature Item

| State    | Text Color        | Icon Color        | Extra                |
| -------- | ----------------- | ----------------- | -------------------- |
| Included | `--sf-text`       | `#22C55E`         | Check icon           |
| Excluded | `--sf-text-muted` | `--sf-text-muted` | Cross, strikethrough |

### ELM-084 CTA Headline

- 36px display font, bold, primary text, center-aligned.

### ELM-085 CTA Button

| State   | Background    | Extra                 |
| ------- | ------------- | --------------------- |
| Default | `--sf-accent` | Dark text, 18px bold  |
| Hover   | `--sf-accent` | Glow shadow, lift 1px |
| Active  | `--sf-accent` | No lift, no shadow    |

### ELM-086 Footer Link

| State   | Color             |
| ------- | ----------------- |
| Default | `--sf-text-muted` |
| Hover   | `--sf-text`       |

13px text, no underline, grouped in columns.

## Token Usage

| Token               | Usage                                         |
| ------------------- | --------------------------------------------- |
| `--sf-font-display` | Headlines, step numbers, prices               |
| `--sf-font-body`    | Subheadline, descriptions                     |
| `--sf-font-mono`    | CLI demo terminal                             |
| `--sf-text`         | Titles, command text, prices                  |
| `--sf-text-muted`   | Descriptions, comments, footer links          |
| `--sf-accent`       | Gradient start, CTA bg, prompt, icons         |
| `--sf-accent-dim`   | Step number bg                                |
| `--sf-bg`           | CTA button text (dark on accent)              |
| `--sf-surface`      | Feature card bg, pricing card bg              |
| `--sf-border`       | Card borders, step connector, footer dividers |

## Cross-References

- **Action:** ACT-028-landing-cta (primary CTA, bottom CTA)
- **Action:** ACT-029-landing-navigate (secondary CTA)
- **Component:** CMP-023-hero-section (hero layout)
- **Component:** CMP-024-feature-grid (feature card grid)
- **Component:** CMP-025-how-it-works-flow (step flow layout)
- **Component:** CMP-026-cli-demo-terminal (terminal demo)
- **Component:** CMP-027-pricing-table (pricing cards)
- **Component:** CMP-028-cta-section (bottom CTA)
- **Component:** CMP-029-landing-footer (footer links)
- **Page:** PG-011-landing-page (parent page)
