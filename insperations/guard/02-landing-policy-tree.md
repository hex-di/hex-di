# 02 — Landing Page (Policy Composition Tree)

**Title:** Guard — Compile-Time Safe Authorization for TypeScript
**Type:** Marketing landing page with visual storytelling
**Layout:** Vertical scroll, 5 sections
**Accent:** `#F59E0B` (amber)
**Mood:** Technical elegance — the policy composition tree is the visual metaphor, showing how `allOf`/`anyOf`/`not` compose into a decision tree

---

## Overview

Extends the baseline by adding a **policy tree SVG** in the hero — a visual metaphor for how Guard composes policies declaratively. Below the hero, a **live code example** section shows policy composition alongside its visual representation, followed by a **before/after comparison** of imperative permission checks vs declarative policies. Richer than 01 but still restrained.

---

## Color Palette

Uses the Guard palette (see `design-system.md`) plus:

| Token         | Value       | Usage                                      |
| ------------- | ----------- | ------------------------------------------ |
| `allow-green` | `#22C55E`   | Allow decision nodes in policy tree SVG    |
| `deny-red`    | `#EF4444`   | Deny decision nodes, "before" card borders |
| `deny-red-20` | `#EF444433` | Deny card subtle backgrounds               |
| `node-amber`  | `#F59E0B`   | Composition nodes (allOf, anyOf)           |
| `leaf-muted`  | `#8a9bb0`   | Leaf policy labels before evaluation       |

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
|  |  Left col (text)           |  |  Right col (policy tree)   |    |
|  |                            |  |                            |    |
|  |  @hex-di ecosystem         |  |        allOf               |    |
|  |                            |  |       /    \               |    |
|  |  Guard                     |  |  hasRole  anyOf            |    |
|  |                            |  |   "admin" /    \           |    |
|  |  Compose policies,         |  |    hasPerm  not            |    |
|  |  not permission checks.    |  |   "Write"    |             |    |
|  |                            |  |           hasAttr          |    |
|  |  [ Get Started ]           |  |          "suspended"       |    |
|  |                            |  |                            |    |
|  |  npm install @hex-di/guard |  |  nodes glow amber/green/red|    |
|  +----------------------------+  +----------------------------+    |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CODE EXAMPLE  bg: #08101C  py-24                                  |
|                                                                    |
|  +----------------------------+  +----------------------------+    |
|  |  Left: description         |  |  Right: code window        |    |
|  |                            |  |                            |    |
|  |  "Compose, don't hardcode" |  |  const policy = allOf(     |    |
|  |                            |  |    hasPermission(Write),   |    |
|  |  * Policies are values     |  |    not(                    |    |
|  |  * Compose with allOf/anyOf|  |      hasAttribute(         |    |
|  |  * Negate with not()       |  |        "suspended", true   |    |
|  |  * Full evaluation trace   |  |      )                     |    |
|  |                            |  |    ),                       |    |
|  |                            |  |  );                         |    |
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
|  |  BEFORE (red border)       |  |  AFTER (amber border)      |    |
|  |                            |  |                            |    |
|  |  if (user.role === "admin" |  |  const policy = allOf(     |    |
|  |    || user.permissions     |  |    hasRole("admin"),       |    |
|  |      .includes("Write"))  |  |    hasPermission(Write),   |    |
|  |  {                         |  |  );                         |    |
|  |    if (!user.suspended) {  |  |                            |    |
|  |      // allow              |  |  const decision =          |    |
|  |    }                       |  |    evaluate(policy, ctx);  |    |
|  |  }                         |  |  // { granted, trace }     |    |
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

- Line 1: "Compose policies,"
- Line 2: "not permission checks."
- Both in Inter 1.15rem, `#a0b4c8`

### Right Column — Policy Tree SVG

An animated SVG diagram showing a composed policy tree:

```
            allOf
           /     \
      hasRole    anyOf
      "admin"   /     \
          hasPerm    not
          "Write"      |
                   hasAttr
                  "suspended"
```

**SVG spec:**

- Width: 420px, height: 380px, `viewBox="0 0 420 380"`
- Composition nodes (`allOf`, `anyOf`, `not`): `stroke: #F59E0B`, fill `#0a1420`, rounded rect 80x32
- Leaf nodes (`hasRole`, `hasPermission`, `hasAttribute`): `stroke: #8a9bb0`, fill `#0a1420`, rounded rect
- Edges: `stroke: #F59E0B` at 30% opacity, stroke-width 1.5
- Node labels: Fira Code 10px
- Animation: paths draw in with `stroke-dashoffset` over 2s on page load
- Evaluation animation: after draw-in, a glow propagates from leaves to root:
  - `hasRole("admin")` → amber glow (evaluating)
  - `hasPermission("Write")` → green glow (allow)
  - `hasAttribute("suspended")` → green glow (not suspended)
  - `not(...)` → green glow
  - `anyOf(...)` → green glow
  - `allOf(...)` → green glow → **ALLOW** badge appears at root
- Total animation: 4s, loops with 2s pause

---

## Code Example Section

**Background:** `#08101C`
**Layout:** 2-column grid (`grid-cols-5`), left 2/5 text, right 3/5 code window

### Left Column

- H2: "Compose, don't hardcode" — Rajdhani 700
- Bullet list (4 items), each with small amber square marker:
  - Policies are composable values, not string checks
  - Combine with `allOf()` and `anyOf()`
  - Negate any policy with `not()`
  - Every evaluation returns a full decision trace

### Right Column — Code Window

- Header bar: `#0a1420`, macOS dots (red/yellow/green at 50% opacity), filename `policy.ts`
- Code body: Dracula-highlighted TypeScript
- Bottom bar: thin 2px amber progress line

```typescript
import { allOf, hasPermission, not, hasAttribute } from "@hex-di/guard";

const canEdit = allOf(hasPermission(Permissions.Write), not(hasAttribute("suspended", true)));

const decision = evaluate(canEdit, {
  subject: currentUser,
  resource: document,
});

// decision.granted  → boolean
// decision.trace    → full evaluation path
// decision.duration → evaluation time (ms)
```

---

## Features Section

Same 6-card grid as variant 01.

---

## Comparison Section

**Background:** `#08101C`
**Layout:** 2-column grid, equal width, gap 24px

### "Before" Card (Imperative)

- Border: `1px solid #EF444440`
- Top label: `IMPERATIVE` — Fira Code 0.68rem, `#EF4444`, uppercase
- Code: nested if/else permission checks, Dracula theme
- Bottom annotation: `// no audit trail, no composition, brittle` in `#EF4444`

```typescript
if (user.role === "admin" || user.permissions.includes("Write")) {
  if (!user.suspended) {
    // allow access
  }
}
// What if the rules change?
// What was the reason for the decision?
```

### "After" Card (Declarative)

- Border: `1px solid #F59E0B40`
- Top label: `DECLARATIVE` — Fira Code 0.68rem, `#F59E0B`, uppercase
- Code: policy composition, Dracula theme
- Bottom annotation: `// composable, auditable, type-safe` in `#F59E0B`

```typescript
const policy = allOf(
  anyOf(hasRole("admin"), hasPermission(Write)),
  not(hasAttribute("suspended", true))
);

const decision = evaluate(policy, context);
// decision.granted → true
// decision.trace → full path
```

Both cards: `bg: #0a1420`, `border-radius: 2px`, `padding: 24px`

---

## Ecosystem + Footer

Same as variant 01.

---

## Animations

| Element                | Animation                                     |
| ---------------------- | --------------------------------------------- |
| Feature cards          | `fade-in-up` on scroll, staggered 0.1s        |
| Policy tree SVG edges  | `stroke-dashoffset` draw-in, 2s on load       |
| Policy tree evaluation | Glow propagation from leaves to root, 4s loop |
| Code window            | `fade-in-up` on scroll                        |
| Comparison cards       | `fade-in-up` on scroll, 0.2s stagger          |

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
        --deny-20: #ef444433;
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
      @keyframes draw-path {
        from {
          stroke-dashoffset: 500;
        }
        to {
          stroke-dashoffset: 0;
        }
      }
      @keyframes glow-pulse {
        0% {
          filter: drop-shadow(0 0 0 transparent);
        }
        50% {
          filter: drop-shadow(0 0 8px var(--accent));
        }
        100% {
          filter: drop-shadow(0 0 0 transparent);
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
        Guard
      </div>
      <div style="display:flex;gap:2rem;font-size:0.85rem;color:var(--text-secondary);">
        <a href="/docs">Docs</a>
        <a href="#">Libraries</a>
        <a href="/blog">Blog</a>
        <a href="#">GitHub</a>
      </div>
    </nav>

    <!-- HERO (2-col: text + policy tree SVG) -->
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
            Guard
          </h1>
          <p style="font-size:1.15rem;color:var(--text-secondary);margin-bottom:4px;">
            Compose policies,
          </p>
          <p style="font-size:1.15rem;color:var(--text-secondary);margin-bottom:28px;">
            not permission checks.
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
        <div style="display:flex;justify-content:center;">
          <!-- Policy Tree SVG -->
          <svg viewBox="0 0 420 380" width="420" height="380" style="max-width:100%;">
            <!-- Edges -->
            <line
              x1="210"
              y1="48"
              x2="110"
              y2="112"
              stroke="rgba(245,158,11,0.3)"
              stroke-width="1.5"
              stroke-dasharray="300"
              style="animation:draw-path 2s ease forwards;"
            />
            <line
              x1="210"
              y1="48"
              x2="310"
              y2="112"
              stroke="rgba(245,158,11,0.3)"
              stroke-width="1.5"
              stroke-dasharray="300"
              style="animation:draw-path 2s ease forwards;"
            />
            <line
              x1="310"
              y1="144"
              x2="240"
              y2="208"
              stroke="rgba(245,158,11,0.3)"
              stroke-width="1.5"
              stroke-dasharray="300"
              style="animation:draw-path 2s 0.3s ease forwards;"
            />
            <line
              x1="310"
              y1="144"
              x2="380"
              y2="208"
              stroke="rgba(245,158,11,0.3)"
              stroke-width="1.5"
              stroke-dasharray="300"
              style="animation:draw-path 2s 0.3s ease forwards;"
            />
            <line
              x1="380"
              y1="240"
              x2="380"
              y2="296"
              stroke="rgba(245,158,11,0.3)"
              stroke-width="1.5"
              stroke-dasharray="300"
              style="animation:draw-path 2s 0.6s ease forwards;"
            />

            <!-- Root: allOf -->
            <rect
              x="170"
              y="20"
              width="80"
              height="32"
              rx="4"
              fill="#0a1420"
              stroke="#F59E0B"
              stroke-width="1.5"
            />
            <text
              x="210"
              y="41"
              text-anchor="middle"
              fill="#F59E0B"
              font-family="Fira Code"
              font-size="11"
              font-weight="500"
            >
              allOf
            </text>

            <!-- Left leaf: hasRole -->
            <rect
              x="60"
              y="112"
              width="100"
              height="32"
              rx="4"
              fill="#0a1420"
              stroke="#8a9bb0"
              stroke-width="1"
            />
            <text
              x="110"
              y="133"
              text-anchor="middle"
              fill="#8a9bb0"
              font-family="Fira Code"
              font-size="10"
            >
              hasRole
            </text>
            <text
              x="110"
              y="162"
              text-anchor="middle"
              fill="#a0b4c8"
              font-family="Fira Code"
              font-size="9"
            >
              "admin"
            </text>

            <!-- Right branch: anyOf -->
            <rect
              x="270"
              y="112"
              width="80"
              height="32"
              rx="4"
              fill="#0a1420"
              stroke="#F59E0B"
              stroke-width="1.5"
            />
            <text
              x="310"
              y="133"
              text-anchor="middle"
              fill="#F59E0B"
              font-family="Fira Code"
              font-size="11"
              font-weight="500"
            >
              anyOf
            </text>

            <!-- Left grandchild: hasPermission -->
            <rect
              x="180"
              y="208"
              width="120"
              height="32"
              rx="4"
              fill="#0a1420"
              stroke="#8a9bb0"
              stroke-width="1"
            />
            <text
              x="240"
              y="229"
              text-anchor="middle"
              fill="#8a9bb0"
              font-family="Fira Code"
              font-size="10"
            >
              hasPermission
            </text>
            <text
              x="240"
              y="258"
              text-anchor="middle"
              fill="#a0b4c8"
              font-family="Fira Code"
              font-size="9"
            >
              "Write"
            </text>

            <!-- Right grandchild: not -->
            <rect
              x="350"
              y="208"
              width="60"
              height="32"
              rx="4"
              fill="#0a1420"
              stroke="#F59E0B"
              stroke-width="1.5"
            />
            <text
              x="380"
              y="229"
              text-anchor="middle"
              fill="#F59E0B"
              font-family="Fira Code"
              font-size="11"
              font-weight="500"
            >
              not
            </text>

            <!-- Great-grandchild: hasAttribute -->
            <rect
              x="315"
              y="296"
              width="130"
              height="32"
              rx="4"
              fill="#0a1420"
              stroke="#8a9bb0"
              stroke-width="1"
            />
            <text
              x="380"
              y="317"
              text-anchor="middle"
              fill="#8a9bb0"
              font-family="Fira Code"
              font-size="10"
            >
              hasAttribute
            </text>
            <text
              x="380"
              y="346"
              text-anchor="middle"
              fill="#a0b4c8"
              font-family="Fira Code"
              font-size="9"
            >
              "suspended"
            </text>
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
            Compose, don't hardcode
          </h2>
          <ul
            style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:0.9rem;line-height:1.65;"
          >
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span> Policies are
              composable values, not string checks
            </li>
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span> Combine with
              <code>allOf()</code> and <code>anyOf()</code>
            </li>
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span> Negate any policy
              with <code>not()</code>
            </li>
            <li>
              <span style="color:var(--accent);margin-right:8px;">&#9632;</span> Every evaluation
              returns a full decision trace
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
              >policy.ts</span
            >
          </div>
          <pre
            style="padding:24px;font-family:'Fira Code',monospace;font-size:0.85rem;line-height:1.7;color:var(--text-muted);background:var(--bg);margin:0;"
          >
<span style="color:#FF79C6">import</span> { allOf, hasPermission, not, hasAttribute } <span style="color:#FF79C6">from</span> <span style="color:#F1FA8C">"@hex-di/guard"</span>;

<span style="color:#FF79C6">const</span> canEdit = <span style="color:#50FA7B">allOf</span>(
  <span style="color:#50FA7B">hasPermission</span>(Permissions.Write),
  <span style="color:#50FA7B">not</span>(
    <span style="color:#50FA7B">hasAttribute</span>(<span style="color:#F1FA8C">"suspended"</span>, <span style="color:#BD93F9">true</span>)
  ),
);

<span style="color:#FF79C6">const</span> decision = <span style="color:#50FA7B">evaluate</span>(canEdit, {
  subject: currentUser,
  resource: document,
});
<span style="color:#6272A4">// decision.granted  → boolean</span>
<span style="color:#6272A4">// decision.trace    → full evaluation path</span></pre>
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
            style="background:var(--card);border:1px solid var(--deny-20);border-radius:2px;padding:24px;"
          >
            <p
              style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--deny);margin-bottom:16px;"
            >
              Imperative
            </p>
            <pre
              style="font-family:'Fira Code',monospace;font-size:0.8rem;line-height:1.7;color:var(--text-muted);margin:0;"
            >
<span style="color:#FF79C6">if</span> (user.role === <span style="color:#F1FA8C">"admin"</span>
    || user.permissions.includes(<span style="color:#F1FA8C">"Write"</span>)) {
  <span style="color:#FF79C6">if</span> (!user.suspended) {
    <span style="color:#6272A4">// allow access</span>
  }
}
<span style="color:#6272A4">// What if the rules change?</span>
<span style="color:#6272A4">// What was the reason?</span></pre>
            <p
              style="font-family:'Fira Code',monospace;font-size:0.75rem;color:var(--deny);margin-top:12px;"
            >
              // no audit trail, no composition, brittle
            </p>
          </div>
          <!-- After (amber) -->
          <div
            style="background:var(--card);border:1px solid var(--accent-40);border-radius:2px;padding:24px;"
          >
            <p
              style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--accent);margin-bottom:16px;"
            >
              Declarative
            </p>
            <pre
              style="font-family:'Fira Code',monospace;font-size:0.8rem;line-height:1.7;color:var(--text-muted);margin:0;"
            >
<span style="color:#FF79C6">const</span> policy = <span style="color:#50FA7B">allOf</span>(
  <span style="color:#50FA7B">anyOf</span>(<span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"admin"</span>), <span style="color:#50FA7B">hasPermission</span>(Write)),
  <span style="color:#50FA7B">not</span>(<span style="color:#50FA7B">hasAttribute</span>(<span style="color:#F1FA8C">"suspended"</span>, <span style="color:#BD93F9">true</span>)),
);

<span style="color:#FF79C6">const</span> decision = <span style="color:#50FA7B">evaluate</span>(policy, ctx);
<span style="color:#6272A4">// decision.granted → true</span>
<span style="color:#6272A4">// decision.trace   → full path</span></pre>
            <p
              style="font-family:'Fira Code',monospace;font-size:0.75rem;color:var(--accent);margin-top:12px;"
            >
              // composable, auditable, type-safe
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
