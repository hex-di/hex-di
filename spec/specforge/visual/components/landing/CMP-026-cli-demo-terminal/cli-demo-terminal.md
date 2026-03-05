# CLI Demo Terminal

**ID:** CMP-026-cli-demo-terminal
**Children:** ELM-080 (Demo Line), ELM-081 (Demo Prompt)
**Context:** Animated terminal window on the landing page showing SpecForge CLI in action.

---

## ASCII Mockup

### Terminal Window

```
 CLI Demo Section (max-width 720px, centered)
 padding: 80px 24px
 +====================================================================+
 |                                                                    |
 |  Terminal Window (border-radius: 12px)                             |
 |  border: 1px solid rgba(0, 240, 255, 0.1)                         |
 |                                                                    |
 |  +----------------------------------------------------------------+|
 |  | Chrome Bar          padding: 12px 16px                         ||
 |  |                                                                ||
 |  |  (o) (o) (o)              Terminal                             ||
 |  |  red yel grn              12px, muted                          ||
 |  |  12px dots, 8px gap       centered title                       ||
 |  |                                                                ||
 |  |  border-bottom: 1px solid rgba(0,240,255,0.06)                 ||
 |  +----------------------------------------------------------------+|
 |  |                                                                ||
 |  | Terminal Body         padding: 20px                            ||
 |  | bg: --sf-surface      font: JetBrains Mono 13px                ||
 |  |                                                                ||
 |  |  ELM-081    ELM-080                                            ||
 |  |  $ specforge init --package @my/app|                           ||
 |  |    ^prompt  ^command (--sf-text)   ^cursor (blink)             ||
 |  |                                                                ||
 |  |  Scanning package structure...                                 ||
 |  |    ^output (--sf-text-muted)                                   ||
 |  |                                                                ||
 |  |  Found 24 source files, 8 test files                          ||
 |  |                                                                ||
 |  |  Starting discovery conversation...                            ||
 |  |                                                                ||
 |  |  # AI agents collaborate to understand your codebase           ||
 |  |    ^comment (accent 40%, italic)                               ||
 |  |                                                                ||
 |  |  Spawning agents: [architect] [analyst] [writer] [reviewer]    ||
 |  |                                                                ||
 |  |  Generating specifications...                                  ||
 |  |                                                                ||
 |  |  Created 12 spec files in ./spec/                              ||
 |  |                                                                ||
 |  |  Done in 47.3s                                                 ||
 |  |                                                                ||
 |  |  ~~~~~~~~~~~~~ scanline overlay (subtle) ~~~~~~~~~~~~~~~~~~~~  ||
 |  |                                                                ||
 |  +----------------------------------------------------------------+|
 |                                                                    |
 +====================================================================+
```

### Chrome Bar Detail

```
 +--------------------------------------------------------------+
 |                                                              |
 |  (o)  (o)  (o)                Terminal                       |
 |                                                              |
 +--------------------------------------------------------------+
  ^                               ^
  Traffic light dots:             Title text:
  12px circles                    "Terminal"
  8px gap between                 Inter 12px
  Colors:                         --sf-text-muted
    #FF5F57 (close)               centered via auto margins
    #FEBC2E (minimize)
    #28C840 (maximize)
```

### Line Types

```
 Command line:
 +--------------------------------------------------------------+
 | $ specforge init --package @my/app|                          |
 +--------------------------------------------------------------+
   ^                                 ^
   ELM-081 prompt                    Blinking cursor
   accent (#00F0FF)                  accent, 530ms blink
   inline, 8px right margin

   ELM-080 text                      Type: "command"
   --sf-text (#DAE6F0)              Typed with 40ms per character

 Output line:
 +--------------------------------------------------------------+
 | Scanning package structure...                                |
 +--------------------------------------------------------------+
   ELM-080 text                      Type: "output"
   --sf-text-muted (#586E85)        Appears after 300ms delay
   No prompt prefix

 Comment line:
 +--------------------------------------------------------------+
 | # AI agents collaborate to understand your codebase          |
 +--------------------------------------------------------------+
   ELM-080 text                      Type: "comment"
   rgba(0, 240, 255, 0.4)           Italic
   No prompt prefix
```

### Animation Sequence

```
 Time    Event
 ----    -----
 0ms     Terminal window appears
 500ms   Cursor starts blinking at prompt
 540ms   First character "s" appears
 580ms   "sp" appears
 620ms   "spe" appears
  ...    (40ms per character, typing effect)
 ~1780ms Full command typed: "specforge init --package @my/app"
 ~2080ms Cursor disappears, first output line fades in
 ~2380ms Second output line fades in
 ~2680ms Third output line fades in
  ...    (300ms between each output/comment line)
 ~4780ms Final line "Done in 47.3s" appears
 ~5280ms New prompt with blinking cursor appears (idle state)
```

### Scanline Effect

```
 Overlay covering terminal body:
 +--------------------------------------------------------------+
 | ============================================================ |  <-- 2px transparent
 | ============================================================ |  <-- 2px rgba(0,240,255,0.02)
 | ============================================================ |  <-- repeating 4px pattern
 | ============================================================ |
 +--------------------------------------------------------------+
  pointer-events: none
  z-index: 1 (above text but non-interactive)
  Very subtle -- barely perceptible green tint in alternating lines
```

## Visual States

### ELM-080 CLI Demo Line

| Type    | Color                       | Style  | Prompt |
| ------- | --------------------------- | ------ | ------ |
| command | `--sf-text` (#DAE6F0)       | normal | yes    |
| output  | `--sf-text-muted` (#586E85) | normal | no     |
| comment | `rgba(0, 240, 255, 0.4)`    | italic | no     |

- JetBrains Mono, 13px, line-height 1.7.
- `white-space: pre-wrap` to preserve spacing.

### ELM-081 CLI Demo Prompt

- Accent-colored `$` character.
- Inline display, 8px right margin before command text.
- Blinking cursor (2px wide `|` character) at the end of the typing position.
- Cursor blinks at 530ms intervals using `step-end` animation.
- Cursor disappears once command is fully typed and output begins.

## Animation Timing

| Parameter           | Value | Description                          |
| ------------------- | ----- | ------------------------------------ |
| `typing-speed`      | 40ms  | Delay between each character typed   |
| `line-appear-delay` | 300ms | Delay between output lines appearing |
| `initial-delay`     | 500ms | Wait before typing begins            |
| `cursor-blink-rate` | 530ms | Cursor blink interval (on/off cycle) |

Animation respects `prefers-reduced-motion`:

- When reduced motion is enabled, all text appears immediately (no typing effect).
- Cursor blink animation is disabled.
- Scanline effect is static.

## Token Usage

| Token             | Usage                                     |
| ----------------- | ----------------------------------------- |
| `--sf-surface`    | Terminal body background                  |
| `--sf-accent`     | Prompt color, cursor color, scanline tint |
| `--sf-text`       | Command text color                        |
| `--sf-text-muted` | Output text color, title text, chrome bg  |
| `--sf-font-mono`  | All terminal text (JetBrains Mono)        |
| `--sf-font-body`  | Chrome title bar text (Inter)             |

## Cross-References

- **Component:** CMP-025-how-it-works-flow (section above)
- **Component:** CMP-027-pricing-table (section below)
- **Page:** PGE-003-landing-page (parent page)
