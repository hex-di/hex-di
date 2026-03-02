# 02 — Landing Page (Railway Diagram)

**Title:** Result — Type-Safe Error Handling for TypeScript
**Type:** Marketing landing page with visual storytelling
**Layout:** Vertical scroll, 5 sections
**Accent:** `#A6E22E` (lime)
**Mood:** Technical elegance — the railway-oriented programming concept is visualized as a literal track diagram

---

## Overview

Extends the baseline by adding a **railway track SVG** in the hero — a visual metaphor for the Ok/Err branching model. Below the hero, a **live code example** section shows Result chaining alongside its visual representation. Richer than 01 but still restrained.

---

## Color Palette

Uses the Result palette (see `design-system.md`) plus:

| Token        | Value       | Usage                                         |
| ------------ | ----------- | --------------------------------------------- |
| `ok-green`   | `#A6E22E`   | Same as accent — Ok path color in railway SVG |
| `err-red`    | `#F92672`   | Err path color in railway SVG                 |
| `err-red-20` | `#F9267233` | Err card borders, subtle backgrounds          |

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  (same as 01)                                                |
+------------------------------------------------------------------+
|                                                                    |
|  HERO  min-h-90vh  bg: #020408                                     |
|                                                                    |
|  +----------------------------+  +----------------------------+    |
|  |  Left col (text)           |  |  Right col (railway SVG)   |    |
|  |                            |  |                            |    |
|  |  @hex-di ecosystem         |  |     ok(value)              |    |
|  |                            |  |    /         \             |    |
|  |  Result                    |  |  map()    andThen()        |    |
|  |                            |  |    |         |             |    |
|  |  Errors become values.     |  |  ok(v2)   ok(v3)          |    |
|  |  Values become pipelines.  |  |    |         |             |    |
|  |                            |  |    +----+----+             |    |
|  |  [ Get Started ]           |  |         |                  |    |
|  |                            |  |     match()                |    |
|  |  npm install @hex-di/result|  |    /         \             |    |
|  +----------------------------+  |  onOk()    onErr()         |    |
|                                  +----------------------------+    |
+------------------------------------------------------------------+
|                                                                    |
|  CODE EXAMPLE  bg: #08101C  py-24                                  |
|                                                                    |
|  +----------------------------+  +----------------------------+    |
|  |  Left: description         |  |  Right: code window        |    |
|  |                            |  |                            |    |
|  |  "Chain, don't catch"      |  |  const result = fetchUser  |    |
|  |                            |  |    .andThen(validate)       |    |
|  |  * Map transforms values   |  |    .map(format)            |    |
|  |  * andThen chains Results  |  |    .match(                  |    |
|  |  * match extracts at end   |  |      ok => render(ok),     |    |
|  |  * Errors skip silently    |  |      err => show(err),     |    |
|  |                            |  |    );                       |    |
|  +----------------------------+  +----------------------------+    |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  FEATURES  bg: #020408  py-20  (same 6-card grid as 01)           |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  COMPARISON  bg: #08101C  py-24                                    |
|                                                                    |
|  +----------------------------+  +----------------------------+    |
|  |  BEFORE (red border)       |  |  AFTER (lime border)       |    |
|  |                            |  |                            |    |
|  |  try {                     |  |  fetchUser(id)             |    |
|  |    const user = await      |  |    .andThen(validate)      |    |
|  |      fetchUser(id);        |  |    .map(format)            |    |
|  |    const validated =       |  |    .match(                  |    |
|  |      validate(user);       |  |      ok => ok,             |    |
|  |    return format(validated)|  |      err => fallback(err)  |    |
|  |  } catch (e) {             |  |    );                       |    |
|  |    // what type is e???    |  |                            |    |
|  |    return fallback(e);     |  |  // err type: NotFound     |    |
|  |  }                         |  |  //   | ValidationFailed   |    |
|  |                            |  |  // fully typed, exhaustive|    |
|  +----------------------------+  +----------------------------+    |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  ECOSYSTEM + FOOTER  (same as 01)                                  |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Hero Section

**Min-height:** 90vh
**Layout:** 2-column grid on lg+ (`grid-cols-2 gap-16 items-center`), stacks on mobile

### Left Column

Same content as 01 hero but with a **two-line tagline** instead of one:

- Line 1: "Errors become values."
- Line 2: "Values become pipelines."
- Both in Inter 1.15rem, `#a0b4c8`

### Right Column — Railway SVG

An animated SVG diagram showing the Result railway:

```
         ok(value)
        /
  input ─── map() ─── andThen() ─── match()
        \                            /     \
         err(error) ─── (skip) ─── onOk   onErr
```

**SVG spec:**

- Width: 400px, height: 350px, `viewBox="0 0 400 350"`
- Ok path: `stroke: #A6E22E`, stroke-width 2, dashed
- Err path: `stroke: #F92672`, stroke-width 2, dashed
- Node circles: 8px radius, filled `#0a1420`, stroke matches path color
- Node labels: Fira Code 11px, color matches path
- Animation: paths draw in with `stroke-dashoffset` over 2s on page load
- A small dot travels along the Ok path (SVG `animateMotion`, 4s loop, lime glow)

---

## Code Example Section

**Background:** `#08101C`
**Layout:** 2-column grid (`grid-cols-5`), left 2/5 text, right 3/5 code window

### Left Column

- H2: "Chain, don't catch" — Rajdhani 700
- Bullet list (4 items), each with small lime square marker:
  - `map()` transforms the Ok value
  - `andThen()` chains Result-returning functions
  - `match()` extracts at the end of the pipeline
  - Errors propagate silently through the chain

### Right Column — Code Window

- Header bar: `#0a1420`, macOS dots (red/yellow/green at 50% opacity), filename "pipeline.ts"
- Code body: Dracula-highlighted TypeScript
- Bottom bar: thin 2px lime progress line

```typescript
const profile = fetchUser(id)
  .andThen(validateAge)
  .map(formatProfile)
  .match(
    profile => renderProfile(profile),
    error => renderError(error)
  );
```

---

## Comparison Section

**Background:** `#08101C`
**Layout:** 2-column grid, equal width, gap 24px

### "Before" Card (Traditional)

- Border: `1px solid #F9267240`
- Top label: `TRADITIONAL` — Fira Code 0.68rem, `#F92672`, uppercase
- Code: vanilla try-catch TypeScript, Dracula theme
- Bottom annotation: `// error type: unknown` in `#F92672`

### "After" Card (Result)

- Border: `1px solid #A6E22E40`
- Top label: `RESULT` — Fira Code 0.68rem, `#A6E22E`, uppercase
- Code: Result chain, Dracula theme
- Bottom annotation: `// error type: NotFound | ValidationFailed` in `#A6E22E`

Both cards: `bg: #0a1420`, `border-radius: 2px`, `padding: 24px`

---

## Features Section

Same 6-card grid as variant 01.

---

## Ecosystem + Footer

Same as variant 01.

---

## Animations

| Element           | Animation                               |
| ----------------- | --------------------------------------- |
| Feature cards     | `fade-in-up` on scroll, staggered 0.1s  |
| Railway SVG paths | `stroke-dashoffset` draw-in, 2s on load |
| Railway dot       | `animateMotion` along Ok path, 4s loop  |
| Code window       | `fade-in-up` on scroll                  |
| Comparison cards  | `fade-in-up` on scroll, 0.2s stagger    |

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
        --err: #f92672;
        --err-20: #f9267233;
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
      @keyframes draw-path {
        from {
          stroke-dashoffset: 1000;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
    </style>
  </head>
  <body>
    <!-- NAV (same as 01) -->
    <nav
      style="position:sticky;top:0;z-index:100;background:rgba(2,4,8,0.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between;"
    >
      <div
        style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.25rem;color:var(--text);"
      >
        Result
      </div>
      <div style="display:flex;gap:2rem;font-size:0.85rem;color:var(--text-secondary);">
        <a href="/docs">Docs</a>
        <a href="#">Libraries</a>
        <a href="/blog">Blog</a>
        <a href="#">GitHub</a>
      </div>
    </nav>

    <!-- HERO (2-col: text + railway SVG) -->
    <section
      style="min-height:90vh;display:flex;align-items:center;background:var(--bg);position:relative;"
    >
      <div
        style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%, var(--accent-08) 0%, transparent 60%);pointer-events:none;"
      ></div>
      <div
        style="max-width:1200px;margin:0 auto;padding:0 2rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;position:relative;z-index:1;"
      >
        <div>
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
          <p style="font-size:1.15rem;color:var(--text-secondary);margin-bottom:4px;">
            Errors become values.
          </p>
          <p style="font-size:1.15rem;color:var(--text-secondary);margin-bottom:28px;">
            Values become pipelines.
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
        <div style="display:flex;justify-content:center;">
          <!-- Railway SVG placeholder -->
          <svg viewBox="0 0 400 350" width="400" height="350" style="max-width:100%;">
            <!-- Ok path (lime) -->
            <path
              d="M 50 50 L 200 50 L 200 150 L 350 150"
              fill="none"
              stroke="#A6E22E"
              stroke-width="2"
              stroke-dasharray="8 4"
              style="animation:draw-path 2s ease forwards;"
            />
            <!-- Err path (red) -->
            <path
              d="M 50 50 L 50 250 L 200 250 L 350 250"
              fill="none"
              stroke="#F92672"
              stroke-width="2"
              stroke-dasharray="8 4"
              style="animation:draw-path 2s 0.5s ease forwards;"
            />
            <!-- Nodes -->
            <circle cx="50" cy="50" r="8" fill="#0a1420" stroke="#A6E22E" stroke-width="2" />
            <text
              x="50"
              y="35"
              text-anchor="middle"
              fill="#A6E22E"
              font-family="Fira Code"
              font-size="11"
            >
              ok(value)
            </text>
            <circle cx="200" cy="50" r="6" fill="#0a1420" stroke="#A6E22E" stroke-width="2" />
            <text
              x="200"
              y="35"
              text-anchor="middle"
              fill="#A6E22E"
              font-family="Fira Code"
              font-size="11"
            >
              map()
            </text>
            <circle cx="200" cy="150" r="6" fill="#0a1420" stroke="#A6E22E" stroke-width="2" />
            <text
              x="200"
              y="170"
              text-anchor="middle"
              fill="#A6E22E"
              font-family="Fira Code"
              font-size="11"
            >
              andThen()
            </text>
            <circle cx="350" cy="150" r="8" fill="#0a1420" stroke="#FFFFFF" stroke-width="2" />
            <text
              x="350"
              y="135"
              text-anchor="middle"
              fill="#FFFFFF"
              font-family="Fira Code"
              font-size="11"
            >
              match()
            </text>
            <circle cx="350" cy="250" r="6" fill="#0a1420" stroke="#F92672" stroke-width="2" />
            <text
              x="350"
              y="270"
              text-anchor="middle"
              fill="#F92672"
              font-family="Fira Code"
              font-size="11"
            >
              onErr()
            </text>
            <!-- Traveling dot on Ok path -->
            <circle r="4" fill="#A6E22E" filter="drop-shadow(0 0 6px #A6E22E)">
              <animateMotion
                dur="4s"
                repeatCount="indefinite"
                path="M 50 50 L 200 50 L 200 150 L 350 150"
              />
            </circle>
          </svg>
        </div>
      </div>
    </section>

    <!-- CODE EXAMPLE (2-col: text + code window) -->
    <section style="background:var(--surface);padding:6rem 2rem;">
      <div
        style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 3fr;gap:4rem;align-items:center;"
      >
        <div>
          <h2
            style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.6rem);color:var(--text);margin-bottom:16px;"
          >
            Chain, don't catch
          </h2>
          <ul
            style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:0.9rem;line-height:1.65;"
          >
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span>
              <code>map()</code> transforms the Ok value
            </li>
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span>
              <code>andThen()</code> chains Result-returning functions
            </li>
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span>
              <code>match()</code> extracts at the end
            </li>
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span> Errors propagate
              silently through the chain
            </li>
          </ul>
        </div>
        <div style="border:1px solid var(--border);border-radius:2px;overflow:hidden;">
          <div
            style="background:var(--card);border-bottom:1px solid var(--border);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;"
          >
            <div style="display:flex;gap:6px;">
              <div
                style="width:12px;height:12px;border-radius:50%;background:rgba(255,69,58,0.5);"
              ></div>
              <div
                style="width:12px;height:12px;border-radius:50%;background:rgba(255,214,10,0.5);"
              ></div>
              <div
                style="width:12px;height:12px;border-radius:50%;background:rgba(48,209,88,0.5);"
              ></div>
            </div>
            <span style="font-family:'Fira Code',monospace;font-size:0.7rem;color:var(--accent);"
              >pipeline.ts</span
            >
          </div>
          <pre
            style="padding:24px;font-family:'Fira Code',monospace;font-size:0.85rem;line-height:1.7;color:var(--text-muted);background:var(--bg);margin:0;"
          >
<span style="color:#FF79C6">const</span> profile = <span style="color:#50FA7B">fetchUser</span>(id)
  .<span style="color:#50FA7B">andThen</span>(validateAge)
  .<span style="color:#50FA7B">map</span>(formatProfile)
  .<span style="color:#50FA7B">match</span>(
    (profile) <span style="color:#FF79C6">=></span> <span style="color:#50FA7B">renderProfile</span>(profile),
    (error)   <span style="color:#FF79C6">=></span> <span style="color:#50FA7B">renderError</span>(error),
  );</pre>
          <div style="height:2px;background:var(--accent);opacity:0.4;"></div>
        </div>
      </div>
    </section>

    <!-- FEATURES (same 6-card grid as 01) -->
    <section style="background:var(--bg);padding:5rem 2rem;">
      <div
        style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
      >
        <!-- 6 feature cards (same as 01) -->
      </div>
    </section>

    <!-- COMPARISON (before/after) -->
    <section style="background:var(--surface);padding:6rem 2rem;">
      <div style="max-width:1000px;margin:0 auto;">
        <h2
          style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.6rem);color:var(--text);text-align:center;margin-bottom:2rem;"
        >
          Before & After
        </h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <!-- Before (red) -->
          <div
            style="background:var(--card);border:1px solid #F9267240;border-radius:2px;padding:24px;"
          >
            <p
              style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.2em;color:#F92672;margin-bottom:16px;"
            >
              Traditional
            </p>
            <pre
              style="font-family:'Fira Code',monospace;font-size:0.8rem;line-height:1.7;color:var(--text-muted);margin:0;"
            >
try-catch block here...</pre
            >
            <p
              style="font-family:'Fira Code',monospace;font-size:0.75rem;color:#F92672;margin-top:12px;"
            >
              // error type: unknown
            </p>
          </div>
          <!-- After (lime) -->
          <div
            style="background:var(--card);border:1px solid #A6E22E40;border-radius:2px;padding:24px;"
          >
            <p
              style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.2em;color:#A6E22E;margin-bottom:16px;"
            >
              Result
            </p>
            <pre
              style="font-family:'Fira Code',monospace;font-size:0.8rem;line-height:1.7;color:var(--text-muted);margin:0;"
            >
Result chain here...</pre
            >
            <p
              style="font-family:'Fira Code',monospace;font-size:0.75rem;color:#A6E22E;margin-top:12px;"
            >
              // error type: NotFound | ValidationFailed
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ECOSYSTEM + FOOTER (same as 01) -->
  </body>
</html>
```

</details>
