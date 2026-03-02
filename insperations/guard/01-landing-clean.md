# 01 — Landing Page (Clean Minimal)

**Title:** Guard — Compile-Time Safe Authorization for TypeScript
**Type:** Documentation landing page
**Layout:** Vertical scroll, 3 sections
**Accent:** `#F59E0B` (amber)
**Mood:** Clean, authoritative, developer-focused — mirrors the library's "policies are data" philosophy

---

## Overview

The baseline Guard landing page. Dark background, amber accent, sharp 2px corners. Three focused sections: Hero, Features, Ecosystem. No heavy animations — just fade-in-up on scroll. The code examples _are_ the visual centerpiece.

---

## Color Palette

Uses the Guard palette (see `design-system.md`).

- Background: `#020408` / `#08101C` alternating
- Accent: `#F59E0B` (amber)
- Deny: `#EF4444` (red)
- Allow: `#22C55E` (green)
- Text: `#FFFFFF` / `#a0b4c8` / `#8a9bb0`
- Border: `#1a2a3e`

---

## Typography

- Headings: **Rajdhani** 700, white
- Body: **Inter** 400, `#8a9bb0`
- Mono: **Fira Code** 400, `#F59E0B` for labels
- Hero H1: `clamp(2.5rem, 5vw, 4rem)`

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  sticky  logo: "Guard"  |  Docs  Libraries v  Blog  [GH]    |
+------------------------------------------------------------------+
|                                                                    |
|  HERO  min-h-80vh  bg: #020408                                     |
|  radial gradient overlay: #F59E0B08 ellipse at top center          |
|                                                                    |
|                  @hex-di ecosystem                                 |  <- mono label, amber
|                                                                    |
|                      Guard                                         |  <- H1, white, Rajdhani 700
|                                                                    |
|            Compile-Time Safe Authorization                         |  <- subtitle, #a0b4c8
|                 for TypeScript                                     |
|                                                                    |
|                 [ Get Started ]                                    |  <- amber bg, black text
|                                                                    |
|            +----------------------------+                          |
|            | npm install @hex-di/guard   |                          |  <- 1px amber border, mono
|            +----------------------------+                          |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  FEATURES  bg: #08101C  py-20                                      |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Compile-Time     |  | Role DAG         |  | 10 Policy        |  |
|  | Policies         |  | Inheritance      |  | Kinds            |  |
|  |                  |  |                  |  |                  |  |
|  | Policies are     |  | O(1) permission  |  | hasPermission,   |  |
|  | data, not        |  | lookup via DAG   |  | hasRole, allOf,  |  |
|  | decorators...    |  | flattening...    |  | anyOf, not...    |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Full Evaluation  |  | Framework        |  | GxP              |  |
|  | Traces           |  | Agnostic         |  | Ready            |  |
|  |                  |  |                  |  |                  |  |
|  | Every decision   |  | No decorators,   |  | 21 CFR Part 11,  |  |
|  | is auditable     |  | no reflection,   |  | audit trails,    |  |
|  | with full trace  |  | no magic...      |  | WAL logging...   |  |
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
|         Guard integrates seamlessly with                           |
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
**Background:** `#020408` with `radial-gradient(ellipse at 50% 0%, #F59E0B08 0%, transparent 60%)`
**Content:** Centered, `max-width: 800px`
**Elements (top to bottom):**

1. **Mono label:** `@hex-di ecosystem` — Fira Code 0.68rem, uppercase, tracking 0.25em, color `#F59E0B`
2. **H1:** "Guard" — Rajdhani 700, white, `clamp(2.5rem, 5vw, 4rem)`, tracking -0.02em
3. **Tagline:** "Compile-Time Safe Authorization for TypeScript" — Inter 1.15rem, `#a0b4c8`
4. **CTA:** "Get Started" — amber bg, black text, Rajdhani 600, padding 12px 28px, radius 2px
5. **Install box:** `npm install @hex-di/guard` — Fira Code 0.85rem, amber text, 1px amber border

**Spacing:** 16px between label and H1, 12px between H1 and tagline, 28px before CTA, 20px before install box.

---

## Features Section

**Background:** `#08101C`
**Padding:** `py-20`
**Grid:** `auto-fit, minmax(280px, 1fr)`, gap 24px, max-width 1000px centered

**6 Cards:**

| Title                  | Description                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Compile-Time Policies  | Policies are data, not decorators. Define authorization rules as composable values with full type safety at compile time.      |
| Role DAG Inheritance   | O(1) permission lookup via directed acyclic graph flattening. Define role hierarchies that resolve instantly at runtime.       |
| 10 Policy Kinds        | hasPermission, hasRole, hasAttribute, hasResourceAttribute, hasSignature, hasRelationship, allOf, anyOf, not, and labeled.     |
| Full Evaluation Traces | Every authorization decision is auditable. The Decision object carries the full evaluation trace, timing, and policy metadata. |
| Framework Agnostic     | No decorators, no reflection, no magic. Pure functions and data structures that work everywhere TypeScript runs.               |
| GxP Ready              | 21 CFR Part 11 compliance support. Electronic signatures, audit trails, write-ahead logging, and tamper-evident records.       |

**Card spec:**

- `bg: #0a1420`, `border: 1px solid #1a2a3e`, `border-radius: 2px`, `padding: 28px`
- Title: Rajdhani 600, 1.1rem, white, `margin-bottom: 8px`
- Description: Inter 0.9rem, `#8a9bb0`, line-height 1.65
- Hover: `border-color: #F59E0B60`, transition 0.3s
- Entry animation: `fade-in-up` on scroll, staggered +0.1s per card

---

## Ecosystem Section

**Background:** `#020408`
**Padding:** `py-20`
**Content:** Centered, max-width 600px

1. **Mono label:** `:: ecosystem` — same style as hero label
2. **H2:** "Part of the HexDI Stack" — Rajdhani 700, `clamp(1.8rem, 3vw, 2.6rem)`, white
3. **Body:** "Guard integrates seamlessly with the HexDI dependency injection ecosystem. Define policies as port adapters, compose them in your graph, and enforce authorization at compile time." — Inter 0.9rem, `#8a9bb0`
4. **CTA:** "Explore HexDI" — outline button, 1px amber border, amber text. Hover: filled amber bg, black text.

---

## Key UX Patterns

- **No heavy animations** — just `fade-in-up` on feature cards
- **No HUD brackets** — cleaner than core HexDI site
- **No floating SVGs** — the library is about security, the site should be authoritative
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
    <title>Guard — Compile-Time Safe Authorization for TypeScript</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400&family=Fira+Code:wght@400&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #020408;
        --surface: #08101c;
        --card: #0a1420;
        --accent: #f59e0b;
        --accent-40: #f59e0b40;
        --accent-60: #f59e0b60;
        --accent-08: #f59e0b08;
        --deny: #ef4444;
        --allow: #22c55e;
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
        Guard
      </div>
      <div
        style="display:flex;gap:2rem;font-family:'Inter',sans-serif;font-size:0.85rem;color:var(--text-secondary);"
      >
        <a href="/docs">Docs</a>
        <a href="#">Libraries</a>
        <a href="/blog">Blog</a>
        <a href="https://github.com/hex-di/guard">GitHub</a>
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
          Guard
        </h1>
        <p style="font-size:1.15rem;color:var(--text-secondary);margin-bottom:28px;">
          Compile-Time Safe Authorization for TypeScript
        </p>
        <a
          href="/docs"
          style="display:inline-block;background:var(--accent);color:var(--bg);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 28px;border-radius:2px;text-decoration:none;margin-bottom:20px;"
          >Get Started</a
        >
        <div
          style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--accent);padding:12px 16px;border-radius:2px;font-family:'Fira Code',monospace;font-size:0.85rem;color:var(--accent);"
        >
          npm install @hex-di/guard
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section style="background:var(--surface);padding:5rem 2rem;">
      <div
        style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
      >
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            Compile-Time Policies
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            Policies are data, not decorators. Define authorization rules as composable values with
            full type safety at compile time.
          </p>
        </div>
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            Role DAG Inheritance
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            O(1) permission lookup via directed acyclic graph flattening. Define role hierarchies
            that resolve instantly at runtime.
          </p>
        </div>
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            10 Policy Kinds
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            hasPermission, hasRole, hasAttribute, hasResourceAttribute, hasSignature,
            hasRelationship, allOf, anyOf, not, and labeled.
          </p>
        </div>
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            Full Evaluation Traces
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            Every authorization decision is auditable. The Decision object carries the full
            evaluation trace, timing, and policy metadata.
          </p>
        </div>
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            Framework Agnostic
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            No decorators, no reflection, no magic. Pure functions and data structures that work
            everywhere TypeScript runs.
          </p>
        </div>
        <div
          style="background:var(--card);border:1px solid var(--border);border-radius:2px;padding:28px;transition:border-color 0.3s;"
        >
          <h3
            style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
          >
            GxP Ready
          </h3>
          <p style="font-size:0.9rem;line-height:1.65;">
            21 CFR Part 11 compliance support. Electronic signatures, audit trails, write-ahead
            logging, and tamper-evident records.
          </p>
        </div>
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
          Guard integrates seamlessly with the HexDI dependency injection ecosystem. Define policies
          as port adapters, compose them in your graph, and enforce authorization at compile time.
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
        &middot; Result &middot; Saga
      </div>
      <div>
        <strong style="color:var(--text-secondary);">Community</strong><br />GitHub &middot; Blog
      </div>
    </footer>
  </body>
</html>
```

</details>
