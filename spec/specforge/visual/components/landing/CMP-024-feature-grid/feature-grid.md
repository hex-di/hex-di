# Feature Grid

**ID:** CMP-024-feature-grid
**Children:** ELM-076 (Feature Card), ELM-077 (Feature Icon)
**Context:** Section below the hero showcasing six key SpecForge capabilities.

---

## ASCII Mockup

```
 Feature Grid Section (max-width 1080px, centered)
 padding: 80px 24px
 +=======================================================================+
 |                                                                       |
 |  +---------------------+ +---------------------+ +------------------+ |
 |  | ELM-076             | | ELM-076             | | ELM-076          | |
 |  |                     | |                     | |                  | |
 |  |  [ELM-077]          | |  [ELM-077]          | |  [ELM-077]       | |
 |  |  32px icon, accent  | |  32px icon, accent  | |  32px icon       | |
 |  |                     | |                     | |                  | |
 |  |  Multi-Agent        | |  Knowledge          | |  Discovery       | |
 |  |  Pipeline           | |  Graph              | |  Conversations   | |
 |  |                     | |                     | |                  | |
 |  |  Orchestrate        | |  Build and traverse | |  AI-guided       | |
 |  |  specialized AI     | |  a living knowledge | |  conversations   | |
 |  |  agents through     | |  graph of your      | |  to understand   | |
 |  |  discovery...       | |  codebase...        | |  your domain...  | |
 |  |                     | |                     | |                  | |
 |  +---------------------+ +---------------------+ +------------------+ |
 |          24px gap              24px gap                               |
 |  +---------------------+ +---------------------+ +------------------+ |
 |  | ELM-076             | | ELM-076             | | ELM-076          | |
 |  |                     | |                     | |                  | |
 |  |  [ELM-077]          | |  [ELM-077]          | |  [ELM-077]       | |
 |  |  32px icon, accent  | |  32px icon, accent  | |  32px icon       | |
 |  |                     | |                     | |                  | |
 |  |  GxP Compliance     | |  Token Budget       | |  Real-time       | |
 |  |                     | |  Management         | |  ACP Session      | |
 |  |                     | |                     | |                  | |
 |  |  Built-in audit     | |  Intelligent token  | |  Shared          | |
 |  |  trails, trace-     | |  allocation across  | |  ACP session      | |
 |  |  ability matrices..| |  agents to...       | |  architecture... | |
 |  |                     | |                     | |                  | |
 |  +---------------------+ +---------------------+ +------------------+ |
 |                                                                       |
 +=======================================================================+
```

### Single Feature Card Detail

```
 ELM-076 Feature Card
 +----------------------------+
 |  padding: 24px             |
 |                            |
 |  [*] <-- ELM-077 icon     |
 |       32px, accent color   |
 |                            |  margin-top: 16px
 |  Feature Title             |  Rajdhani 18px, 600, --sf-text
 |                            |  margin-bottom: 8px
 |  Description text that     |  Inter 14px, 1.6 line-height
 |  wraps across multiple     |  --sf-text-muted
 |  lines if needed.          |
 |                            |
 +----------------------------+
  bg: --sf-surface (#08101C)
  border: 1px solid rgba(0,240,255, 0.06)
  border-radius: 12px

 Hover state:
 +----------------------------+
 |  (same content)            |
 |                            |
 |  glow: 0 0 24px            |
 |    rgba(0,240,255,0.1)     |
 |  border: rgba(0,240,255,   |
 |    0.15)                    |
 |  transform: translateY(-2) |
 +----------------------------+
```

### Responsive Layouts

```
 Desktop (>768px): 3 columns
 +--------+ +--------+ +--------+
 | Card 1 | | Card 2 | | Card 3 |
 +--------+ +--------+ +--------+
 +--------+ +--------+ +--------+
 | Card 4 | | Card 5 | | Card 6 |
 +--------+ +--------+ +--------+

 Tablet (480-768px): 2 columns
 +--------+ +--------+
 | Card 1 | | Card 2 |
 +--------+ +--------+
 +--------+ +--------+
 | Card 3 | | Card 4 |
 +--------+ +--------+
 +--------+ +--------+
 | Card 5 | | Card 6 |
 +--------+ +--------+

 Mobile (<480px): 1 column
 +------------------+
 |     Card 1       |
 +------------------+
 +------------------+
 |     Card 2       |
 +------------------+
      ... etc.
```

## Visual States

### ELM-076 Feature Card

| State   | Background     | Border                           | Extra                         |
| ------- | -------------- | -------------------------------- | ----------------------------- |
| Default | `--sf-surface` | `1px solid rgba(0,240,255,0.06)` | --                            |
| Hover   | `--sf-surface` | `1px solid rgba(0,240,255,0.15)` | Glow shadow, translateY(-2px) |

- Border-radius: 12px.
- Padding: 24px on all sides.
- Transition: `box-shadow 0.2s ease, transform 0.2s ease`.

### ELM-077 Feature Icon

- 32px square icon rendered in `--sf-accent` color.
- Positioned at the top of the card, left-aligned.
- Icon glyph determined by the `icon` field in the feature data.

### Card Title

- Rajdhani (display font), 18px, weight 600.
- Color: `--sf-text` (#DAE6F0).
- 16px top margin from icon, 8px bottom margin to description.

### Card Description

- Inter (body font), 14px, weight 400, line-height 1.6.
- Color: `--sf-text-muted` (#586E85).

## Feature Data

| #   | Icon Key       | Title                   | Description                                                                           |
| --- | -------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| 1   | `pipeline`     | Multi-Agent Pipeline    | Orchestrate specialized AI agents through discovery, planning, and generation phases. |
| 2   | `graph`        | Knowledge Graph         | Build and traverse a living knowledge graph of your codebase relationships.           |
| 3   | `conversation` | Discovery Conversations | AI-guided conversations to understand your domain before generating specs.            |
| 4   | `compliance`   | GxP Compliance          | Built-in audit trails, traceability matrices, and regulatory documentation.           |
| 5   | `token`        | Token Budget Management | Intelligent token allocation across agents to optimize cost and quality.              |
| 6   | `acp-session`  | Real-time ACP Session   | Shared ACP session architecture for inter-agent communication and coordination.       |

## Token Usage

| Token               | Usage                          |
| ------------------- | ------------------------------ |
| `--sf-surface`      | Card background                |
| `--sf-accent`       | Feature icon color, hover glow |
| `--sf-text`         | Card title color               |
| `--sf-text-muted`   | Card description color         |
| `--sf-font-display` | Card title font (Rajdhani)     |
| `--sf-font-body`    | Card description font (Inter)  |

## Cross-References

- **Component:** CMP-023-hero-section (section above)
- **Component:** CMP-025-how-it-works-flow (section below)
- **Page:** PGE-003-landing-page (parent page)
