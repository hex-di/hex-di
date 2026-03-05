# How It Works Flow

**ID:** CMP-025-how-it-works-flow
**Children:** ELM-078 (Step), ELM-079 (Connector)
**Context:** Four-step horizontal flow diagram showing the SpecForge workflow.

---

## ASCII Mockup

### Desktop Layout

```
 How It Works Section (max-width 1080px, centered)
 padding: 80px 24px
 +=======================================================================+
 |                                                                       |
 |                        How It Works                                   |
 |                   Rajdhani 32px, 700, --sf-text                       |
 |                        (centered)                                     |
 |                                                                       |
 |                       48px margin-bottom                              |
 |                                                                       |
 |   ELM-078        ELM-079    ELM-078       ELM-079    ELM-078         |
 |                                                                       |
 |   +------+  . . . . . .  +------+  . . . . . .  +------+             |
 |   |      |  dotted line  |      |  dotted line  |      |             |
 |   |  01  |  connector    |  02  |  connector    |  03  |             |
 |   |      |  (accent)     |      |  (accent)     |      |             |
 |   +------+               +------+               +------+             |
 |   48px circle             48px circle            48px circle          |
 |                                                                       |
 |   Point to               Discover               Generate             |
 |   Package                                                             |
 |   16px, 600              16px, 600              16px, 600             |
 |                                                                       |
 |   Select the             AI conversation        Multi-agent           |
 |   target codebase        to understand          pipeline creates      |
 |   or package...          your domain...         comprehensive...      |
 |   13px, muted            13px, muted            13px, muted           |
 |                                                                       |
 |                                                       ELM-079         |
 |                                                 . . . . . .          |
 |                                                                       |
 |                                                 +------+             |
 |                                                 |      |             |
 |                                                 |  04  |             |
 |                                                 |      |             |
 |                                                 +------+             |
 |                                                                       |
 |                                                 Review               |
 |                                                                       |
 |                                                 Human-in-the-        |
 |                                                 loop verification... |
 |                                                                       |
 +=======================================================================+

 Corrected horizontal layout (all 4 in a row):

 +------+ . . . . +------+ . . . . +------+ . . . . +------+
 |      |         |      |         |      |         |      |
 |  01  |         |  02  |         |  03  |         |  04  |
 |      |         |      |         |      |         |      |
 +------+         +------+         +------+         +------+
  Point to         Discover         Generate         Review
  Package

  Select the       AI conver-       Multi-agent      Human-in-
  target code-     sation to        pipeline         the-loop
  base or          understand       creates          verification
  package you      your domain      comprehensive    ensures
  want to...       requirements...  production-      accuracy...
                                    grade specs...
```

### Step Circle Detail

```
 Active / Completed State         Future State
 +----------+                     +----------+
 |  accent  |                     |  ------  |
 |  bg fill |                     | | muted| |
 |   "01"   |                     |  | 01 |  |
 |  dark txt|                     |  ------  |
 +----------+                     +----------+
  bg: #00F0FF                      bg: transparent
  color: #020408                   color: #586E85
  48px circle                      border: 1px dashed #586E85
```

### Connector Detail

```
 Desktop (horizontal):
 . . . . . . . . . . . .
 2px dotted line, accent or muted
 Centered vertically at 24px from top (middle of 48px circle)
 max-width: 80px, flex: 1

 Mobile (vertical):
 .
 .
 .
 .
 2px dotted line, vertical
 height: 32px
```

### Mobile Layout

```
 Mobile (<640px): vertical stack
 +============+
 |            |
 |  +------+  |
 |  |  01  |  |
 |  +------+  |
 |  Point to  |
 |  Package   |
 |  desc...   |
 |            |
 |     .      |
 |     .      |  <-- ELM-079 vertical connector
 |     .      |
 |            |
 |  +------+  |
 |  |  02  |  |
 |  +------+  |
 |  Discover  |
 |  desc...   |
 |            |
 |     .      |
 |     .      |
 |     .      |
 |            |
 |  +------+  |
 |  |  03  |  |
 |  +------+  |
 |  Generate  |
 |  desc...   |
 |            |
 |     .      |
 |     .      |
 |     .      |
 |            |
 |  +------+  |
 |  |  04  |  |
 |  +------+  |
 |  Review    |
 |  desc...   |
 |            |
 +============+
```

## Visual States

### ELM-078 How It Works Step

**Active / Completed State:**

| Element       | Style                                        |
| ------------- | -------------------------------------------- |
| Circle bg     | `--sf-accent` (#00F0FF)                      |
| Circle text   | `--sf-bg` (#020408)                          |
| Circle border | none                                         |
| Title         | `--sf-text` (#DAE6F0), Rajdhani 16px, 600    |
| Description   | `--sf-text-muted` (#586E85), Inter 13px, 400 |

**Future State:**

| Element       | Style                        |
| ------------- | ---------------------------- |
| Circle bg     | `transparent`                |
| Circle text   | `--sf-text-muted` (#586E85)  |
| Circle border | `1px dashed --sf-text-muted` |
| Title         | `--sf-text-muted` (#586E85)  |
| Description   | `rgba(88, 110, 133, 0.6)`    |

On the landing page, all four steps render in the "active" state by default to showcase the complete workflow.

### ELM-079 Step Connector

| State  | Desktop                             | Mobile                             |
| ------ | ----------------------------------- | ---------------------------------- |
| Active | `2px dotted --sf-accent` horizontal | `2px dotted --sf-accent` vertical  |
| Future | `2px dotted --sf-text-muted` horiz. | `2px dotted --sf-text-muted` vert. |

- Three connectors total: between steps 1-2, 2-3, and 3-4.
- Decorative only, hidden from screen readers (`aria-hidden: true`).

## Step Data

| #   | Title            | Description                                                                  |
| --- | ---------------- | ---------------------------------------------------------------------------- |
| 1   | Point to Package | Select the target codebase or package you want to generate specs for.        |
| 2   | Discover         | AI conversation to understand your domain, requirements, and constraints.    |
| 3   | Generate         | Multi-agent pipeline creates comprehensive, production-grade specifications. |
| 4   | Review           | Human-in-the-loop verification ensures accuracy and completeness.            |

## Token Usage

| Token               | Usage                                        |
| ------------------- | -------------------------------------------- |
| `--sf-accent`       | Active circle bg, active connector line      |
| `--sf-bg`           | Active circle text color                     |
| `--sf-text`         | Section heading, active step title           |
| `--sf-text-muted`   | Future state, descriptions, future circles   |
| `--sf-font-display` | Section heading, step titles, circle numbers |
| `--sf-font-body`    | Step descriptions                            |

## Cross-References

- **Component:** CMP-024-feature-grid (section above)
- **Component:** CMP-026-cli-demo-terminal (section below)
- **Page:** PGE-003-landing-page (parent page)
