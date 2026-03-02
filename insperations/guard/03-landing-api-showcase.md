# 03 — Landing Page (API Showcase)

**Title:** Guard — Compile-Time Safe Authorization for TypeScript
**Type:** API-focused landing page
**Layout:** Vertical scroll, 6 sections
**Accent:** `#F59E0B` (amber)
**Mood:** Reference card meets marketing page — the full API surface (10 policy kinds) is the selling point

---

## Overview

This variant puts the **API breadth** front and center. Instead of vague feature descriptions, each section shows actual code. The hero has a compact tagline ("10 Policy Kinds. One evaluate() Call."), followed by dedicated sections for the 10 policy kinds, composition, evaluation, and React integration. Designed for developers who want to _see what the library does_ before reading docs.

---

## Color Palette

Uses the Guard palette (see `design-system.md`) plus Dracula syntax tokens:

| Token           | Value     | Usage                      |
| --------------- | --------- | -------------------------- |
| `allow-green`   | `#22C55E` | Allow decision annotations |
| `deny-red`      | `#EF4444` | Deny decision annotations  |
| `type-cyan`     | `#8BE9FD` | Type annotations in code   |
| `keyword-pink`  | `#FF79C6` | Keywords in code           |
| `fn-green`      | `#50FA7B` | Function names in code     |
| `string-yellow` | `#F1FA8C` | Strings in code            |
| `number-purple` | `#BD93F9` | Numeric / boolean literals |

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  (same as 01)                                                |
+------------------------------------------------------------------+
|                                                                    |
|  HERO  min-h-70vh  bg: #020408  centered                          |
|  @hex-di ecosystem  |  Guard  |  tagline  |  CTA  |  install      |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  POLICY KINDS  bg: #08101C  py-24                                  |
|                                                                    |
|   "10 Policy Kinds"                                                |
|                                                                    |
|  +---------------------+  +---------------------+                  |
|  | hasPermission        |  | hasRole              |                  |
|  | hasPermission(Write) |  | hasRole("admin")     |                  |
|  +---------------------+  +---------------------+                  |
|  | hasAttribute         |  | hasResourceAttribute |                  |
|  | hasAttribute(        |  | hasResourceAttribute(|                  |
|  |   "dept", "eng")     |  |   "visibility","pub")|                  |
|  +---------------------+  +---------------------+                  |
|  | hasSignature         |  | hasRelationship      |                  |
|  | hasSignature(        |  | hasRelationship(     |                  |
|  |   "electronic")      |  |   "owner")           |                  |
|  +---------------------+  +---------------------+                  |
|  | allOf                |  | anyOf                |                  |
|  | allOf(p1, p2, p3)    |  | anyOf(p1, p2)        |                  |
|  +---------------------+  +---------------------+                  |
|  | not                  |  | withLabel            |                  |
|  | not(policy)          |  | withLabel("audit",p) |                  |
|  +---------------------+  +---------------------+                  |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  COMPOSITION  bg: #020408  py-24                                   |
|  Large code block showing nested allOf/anyOf/not                   |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  EVALUATION  bg: #08101C  py-24                                    |
|  Decision object structure: granted, trace, durationMs             |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  REACT  bg: #020408  py-24                                         |
|  <Can> component + useCan() hook                                   |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  ECOSYSTEM + FOOTER  (same as 01)                                  |
|                                                                    |
+------------------------------------------------------------------+
```

---

## Hero Section

**Min-height:** 70vh (shorter — content is below)
**Background:** `#020408` with radial gradient overlay
**Content:** Centered, `max-width: 800px`

1. **Mono label:** `@hex-di ecosystem` — Fira Code 0.68rem, uppercase, tracking 0.25em, amber
2. **H1:** "Guard" — Rajdhani 700, white, `clamp(2.5rem, 5vw, 4rem)`
3. **Tagline:** "10 Policy Kinds. One evaluate() Call." — Inter 1.15rem, `#a0b4c8`. The `evaluate()` uses Fira Code inline.
4. **CTA:** "Get Started" — amber bg, black text
5. **Install box:** `npm install @hex-di/guard`

---

## Policy Kinds Section

**Background:** `#08101C`
**Padding:** `py-24`
**Grid:** 2-column on lg, stacks on mobile, gap 20px, max-width 900px

### Section Header

- Mono label: `:: policy kinds`
- H2: "10 Policy Kinds"
- Subtitle: "Every authorization pattern you need, as a composable value." — Inter 0.9rem, `#8a9bb0`

### 10 Policy Kind Cards

Each card is compact — title + 2-3 line code example + one-line annotation:

| #   | Title                    | Code                                           | Annotation                                                           |
| --- | ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------- |
| 1   | **hasPermission**        | `hasPermission(Permissions.Write)`             | Check if subject holds a specific permission token.                  |
| 2   | **hasRole**              | `hasRole("admin")`                             | Check if subject has been assigned a role.                           |
| 3   | **hasAttribute**         | `hasAttribute("department", "engineering")`    | Match a subject attribute against an expected value.                 |
| 4   | **hasResourceAttribute** | `hasResourceAttribute("visibility", "public")` | Match a resource attribute against an expected value.                |
| 5   | **hasSignature**         | `hasSignature("electronic")`                   | Verify electronic signature type — 21 CFR Part 11.                   |
| 6   | **hasRelationship**      | `hasRelationship("owner")`                     | Check subject-resource relationship — ReBAC pattern.                 |
| 7   | **allOf**                | `allOf(policy1, policy2, policy3)`             | All child policies must grant. Short-circuits on first deny.         |
| 8   | **anyOf**                | `anyOf(policy1, policy2)`                      | At least one child policy must grant. Short-circuits on first allow. |
| 9   | **not**                  | `not(hasAttribute("suspended", true))`         | Inverts the child policy decision.                                   |
| 10  | **withLabel**            | `withLabel("audit-check", policy)`             | Attaches a label for trace identification and filtering.             |

### Policy Card Spec

- `bg: #0a1420`, `border: 1px solid #1a2a3e`, `border-radius: 2px`
- **Number badge:** Top-left, Fira Code 0.6rem, amber bg at 10%, amber text, `width: 20px; height: 20px; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center;`
- **Title:** Fira Code 500 0.9rem, amber, `margin-bottom: 8px`
- **Code:** Fira Code 0.8rem, Dracula highlighting, `line-height: 1.6`
- **Annotation:** Inter 0.78rem, `#8a9bb0`, `margin-top: 8px`
- **Padding:** 20px
- Hover: `border-color: #F59E0B60`

---

## Composition Section

**Background:** `#020408`
**Layout:** Centered, max-width 700px

### Section Header

- Mono label: `:: composition`
- H2: "Compose Into Any Shape"

### Large Code Block

Full code window (macOS dots, filename `access-policy.ts`, Dracula theme):

```typescript
import {
  allOf,
  anyOf,
  not,
  hasPermission,
  hasRole,
  hasAttribute,
  hasRelationship,
  withLabel,
} from "@hex-di/guard";

const canPublish = withLabel(
  "publish-access",
  allOf(
    // Must be an editor or admin
    anyOf(hasRole("editor"), hasRole("admin")),
    // Must have publish permission
    hasPermission(Permissions.Publish),
    // Must not be suspended
    not(hasAttribute("suspended", true)),
    // Must own the resource OR be admin
    anyOf(hasRelationship("owner"), hasRole("admin"))
  )
);
```

---

## Evaluation Section

**Background:** `#08101C`
**Layout:** 2-column grid (`grid-cols-5`), left 2/5 text, right 3/5 code

### Left Column

- H2: "Full Decision Objects" — Rajdhani 700
- Bullet list:
  - `granted` — boolean result
  - `trace` — full evaluation path with timing
  - `durationMs` — total evaluation time
  - Every node in the tree is individually traceable

### Right Column — Code Window

```typescript
const decision = evaluate(canPublish, {
  subject: { id: "u-1", roles: ["editor"] },
  resource: { id: "doc-42", owner: "u-1" },
});

// decision.granted → true
// decision.durationMs → 0.12
// decision.trace:
//   allOf [ALLOW 0.12ms]
//   ├── anyOf [ALLOW 0.03ms]
//   │   ├── hasRole("editor") → ALLOW
//   │   └── hasRole("admin") → DENY (skipped)
//   ├── hasPermission("Publish") → ALLOW
//   ├── not(hasAttribute("suspended")) → ALLOW
//   └── anyOf [ALLOW 0.02ms]
//       └── hasRelationship("owner") → ALLOW
```

---

## React Integration Section

**Background:** `#020408`
**Layout:** 2-column grid, equal width

### Section Header

- Mono label: `:: react`
- H2: "First-Class React Support"

### Card 1 — `<Can>` Component

```tsx
import { Can } from "@hex-di/guard/react";

function DocumentActions({ doc }) {
  return (
    <Can policy={canPublish} resource={doc}>
      <button>Publish</button>
    </Can>
  );
}
// Renders children only if policy grants
```

Annotation: Declarative gate component. Renders children only when the policy grants.

### Card 2 — `useCan()` Hook

```tsx
import { useCan } from "@hex-di/guard/react";

function DocumentPage({ doc }) {
  const { granted, loading } = useCan(canPublish, { resource: doc });

  if (loading) return <Spinner />;
  if (!granted) return <Forbidden />;

  return <Editor doc={doc} />;
}
```

Annotation: Imperative hook for conditional rendering and loading states.

---

## Key Design Decisions

- **Code is the hero** — every section leads with code, not prose
- **No illustrations** — the API surface _is_ the visual
- **Consistent card grid** — 2 per row for policy kinds, wider for composition/evaluation
- **Annotations inline** — short comments below code blocks, not separate paragraphs
- **Progressive disclosure** — Hero names the breadth, sections drill into each capability
- **Number badges** — policy kinds are numbered 1-10 to emphasize breadth

---

## Animations

| Element                | Animation                                                       |
| ---------------------- | --------------------------------------------------------------- |
| Policy kind cards      | `fade-in-up` on scroll, staggered 0.05s (10 items fast cascade) |
| Composition code block | `fade-in-up` on scroll                                          |
| Evaluation columns     | `fade-in-up` on scroll, left then right (0.15s stagger)         |
| React cards            | `fade-in-up` on scroll, 0.2s stagger                            |

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
      href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Inter:wght@400&family=Fira+Code:wght@400;500&display=swap"
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
      .policy-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 2px;
        padding: 20px;
        transition: border-color 0.3s;
      }
      .policy-card:hover {
        border-color: var(--accent-60);
      }
      .policy-card .card-title {
        font-family: "Fira Code", monospace;
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--accent);
        margin-bottom: 8px;
      }
      .policy-card pre {
        font-family: "Fira Code", monospace;
        font-size: 0.8rem;
        line-height: 1.6;
        margin: 0;
      }
      .policy-card .annotation {
        font-size: 0.78rem;
        color: var(--text-muted);
        margin-top: 8px;
      }
      .number-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 2px;
        background: rgba(245, 158, 11, 0.1);
        color: var(--accent);
        font-family: "Fira Code", monospace;
        font-size: 0.6rem;
        margin-bottom: 8px;
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
        margin-bottom: 8px;
      }
      .section-header .subtitle {
        font-size: 0.9rem;
        color: var(--text-muted);
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

    <!-- HERO (centered, shorter) -->
    <section
      style="min-height:70vh;display:flex;align-items:center;justify-content:center;background:var(--bg);position:relative;"
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
          10 Policy Kinds. One
          <code style="font-family:'Fira Code',monospace;color:var(--accent);">evaluate()</code>
          Call.
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

    <!-- POLICY KINDS (10 cards, 2-col grid) -->
    <section style="background:var(--surface);padding:6rem 2rem;">
      <div style="max-width:900px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: policy kinds</p>
          <h2>10 Policy Kinds</h2>
          <p class="subtitle">Every authorization pattern you need, as a composable value.</p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div class="policy-card">
            <div class="number-badge">1</div>
            <div class="card-title">hasPermission</div>
            <pre><span style="color:#50FA7B">hasPermission</span>(Permissions.<span style="color:#BD93F9">Write</span>)</pre>
            <p class="annotation">Check if subject holds a specific permission token.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">2</div>
            <div class="card-title">hasRole</div>
            <pre><span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"admin"</span>)</pre>
            <p class="annotation">Check if subject has been assigned a role.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">3</div>
            <div class="card-title">hasAttribute</div>
            <pre><span style="color:#50FA7B">hasAttribute</span>(<span style="color:#F1FA8C">"department"</span>, <span style="color:#F1FA8C">"engineering"</span>)</pre>
            <p class="annotation">Match a subject attribute against an expected value.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">4</div>
            <div class="card-title">hasResourceAttribute</div>
            <pre><span style="color:#50FA7B">hasResourceAttribute</span>(<span style="color:#F1FA8C">"visibility"</span>, <span style="color:#F1FA8C">"public"</span>)</pre>
            <p class="annotation">Match a resource attribute against an expected value.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">5</div>
            <div class="card-title">hasSignature</div>
            <pre><span style="color:#50FA7B">hasSignature</span>(<span style="color:#F1FA8C">"electronic"</span>)</pre>
            <p class="annotation">Verify electronic signature type — 21 CFR Part 11.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">6</div>
            <div class="card-title">hasRelationship</div>
            <pre><span style="color:#50FA7B">hasRelationship</span>(<span style="color:#F1FA8C">"owner"</span>)</pre>
            <p class="annotation">Check subject-resource relationship — ReBAC pattern.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">7</div>
            <div class="card-title">allOf</div>
            <pre><span style="color:#50FA7B">allOf</span>(policy1, policy2, policy3)</pre>
            <p class="annotation">All child policies must grant. Short-circuits on first deny.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">8</div>
            <div class="card-title">anyOf</div>
            <pre><span style="color:#50FA7B">anyOf</span>(policy1, policy2)</pre>
            <p class="annotation">At least one child must grant. Short-circuits on first allow.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">9</div>
            <div class="card-title">not</div>
            <pre><span style="color:#50FA7B">not</span>(<span style="color:#50FA7B">hasAttribute</span>(<span style="color:#F1FA8C">"suspended"</span>, <span style="color:#BD93F9">true</span>))</pre>
            <p class="annotation">Inverts the child policy decision.</p>
          </div>
          <div class="policy-card">
            <div class="number-badge">10</div>
            <div class="card-title">withLabel</div>
            <pre><span style="color:#50FA7B">withLabel</span>(<span style="color:#F1FA8C">"audit-check"</span>, policy)</pre>
            <p class="annotation">Attaches a label for trace identification and filtering.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- COMPOSITION (large code block) -->
    <section style="background:var(--bg);padding:6rem 2rem;">
      <div style="max-width:700px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: composition</p>
          <h2>Compose Into Any Shape</h2>
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
              >access-policy.ts</span
            >
          </div>
          <pre
            style="padding:24px;font-family:'Fira Code',monospace;font-size:0.85rem;line-height:1.7;color:var(--text-muted);background:var(--bg);margin:0;"
          >
<span style="color:#FF79C6">import</span> {
  allOf, anyOf, not,
  hasPermission, hasRole, hasAttribute,
  hasRelationship, withLabel,
} <span style="color:#FF79C6">from</span> <span style="color:#F1FA8C">"@hex-di/guard"</span>;

<span style="color:#FF79C6">const</span> canPublish = <span style="color:#50FA7B">withLabel</span>(<span style="color:#F1FA8C">"publish-access"</span>,
  <span style="color:#50FA7B">allOf</span>(
    <span style="color:#6272A4">// Must be an editor or admin</span>
    <span style="color:#50FA7B">anyOf</span>(
      <span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"editor"</span>),
      <span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"admin"</span>),
    ),
    <span style="color:#6272A4">// Must have publish permission</span>
    <span style="color:#50FA7B">hasPermission</span>(Permissions.<span style="color:#BD93F9">Publish</span>),
    <span style="color:#6272A4">// Must not be suspended</span>
    <span style="color:#50FA7B">not</span>(<span style="color:#50FA7B">hasAttribute</span>(<span style="color:#F1FA8C">"suspended"</span>, <span style="color:#BD93F9">true</span>)),
    <span style="color:#6272A4">// Must own the resource OR be admin</span>
    <span style="color:#50FA7B">anyOf</span>(
      <span style="color:#50FA7B">hasRelationship</span>(<span style="color:#F1FA8C">"owner"</span>),
      <span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"admin"</span>),
    ),
  ),
);</pre>
          <div style="height:2px;background:var(--accent);opacity:0.4;"></div>
        </div>
      </div>
    </section>

    <!-- EVALUATION (2-col: text + code) -->
    <section style="background:var(--surface);padding:6rem 2rem;">
      <div style="max-width:1200px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: evaluation</p>
          <h2>Full Decision Objects</h2>
        </div>
        <div style="display:grid;grid-template-columns:2fr 3fr;gap:4rem;align-items:start;">
          <div>
            <ul
              style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:0.9rem;line-height:1.65;"
            >
              <li>
                <span style="color:var(--accent);margin-right:8px;">&#9632;</span>
                <code>granted</code> — boolean result
              </li>
              <li>
                <span style="color:var(--accent);margin-right:8px;">&#9632;</span>
                <code>trace</code> — full evaluation path with timing
              </li>
              <li>
                <span style="color:var(--accent);margin-right:8px;">&#9632;</span>
                <code>durationMs</code> — total evaluation time
              </li>
              <li>
                <span style="color:var(--accent);margin-right:8px;">&#9632;</span> Every node in the
                tree is individually traceable
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
                >evaluate.ts</span
              >
            </div>
            <pre
              style="padding:24px;font-family:'Fira Code',monospace;font-size:0.8rem;line-height:1.7;color:var(--text-muted);background:var(--bg);margin:0;"
            >
<span style="color:#FF79C6">const</span> decision = <span style="color:#50FA7B">evaluate</span>(canPublish, {
  subject: { id: <span style="color:#F1FA8C">"u-1"</span>, roles: [<span style="color:#F1FA8C">"editor"</span>] },
  resource: { id: <span style="color:#F1FA8C">"doc-42"</span>, owner: <span style="color:#F1FA8C">"u-1"</span> },
});

<span style="color:#6272A4">// decision.granted    → true</span>
<span style="color:#6272A4">// decision.durationMs → 0.12</span>
<span style="color:#6272A4">// decision.trace:</span>
<span style="color:#6272A4">//   allOf [<span style="color:#22C55E">ALLOW</span> 0.12ms]</span>
<span style="color:#6272A4">//   ├── anyOf [<span style="color:#22C55E">ALLOW</span> 0.03ms]</span>
<span style="color:#6272A4">//   │   ├── hasRole("editor") → <span style="color:#22C55E">ALLOW</span></span>
<span style="color:#6272A4">//   │   └── hasRole("admin") → <span style="color:#EF4444">DENY</span> (skipped)</span>
<span style="color:#6272A4">//   ├── hasPermission("Publish") → <span style="color:#22C55E">ALLOW</span></span>
<span style="color:#6272A4">//   ├── not(hasAttribute("suspended")) → <span style="color:#22C55E">ALLOW</span></span>
<span style="color:#6272A4">//   └── anyOf [<span style="color:#22C55E">ALLOW</span> 0.02ms]</span>
<span style="color:#6272A4">//       └── hasRelationship("owner") → <span style="color:#22C55E">ALLOW</span></span></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- REACT INTEGRATION (2-col: Can + useCan) -->
    <section style="background:var(--bg);padding:6rem 2rem;">
      <div style="max-width:1000px;margin:0 auto;">
        <div class="section-header">
          <p class="mono-label">:: react</p>
          <h2>First-Class React Support</h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div class="policy-card">
            <div class="card-title">&lt;Can&gt; Component</div>
            <pre>
<span style="color:#FF79C6">import</span> { Can } <span style="color:#FF79C6">from</span> <span style="color:#F1FA8C">"@hex-di/guard/react"</span>;

<span style="color:#FF79C6">function</span> <span style="color:#50FA7B">DocumentActions</span>({ doc }) {
  <span style="color:#FF79C6">return</span> (
    &lt;<span style="color:#8BE9FD">Can</span> policy={canPublish} resource={doc}&gt;
      &lt;<span style="color:#8BE9FD">button</span>&gt;Publish&lt;/<span style="color:#8BE9FD">button</span>&gt;
    &lt;/<span style="color:#8BE9FD">Can</span>&gt;
  );
}</pre>
            <p class="annotation">
              Declarative gate. Renders children only when the policy grants.
            </p>
          </div>
          <div class="policy-card">
            <div class="card-title">useCan() Hook</div>
            <pre>
<span style="color:#FF79C6">import</span> { useCan } <span style="color:#FF79C6">from</span> <span style="color:#F1FA8C">"@hex-di/guard/react"</span>;

<span style="color:#FF79C6">function</span> <span style="color:#50FA7B">DocumentPage</span>({ doc }) {
  <span style="color:#FF79C6">const</span> { granted, loading } =
    <span style="color:#50FA7B">useCan</span>(canPublish, { resource: doc });

  <span style="color:#FF79C6">if</span> (loading) <span style="color:#FF79C6">return</span> &lt;<span style="color:#8BE9FD">Spinner</span> /&gt;;
  <span style="color:#FF79C6">if</span> (!granted) <span style="color:#FF79C6">return</span> &lt;<span style="color:#8BE9FD">Forbidden</span> /&gt;;
  <span style="color:#FF79C6">return</span> &lt;<span style="color:#8BE9FD">Editor</span> doc={doc} /&gt;;
}</pre>
            <p class="annotation">Imperative hook for conditional rendering and loading states.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ECOSYSTEM + FOOTER (same as 01) -->
  </body>
</html>
```

</details>
