# 09 — Auth / Login Split-Screen

**File:** `9.html`
**Title:** HexDI - Secure Gateway
**Type:** Authentication / login page
**Layout:** Full-screen horizontal split (no scroll on root, right side scrollable)

---

![Screenshot](./screenshots/09.png)

## Overview

A completely different layout archetype. A **full-screen split** (`flex h-screen overflow-hidden`) with the login form on the left half and the landing page content scrolling on the right half. The left panel is a fixed-height auth form; the right panel is a long scrollable content area with marketing sections.

---

## Color Palette

Standard HexDI palette. No overrides.

- Background: `#020408`
- Custom scrollbar: `4px width, #00F0FF thumb`

---

## Root Layout

```css
body {
  overflow: hidden;
}
main {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
```

```
┌──────────────────────────┬──────────────────────────────────┐
│  LEFT HALF  w-1/2        │  RIGHT HALF  w-1/2               │
│  (auth panel)            │  (scrollable content)            │
│                          │                                  │
│  - bg-grid               │  - overflow-y: auto              │
│  - diagonal gradient     │  - custom-scrollbar (4px cyan)   │
│    from-primary/5 to     │                                  │
│    accent/5              │  sticky status badge top-right   │
│  - flex items-center     │                                  │
│    justify-center        │  px-12 pb-24 space-y-32          │
│                          │  ├─ Hero text (no SVG)           │
│  HexDI logo (32px)       │  ├─ Features 2-col               │
│                          │  ├─ Code preview                  │
│  .hud-card p-8           │  ├─ Architecture                  │
│  ┌──────────────────┐    │  └─ CTA                          │
│  │ "Access_Protocol"│    │                                  │
│  │ ─────────────    │    │                                  │
│  │ User_Identity    │    │                                  │
│  │ [ID_ALPHA_01   ] │    │                                  │
│  │ Security_Cipher  │    │                                  │
│  │ [••••••••      ] │    │                                  │
│  │ [Initialize_   ] │    │                                  │
│  │  Session        │    │                                  │
│  │ ──────────────── │    │                                  │
│  │ No account?      │    │                                  │
│  │        Req_Access│    │                                  │
│  └──────────────────┘    │                                  │
│                          │                                  │
│  bottom-left telemetry:  │                                  │
│  "Build: V2.4.0_LTS"     │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Left Panel Details

### Container

```html
<section
  class="w-1/2 relative bg-grid flex items-center justify-center border-r border-hex-primary/10"
>
  <!-- diagonal gradient overlay -->
  <div
    class="absolute inset-0 bg-gradient-to-br from-hex-primary/5 via-transparent to-hex-accent/5"
  ></div>
  <!-- content: max-w-md px-8 relative z-10 -->
</section>
```

### Logo Block

- 32px hex SVG icon + "HexDI" in `font-display font-bold text-3xl tracking-widest uppercase`

### Auth Form Card (`.hud-card p-8`)

- Title: `"Access_Protocol"` — `text-xl font-display font-bold uppercase tracking-widest`
- 2px cyan underline bar below title: `h-0.5 w-12 bg-hex-primary`

**Input fields:**

```css
/* Label: */
font-mono text-[10px] text-hex-muted uppercase tracking-[0.2em]

/* Input: */
w-full bg-hex-bg/50 border border-hex-primary/20 p-3 font-mono text-sm
focus:border-hex-primary text-hex-primary transition-colors
/* No border-radius — sharp corners */
placeholder: "ID_ALPHA_01" / "••••••••"
```

**Submit button:**

```css
w-full py-4 bg-hex-primary text-black font-bold font-display uppercase tracking-widest
clip-path-slant shadow-[0_0_20px_rgba(0,240,255,0.2)]
hover:bg-white transition-all
```

Text: `"Initialize_Session"`

**Footer links:**

- Left: `"No account?"` — `text-[10px] font-mono text-hex-muted uppercase`
- Right: `"Request_Access"` — `text-[10px] font-mono text-hex-primary hover:underline`

### Bottom Telemetry

```html
<div
  class="absolute bottom-8 left-8 font-mono text-[8px] text-hex-muted tracking-[0.5em] uppercase"
>
  Build: V2.4.0_LTS // Node_Alpha
</div>
```

---

## Right Panel Details

### Container

```html
<section class="w-1/2 bg-[#020408] overflow-y-auto custom-scrollbar relative">
  <!-- sticky status badge -->
  <div class="sticky top-0 z-20 p-8 flex justify-end">
    <!-- SYS.ONLINE badge -->
  </div>
  <!-- content: px-12 pb-24 space-y-32 -->
</section>
```

**Content sections (vertical stack, `space-y-32`):**

1. Hero text: orange badge + H1 + subtext paragraph (no SVG graphic — it's on left)
2. Features: condensed 2-column grid of hud-cards
3. Code preview: terminal code window
4. Module architecture section
5. CTA block

---

## Scrollbar

```css
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #020408;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 240, 255, 0.2);
}
```

---

## When to Use

Use this when the page requires a login gate with simultaneous product preview. The split layout keeps users engaged with the marketing content while presenting the auth form. Classic SaaS auth page pattern with HexDI visual language.

---

<details>
<summary><strong>HTML Starter Boilerplate</strong></summary>

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Standard head (no animation keyframes needed for this layout) -->
    <!-- Split: flex h-screen, left form + right scrollable content, no top nav -->
    <!-- body overflow: hidden (fixed split layout), hud-card blur: 12px -->
    <!-- custom-scrollbar: 4px thin scrollbar for right pane -->
  </head>
  <body class="bg-hex-bg overflow-hidden">
    <main class="flex h-screen w-full overflow-hidden">
      <!-- Left: Login form (50%) -->
      <section
        class="w-1/2 relative bg-grid flex items-center justify-center border-r border-hex-primary/10"
      >
        <div class="w-full max-w-md px-8 relative z-10">
          <!-- Logo -->
          <div class="mb-10 flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" class="text-hex-primary">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" stroke-width="2" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            <span class="font-display font-bold text-2xl tracking-widest uppercase"
              >Hex<span class="text-hex-primary">DI</span></span
            >
          </div>
          <!-- Form card -->
          <div class="hud-card p-8" style="backdrop-filter: blur(12px);">
            <h2 class="text-xl font-display font-bold text-white uppercase tracking-widest mb-6">
              Access_Protocol
            </h2>
            <form class="space-y-6">
              <div>
                <label
                  class="block font-mono text-[10px] text-hex-muted uppercase tracking-[0.2em] mb-2"
                  >User_Identity</label
                >
                <input
                  type="text"
                  class="w-full bg-hex-bg/50 border border-hex-primary/20 p-3 font-mono text-sm focus:outline-none focus:border-hex-primary text-hex-primary transition-colors"
                  placeholder="ID_ALPHA_01"
                />
              </div>
              <div>
                <label
                  class="block font-mono text-[10px] text-hex-muted uppercase tracking-[0.2em] mb-2"
                  >Security_Cipher</label
                >
                <input
                  type="password"
                  class="w-full bg-hex-bg/50 border border-hex-primary/20 p-3 font-mono text-sm focus:outline-none focus:border-hex-primary text-hex-primary transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button
                class="w-full py-4 bg-hex-primary text-black font-bold font-display uppercase tracking-widest clip-path-slant hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              >
                Initialize_Session
              </button>
            </form>
          </div>
        </div>
        <div
          class="absolute bottom-8 left-8 font-mono text-[8px] text-hex-muted tracking-[0.5em] uppercase"
        >
          Build: V2.4.0_LTS
        </div>
      </section>

      <!-- Right: Scrollable content (50%) -->
      <section
        class="w-1/2 overflow-y-auto relative"
        style="scrollbar-width: thin; scrollbar-color: rgba(0,240,255,0.2) transparent;"
      >
        <div
          class="sticky top-0 z-20 p-8 flex justify-end bg-gradient-to-b from-hex-bg to-transparent"
        >
          <div
            class="flex items-center gap-3 text-[10px] text-hex-primary border border-hex-primary/30 px-3 py-1.5 bg-hex-bg/80 backdrop-blur-md"
          >
            <div class="w-1.5 h-1.5 bg-hex-primary rounded-full animate-ping"></div>
            SYS.ONLINE
          </div>
        </div>
        <div class="px-12 pb-24 space-y-32">
          <!-- Hero text block -->
          <div class="pt-12">
            <div
              class="inline-flex items-center gap-2 px-3 py-1 border border-hex-accent/50 bg-hex-accent/5 text-hex-accent text-[9px] font-mono tracking-[0.4em] uppercase mb-8"
            >
              <span class="w-1.5 h-1.5 bg-hex-accent animate-pulse inline-block"></span>
              STABLE_PROTOCOL
            </div>
            <h1
              class="font-display font-bold text-5xl leading-[0.85] tracking-tighter text-white uppercase mb-6"
            >
              Compile_Time<br />
              <span class="text-hex-primary">Structural</span><br />
              Integrity.
            </h1>
            <p
              class="text-hex-muted font-mono text-sm leading-relaxed max-w-md pl-4 border-l-2 border-hex-primary/30"
            >
              High-performance DI for TypeScript. Zero runtime failures.
            </p>
          </div>
          <!-- Numbered feature cards -->
          <div class="space-y-6"><!-- 4× numbered hud-card features --></div>
          <!-- Install widget -->
          <div
            class="bg-hex-surface/40 p-4 border border-hex-primary/10 font-mono text-[11px] inline-block"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-hex-accent">$</span>
              <span class="text-hex-primary">npm install @hex-di/core</span>
            </div>
            <div class="text-hex-muted">&gt; TOPOLOGY_READY [42_NODES]</div>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
```

</details>
