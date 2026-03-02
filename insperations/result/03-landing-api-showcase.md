# 03 — Landing Page (API Showcase)

**Title:** Result — Type-Safe Error Handling for TypeScript
**Type:** API-focused landing page
**Layout:** Vertical scroll, 6 sections
**Accent:** `#A6E22E` (lime)
**Mood:** Reference card meets marketing page — the full API surface is the selling point

---

## Overview

This variant puts the **API breadth** front and center. Instead of vague feature descriptions, each section shows actual code. The hero has a compact interactive-style code block, followed by sections dedicated to constructors, chaining, combinators, async, and the Option type. Designed for developers who want to _see what the library does_ before reading docs.

---

## Color Palette

Uses the Result palette (see `design-system.md`) plus:

| Token           | Value     | Usage                    |
| --------------- | --------- | ------------------------ |
| `ok-green`      | `#A6E22E` | Ok annotations           |
| `err-red`       | `#F92672` | Err annotations          |
| `type-cyan`     | `#8BE9FD` | Type annotations in code |
| `keyword-pink`  | `#FF79C6` | Keywords in code         |
| `fn-green`      | `#50FA7B` | Function names in code   |
| `string-yellow` | `#F1FA8C` | Strings in code          |

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  (same as 01)                                                |
+------------------------------------------------------------------+
|                                                                    |
|  HERO  min-h-80vh  bg: #020408                                     |
|  centered: mono label + H1 + tagline + CTA + install              |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  CODE BLOCK  max-w-600px centered                           |   |
|  |                                                             |   |
|  |  const user = fetchUser(id)                                 |   |
|  |    .andThen(validate)                                       |   |
|  |    .map(format)                                             |   |
|  |    .match(ok => ok, err => fallback(err));                  |   |
|  |                                                             |   |
|  |  // typeof user: Profile                                    |   |
|  |  // possible errors: NotFound | ValidationFailed            |   |
|  +------------------------------------------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CONSTRUCTORS  bg: #08101C  py-24                                  |
|                                                                    |
|   "Many ways to create a Result"                                   |
|                                                                    |
|  +----------------+  +----------------+  +----------------+        |
|  | ok / err       |  | tryCatch       |  | fromNullable   |        |
|  |                |  |                |  |                |        |
|  | ok(42)         |  | tryCatch(      |  | fromNullable(  |        |
|  | err({ _tag:    |  |   () => parse  |  |   lookup(key), |        |
|  |  "NotFound" }) |  |   (raw),       |  |   () => err    |        |
|  |                |  |   mapErr       |  | )              |        |
|  |                |  | )              |  |                |        |
|  +----------------+  +----------------+  +----------------+        |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CHAINING  bg: #020408  py-24                                      |
|                                                                    |
|   "Transform and chain without losing type safety"                 |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | map / mapErr     |  | andThen / orElse |  | andTee / orTee   |  |
|  |                  |  |                  |  |                  |  |
|  | result           |  | result           |  | result           |  |
|  |  .map(x => x*2)  |  |  .andThen(fn)    |  |  .andTee(log)    |  |
|  |  .mapErr(wrap)    |  |  .orElse(retry)  |  |  .orTee(report)  |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  COMBINATORS  bg: #08101C  py-24                                   |
|                                                                    |
|   "Combine multiple Results at once"                               |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | all()            |  | collect()        |  | partition()      |  |
|  |                  |  |                  |  |                  |  |
|  | all(             |  | collect(         |  | partition([      |  |
|  |   getUser(),     |  |   validate(a),   |  |   ok(1),         |  |
|  |   getPerms(),    |  |   validate(b),   |  |   err("x"),      |  |
|  |   getPrefs()     |  |   validate(c)    |  |   ok(3),         |  |
|  | )                |  | )                |  | ])               |  |
|  | // Ok<[U,P,Pr]>  |  | // all errors    |  | // [[1,3],["x"]] |  |
|  | // short-circuits|  | // accumulated    |  | // split apart   |  |
|  +------------------+  +------------------+  +------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  ASYNC + OPTION  bg: #020408  py-24                                |
|                                                                    |
|  +-----------------------------+  +-----------------------------+  |
|  |  ResultAsync<T, E>          |  |  Option<T>                  |  |
|  |                             |  |                             |  |
|  |  fromPromise(               |  |  some(42)                   |  |
|  |    fetch("/api/user"),      |  |    .map(x => x * 2)        |  |
|  |    () => new NetworkError() |  |    .unwrapOr(0)             |  |
|  |  )                          |  |                             |  |
|  |    .andThen(parse)          |  |  fromNullable(              |  |
|  |    .map(normalize)          |  |    map.get("key")           |  |
|  |    // Promise<Result<T,E>>  |  |  )                          |  |
|  +-----------------------------+  +-----------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  ECOSYSTEM + FOOTER  (same as 01)                                  |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Hero Section

**Min-height:** 80vh
**Background:** `#020408` with radial gradient overlay

Same top section as 01 (mono label, H1, tagline, CTA, install box), but below the install box add:

### Hero Code Block

A prominent centered code window (max-width 600px) showing a complete pipeline:

```typescript
const user = fetchUser(id)
  .andThen(validate)
  .map(format)
  .match(
    profile => profile,
    error => fallback(error)
  );

// typeof user: Profile
// possible errors: NotFound | ValidationFailed
```

**Code window spec:**

- Same as 02 code window (macOS dots, filename, Dracula highlighting)
- The type comment lines use `#8BE9FD` (cyan) for type names
- The error union comment uses `#F92672` (pink) for error type names

---

## API Section Pattern (shared across Constructors, Chaining, Combinators)

Each API section follows this pattern:

1. **Section mono label** — e.g., `:: constructors`
2. **H2** — e.g., "Many ways to create a Result"
3. **Card grid** — 3 cards, each showing one API group

### API Card Spec

- `bg: #0a1420`, `border: 1px solid #1a2a3e`, `border-radius: 2px`
- **Header:** Card title in Rajdhani 600 1.1rem white, `margin-bottom: 12px`
- **Code:** Fira Code 0.8rem, Dracula highlighting, `line-height: 1.7`
- **Annotation:** Below code, Fira Code 0.75rem, `#8a9bb0`, explains behavior
- Hover: `border-color: #A6E22E60`
- **No description prose** — the code IS the description

---

## Constructors Section

**Background:** `#08101C`

3 cards:

| Card             | Code                                                        | Annotation                            |
| ---------------- | ----------------------------------------------------------- | ------------------------------------- |
| **ok / err**     | `ok(42)` / `err({ _tag: "NotFound", id })`                  | Direct construction. Frozen, branded. |
| **tryCatch**     | `tryCatch(() => JSON.parse(raw), (e) => new ParseError(e))` | Wraps throwing functions safely.      |
| **fromNullable** | `fromNullable(map.get(key), () => new MissingKey(key))`     | Converts null/undefined to Err.       |

---

## Chaining Section

**Background:** `#020408`

3 cards:

| Card                 | Code                                         | Annotation                             |
| -------------------- | -------------------------------------------- | -------------------------------------- |
| **map / mapErr**     | `.map(x => x * 2)` / `.mapErr(e => wrap(e))` | Transform Ok or Err independently.     |
| **andThen / orElse** | `.andThen(validate)` / `.orElse(retry)`      | Monadic bind. Short-circuits on Err.   |
| **andTee / orTee**   | `.andTee(log)` / `.orTee(report)`            | Side effects. Returns original Result. |

---

## Combinators Section

**Background:** `#08101C`

3 cards:

| Card            | Code                                             | Annotation                                       |
| --------------- | ------------------------------------------------ | ------------------------------------------------ |
| **all()**       | `all(getUser(), getPerms(), getPrefs())`         | Tuple of Ok values. Short-circuits on first Err. |
| **collect()**   | `collect(validate(a), validate(b), validate(c))` | Accumulates ALL errors. No short-circuit.        |
| **partition()** | `partition([ok(1), err("x"), ok(3)])`            | Splits into `[okValues, errValues]`.             |

---

## Async + Option Section

**Background:** `#020408`

2 cards (wider, `grid-cols-2`):

| Card                  | Code                                                                | Annotation                                  |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| **ResultAsync<T, E>** | `fromPromise(fetch("/api"), mapErr).andThen(parse).map(normalize)`  | Same API surface as sync Result. Awaitable. |
| **Option<T>**         | `some(42).map(x => x*2).unwrapOr(0)` / `fromNullable(map.get(key))` | Nullable handling without null checks.      |

---

## Key Design Decisions

- **Code is the hero** — every section leads with code, not prose
- **No illustrations** — the API surface _is_ the visual
- **Consistent card grid** — 3 per row for API groups, 2 per row for larger examples
- **Annotations inline** — short comments below code blocks, not separate paragraphs
- **Progressive disclosure** — Hero shows the complete story, sections drill into each capability

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
      .api-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 2px;
        padding: 24px;
        transition: border-color 0.3s;
      }
      .api-card:hover {
        border-color: var(--accent-60);
      }
      .api-card h3 {
        font-family: "Rajdhani", sans-serif;
        font-weight: 600;
        font-size: 1.1rem;
        color: var(--text);
        margin-bottom: 12px;
      }
      .api-card pre {
        font-family: "Fira Code", monospace;
        font-size: 0.8rem;
        line-height: 1.7;
        margin: 0;
      }
      .api-card .annotation {
        font-family: "Fira Code", monospace;
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }
      .section-header {
        text-align: center;
        margin-bottom: 2.5rem;
      }
      .section-header .mono-label {
        font-family: "Fira Code", monospace;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.25em;
        color: var(--accent);
        margin-bottom: 12px;
      }
      .section-header h2 {
        font-family: "Rajdhani", sans-serif;
        font-weight: 700;
        font-size: clamp(1.8rem, 3vw, 2.6rem);
        letter-spacing: -0.01em;
        color: var(--text);
      }
    </style>
  </head>
  <body>
    <!-- NAV (same as 01) -->

    <!-- HERO (same as 01 + code block below install box) -->
    <section
      style="min-height:80vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);position:relative;padding:6rem 2rem 4rem;"
    >
      <div
        style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%, var(--accent-08) 0%, transparent 60%);pointer-events:none;"
      ></div>
      <div style="text-align:center;max-width:800px;position:relative;z-index:1;">
        <!-- mono label, H1, tagline, CTA, install box (same as 01) -->
      </div>
      <!-- Hero code block -->
      <div style="max-width:600px;width:100%;margin-top:3rem;position:relative;z-index:1;">
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
              >example.ts</span
            >
          </div>
          <pre
            style="padding:24px;font-family:'Fira Code',monospace;font-size:0.85rem;line-height:1.7;color:var(--text-muted);background:var(--bg);margin:0;"
          ><!-- highlighted code --></pre>
        </div>
      </div>
    </section>

    <!-- CONSTRUCTORS -->
    <section style="background:var(--surface);padding:6rem 2rem;">
      <div style="max-width:1000px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: constructors</p>
          <h2>Many ways to create a Result</h2>
        </div>
        <div
          style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
        >
          <div class="api-card">
            <h3>ok / err</h3>
            <pre><!-- code --></pre>
            <p class="annotation">Direct construction. Frozen, branded.</p>
          </div>
          <div class="api-card">
            <h3>tryCatch</h3>
            <pre><!-- code --></pre>
            <p class="annotation">Wraps throwing functions safely.</p>
          </div>
          <div class="api-card">
            <h3>fromNullable</h3>
            <pre><!-- code --></pre>
            <p class="annotation">Converts null/undefined to Err.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CHAINING -->
    <section style="background:var(--bg);padding:6rem 2rem;">
      <div style="max-width:1000px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: chaining</p>
          <h2>Transform and chain without losing type safety</h2>
        </div>
        <div
          style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
        >
          <!-- 3 api-cards -->
        </div>
      </div>
    </section>

    <!-- COMBINATORS -->
    <section style="background:var(--surface);padding:6rem 2rem;">
      <div style="max-width:1000px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: combinators</p>
          <h2>Combine multiple Results at once</h2>
        </div>
        <div
          style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
        >
          <!-- 3 api-cards -->
        </div>
      </div>
    </section>

    <!-- ASYNC + OPTION -->
    <section style="background:var(--bg);padding:6rem 2rem;">
      <div style="max-width:1000px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: extensions</p>
          <h2>Async and nullable support built in</h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <!-- 2 wider api-cards -->
        </div>
      </div>
    </section>

    <!-- ECOSYSTEM + FOOTER (same as 01) -->
  </body>
</html>
```

</details>
