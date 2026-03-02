# 01 — Landing Page (Clean Minimal)

**Title:** Result — Type-Safe Error Handling for TypeScript
**Type:** Documentation landing page
**Layout:** Vertical scroll, 3 sections
**Accent:** `#A6E22E` (lime)
**Mood:** Clean, developer-focused, no gimmicks — mirrors the library's "errors are values" philosophy

---

## Overview

The baseline Result landing page. Dark background, lime accent, sharp 2px corners. Three focused sections: Hero, Features, Ecosystem. No heavy animations — just fade-in-up on scroll. The code examples _are_ the visual centerpiece.

---

## Color Palette

Uses the Result palette (see `design-system.md`).

- Background: `#020408` / `#08101C` alternating
- Accent: `#A6E22E` (lime)
- Text: `#FFFFFF` / `#a0b4c8` / `#8a9bb0`
- Border: `#1a2a3e`

---

## Typography

- Headings: **Rajdhani** 700, white
- Body: **Inter** 400, `#8a9bb0`
- Mono: **Fira Code** 400, `#A6E22E` for labels
- Hero H1: `clamp(2.5rem, 5vw, 4rem)`

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  sticky  logo: "Result"  |  Docs  Libraries v  Blog  [GH]  |
+------------------------------------------------------------------+
|                                                                    |
|  HERO  min-h-80vh  bg: #020408                                     |
|  radial gradient overlay: #A6E22E08 ellipse at top center          |
|                                                                    |
|                  @hex-di ecosystem                                 |  <- mono label, lime
|                                                                    |
|                      Result                                        |  <- H1, white, Rajdhani 700
|                                                                    |
|             Type-Safe Error Handling                               |  <- subtitle, #a0b4c8
|                 for TypeScript                                     |
|                                                                    |
|                 [ Get Started ]                                    |  <- lime bg, black text
|                                                                    |
|            +----------------------------+                          |
|            | npm install @hex-di/result  |                          |  <- 1px lime border, mono
|            +----------------------------+                          |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  FEATURES  bg: #08101C  py-20                                      |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | No More          |  | Railway-         |  | Exhaustive       |  |
|  | Try-Catch        |  | Oriented         |  | Matching         |  |
|  |                  |  |                  |  |                  |  |
|  | Errors are       |  | Chain ops with   |  | TypeScript       |  |
|  | values, not      |  | map, flatMap,    |  | ensures you      |  |
|  | exceptions...    |  | and recover...   |  | handle every...  |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Zero Runtime     |  | Composable       |  | Framework        |  |
|  | Cost             |  |                  |  | Agnostic         |  |
|  |                  |  |                  |  |                  |  |
|  | Lightweight      |  | Combine Results  |  | Works everywhere |  |
|  | wrapper, no      |  | with all,        |  | TypeScript       |  |
|  | dependencies...  |  | collect...       |  | runs...          |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  ECOSYSTEM  bg: #020408  py-20                                     |
|                                                                    |
|                    :: ecosystem                                    |  <- mono label
|                                                                    |
|              Part of the HexDI Stack                               |  <- H2
|                                                                    |
|         Result integrates seamlessly with                          |
|         the HexDI dependency injection                             |
|         ecosystem...                                               |
|                                                                    |
|                [ Explore HexDI ]                                   |  <- outline button
|                                                                    |
+------------------------------------------------------------------+
|  FOOTER  3-col: Docs | Ecosystem | Community                      |
|  Copyright                                                         |
+------------------------------------------------------------------+
```

---

## Hero Section

**Min-height:** 80vh
**Background:** `#020408` with `radial-gradient(ellipse at 50% 0%, #A6E22E08 0%, transparent 60%)`
**Content:** Centered, `max-width: 800px`
**Elements (top to bottom):**

1. **Mono label:** `@hex-di ecosystem` — Fira Code 0.68rem, uppercase, tracking 0.25em, color `#A6E22E`
2. **H1:** "Result" — Rajdhani 700, white, `clamp(2.5rem, 5vw, 4rem)`, tracking -0.02em
3. **Tagline:** "Type-Safe Error Handling for TypeScript" — Inter 1.15rem, `#a0b4c8`
4. **CTA:** "Get Started" — lime bg, black text, Rajdhani 600, padding 12px 28px, radius 2px
5. **Install box:** `npm install @hex-di/result` — Fira Code 0.85rem, lime text, 1px lime border

**Spacing:** 16px between label and H1, 12px between H1 and tagline, 28px before CTA, 20px before install box.

---

## Features Section

**Background:** `#08101C`
**Padding:** `py-20`
**Grid:** `auto-fit, minmax(280px, 1fr)`, gap 24px, max-width 1000px centered

**6 Cards:**

| Title               | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| No More Try-Catch   | Errors are values, not exceptions. Pattern match on success and failure paths with full type safety.  |
| Railway-Oriented    | Chain operations with map, flatMap, and recover. Errors propagate automatically through the pipeline. |
| Exhaustive Matching | TypeScript ensures you handle every error variant. No silent failures, no forgotten catch blocks.     |
| Zero Runtime Cost   | Lightweight wrapper with no dependencies. Result<T, E> compiles away to simple objects.               |
| Composable          | Combine multiple Results with combine, all, and sequence. Build complex flows from simple parts.      |
| Framework Agnostic  | Works everywhere TypeScript runs. No decorators, no reflection, no magic.                             |

**Card spec:**

- `bg: #0a1420`, `border: 1px solid #1a2a3e`, `border-radius: 2px`, `padding: 28px`
- Title: Rajdhani 600, 1.1rem, white, `margin-bottom: 8px`
- Description: Inter 0.9rem, `#8a9bb0`, line-height 1.65
- Hover: `border-color: #A6E22E60`, transition 0.3s
- Entry animation: `fade-in-up` on scroll, staggered +0.1s per card

---

## Ecosystem Section

**Background:** `#020408`
**Padding:** `py-20`
**Content:** Centered, max-width 600px

1. **Mono label:** `:: ecosystem` — same style as hero label
2. **H2:** "Part of the HexDI Stack" — Rajdhani 700, `clamp(1.8rem, 3vw, 2.6rem)`, white
3. **Body:** "Result integrates seamlessly with the HexDI dependency injection ecosystem. Adapters return Result<T, E>, and the error channel flows through the graph at compile time." — Inter 0.9rem, `#8a9bb0`
4. **CTA:** "Explore HexDI" — outline button, 1px lime border, lime text. Hover: filled lime bg, black text.

---

## Key UX Patterns

- **No heavy animations** — just `fade-in-up` on feature cards
- **No HUD brackets** — cleaner than core HexDI site
- **No floating SVGs** — the library is about simplicity, the site should be too
- **Sharp corners** — `border-radius: 2px` everywhere, never rounded
- **Dark mode only** — no toggle
- **Code = hero** — if expanding this variant, code examples go front-and-center (not illustrations)

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Result — Type-Safe Error Handling for TypeScript</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400&family=Fira+Code:wght@400&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #020408;
        --surface: #08101c;
        --card: #0a1420;
        --accent: #a6e22e;
        --accent-40: #a6e22e40;
        --accent-60: #a6e22e60;
        --accent-08: #a6e22e08;
        --text: #ffffff;
        --text-secondary: #a0b4c8;
        --text-muted: #8a9bb0;
        --border: #1a2a3e;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        background: var(--bg);
        color: var(--text-muted);
        font-family: "Inter", sans-serif;
        overflow-x: hidden;
      }
      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  </head>
  <body>
    <!-- NAV -->
    <nav
      style="position:sticky;top:0;z-index:100;background:rgba(2,4,8,0.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between;"
    >
      <div
        style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.25rem;color:var(--text);"
      >
        Result
      </div>
      <div
        style="display:flex;gap:2rem;font-family:'Inter',sans-serif;font-size:0.85rem;color:var(--text-secondary);"
      >
        <a href="/docs">Docs</a>
        <a href="#">Libraries</a>
        <a href="/blog">Blog</a>
        <a href="https://github.com/hex-di/result">GitHub</a>
      </div>
    </nav>

    <!-- HERO -->
    <section
      style="min-height:80vh;display:flex;align-items:center;justify-content:center;background:var(--bg);position:relative;"
    >
      <div
        style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%, var(--accent-08) 0%, transparent 60%);pointer-events:none;"
      ></div>
      <div style="text-align:center;max-width:800px;padding:0 2rem;position:relative;z-index:1;">
        <p
          style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.25em;color:var(--accent);margin-bottom:16px;"
        >
          @hex-di ecosystem
        </p>
        <h1
          style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(2.5rem,5vw,4rem);letter-spacing:-0.02em;color:var(--text);margin-bottom:12px;"
        >
          Result
        </h1>
        <p style="font-size:1.15rem;color:var(--text-secondary);margin-bottom:28px;">
          Type-Safe Error Handling for TypeScript
        </p>
        <a
          href="/docs"
          style="display:inline-block;background:var(--accent);color:var(--bg);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 28px;border-radius:2px;text-decoration:none;margin-bottom:20px;"
          >Get Started</a
        >
        <div
          style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--accent);padding:12px 16px;border-radius:2px;font-family:'Fira Code',monospace;font-size:0.85rem;color:var(--accent);"
        >
          npm install @hex-di/result
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section style="background:var(--surface);padding:5rem 2rem;">
      <div
        style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
      >
        <!-- Repeat 6x: feature card -->
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            No More Try-Catch
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            Errors are values, not exceptions. Pattern match on success and failure paths with full
            type safety.
          </p>
        </div>
        <!-- ... 5 more cards -->
      </div>
    </section>

    <!-- ECOSYSTEM -->
    <section style="background:var(--bg);padding:5rem 2rem;text-align:center;">
      <div style="max-width:600px;margin:0 auto;">
        <p
          style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.25em;color:var(--accent);margin-bottom:16px;"
        >
          :: ecosystem
        </p>
        <h2
          style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.6rem);letter-spacing:-0.01em;line-height:1.2;color:var(--text);margin-bottom:16px;"
        >
          Part of the HexDI Stack
        </h2>
        <p style="font-size:0.9rem;line-height:1.65;margin-bottom:28px;">
          Result integrates seamlessly with the HexDI dependency injection ecosystem. Adapters
          return Result&lt;T, E&gt;, and the error channel flows through the graph at compile time.
        </p>
        <a
          href="https://hexdi.dev"
          style="display:inline-block;border:1px solid var(--accent);color:var(--accent);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 28px;border-radius:2px;text-decoration:none;transition:background 0.2s,color 0.2s;"
          >Explore HexDI</a
        >
      </div>
    </section>

    <!-- FOOTER -->
    <footer
      style="border-top:1px solid var(--border);padding:3rem 2rem;display:flex;justify-content:center;gap:4rem;font-size:0.8rem;color:var(--text-muted);"
    >
      <div><strong style="color:var(--text-secondary);">Docs</strong><br />Getting Started</div>
      <div>
        <strong style="color:var(--text-secondary);">Ecosystem</strong><br />Core &middot; Flow
        &middot; Guard &middot; Saga
      </div>
      <div>
        <strong style="color:var(--text-secondary);">Community</strong><br />GitHub &middot; Blog
      </div>
    </footer>
  </body>
</html>
```

</details>
