# Component Patterns — Reusable HTML Snippets

Copy-paste building blocks for any HexDI page. All snippets assume the standard `<head>` block (Tailwind CDN + fonts + config + CSS) is already present. See `design-system.md` for the full `<head>`.

---

## 1. Standard `<head>` (Vertical Scroll Variant)

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HexDI - Page Title</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600&family=Rajdhani:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          fontFamily: {
            sans: ["Inter", "sans-serif"],
            display: ["Rajdhani", "sans-serif"],
            mono: ["Fira Code", "monospace"],
          },
          colors: {
            hex: {
              bg: "#020408",
              surface: "#08101C",
              primary: "#00F0FF",
              primaryLight: "#5FFFFF",
              primaryDark: "#008F99",
              accent: "#FF5E00",
              accentDark: "#CC4A00",
              text: "#DAE6F0",
              muted: "#586E85",
            },
          },
          backgroundImage: {
            "radar-gradient":
              "radial-gradient(circle at center, rgba(0,240,255,0.12) 0%, rgba(2,4,8,0) 70%)",
            "holo-shimmer":
              "linear-gradient(45deg, transparent 25%, rgba(0,240,255,0.1) 50%, transparent 75%)",
          },
          animation: {
            float: "float 6s ease-in-out infinite",
            "pulse-glow": "pulse-glow 2s cubic-bezier(0.4,0,0.6,1) infinite",
            scanline: "scanline 8s linear infinite",
            "holo-slide": "holo-slide 3s ease-in-out infinite",
            "spin-slow": "spin 20s linear infinite",
          },
          keyframes: {
            float: {
              "0%,100%": { transform: "translateY(0) rotateX(20deg) rotateZ(-10deg)" },
              "50%": { transform: "translateY(-20px) rotateX(22deg) rotateZ(-8deg)" },
            },
            "pulse-glow": {
              "0%,100%": { opacity: "0.4", boxShadow: "0 0 5px rgba(0,240,255,0.2)" },
              "50%": { opacity: "1", boxShadow: "0 0 20px rgba(0,240,255,0.6)" },
            },
            scanline: {
              "0%": { transform: "translateY(-100%)" },
              "100%": { transform: "translateY(100%)" },
            },
            "holo-slide": {
              "0%": { backgroundPosition: "-200% 0" },
              "100%": { backgroundPosition: "200% 0" },
            },
          },
        },
      },
    };
  </script>
  <style>
    body {
      background-color: #020408;
      color: #dae6f0;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .bg-grid {
      background-size: 40px 40px;
      background-image:
        linear-gradient(to right, rgba(0, 240, 255, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
    }
    .hud-card {
      background: rgba(8, 16, 28, 0.7);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 240, 255, 0.15);
      position: relative;
      transition: all 0.3s ease;
    }
    .hud-card::before {
      content: "";
      position: absolute;
      top: -1px;
      left: -1px;
      width: 15px;
      height: 15px;
      border-top: 2px solid #00f0ff;
      border-left: 2px solid #00f0ff;
      transition: all 0.3s ease;
    }
    .hud-card::after {
      content: "";
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 15px;
      height: 15px;
      border-bottom: 2px solid #00f0ff;
      border-right: 2px solid #00f0ff;
      transition: all 0.3s ease;
    }
    .hud-card:hover {
      background: rgba(0, 240, 255, 0.05);
      border-color: rgba(0, 240, 255, 0.4);
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
    }
    .clip-path-slant {
      clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
    }
    .scanline {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100px;
      background: linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.05), transparent);
      animation: scanline-move 8s linear infinite;
      pointer-events: none;
      z-index: 50;
    }
    @keyframes scanline-move {
      0% {
        top: 0%;
      }
      100% {
        top: 100%;
      }
    }
  </style>
</head>
```

---

## 2. Navigation Bars

### 2a. Standard Top Nav (h-20)

```html
<nav
  class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl"
>
  <div class="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
    <!-- Logo -->
    <div class="flex items-center gap-3">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" class="text-hex-primary">
        <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" stroke-width="2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
      <span class="font-display font-bold text-2xl tracking-widest uppercase"
        >Hex<span class="text-hex-primary">DI</span></span
      >
    </div>
    <!-- Links -->
    <div
      class="hidden md:flex items-center gap-8 font-mono text-[11px] uppercase tracking-widest text-hex-muted"
    >
      <a href="#features" class="hover:text-hex-primary transition-colors">Features</a>
      <a href="#architecture" class="hover:text-hex-primary transition-colors">Architecture</a>
      <a href="#docs" class="hover:text-hex-primary transition-colors">Docs</a>
    </div>
    <!-- Status badge -->
    <div
      class="flex items-center gap-2 text-[10px] font-mono text-hex-primary border border-hex-primary/30 px-3 py-1.5 bg-hex-bg/60 backdrop-blur-sm"
    >
      <div class="w-1.5 h-1.5 bg-hex-primary rounded-full animate-ping"></div>
      SYS_v2.4
    </div>
  </div>
</nav>
```

### 2b. Compact Nav (h-16, grid-12 variant)

```html
<nav
  class="fixed top-0 w-full z-[100] border-b border-hex-primary/20 bg-hex-bg/80 backdrop-blur-xl h-16"
>
  <div class="max-w-[1400px] mx-auto px-6 w-full h-full flex items-center justify-between">
    <div class="flex items-center gap-3">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="text-hex-primary">
        <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" stroke-width="2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
      <span class="font-display font-bold text-xl tracking-widest uppercase"
        >Hex<span class="text-hex-primary">DI</span></span
      >
    </div>
    <div
      class="hidden md:flex items-center gap-6 font-mono text-[10px] uppercase tracking-widest text-hex-muted"
    >
      <a href="#features" class="hover:text-hex-primary transition-colors">Features</a>
      <a href="#architecture" class="hover:text-hex-primary transition-colors">Architecture</a>
      <a href="#docs" class="hover:text-hex-primary transition-colors">Docs</a>
    </div>
    <span class="font-mono text-[10px] text-hex-primary/60 border border-hex-primary/20 px-2 py-1"
      >SYS_v2.4</span
    >
  </div>
</nav>
```

### 2c. Left Sidebar Nav (fixed, w-64)

```html
<aside
  class="fixed left-0 top-0 bottom-0 w-64 z-[100] bg-hex-bg/90 backdrop-blur-xl flex flex-col p-8"
  style="border-right: 1px solid rgba(0,240,255,0.2); box-shadow: 4px 0 30px -10px rgba(0,240,255,0.2);"
>
  <!-- Logo -->
  <div class="flex items-center gap-3 cursor-pointer mb-16 group">
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      class="text-hex-primary transition-transform duration-500 group-hover:rotate-90"
    >
      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" stroke-width="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
    <span class="font-display font-bold text-2xl tracking-widest">HexDI</span>
  </div>
  <!-- Nav links -->
  <nav
    class="flex flex-col gap-8 text-[11px] font-mono tracking-[0.2em] text-hex-muted uppercase flex-grow"
  >
    <a href="#features" class="relative group py-2">
      <span class="group-hover:text-hex-primary transition-colors">[01_Features]</span>
      <span
        class="absolute bottom-0 left-0 w-0 h-[1px] bg-hex-primary transition-all duration-300 group-hover:w-full"
      ></span>
    </a>
    <a href="#architecture" class="relative group py-2">
      <span class="group-hover:text-hex-primary transition-colors">[02_Architecture]</span>
      <span
        class="absolute bottom-0 left-0 w-0 h-[1px] bg-hex-primary transition-all duration-300 group-hover:w-full"
      ></span>
    </a>
    <a href="#code" class="relative group py-2">
      <span class="group-hover:text-hex-primary transition-colors">[03_Code]</span>
      <span
        class="absolute bottom-0 left-0 w-0 h-[1px] bg-hex-primary transition-all duration-300 group-hover:w-full"
      ></span>
    </a>
  </nav>
</aside>
```

---

## 3. Hero Sections

### 3a. Standard Hero (full-screen, text left + hex SVG right)

```html
<section class="min-h-screen flex items-center pt-20 bg-grid relative overflow-hidden">
  <!-- Radial spotlight -->
  <div class="absolute inset-0 bg-radar-gradient opacity-60 pointer-events-none"></div>

  <div class="max-w-7xl mx-auto px-10 w-full grid lg:grid-cols-2 gap-16 items-center">
    <!-- Text side -->
    <div>
      <!-- Orange badge -->
      <div
        class="inline-flex items-center gap-3 px-3 py-1 border border-hex-accent/50 bg-hex-accent/5 text-hex-accent text-[9px] font-mono tracking-[0.4em] uppercase mb-8"
      >
        <span class="w-1.5 h-1.5 bg-hex-accent animate-pulse inline-block"></span>
        STABLE_PROTOCOL
      </div>
      <!-- Headline -->
      <h1
        class="font-display font-bold text-6xl lg:text-8xl leading-[0.85] tracking-tighter text-white uppercase mb-8"
      >
        Compile_Time<br />
        <span class="text-hex-primary drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">Structural</span
        ><br />
        Integrity.
      </h1>
      <!-- Subtext -->
      <p
        class="text-hex-muted font-mono text-sm leading-relaxed max-w-md mb-12 pl-4 border-l-2 border-hex-primary/30"
      >
        High-performance dependency injection for TypeScript.<br />
        Maps topology before execution to eliminate runtime failures.
      </p>
      <!-- CTAs -->
      <div class="flex flex-wrap gap-4">
        <button
          class="px-8 py-4 bg-hex-primary text-black font-bold font-display uppercase tracking-widest clip-path-slant hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
        >
          Initialize_Core
        </button>
        <button
          class="px-8 py-4 border border-hex-primary/40 text-hex-primary font-display uppercase tracking-widest hover:bg-hex-primary/10 transition-all font-bold"
        >
          View_Docs
        </button>
      </div>
    </div>

    <!-- Hex SVG side -->
    <div class="flex justify-center lg:justify-end">
      <svg
        class="animate-float w-80 h-80 opacity-80"
        viewBox="0 0 300 300"
        style="filter: drop-shadow(0 0 40px rgba(0,240,255,0.3));"
      >
        <polygon
          points="150,20 270,85 270,215 150,280 30,215 30,85"
          fill="none"
          stroke="#00F0FF"
          stroke-width="1.5"
          opacity="0.6"
        />
        <polygon
          points="150,50 245,103 245,197 150,250 55,197 55,103"
          fill="none"
          stroke="#00F0FF"
          stroke-width="1"
          opacity="0.3"
        />
        <polygon
          points="150,80 220,121 220,179 150,220 80,179 80,121"
          fill="rgba(0,240,255,0.05)"
          stroke="#00F0FF"
          stroke-width="1.5"
        />
        <circle cx="150" cy="150" r="20" fill="none" stroke="#FF5E00" stroke-width="2" />
        <circle cx="150" cy="150" r="6" fill="#FF5E00" />
        <line x1="150" y1="150" x2="150" y2="80" stroke="#00F0FF" stroke-width="1" opacity="0.5" />
        <line x1="150" y1="150" x2="220" y2="121" stroke="#00F0FF" stroke-width="1" opacity="0.5" />
        <line x1="150" y1="150" x2="220" y2="179" stroke="#00F0FF" stroke-width="1" opacity="0.5" />
      </svg>
    </div>
  </div>
</section>
```

### 3b. Hero Card (hud-card full-width, used in grid-12 / sidebar layouts)

```html
<div
  class="hud-card overflow-hidden min-h-[500px] flex flex-col lg:flex-row items-center p-8 lg:p-16 gap-12 relative"
>
  <!-- BG gradient -->
  <div class="absolute inset-0 bg-radar-gradient opacity-30 pointer-events-none"></div>
  <!-- Top pulse line -->
  <div
    class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-hex-primary to-transparent animate-pulse"
  ></div>

  <!-- Text -->
  <div class="flex-1 relative z-10">
    <div
      class="inline-flex items-center gap-3 px-3 py-1 border border-hex-accent/50 bg-hex-accent/5 text-hex-accent text-[9px] font-mono tracking-[0.4em] uppercase mb-8"
    >
      <span class="w-1.5 h-1.5 bg-hex-accent animate-pulse inline-block"></span>
      STABLE_PROTOCOL
    </div>
    <h1
      class="font-display font-bold text-5xl md:text-7xl leading-[0.85] tracking-tighter text-white uppercase mb-6"
    >
      Compile_Time<br />
      <span class="text-hex-primary drop-shadow-[0_0_20px_rgba(0,240,255,0.4)]">Structural</span
      ><br />
      Integrity.
    </h1>
    <p
      class="text-hex-muted font-mono text-sm leading-relaxed max-w-md mb-8 pl-4 border-l-2 border-hex-primary/30"
    >
      High-performance DI for TypeScript. Zero runtime failures.
    </p>
    <div class="flex flex-wrap gap-4">
      <button
        class="px-6 py-3 bg-hex-primary text-black font-bold font-display uppercase tracking-widest clip-path-slant hover:bg-white transition-all"
      >
        Initialize_Core
      </button>
      <button
        class="px-6 py-3 border border-hex-primary/40 text-hex-primary font-display uppercase tracking-widest hover:bg-hex-primary/10 transition-all font-bold"
      >
        View_Docs
      </button>
    </div>
  </div>

  <!-- SVG -->
  <div class="flex-1 max-w-md flex justify-center relative z-10">
    <svg
      class="animate-float w-64 h-64 opacity-80"
      viewBox="0 0 300 300"
      style="filter: drop-shadow(0 0 30px rgba(0,240,255,0.3));"
    >
      <polygon
        points="150,20 270,85 270,215 150,280 30,215 30,85"
        fill="none"
        stroke="#00F0FF"
        stroke-width="1.5"
        opacity="0.6"
      />
      <polygon
        points="150,80 220,121 220,179 150,220 80,179 80,121"
        fill="rgba(0,240,255,0.05)"
        stroke="#00F0FF"
        stroke-width="1.5"
      />
      <circle cx="150" cy="150" r="20" fill="none" stroke="#FF5E00" stroke-width="2" />
      <circle cx="150" cy="150" r="6" fill="#FF5E00" />
    </svg>
  </div>
</div>
```

---

## 4. Feature Cards

### 4a. Standard Feature Card (icon + title + description)

```html
<div class="hud-card p-6">
  <!-- Icon box -->
  <div
    class="w-10 h-10 flex items-center justify-center border border-hex-primary/20 bg-hex-primary/5 text-hex-primary mb-4"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  </div>
  <h3 class="font-display font-bold text-xl uppercase tracking-widest text-white mb-3">
    Feature_Title
  </h3>
  <p class="text-hex-muted text-xs font-mono leading-relaxed">
    Feature description text goes here. Keep it concise and technical.
  </p>
</div>
```

### 4b. Numbered Feature Card (numbered list style, from file 9)

```html
<div class="hud-card p-6 group hover:bg-hex-primary/5 transition-colors">
  <div class="flex gap-6 items-start">
    <div
      class="w-10 h-10 flex-shrink-0 flex items-center justify-center border border-hex-primary/20 text-hex-primary font-mono text-sm"
    >
      01
    </div>
    <div>
      <h4 class="font-display font-bold text-white uppercase tracking-widest text-lg mb-2">
        Feature Title
      </h4>
      <p class="text-hex-muted text-xs font-mono leading-relaxed">
        Feature description text. Keep short and precise.
      </p>
    </div>
  </div>
</div>
```

### 4c. Feature Card Grid (3-column)

```html
<div class="grid md:grid-cols-3 gap-6">
  <!-- Repeat 4a cards here -->
</div>
```

---

## 5. Terminal / Code Blocks

### 5a. Terminal Window

```html
<div class="hud-card overflow-hidden">
  <!-- Terminal title bar -->
  <div class="flex items-center gap-2 px-4 py-3 border-b border-hex-primary/10 bg-hex-surface/50">
    <div class="w-2.5 h-2.5 rounded-full bg-hex-accent/60"></div>
    <div class="w-2.5 h-2.5 rounded-full bg-hex-primary/40"></div>
    <div class="w-2.5 h-2.5 rounded-full bg-hex-muted/30"></div>
    <span class="font-mono text-[10px] text-hex-muted ml-3 tracking-widest uppercase"
      >Terminal_Output</span
    >
  </div>
  <!-- Code content -->
  <div
    class="p-6 font-mono text-[13px] overflow-x-auto relative"
    style="background: rgba(0,0,0,0.4);"
  >
    <!-- Scanline overlay -->
    <div class="scanline pointer-events-none"></div>
    <div class="space-y-1">
      <div><span class="text-hex-muted">// dependency graph analysis</span></div>
      <div>
        <span class="text-hex-accent">$</span>
        <span class="text-hex-primary">hex-di --analyze ./src</span>
      </div>
      <div class="text-hex-muted">&nbsp;</div>
      <div>
        <span class="text-hex-muted">[SCAN] </span
        ><span class="text-hex-text">Reading AST nodes...</span>
      </div>
      <div>
        <span class="text-hex-muted">[GRAPH]</span
        ><span class="text-hex-text"> Generating dependency tree...</span>
      </div>
      <div>
        <span class="text-hex-muted">[OK] </span
        ><span class="text-green-400">Topology validated ✓</span>
      </div>
      <div class="text-hex-muted">&nbsp;</div>
      <div>
        <span class="text-hex-muted">const </span><span class="text-hex-primary">container</span
        ><span class="text-hex-text"> = </span><span class="text-hex-accent">new</span
        ><span class="text-hex-text"> Container()</span>
      </div>
      <div>
        <span class="text-hex-text"> .</span><span class="text-hex-primary">register</span
        ><span class="text-hex-text">(LoggerAdapter)</span>
      </div>
      <div>
        <span class="text-hex-text"> .</span><span class="text-hex-primary">register</span
        ><span class="text-hex-text">(DatabaseAdapter)</span>
      </div>
      <div>
        <span class="text-hex-text"> .</span><span class="text-hex-primary">build</span
        ><span class="text-hex-text">()</span>
      </div>
    </div>
  </div>
</div>
```

### 5b. Install Widget (compact inline terminal)

```html
<div class="bg-hex-surface/40 p-4 border border-hex-primary/10 font-mono text-[11px] inline-block">
  <div class="flex items-center gap-2 mb-1">
    <span class="text-hex-accent">$</span>
    <span class="text-hex-primary">npm install @hex-di/core</span>
  </div>
  <div class="text-hex-muted">
    &gt; VALIDATING_GRAPH...<br />
    &gt; TOPOLOGY_READY [42_NODES]
  </div>
</div>
```

### 5c. Terminal Inspector Panel (left sidebar, from file 13)

```html
<aside class="w-[450px] flex-shrink-0 border-r border-hex-primary/10 flex flex-col overflow-hidden">
  <!-- Header -->
  <div
    class="p-4 border-b border-hex-primary/10 bg-hex-surface/30 flex justify-between items-center"
  >
    <span class="font-mono text-[10px] uppercase tracking-widest text-hex-muted"
      >Terminal_Inspector</span
    >
    <div class="flex gap-1.5">
      <div class="w-2.5 h-2.5 rounded-full bg-hex-accent/40"></div>
      <div class="w-2.5 h-2.5 rounded-full bg-hex-primary/40"></div>
    </div>
  </div>
  <!-- Scrollable body -->
  <div
    class="flex-1 overflow-y-auto p-6 font-mono text-[11px] relative"
    style="scrollbar-width: thin; scrollbar-color: #00F0FF33 transparent;"
  >
    <!-- Scanline -->
    <div class="scanline"></div>
    <!-- Content -->
    <div class="space-y-2 text-hex-muted">
      <div class="text-hex-primary/40">// APP_TOPOLOGY_MAPPING_INIT</div>
      <div>
        <span class="text-hex-accent">$</span>
        <span class="text-hex-primary">hex-di --analyze ./src</span>
      </div>
      <div>&nbsp;</div>
      <div>[SCAN] Reading AST nodes...</div>
      <div>[GRAPH] Generating dependency tree...</div>
      <div>[COMPUTE] Path validation: <span class="text-green-400">OK</span></div>
      <div>&nbsp;</div>
      <div class="border border-hex-primary/20 bg-black/40 p-4 rounded text-hex-primaryLight">
        <div class="text-hex-primary/40">// CONTAINER_BUILD</div>
        <div>
          <span class="text-hex-accent">const</span> container =
          <span class="text-hex-accent">new</span> Container()
        </div>
        <div>.register(LoggerAdapter)</div>
        <div>.build()</div>
      </div>
    </div>
  </div>
</aside>
```

---

## 6. Stat / Metric Cards (Dashboard style)

### 6a. Stat Card

```html
<div
  class="compact-card bg-hex-surface/30 p-4 relative"
  style="border: 1px solid rgba(0,240,255,0.1); transition: all 0.2s ease;"
>
  <div class="text-[9px] font-mono text-hex-muted uppercase tracking-widest mb-2">METRIC_LABEL</div>
  <div
    class="text-3xl font-display font-bold text-hex-primary"
    style="text-shadow: 0 0 10px rgba(0,240,255,0.3);"
  >
    42
  </div>
  <div class="text-[9px] font-mono text-hex-muted mt-1">unit or sublabel</div>
</div>
```

### 6b. Stat Cards Row (4-column)

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <!-- repeat stat cards -->
</div>
```

---

## 7. Buttons

### 7a. Primary CTA (slanted)

```html
<button
  class="px-8 py-4 bg-hex-primary text-black font-bold font-display uppercase tracking-widest clip-path-slant hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
>
  Initialize_Core
</button>
```

### 7b. Ghost CTA

```html
<button
  class="px-8 py-4 border border-hex-primary/40 text-hex-primary font-display uppercase tracking-widest hover:bg-hex-primary/10 transition-all font-bold"
>
  View_Docs
</button>
```

### 7c. Small Mono Action Button

```html
<button
  class="px-4 py-2 border border-hex-primary/30 text-hex-primary font-mono text-[10px] uppercase tracking-widest hover:bg-hex-primary/10 transition-colors"
>
  [ACTION]
</button>
```

---

## 8. Badges & Labels

### 8a. Orange Status Badge

```html
<div
  class="inline-flex items-center gap-2 px-3 py-1 border border-hex-accent/50 bg-hex-accent/5 text-hex-accent text-[9px] font-mono tracking-[0.4em] uppercase"
>
  <span class="w-1.5 h-1.5 bg-hex-accent animate-pulse inline-block"></span>
  STABLE_PROTOCOL
</div>
```

### 8b. Cyan System Badge

```html
<div
  class="inline-flex items-center gap-2 text-[10px] font-mono text-hex-primary border border-hex-primary/30 px-3 py-1.5 bg-hex-bg/80 backdrop-blur-sm"
>
  <div class="w-1.5 h-1.5 bg-hex-primary rounded-full animate-ping"></div>
  SYS.ONLINE
</div>
```

### 8c. Section Label

```html
<div class="font-mono text-[10px] text-hex-primary uppercase tracking-[0.5em] mb-6">
  SECTION_LABEL
</div>
```

---

## 9. Layout Shells

### 9a. Vertical Scroll Landing (standard)

```html
<body class="bg-hex-bg bg-grid overflow-x-hidden">
  <!-- Fixed bg layers -->
  <div class="fixed inset-0 bg-grid opacity-30 pointer-events-none z-0"></div>
  <div
    class="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,4,8,0.8)_100%)] pointer-events-none z-0"
  ></div>

  <!-- Nav -->
  <!-- ... standard nav ... -->

  <!-- Main content -->
  <main class="relative z-10">
    <!-- Hero -->
    <!-- Features -->
    <!-- Code Preview -->
    <!-- Architecture -->
    <!-- Comparison -->
    <!-- CTA -->
    <!-- Footer -->
  </main>
</body>
```

### 9b. Grid-12 Layout Shell

```html
<body class="bg-hex-bg overflow-x-hidden">
  <!-- Nav h-16 -->
  <main class="max-w-[1400px] mx-auto px-6 pt-24 pb-20 grid grid-cols-1 md:grid-cols-12 gap-6">
    <!-- Hero: col-span-12 -->
    <!-- Features: 3× col-span-4 -->
    <!-- Code: col-span-7 + Sidebar: col-span-5 -->
    <!-- Architecture: col-span-12 -->
    <!-- Lifetime: 3× col-span-4 -->
    <!-- Comparison: 2× col-span-6 -->
    <!-- CTA: col-span-12 -->
  </main>
</body>
```

### 9c. Split Screen (auth / 50-50)

```html
<body class="bg-hex-bg overflow-hidden">
  <main class="flex h-screen w-full overflow-hidden">
    <!-- Left: form panel -->
    <section
      class="w-1/2 relative bg-grid flex items-center justify-center border-r border-hex-primary/10"
    >
      <!-- form content -->
    </section>
    <!-- Right: scrollable content -->
    <section class="w-1/2 overflow-y-auto">
      <!-- feature list / marketing content -->
    </section>
  </main>
</body>
```

### 9d. Dashboard (fixed-height, no scroll)

```html
<body class="bg-hex-bg bg-grid min-h-screen flex flex-col">
  <!-- Nav h-14 sticky -->
  <main class="flex flex-1 overflow-hidden" style="height: calc(100vh - 56px);">
    <!-- Optional left panel -->
    <aside class="w-[450px] border-r border-hex-primary/10 overflow-y-auto">
      <!-- terminal -->
    </aside>
    <!-- Main content -->
    <div class="flex-1 overflow-y-auto p-6"><!-- stats + charts --></div>
  </main>
</body>
```

### 9e. Sidebar Nav Shell

```html
<body class="bg-hex-bg flex overflow-x-hidden">
  <!-- Fixed sidebar -->
  <aside><!-- ... sidebar nav ... --></aside>
  <!-- Scrollable main -->
  <main class="ml-64 flex-1 min-h-screen relative z-10 p-8 md:p-16">
    <!-- page content -->
  </main>
</body>
```

### 9f. Mobile Vertical Snap (5 sections)

```html
<body class="bg-hex-bg overflow-hidden" style="height:100vh; width:100vw;">
  <div
    class="mobile-snap-container"
    style="scroll-snap-type: y mandatory; overflow-y: scroll; height: 100vh; scrollbar-width: none;"
  >
    <section
      class="snap-section"
      style="scroll-snap-align: start; height: 100vh; width: 100%; position: relative;"
    >
      <!-- Panel 1 -->
    </section>
    <section class="snap-section"><!-- Panel 2 --></section>
    <section class="snap-section"><!-- Panel 3 --></section>
    <section class="snap-section"><!-- Panel 4 --></section>
    <section class="snap-section"><!-- Panel 5 --></section>
  </div>
</body>
```

### 9g. Horizontal Terminal Scroll (5 panels × 100vw)

```html
<body class="bg-hex-bg overflow-hidden">
  <!-- Fixed nav -->
  <!-- Fixed bg layers -->
  <div
    class="horizontal-scroll-container"
    style="display:flex; width:500vw; height:100vh; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none;"
  >
    <section
      style="width:100vw; height:100vh; flex-shrink:0; scroll-snap-align:start; position:relative; overflow:hidden;"
    >
      <!-- Panel 1: Hero -->
    </section>
    <section style="width:100vw; height:100vh; flex-shrink:0; scroll-snap-align:start;">
      <!-- Panel 2: Features -->
    </section>
    <section style="width:100vw; height:100vh; flex-shrink:0; scroll-snap-align:start;">
      <!-- Panel 3: Code -->
    </section>
    <section style="width:100vw; height:100vh; flex-shrink:0; scroll-snap-align:start;">
      <!-- Panel 4: Architecture -->
    </section>
    <section style="width:100vw; height:100vh; flex-shrink:0; scroll-snap-align:start;">
      <!-- Panel 5: CTA -->
    </section>
  </div>
  <!-- Progress dots -->
  <div
    style="position:fixed; bottom:40px; left:50%; transform:translateX(-50%); display:flex; gap:12px; z-index:100; padding:8px 16px; background:rgba(8,16,28,0.6); border:1px solid rgba(0,240,255,0.2);"
  >
    <div style="width:40px; height:3px; background:#00F0FF; box-shadow:0 0 10px #00F0FF;"></div>
    <div style="width:40px; height:3px; background:rgba(0,240,255,0.15);"></div>
    <div style="width:40px; height:3px; background:rgba(0,240,255,0.15);"></div>
    <div style="width:40px; height:3px; background:rgba(0,240,255,0.15);"></div>
    <div style="width:40px; height:3px; background:rgba(0,240,255,0.15);"></div>
  </div>
</body>
```

---

## 10. Section Patterns

### 10a. Section Header with Left Border

```html
<div class="border-l-4 border-hex-primary pl-6 mb-12">
  <div class="font-mono text-[10px] text-hex-primary uppercase tracking-[0.5em] mb-2">
    SECTION_LABEL
  </div>
  <h2 class="font-display font-bold text-4xl md:text-5xl uppercase tracking-wider text-white">
    Section Title
  </h2>
</div>
```

### 10b. Comparison Table (2-col, HexDI vs Traditional)

```html
<div class="grid md:grid-cols-2 gap-6">
  <!-- HexDI column -->
  <div class="hud-card p-6">
    <div class="font-mono text-[10px] text-hex-primary uppercase tracking-widest mb-4">HexDI</div>
    <ul class="space-y-3">
      <li class="flex items-center gap-3 font-mono text-xs text-hex-text">
        <span class="text-green-400">✓</span> Compile-time validation
      </li>
      <li class="flex items-center gap-3 font-mono text-xs text-hex-text">
        <span class="text-green-400">✓</span> Zero runtime overhead
      </li>
    </ul>
  </div>
  <!-- Traditional column -->
  <div class="hud-card p-6 opacity-60">
    <div class="font-mono text-[10px] text-hex-muted uppercase tracking-widest mb-4">
      Traditional DI
    </div>
    <ul class="space-y-3">
      <li class="flex items-center gap-3 font-mono text-xs text-hex-muted">
        <span class="text-red-400">✗</span> Runtime dependency resolution
      </li>
      <li class="flex items-center gap-3 font-mono text-xs text-hex-muted">
        <span class="text-red-400">✗</span> Decorator magic / reflection
      </li>
    </ul>
  </div>
</div>
```

### 10c. CTA Block

```html
<div class="hud-card p-12 text-center relative overflow-hidden">
  <div class="absolute inset-0 bg-radar-gradient opacity-40 pointer-events-none"></div>
  <div class="relative z-10">
    <div class="font-mono text-[10px] text-hex-primary uppercase tracking-[0.5em] mb-4">
      READY TO DEPLOY
    </div>
    <h2 class="font-display font-bold text-5xl uppercase tracking-wider text-white mb-4">
      Start Building
    </h2>
    <p class="text-hex-muted font-mono text-sm mb-8 max-w-lg mx-auto">
      Eliminate runtime dependency failures. Ship with confidence.
    </p>
    <div class="flex justify-center gap-4">
      <button
        class="px-10 py-4 bg-hex-primary text-black font-bold font-display uppercase tracking-widest clip-path-slant hover:bg-white transition-all shadow-[0_0_30px_rgba(0,240,255,0.4)]"
      >
        Get_Started
      </button>
      <button
        class="px-10 py-4 border border-hex-primary/40 text-hex-primary font-display uppercase tracking-widest hover:bg-hex-primary/10 transition-all font-bold"
      >
        Read_Docs
      </button>
    </div>
  </div>
</div>
```

### 10d. Lifetime Scope Cards (3-col)

```html
<div class="grid md:grid-cols-3 gap-6">
  <div class="hud-card p-6">
    <div class="font-mono text-[10px] text-hex-accent uppercase tracking-widest mb-3">
      SINGLETON
    </div>
    <h3 class="font-display font-bold text-xl text-white uppercase mb-2">One Instance</h3>
    <p class="text-hex-muted text-xs font-mono leading-relaxed">
      Created once, shared across the entire container lifetime.
    </p>
  </div>
  <div class="hud-card p-6">
    <div class="font-mono text-[10px] text-hex-primary uppercase tracking-widest mb-3">
      TRANSIENT
    </div>
    <h3 class="font-display font-bold text-xl text-white uppercase mb-2">New Each Time</h3>
    <p class="text-hex-muted text-xs font-mono leading-relaxed">
      Fresh instance created on every resolution request.
    </p>
  </div>
  <div class="hud-card p-6">
    <div class="font-mono text-[10px] text-hex-primaryLight uppercase tracking-widest mb-3">
      SCOPED
    </div>
    <h3 class="font-display font-bold text-xl text-white uppercase mb-2">Per Scope</h3>
    <p class="text-hex-muted text-xs font-mono leading-relaxed">
      Shared within a scope boundary, disposed when scope ends.
    </p>
  </div>
</div>
```

---

## 11. Hex SVG Icon (standalone)

```html
<svg width="28" height="28" viewBox="0 0 24 24" fill="none" class="text-hex-primary">
  <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" stroke-width="2" />
  <circle cx="12" cy="12" r="3" fill="currentColor" />
</svg>
```

---

## 12. Form Elements (auth / gateway style)

```html
<form class="space-y-6">
  <div>
    <label class="block font-mono text-[10px] text-hex-muted uppercase tracking-[0.2em] mb-2"
      >User_Identity</label
    >
    <input
      type="text"
      class="w-full bg-hex-bg/50 border border-hex-primary/20 p-3 font-mono text-sm focus:outline-none focus:border-hex-primary text-hex-primary transition-colors"
      placeholder="ID_ALPHA_01"
    />
  </div>
  <div>
    <label class="block font-mono text-[10px] text-hex-muted uppercase tracking-[0.2em] mb-2"
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
```

---

## 13. Footer

```html
<footer class="border-t border-hex-primary/10 py-12 mt-24">
  <div class="max-w-7xl mx-auto px-10 flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="flex items-center gap-3">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        class="text-hex-primary opacity-60"
      >
        <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" stroke="currentColor" stroke-width="2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
      <span class="font-mono text-[10px] text-hex-muted uppercase tracking-widest"
        >HexDI v2.4.0 // MIT License</span
      >
    </div>
    <div class="flex gap-6 font-mono text-[10px] text-hex-muted uppercase tracking-widest">
      <a href="#" class="hover:text-hex-primary transition-colors">GitHub</a>
      <a href="#" class="hover:text-hex-primary transition-colors">Docs</a>
      <a href="#" class="hover:text-hex-primary transition-colors">npm</a>
    </div>
  </div>
</footer>
```

---

_See individual file docs (01 through 18) for per-variant details and differences._
