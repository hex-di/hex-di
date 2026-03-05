# Landing Footer

**ID:** CMP-029-landing-footer
**Children:** ELM-086 (Footer Link)
**Context:** Page footer at the bottom of the SpecForge landing page with branding and link columns.

---

## ASCII Mockup

### Desktop Layout

```
 Landing Footer (max-width 1080px, centered)
 border-top: 1px solid rgba(0, 240, 255, 0.08)
 padding: 48px 24px 32px
 +=======================================================================+
 |                                                                       |
 |  Logo Column        Product          Community        Legal           |
 |  (1.5fr)            (1fr)            (1fr)            (1fr)           |
 |                                                                       |
 |  [SpecForge Logo]   PRODUCT          COMMUNITY        LEGAL           |
 |  28px height        11px, uppercase  11px, uppercase  11px, uppercase |
 |                     accent, 700      accent, 700      accent, 700     |
 |  AI-powered         letter-sp 0.08em letter-sp 0.08em letter-sp 0.08em|
 |  specification                                                        |
 |  authoring          Features         GitHub           Privacy         |
 |  13px, muted        Pricing          Discord          Terms           |
 |                     Documentation    Twitter          License         |
 |                                                                       |
 |                     13px each        13px each        13px each       |
 |                     muted color      muted color      muted color     |
 |                     hover: text      hover: text      hover: text     |
 |                                                                       |
 |  -----------------------------------------------------------------   |
 |  border-top: 1px solid rgba(0,240,255,0.04)                          |
 |  margin-top: 48px, padding-top: 24px                                 |
 |                                                                       |
 |                  SpecForge. All rights reserved.                      |
 |                  12px, muted, centered                                |
 |                                                                       |
 +=======================================================================+
```

### Link Column Detail

```
 Single Column (e.g., Product):
 +---------------------+
 |                     |
 |  PRODUCT            |  <-- Column heading
 |                     |      11px, uppercase, --sf-accent
 |                     |      700 weight, letter-spacing 0.08em
 |                     |      margin-bottom: 16px
 |                     |
 |  Features           |  <-- ELM-086 Footer Link
 |                     |      13px, --sf-text-muted
 |  Pricing            |      padding: 4px 0
 |                     |      hover: --sf-text
 |  Documentation      |
 |                     |
 +---------------------+
```

### Logo Section Detail

```
 +---------------------------+
 |                           |
 |  [SpecForge]              |  Logo: 28px height
 |                           |
 |  AI-powered specification |  Tagline: 13px, --sf-text-muted
 |  authoring                |  margin-top: 12px
 |                           |
 +---------------------------+
```

### Link Hover State

```
 Default:                      Hover:
 +---------------------+      +---------------------+
 |  Features           |      |  Features           |
 |  #586E85 (muted)    |      |  #DAE6F0 (text)     |
 +---------------------+      +---------------------+
  transition: color 0.15s       smooth color change

 Focus:
 +---------------------+
 |  [ Features ]       |  1px accent outline, 2px offset
 +---------------------+
```

### Responsive Layouts

```
 Tablet (480-768px): 2-column grid, 32px gap
 +------------------+------------------+
 | [SpecForge Logo] | PRODUCT          |
 | AI-powered...    | Features         |
 |                  | Pricing          |
 |                  | Documentation    |
 +------------------+------------------+
 | COMMUNITY        | LEGAL            |
 | GitHub           | Privacy          |
 | Discord          | Terms            |
 | Twitter          | License          |
 +------------------+------------------+

 Mobile (<480px): single column, 24px gap
 +---------------------------+
 | [SpecForge Logo]          |
 | AI-powered specification  |
 | authoring                 |
 +---------------------------+
 | PRODUCT                   |
 | Features                  |
 | Pricing                   |
 | Documentation             |
 +---------------------------+
 | COMMUNITY                 |
 | GitHub                    |
 | Discord                   |
 | Twitter                   |
 +---------------------------+
 | LEGAL                     |
 | Privacy                   |
 | Terms                     |
 | License                   |
 +---------------------------+
```

## Visual States

### ELM-086 Footer Link

| State   | Color             | Extra                          |
| ------- | ----------------- | ------------------------------ |
| Default | `--sf-text-muted` | --                             |
| Hover   | `--sf-text`       | Smooth transition (0.15s)      |
| Focus   | `--sf-text`       | 1px accent outline, 2px offset |

- Inter (body font), 13px, line-height 1.4.
- Block display, 4px vertical padding per link.
- No text-decoration (underline removed).

### Column Headings

- Inter (body font), 11px, weight 700, uppercase.
- Color: `--sf-accent` (#00F0FF).
- Letter-spacing: `0.08em`.
- 16px bottom margin to first link.

### Border & Dividers

| Element          | Border                              |
| ---------------- | ----------------------------------- |
| Top border       | `1px solid rgba(0, 240, 255, 0.08)` |
| Copyright border | `1px solid rgba(0, 240, 255, 0.04)` |

## Link Data

| Column    | Links                                                                 |
| --------- | --------------------------------------------------------------------- |
| Product   | Features (`#features`), Pricing (`#pricing`), Documentation (`/docs`) |
| Community | GitHub (`https://github.com/specforge`), Discord, Twitter             |
| Legal     | Privacy (`/privacy`), Terms (`/terms`), License (`/license`)          |

## Token Usage

| Token             | Usage                                  |
| ----------------- | -------------------------------------- |
| `--sf-accent`     | Column headings, focus outline         |
| `--sf-text`       | Link hover color                       |
| `--sf-text-muted` | Link default color, tagline, copyright |
| `--sf-font-body`  | All text in footer (Inter)             |

## Cross-References

- **Component:** CMP-028-cta-section (section above)
- **Page:** PGE-003-landing-page (parent page)
