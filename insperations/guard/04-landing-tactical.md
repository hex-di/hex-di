# 04 — Landing Page (Tactical / HUD)

**Title:** Guard — Compile-Time Safe Authorization for TypeScript
**Type:** Marketing landing page with tactical HUD aesthetic
**Layout:** Vertical scroll, 5 sections
**Accent:** `#F59E0B` (amber)
**Mood:** Cyberpunk tactical — carries forward the core HexDI HUD language (corner brackets, scanlines, grid bg) but with amber instead of cyan. Security operations center aesthetic.

---

## Overview

The "tactical" variant brings the core HexDI visual language (HUD cards, corner brackets, grid background, scanline overlays) into the Guard site, recolored from cyan to amber. More visually intense than variants 01–03. Uses the `hud-card` pattern with expanding corner brackets on hover, a subtle 40px grid background, and a floating HUD card in the hero showing a stylized evaluation trace.

---

## Color Palette

Uses the Guard palette (see `design-system.md`) plus tactical overlays:

| Token         | Value                               | Usage                          |
| ------------- | ----------------------------------- | ------------------------------ |
| `grid-line`   | `rgba(245, 158, 11, 0.03)`          | 40px background grid lines     |
| `scanline`    | `rgba(245, 158, 11, 0.02)`          | Horizontal scanline overlay    |
| `bracket`     | `#F59E0B`                           | Corner bracket pseudo-elements |
| `glow-shadow` | `0 0 20px rgba(245, 158, 11, 0.15)` | Card hover glow                |

---

## Layout Structure

```
+------------------------------------------------------------------+
|  NAV  fixed h-16  bg blur  tactical bottom border                  |
|  logo + [Docs] [Libraries] [Blog] + status badge + GitHub         |
+------------------------------------------------------------------+
|  (40px amber grid background, full page, 0.03 opacity)            |
|  (radial gradient mask: transparent center, dark edges)            |
|                                                                    |
|  HERO  min-h-screen  pt-20                                         |
|  +----------------------------+  +----------------------------+    |
|  |  Left col                  |  |  Right col                 |    |
|  |                            |  |                            |    |
|  |  [GUARD::ACTIVE] badge     |  |  +---------------------+   |    |
|  |                            |  |  | EVALUATION TRACE     |   |    |
|  |  ACCESS                    |  |  |                      |   |    |
|  |  IS NOT                    |  |  | policy: canPublish   |   |    |
|  |  A STRING CHECK            |  |  | subject: user-042    |   |    |
|  |                            |  |  | decision: ALLOW      |   |    |
|  |  Policies are data.        |  |  |                      |   |    |
|  |  Compile-time safe.        |  |  | trace:               |   |    |
|  |  Fully auditable.          |  |  |   allOf ✓            |   |    |
|  |                            |  |  |   ├ hasRole ✓        |   |    |
|  |  [ Initialize ] [ Docs ]   |  |  |   └ not(susp.) ✓     |   |    |
|  |                            |  |  |                      |   |    |
|  |  $ npm install @hex-di/... |  |  | 0.08ms               |   |    |
|  +----------------------------+  +---------------------+----+    |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  FEATURES  py-32  6x hud-card with corner brackets                 |
|                                                                    |
|  +----------+  +----------+  +----------+                          |
|  | [  ]     |  | [  ]     |  | [  ]     |   <- corner brackets    |
|  |          |  |          |  |          |      expand on hover     |
|  | Compile  |  | Role DAG |  | 10       |                          |
|  | Time     |  | Inherit  |  | Policy   |                          |
|  |          |  |          |  | Kinds    |                          |
|  |     [  ] |  |     [  ] |  |     [  ] |                          |
|  +----------+  +----------+  +----------+                          |
|                                                                    |
|  +----------+  +----------+  +----------+                          |
|  | Eval     |  | Framework|  | GxP      |                          |
|  | Traces   |  | Agnostic |  | Ready    |                          |
|  +----------+  +----------+  +----------+                          |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CODE PREVIEW  bg alternating                                      |
|  terminal window with scanline overlay + syntax-highlighted code   |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  COMPARISON  2-col                                                 |
|  [RUNTIME_FAIL] vs [COMPILE_OK] badges                             |
|  red hud-card vs amber hud-card                                    |
|                                                                    |
+------------------------------------------------------------------+
|                                                                    |
|  CTA  full-width hud-card  large heading + 2 buttons               |
|                                                                    |
+------------------------------------------------------------------+
|  FOOTER  tactical border top  3-col                                |
+------------------------------------------------------------------+
```

---

## Navigation

- **Height:** `h-16` fixed
- **Background:** `rgba(2, 4, 8, 0.9)`, `backdrop-filter: blur(12px)`
- **Bottom border:** tactical — `1px solid rgba(245, 158, 11, 0.2)` + `box-shadow: 0 4px 20px -10px rgba(245, 158, 11, 0.3)`
- **Logo:** "Guard" in Rajdhani 700, white
- **Links:** `[Docs]` `[Libraries]` `[Blog]` — bracket-wrapped, Fira Code 0.8rem, hover: amber
- **Right side:** status badge + GitHub icon

### Status Badge

```html
<div class="badge">
  <div class="pulse-dot"></div>
  GUARD::v0.1
</div>
```

- Fira Code 0.65rem, uppercase, tracking 0.2em
- 1px amber border at 30% opacity, amber bg at 5%
- Pulsing 6px amber dot

---

## Hero Section

**Min-height:** 100vh, `display: flex; align-items: center; padding-top: 80px`
**Background:** `#020408` + 40px grid + radial gradient mask
**Layout:** 2-column grid (`grid-cols-2 gap-16`)

### Left Column

1. **Badge:** `[GUARD::ACTIVE]` — Fira Code 0.65rem, amber border, amber text, pulsing dot
2. **H1:** Three lines, Rajdhani 700, uppercase, `text-5xl md:text-7xl leading-[0.9]`:
   - "ACCESS"
   - "IS NOT"
   - "A STRING CHECK" — last word ("CHECK") in amber
3. **Subtitle:** Three lines, Inter 1rem, `#a0b4c8`, `border-left: 2px solid rgba(245, 158, 11, 0.2); padding-left: 16px`:
   - "Policies are data."
   - "Compile-time safe."
   - "Fully auditable."
4. **CTA buttons** (horizontal):
   - Primary: `bg: rgba(245, 158, 11, 0.1)`, `border: 1px solid #F59E0B`, amber text, clip-path slant
   - Secondary: ghost border, hover fill
5. **Install widget:** Same as 01 but with corner brackets decoration

### Right Column — Floating HUD Card

A `hud-card` with **3D tilt float animation** showing a stylized evaluation trace:

```
+--[ EVALUATION TRACE ]--+
|                         |
|  policy: canPublish     |  <- amber text
|  subject: user-042      |  <- muted text
|  decision: ALLOW        |  <- green text
|                         |
|  trace:                 |
|    allOf ✓              |  <- amber
|    ├ hasRole("admin") ✓ |  <- green
|    ├ hasPerm("Write") ✓ |  <- green
|    └ not(suspended) ✓   |  <- green
|                         |
|  duration: 0.08ms       |  <- muted
+-------------------------+
```

**Card spec:**

- `bg: rgba(8, 16, 28, 0.6)`, `backdrop-filter: blur(8px)`
- `border: 1px solid rgba(245, 158, 11, 0.15)`
- Corner brackets: 15px, 2px, `#F59E0B`
- Float animation: `6s ease-in-out infinite`, `translateY(0) -> translateY(-10px)`, `rotateX(5deg) rotateZ(-2deg)`
- Scanline overlay: `4px repeating linear-gradient, rgba(245, 158, 11, 0.02)`

---

## Feature Cards (HUD Style)

Same 6 features as 01, but styled as `hud-card`:

**Card spec:**

```css
background: rgba(8, 16, 28, 0.5);
backdrop-filter: blur(4px);
border: 1px solid rgba(245, 158, 11, 0.12);
padding: 28px;
position: relative;

/* Corner brackets */
::before {
  /* top-left */
  width: 12px;
  height: 12px;
  border-top: 2px solid #f59e0b;
  border-left: 2px solid #f59e0b;
}
::after {
  /* bottom-right */
  width: 12px;
  height: 12px;
  border-bottom: 2px solid #f59e0b;
  border-right: 2px solid #f59e0b;
}

/* Hover */
background: rgba(245, 158, 11, 0.04);
border-color: rgba(245, 158, 11, 0.4);
box-shadow: 0 0 20px rgba(245, 158, 11, 0.1);
::before,
::after {
  width: 100%;
  height: 100%;
  opacity: 0.3;
} /* full-frame brackets */
```

**Icon per card:** 48px square container with colored border/fill:

- Compile-Time Policies → amber (`#F59E0B`)
- Role DAG Inheritance → teal (`#20B2AA`)
- 10 Policy Kinds → purple (`#BD93F9`)
- Full Evaluation Traces → green (`#22C55E`)
- Framework Agnostic → pink (`#FF79C6`)
- GxP Ready → red (`#EF4444`)

---

## Code Preview Section

**Background:** `#05080F` (slightly lighter dark)
**Layout:** `grid-cols-5`, left 2/5 text + right 3/5 code window

### Code Window (Terminal Style)

- Header: `#0a1420`, macOS dots, label `TERMINAL_01`, filename `enforce.ts`
- Scanline overlay: absolute, `repeating-linear-gradient`, `4px` lines, `0.02` opacity
- Progress bar at bottom: `h-1`, amber, pulsing glow

### Code Content

```typescript
import { allOf, hasRole, hasPermission, not, hasAttribute } from "@hex-di/guard";

const policy = allOf(
  hasRole("editor"),
  hasPermission(Permissions.Publish),
  not(hasAttribute("suspended", true))
);

const decision = evaluate(policy, {
  subject: currentUser,
  resource: targetDocument,
});

if (decision.granted) {
  // Access allowed — full trace available
  audit.log(decision.trace);
}
```

---

## Comparison Section

**Background:** `#020408`
**Layout:** 2-column, centered heading above

### Before Card (Red HUD)

- Border: `1px solid rgba(239, 68, 68, 0.3)`
- Badge: `RUNTIME_FAIL` — Fira Code, red bg at 10%, red text
- Corner brackets in `#EF4444`
- Code: imperative if/else permission checks

```typescript
// Scattered across codebase
if (user.role === "admin" || user.permissions.includes("Write")) {
  if (!user.suspended) {
    // allow... maybe?
  }
}
// No audit trail
// No composition
// No type safety
// Changes require grep + pray
```

### After Card (Amber HUD)

- Border: `1px solid rgba(245, 158, 11, 0.3)`
- Badge: `COMPILE_OK` — Fira Code, amber bg at 10%, amber text
- Corner brackets in `#F59E0B`
- Code: declarative policy composition

```typescript
// Defined once, enforced everywhere
const policy = allOf(
  anyOf(hasRole("admin"), hasPermission(Write)),
  not(hasAttribute("suspended", true))
);

const { granted, trace } = evaluate(policy, ctx);
// Full audit trail
// Composable & reusable
// Compile-time type safe
// Changes in one place
```

---

## CTA Section

Full-width `hud-card` with:

- H2: "Ready to secure your stack?" — Rajdhani 700
- 2 buttons: Primary (solid amber slant) + Secondary (ghost)
- Corner brackets at all 4 corners (32px size)

---

## Animations

| Element               | Animation                                        |
| --------------------- | ------------------------------------------------ |
| Hero HUD card         | `float: 6s ease-in-out infinite` with 3D tilt    |
| Feature card brackets | Expand to 100% on hover, 0.4s cubic-bezier       |
| Feature cards         | `fade-in-up` on scroll, staggered                |
| Code window           | `fade-in-up` on scroll                           |
| Status badge dot      | `pulse: 2s ease-in-out infinite`                 |
| Grid background       | Static (no scroll animation — keeps it readable) |

---

## Key Differences from Core HexDI Tactical (04) and Result Tactical (04)

| Aspect            | Core HexDI 04                | Result 04                             | Guard 04                                |
| ----------------- | ---------------------------- | ------------------------------------- | --------------------------------------- |
| Primary color     | `#00F0FF` (cyan)             | `#A6E22E` (lime)                      | `#F59E0B` (amber)                       |
| Secondary color   | `#FF5E00` (orange)           | `#F92672` (pink/red)                  | `#EF4444` (red — deny)                  |
| Hero visual       | Hex dependency graph SVG     | Floating HUD card with type signature | Floating HUD card with evaluation trace |
| Hero H1           | "INJECT / COMPOSE / EXECUTE" | "THE COMPILER / HANDLES THE / ERRORS" | "ACCESS / IS NOT / A STRING CHECK"      |
| Comparison        | None                         | Red HUD vs Lime HUD                   | Red HUD vs Amber HUD                    |
| Comparison badges | N/A                          | `RUNTIME_ERR` vs `COMPILE_OK`         | `RUNTIME_FAIL` vs `COMPILE_OK`          |
| Rising particles  | Yes                          | No (cleaner)                          | No (cleaner)                            |
| 3D depth cards    | Yes (perspective hover)      | Corner bracket expansion only         | Corner bracket expansion only           |
| Grid intensity    | 40px, 0.05 opacity           | 40px, 0.03 opacity                    | 40px, 0.03 opacity (subtler)            |
| Identity          | Dependency injection         | Error handling                        | Authorization / security                |

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

      /* Grid background */
      .bg-grid {
        background-size: 40px 40px;
        background-image:
          linear-gradient(to right, rgba(245, 158, 11, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(245, 158, 11, 0.03) 1px, transparent 1px);
      }

      /* HUD Card */
      .hud-card {
        background: rgba(8, 16, 28, 0.5);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(245, 158, 11, 0.12);
        padding: 28px;
        position: relative;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hud-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 12px;
        height: 12px;
        border-top: 2px solid var(--accent);
        border-left: 2px solid var(--accent);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hud-card::after {
        content: "";
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-bottom: 2px solid var(--accent);
        border-right: 2px solid var(--accent);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .hud-card:hover {
        background: rgba(245, 158, 11, 0.04);
        border-color: rgba(245, 158, 11, 0.4);
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.1);
      }
      .hud-card:hover::before,
      .hud-card:hover::after {
        width: 100%;
        height: 100%;
        opacity: 0.3;
      }

      /* Float animation */
      @keyframes float {
        0%,
        100% {
          transform: translateY(0) rotateX(5deg) rotateZ(-2deg);
        }
        50% {
          transform: translateY(-10px) rotateX(5deg) rotateZ(-2deg);
        }
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

      @keyframes pulse {
        0%,
        100% {
          opacity: 0.4;
        }
        50% {
          opacity: 1;
        }
      }

      /* Tactical bottom border */
      .tactical-border-b {
        border-bottom: 1px solid rgba(245, 158, 11, 0.2);
        box-shadow: 0 4px 20px -10px rgba(245, 158, 11, 0.3);
      }

      /* Clip-path slant button */
      .btn-slant {
        clip-path: polygon(0 0, 100% 0, 93% 100%, 0% 100%);
      }
    </style>
  </head>
  <body class="bg-grid">
    <!-- Full-page grid overlay with radial mask -->
    <div
      style="position:fixed;inset:0;background:radial-gradient(circle at 50% 50%, transparent 0%, rgba(2,4,8,0.8) 100%);pointer-events:none;z-index:0;"
    ></div>

    <!-- NAV -->
    <nav
      class="tactical-border-b"
      style="position:fixed;top:0;width:100%;z-index:100;background:rgba(2,4,8,0.9);backdrop-filter:blur(12px);padding:0 2.5rem;height:64px;display:flex;align-items:center;justify-content:space-between;"
    >
      <div
        style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.25rem;color:var(--text);"
      >
        Guard
      </div>
      <div style="display:flex;align-items:center;gap:1.5rem;">
        <a
          href="/docs"
          style="font-family:'Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;"
          >[Docs]</a
        >
        <a
          href="#"
          style="font-family:'Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;"
          >[Libraries]</a
        >
        <a
          href="/blog"
          style="font-family:'Fira Code',monospace;font-size:0.8rem;color:var(--text-secondary);text-decoration:none;"
          >[Blog]</a
        >
        <!-- Status badge -->
        <div
          style="display:flex;align-items:center;gap:6px;font-family:'Fira Code',monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--accent);border:1px solid rgba(245,158,11,0.3);padding:4px 10px;background:rgba(245,158,11,0.05);"
        >
          <div
            style="width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse 2s ease-in-out infinite;"
          ></div>
          GUARD::v0.1
        </div>
      </div>
    </nav>

    <main style="position:relative;z-index:10;">
      <!-- HERO -->
      <section style="min-height:100vh;display:flex;align-items:center;padding-top:80px;">
        <div
          style="max-width:1200px;margin:0 auto;padding:0 2.5rem;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;"
        >
          <!-- Left: text -->
          <div>
            <!-- Badge -->
            <div
              style="display:inline-flex;align-items:center;gap:6px;font-family:'Fira Code',monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.2em;color:var(--accent);border:1px solid rgba(245,158,11,0.3);padding:4px 10px;background:rgba(245,158,11,0.05);margin-bottom:24px;"
            >
              <div
                style="width:6px;height:6px;background:var(--accent);border-radius:50%;animation:pulse 2s ease-in-out infinite;"
              ></div>
              GUARD::ACTIVE
            </div>
            <!-- H1 -->
            <h1
              style="font-family:'Rajdhani',sans-serif;font-weight:700;text-transform:uppercase;font-size:clamp(2.5rem,5vw,4.5rem);line-height:0.9;color:var(--text);margin-bottom:20px;"
            >
              ACCESS<br />IS NOT<br />A STRING <span style="color:var(--accent);">CHECK</span>
            </h1>
            <!-- Subtitle -->
            <div
              style="border-left:2px solid rgba(245,158,11,0.2);padding-left:16px;margin-bottom:28px;"
            >
              <p style="font-size:1rem;color:var(--text-secondary);margin-bottom:4px;">
                Policies are data.
              </p>
              <p style="font-size:1rem;color:var(--text-secondary);margin-bottom:4px;">
                Compile-time safe.
              </p>
              <p style="font-size:1rem;color:var(--text-secondary);">Fully auditable.</p>
            </div>
            <!-- CTA -->
            <div style="display:flex;gap:12px;margin-bottom:20px;">
              <a
                href="/docs"
                class="btn-slant"
                style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid var(--accent);color:var(--accent);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 32px;text-decoration:none;"
                >Initialize</a
              >
              <a
                href="/docs"
                style="display:inline-block;border:1px solid var(--border);color:var(--text-secondary);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 28px;text-decoration:none;transition:all 0.2s;"
                >Docs</a
              >
            </div>
            <!-- Install -->
            <div
              style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--accent);padding:12px 16px;border-radius:2px;font-family:'Fira Code',monospace;font-size:0.85rem;color:var(--accent);"
            >
              npm install @hex-di/guard
            </div>
          </div>
          <!-- Right: floating HUD card -->
          <div style="display:flex;justify-content:center;">
            <div
              class="hud-card"
              style="width:340px;animation:float 6s ease-in-out infinite;perspective:1000px;"
            >
              <!-- Scanline overlay -->
              <div
                style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(245,158,11,0.02) 3px,rgba(245,158,11,0.02) 4px);pointer-events:none;z-index:1;"
              ></div>
              <pre
                style="font-family:'Fira Code',monospace;font-size:0.78rem;line-height:1.8;margin:0;position:relative;z-index:2;"
              >
<span style="color:var(--text-muted);font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;">EVALUATION TRACE</span>

<span style="color:var(--accent);">policy:</span> <span style="color:var(--text-secondary);">canPublish</span>
<span style="color:var(--accent);">subject:</span> <span style="color:var(--text-muted);">user-042</span>
<span style="color:var(--accent);">decision:</span> <span style="color:var(--allow);">ALLOW</span>

<span style="color:var(--text-muted);">trace:</span>
  <span style="color:var(--accent);">allOf</span> <span style="color:var(--allow);">✓</span>
  <span style="color:var(--text-muted);">├</span> <span style="color:var(--text-secondary);">hasRole("admin")</span> <span style="color:var(--allow);">✓</span>
  <span style="color:var(--text-muted);">├</span> <span style="color:var(--text-secondary);">hasPerm("Write")</span> <span style="color:var(--allow);">✓</span>
  <span style="color:var(--text-muted);">└</span> <span style="color:var(--text-secondary);">not(suspended)</span> <span style="color:var(--allow);">✓</span>

<span style="color:var(--text-muted);font-size:0.7rem;">duration: 0.08ms</span></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURES (6x hud-card) -->
      <section style="background:var(--surface);padding:5rem 2.5rem;">
        <div
          style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;"
        >
          <div class="hud-card">
            <div
              style="width:48px;height:48px;border:1px solid #F59E0B;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.2rem;"
            >
              &#128274;
            </div>
            <h3
              style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
            >
              Compile-Time Policies
            </h3>
            <p style="font-size:0.9rem;line-height:1.65;">
              Policies are data, not decorators. Define authorization rules as composable values
              with full type safety at compile time.
            </p>
          </div>
          <div class="hud-card">
            <div
              style="width:48px;height:48px;border:1px solid #20B2AA;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.2rem;"
            >
              &#128279;
            </div>
            <h3
              style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
            >
              Role DAG Inheritance
            </h3>
            <p style="font-size:0.9rem;line-height:1.65;">
              O(1) permission lookup via directed acyclic graph flattening. Define role hierarchies
              that resolve instantly.
            </p>
          </div>
          <div class="hud-card">
            <div
              style="width:48px;height:48px;border:1px solid #BD93F9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.2rem;"
            >
              &#128218;
            </div>
            <h3
              style="font-family:'Rajdhani',sans-serif;font-weight:600;font-size:1.1rem;color:var(--text);margin-bottom:8px;"
            >
              10 Policy Kinds
            </h3>
            <p style="font-size:0.9rem;line-height:1.65;">
              hasPermission, hasRole, hasAttribute, hasResourceAttribute, hasSignature,
              hasRelationship, allOf, anyOf, not, labeled.
            </p>
          </div>
          <div class="hud-card">
            <div
              style="width:48px;height:48px;border:1px solid #22C55E;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.2rem;"
            >
              &#128269;
            </div>
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
          <div class="hud-card">
            <div
              style="width:48px;height:48px;border:1px solid #FF79C6;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.2rem;"
            >
              &#9881;
            </div>
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
          <div class="hud-card">
            <div
              style="width:48px;height:48px;border:1px solid #EF4444;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:1.2rem;"
            >
              &#128203;
            </div>
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

      <!-- CODE PREVIEW (terminal window) -->
      <section style="background:#05080F;padding:6rem 2.5rem;">
        <div
          style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:2fr 3fr;gap:4rem;align-items:center;"
        >
          <div>
            <p
              style="font-family:'Fira Code',monospace;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.25em;color:var(--accent);margin-bottom:12px;"
            >
              :: enforcement
            </p>
            <h2
              style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.6rem);color:var(--text);margin-bottom:16px;"
            >
              Define Once, Enforce Everywhere
            </h2>
            <p style="font-size:0.9rem;line-height:1.65;">
              Policies are plain values. Compose them, pass them around, serialize them. Enforce at
              the adapter boundary with full decision traces.
            </p>
          </div>
          <div
            style="border:1px solid var(--border);border-radius:2px;overflow:hidden;position:relative;"
          >
            <!-- Scanline overlay -->
            <div
              style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(245,158,11,0.02) 3px,rgba(245,158,11,0.02) 4px);pointer-events:none;z-index:1;"
            ></div>
            <div
              style="background:var(--card);border-bottom:1px solid var(--border);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;"
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
              <div
                style="display:flex;gap:16px;font-family:'Fira Code',monospace;font-size:0.65rem;"
              >
                <span style="color:var(--text-muted);">TERMINAL_01</span>
                <span style="color:var(--accent);">enforce.ts</span>
              </div>
            </div>
            <pre
              style="padding:24px;font-family:'Fira Code',monospace;font-size:0.8rem;line-height:1.7;color:var(--text-muted);background:var(--bg);margin:0;position:relative;z-index:2;"
            >
<span style="color:#FF79C6">import</span> { allOf, hasRole, hasPermission, not, hasAttribute } <span style="color:#FF79C6">from</span> <span style="color:#F1FA8C">"@hex-di/guard"</span>;

<span style="color:#FF79C6">const</span> policy = <span style="color:#50FA7B">allOf</span>(
  <span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"editor"</span>),
  <span style="color:#50FA7B">hasPermission</span>(Permissions.<span style="color:#BD93F9">Publish</span>),
  <span style="color:#50FA7B">not</span>(<span style="color:#50FA7B">hasAttribute</span>(<span style="color:#F1FA8C">"suspended"</span>, <span style="color:#BD93F9">true</span>)),
);

<span style="color:#FF79C6">const</span> decision = <span style="color:#50FA7B">evaluate</span>(policy, {
  subject: currentUser,
  resource: targetDocument,
});

<span style="color:#FF79C6">if</span> (decision.granted) {
  <span style="color:#6272A4">// Access allowed — full trace available</span>
  audit.<span style="color:#50FA7B">log</span>(decision.trace);
}</pre>
            <!-- Progress bar -->
            <div
              style="height:2px;background:var(--accent);opacity:0.4;position:relative;z-index:2;"
            ></div>
          </div>
        </div>
      </section>

      <!-- COMPARISON (red hud vs amber hud) -->
      <section style="padding:6rem 2.5rem;">
        <div style="max-width:1000px;margin:0 auto;">
          <h2
            style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.6rem);color:var(--text);text-align:center;margin-bottom:2rem;"
          >
            Before & After
          </h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <!-- Before (red HUD) -->
            <div class="hud-card" style="border-color:rgba(239,68,68,0.3);">
              <style>
                .hud-card-red::before {
                  border-color: #ef4444 !important;
                }
                .hud-card-red::after {
                  border-color: #ef4444 !important;
                }
              </style>
              <div
                style="display:inline-flex;align-items:center;gap:6px;font-family:'Fira Code',monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--deny);border:1px solid rgba(239,68,68,0.3);padding:4px 10px;background:rgba(239,68,68,0.1);margin-bottom:16px;"
              >
                RUNTIME_FAIL
              </div>
              <pre
                style="font-family:'Fira Code',monospace;font-size:0.78rem;line-height:1.7;color:var(--text-muted);margin:0;"
              >
<span style="color:#6272A4">// Scattered across codebase</span>
<span style="color:#FF79C6">if</span> (user.role === <span style="color:#F1FA8C">"admin"</span>
    || user.permissions
      .includes(<span style="color:#F1FA8C">"Write"</span>)) {
  <span style="color:#FF79C6">if</span> (!user.suspended) {
    <span style="color:#6272A4">// allow... maybe?</span>
  }
}
<span style="color:#EF4444">// No audit trail</span>
<span style="color:#EF4444">// No composition</span>
<span style="color:#EF4444">// No type safety</span></pre>
            </div>
            <!-- After (amber HUD) -->
            <div class="hud-card">
              <div
                style="display:inline-flex;align-items:center;gap:6px;font-family:'Fira Code',monospace;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.15em;color:var(--accent);border:1px solid rgba(245,158,11,0.3);padding:4px 10px;background:rgba(245,158,11,0.1);margin-bottom:16px;"
              >
                COMPILE_OK
              </div>
              <pre
                style="font-family:'Fira Code',monospace;font-size:0.78rem;line-height:1.7;color:var(--text-muted);margin:0;"
              >
<span style="color:#6272A4">// Defined once, everywhere</span>
<span style="color:#FF79C6">const</span> policy = <span style="color:#50FA7B">allOf</span>(
  <span style="color:#50FA7B">anyOf</span>(<span style="color:#50FA7B">hasRole</span>(<span style="color:#F1FA8C">"admin"</span>),
    <span style="color:#50FA7B">hasPermission</span>(Write)),
  <span style="color:#50FA7B">not</span>(<span style="color:#50FA7B">hasAttribute</span>(
    <span style="color:#F1FA8C">"suspended"</span>, <span style="color:#BD93F9">true</span>)),
);

<span style="color:#F59E0B">// Full audit trail</span>
<span style="color:#F59E0B">// Composable & reusable</span>
<span style="color:#F59E0B">// Compile-time safe</span></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA (full-width hud-card) -->
      <section style="padding:4rem 2.5rem;">
        <div style="max-width:800px;margin:0 auto;">
          <div class="hud-card" style="text-align:center;padding:48px;">
            <h2
              style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:clamp(1.8rem,3vw,2.6rem);color:var(--text);margin-bottom:20px;"
            >
              Ready to secure your stack?
            </h2>
            <div style="display:flex;justify-content:center;gap:12px;">
              <a
                href="/docs"
                class="btn-slant"
                style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid var(--accent);color:var(--accent);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 32px;text-decoration:none;"
                >Get Started</a
              >
              <a
                href="/docs"
                style="display:inline-block;border:1px solid var(--border);color:var(--text-secondary);font-family:'Rajdhani',sans-serif;font-weight:600;padding:12px 28px;text-decoration:none;"
                >View Docs</a
              >
            </div>
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer
        class="tactical-border-b"
        style="border-bottom:none;border-top:1px solid rgba(245,158,11,0.2);padding:3rem 2.5rem;display:flex;justify-content:center;gap:4rem;font-size:0.8rem;color:var(--text-muted);"
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
    </main>
  </body>
</html>
```

</details>
