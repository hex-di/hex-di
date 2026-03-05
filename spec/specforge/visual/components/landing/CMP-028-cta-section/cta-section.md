# CTA Section

**ID:** CMP-028-cta-section
**Children:** ELM-084 (CTA Headline), ELM-085 (CTA Button)
**Context:** Bottom call-to-action section before the footer on the landing page.

---

## ASCII Mockup

```
 CTA Section (max-width 600px, centered)
 padding: 80px 24px
 +=======================================================================+
 |                                                                       |
 |         ~~~ radial gradient overlay (accent at 4%) ~~~                |
 |                                                                       |
 |                                                                       |
 |                   +-----------------------------+                     |
 |                   |     ELM-084 Headline        |                     |
 |                   |                             |                     |
 |                   |  Ready to Automate          |                     |
 |                   |     Your Specs?             |                     |
 |                   |                             |                     |
 |                   |  Rajdhani 36px, 700         |                     |
 |                   |  --sf-text                  |                     |
 |                   +-----------------------------+                     |
 |                                                                       |
 |                         32px gap                                      |
 |                                                                       |
 |                   +-----------------------------+                     |
 |                   |       ELM-085 Button        |                     |
 |                   |                             |                     |
 |                   |       [ Start Free ]        |                     |
 |                   |                             |                     |
 |                   |  accent bg, dark text       |                     |
 |                   |  18px, 600, pill shape      |                     |
 |                   |  pad: 16px 48px             |                     |
 |                   +-----------------------------+                     |
 |                                                                       |
 |                                                                       |
 +=======================================================================+
```

### Button States

```
 Default:
 +-------------------+
 |                   |
 |    Start Free     |
 |                   |
 +-------------------+
  bg: #00F0FF
  text: #020408
  border: none
  radius: 999px
  pad: 16px 48px

 Hover:
 +-------------------+
 |                   |
 |    Start Free     |
 |    (glow + scale) |
 +-------------------+
  bg: #5FFFFF
  text: #020408
  shadow: 0 0 30px rgba(0,240,255,0.3)
  transform: scale(1.03)

 Focus:
 +-------------------+
 |                   |
 |    Start Free     |
 |                   |
 +-------------------+
  outline: 2px solid #5FFFFF
  outline-offset: 4px
```

### Gradient Background

```
 Background layer:
 +------------------------------------------------------------+
 |                                                            |
 |                     . . . . . .                            |
 |                 .                 .                         |
 |              .    accent glow       .                      |
 |             .   rgba(0,240,255,     .                      |
 |              .       0.04)         .                       |
 |                 .                .                          |
 |                     . . . . .                              |
 |                                                            |
 +------------------------------------------------------------+
  radial-gradient(ellipse at center,
    rgba(0,240,255,0.04) 0%,
    transparent 70%)
  Overlaid on --sf-bg base
```

## Visual States

### ELM-084 CTA Headline

- Rajdhani (display font), 36px, weight 700, line-height 1.2.
- Color: `--sf-text` (#DAE6F0).
- 32px bottom margin to the CTA button.
- Centered text, heading level 2.

### ELM-085 CTA Button

| State   | Background          | Text Color | Extra                                           |
| ------- | ------------------- | ---------- | ----------------------------------------------- |
| Default | `--sf-accent`       | `--sf-bg`  | --                                              |
| Hover   | `--sf-accent-light` | `--sf-bg`  | Glow `0 0 30px rgba(0,240,255,0.3)`, scale 1.03 |
| Focus   | `--sf-accent`       | `--sf-bg`  | 2px outline, 4px offset                         |

- Large pill button: 18px, weight 600, padding `16px 48px`.
- `border-radius: 999px`.
- Smooth transition: `background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease`.

## Token Usage

| Token               | Usage                              |
| ------------------- | ---------------------------------- |
| `--sf-bg`           | Base background, button text color |
| `--sf-accent`       | Button bg, gradient overlay tint   |
| `--sf-accent-light` | Button hover bg, focus outline     |
| `--sf-text`         | Headline text color                |
| `--sf-font-display` | Headline font (Rajdhani)           |
| `--sf-font-body`    | Button font (Inter)                |

## Cross-References

- **Component:** CMP-027-pricing-table (section above)
- **Component:** CMP-029-landing-footer (section below)
- **Page:** PGE-003-landing-page (parent page)
