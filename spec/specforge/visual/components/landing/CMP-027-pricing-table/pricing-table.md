# Pricing Table

**ID:** CMP-027-pricing-table
**Children:** ELM-082 (Tier Card), ELM-083 (Feature Item)
**Context:** Three-tier pricing comparison on the SpecForge landing page.

---

## ASCII Mockup

### Full Desktop Layout

```
 Pricing Section (max-width 1080px, centered)
 padding: 80px 24px
 +=======================================================================+
 |                                                                       |
 |                            Pricing                                    |
 |                    Rajdhani 32px, 700, --sf-text                      |
 |                          (centered)                                   |
 |                                                                       |
 |                        48px margin-bottom                             |
 |                                                                       |
 | +-------------------+ +---------------------+ +-------------------+   |
 | | ELM-082           | | ELM-082             | | ELM-082           |   |
 | |                   | |      [Popular]       | |                   |   |
 | | Open Source       | |        ^badge        | | Enterprise        |   |
 | |                   | |                      | |                   |   |
 | | Free              | | Pro                  | | Custom            |   |
 | |                   | |                      | |                   |   |
 | |                   | | $29/mo               | |                   |   |
 | |                   | |                      | |                   |   |
 | | [/] Core CLI      | | [/] Core CLI         | | [/] Core CLI      |   |
 | | [/] Local spec    | | [/] Local spec       | | [/] Local spec    |   |
 | | [/] Single-agent  | | [/] Multi-agent      | | [/] Multi-agent   |   |
 | | [/] Community     | | [/] Priority         | | [/] Dedicated     |   |
 | | [x] Cloud sync    | | [/] Cloud sync       | | [/] Cloud sync    |   |
 | | [x] Team collab   | | [/] Team collab      | | [/] Team collab   |   |
 | | [x] GxP           | | [x] GxP              | | [/] GxP           |   |
 | | [x] SSO & audit   | | [x] SSO & audit      | | [/] SSO & audit   |   |
 | |                   | |                      | |                   |   |
 | | [  Get Started  ] | | [ Start Free Trial ] | | [ Contact Sales ] |   |
 | |   ghost button    | |   accent filled btn  | |   ghost button    |   |
 | |                   | |                      | |                   |   |
 | +-------------------+ +---------------------+ +-------------------+   |
 |       24px gap              24px gap                                  |
 +=======================================================================+
```

### Single Tier Card Detail

```
 ELM-082 Pricing Tier Card (default state)
 +---------------------------+
 | padding: 32px             |
 |                           |
 | Open Source               |  Rajdhani 20px, 600, --sf-text
 |                           |  margin-bottom: 8px
 | Free                      |  Rajdhani 40px, 700, --sf-text
 |                           |  margin-bottom: 24px
 |                           |
 | [/] Core CLI              |  ELM-083 (included)
 | [/] Local spec generation |  13px, --sf-text, check icon accent
 | [/] Single-agent pipeline |
 | [/] Community support     |
 | [x] Cloud sync            |  ELM-083 (excluded)
 | [x] Team collaboration    |  13px, --sf-text-muted, 50% opacity
 | [x] GxP compliance        |
 | [x] SSO & audit trails    |
 |                           |  margin-bottom: 32px
 | +-----------------------+ |
 | |    Get Started        | |  Ghost CTA: accent border, accent text
 | +-----------------------+ |  14px, 600, pill shape
 |                           |
 +---------------------------+
  bg: --sf-surface
  border: 1px solid rgba(0,240,255,0.06)
  border-radius: 12px


 ELM-082 Pricing Tier Card (popular state -- Pro tier)
                [Popular]        <-- Badge: absolute positioned
 +---------------------------+       top: -12px, centered
 | padding: 32px             |       accent bg, dark text
 |                           |       11px, uppercase, pill
 | Pro                       |
 |                           |
 | $29 /mo                   |  "$29" at 40px, "/mo" at 16px muted
 |                           |
 | [/] Core CLI              |
 | [/] Local spec generation |
 | [/] Multi-agent pipeline  |
 | [/] Priority support      |
 | [/] Cloud sync            |
 | [/] Team collaboration    |
 | [x] GxP compliance        |
 | [x] SSO & audit trails    |
 |                           |
 | +-----------------------+ |
 | |  Start Free Trial     | |  Filled CTA: accent bg, dark text
 | +-----------------------+ |
 |                           |
 +---------------------------+
  bg: --sf-surface
  border: 1px solid --sf-accent      <-- Accent border
  box-shadow: 0 0 30px rgba(0,240,255,0.12)  <-- Glow
```

### Feature Item Detail

```
 ELM-083 (included)               ELM-083 (excluded)
 +---+---------------------+     +---+---------------------+
 | / | Core CLI             |     | x | Cloud sync           |
 +---+---------------------+     +---+---------------------+
  16px checkmark icon              16px cross icon
  accent color                     muted color
  --sf-text                        --sf-text-muted, 50% opacity
  13px, Inter                      13px, Inter
  6px vertical padding             6px vertical padding
  10px gap between icon/text       10px gap between icon/text
```

### Mobile Layout

```
 Mobile (<768px): single column, max-width 400px
 +=======================+
 |                       |
 |  +-------------------+|
 |  |   Open Source     ||
 |  |   Free            ||
 |  |   ...features...  ||
 |  |   [Get Started]   ||
 |  +-------------------+|
 |                       |
 |       [Popular]       |
 |  +-------------------+|
 |  |   Pro             ||
 |  |   $29/mo          ||
 |  |   ...features...  ||
 |  |   [Start Trial]   ||
 |  +-------------------+|
 |                       |
 |  +-------------------+|
 |  |   Enterprise      ||
 |  |   Custom          ||
 |  |   ...features...  ||
 |  |   [Contact Sales] ||
 |  +-------------------+|
 |                       |
 +=======================+
```

## Visual States

### ELM-082 Pricing Tier Card

**Default State (Open Source, Enterprise):**

| Property   | Value                              |
| ---------- | ---------------------------------- |
| Background | `--sf-surface`                     |
| Border     | `1px solid rgba(0,240,255,0.06)`   |
| Badge      | Hidden                             |
| CTA style  | Ghost (accent border, accent text) |

**Popular State (Pro):**

| Property   | Value                                    |
| ---------- | ---------------------------------------- |
| Background | `--sf-surface`                           |
| Border     | `1px solid --sf-accent`                  |
| Box-shadow | `0 0 30px rgba(0,240,255,0.12)`          |
| Badge      | Visible, accent bg, dark text, "Popular" |
| CTA style  | Filled (accent bg, dark text)            |

**CTA Hover (Default Tier):**

| Property | Value                     |
| -------- | ------------------------- |
| bg       | `rgba(0, 240, 255, 0.08)` |
| color    | `--sf-accent-light`       |

**CTA Hover (Popular Tier):**

| Property   | Value                          |
| ---------- | ------------------------------ |
| bg         | `--sf-accent-light`            |
| color      | `--sf-bg`                      |
| box-shadow | `0 0 20px rgba(0,240,255,0.3)` |

### Popular Badge

- Positioned absolutely: `top: -12px`, centered horizontally.
- Accent background, dark text, 11px, uppercase, bold.
- Pill shape: `border-radius: 999px`, padding `4px 12px`.
- Letter-spacing: `0.05em`.

### Price Display

- Dollar amount: Rajdhani 40px, weight 700, `--sf-text`.
- Period suffix ("/mo"): 16px, `--sf-text-muted`.
- "Free" and "Custom" rendered at 40px without period suffix.

### ELM-083 Pricing Feature Item

| State    | Icon      | Icon Color        | Text Color        | Opacity |
| -------- | --------- | ----------------- | ----------------- | ------- |
| Included | Checkmark | `--sf-accent`     | `--sf-text`       | 1.0     |
| Excluded | Cross     | `--sf-text-muted` | `--sf-text-muted` | 0.5     |

## Tier Data

| Tier        | Price  | Features Included | Features Excluded | CTA Label        | Popular |
| ----------- | ------ | ----------------- | ----------------- | ---------------- | ------- |
| Open Source | Free   | 4                 | 4                 | Get Started      | No      |
| Pro         | $29/mo | 6                 | 2                 | Start Free Trial | Yes     |
| Enterprise  | Custom | 8                 | 0                 | Contact Sales    | No      |

## Token Usage

| Token               | Usage                                     |
| ------------------- | ----------------------------------------- |
| `--sf-surface`      | Card background                           |
| `--sf-accent`       | Popular border, badge bg, checkmarks, CTA |
| `--sf-accent-light` | CTA hover states                          |
| `--sf-bg`           | Badge text, popular CTA text              |
| `--sf-text`         | Tier name, price, included feature text   |
| `--sf-text-muted`   | Period suffix, excluded features, X icons |
| `--sf-font-display` | Tier name, price (Rajdhani)               |
| `--sf-font-body`    | Feature text, CTA text, badge (Inter)     |

## Cross-References

- **Component:** CMP-026-cli-demo-terminal (section above)
- **Component:** CMP-028-cta-section (section below)
- **Page:** PGE-003-landing-page (parent page)
