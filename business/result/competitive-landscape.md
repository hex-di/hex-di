# Competitive Landscape: TypeScript Result Libraries

## Summary Table

| Library    | Weekly Downloads | GitHub Stars | Bundle Size       | Dependencies     | Focus                                       |
| ---------- | ---------------- | ------------ | ----------------- | ---------------- | ------------------------------------------- |
| Effect     | ~8M              | 13.4k        | Large (ecosystem) | Many (ecosystem) | Full ecosystem ("missing stdlib")           |
| fp-ts      | ~3.9M            | 11.5k        | ~45kb             | 0                | FP library (declining, merging into Effect) |
| neverthrow | ~1.4M            | 7.3k         | ~5kb              | 0                | Focused Result type leader                  |
| true-myth  | ~485k            | 1.3k         | ~12kb             | 0                | Result + Maybe + Task                       |
| ts-results | ~152k            | 1.4k         | ~3kb              | 0                | Minimal Result                              |
| purify-ts  | ~66k             | 1.6k         | ~25kb             | 0                | FP standard library                         |
| oxide.ts   | ~27k             | ~300         | ~4kb              | 0                | Rust-inspired minimal                       |

_Data as of March 2026. Downloads from npm; stars from GitHub._

```
  Weekly Downloads — Logarithmic Scale (thousands)
 ┌──────────────────────────────────────────────────────────────────────┐
 │                                                                      │
 │  Effect     │████████████████████████████████████████████████│ 8,000k │
 │  fp-ts      │██████████████████████████████████▒▒▒▒▒▒▒▒▒▒▒▒│ 3,900k │
 │  neverthrow │██████████████████████████████                 │ 1,400k │
 │  true-myth  │█████████████████████                          │   485k │
 │  ts-results │████████████████                               │   152k │
 │  purify-ts  │████████████                                   │    66k │
 │  oxide.ts   │██████████                                     │    27k │
 │             └───────────────────────────────────────────────┘        │
 │              10k     100k       500k      1M       5M       10M     │
 │                                                                      │
 │  █ = active/growing    ▒ = declining                                 │
 └──────────────────────────────────────────────────────────────────────┘

  GitHub Stars
 ┌──────────────────────────────────────────────────────────────────────┐
 │                                                                      │
 │  Effect     │████████████████████████████████████████████████│ 13.4k  │
 │  fp-ts      │█████████████████████████████████████████▒▒▒▒▒▒│ 11.5k  │
 │  neverthrow │██████████████████████████                     │  7.3k  │
 │  purify-ts  │█████                                          │  1.6k  │
 │  ts-results │████                                           │  1.4k  │
 │  true-myth  │████                                           │  1.3k  │
 │  oxide.ts   │█                                              │  ~300  │
 │             └───────────────────────────────────────────────┘        │
 │              0       2k       5k       8k       11k      14k        │
 │                                                                      │
 └──────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Competitor Profiles

### Effect (~8M weekly downloads)

**Overview**: Effect is a full-featured TypeScript ecosystem providing typed errors, dependency injection, concurrency, streaming, scheduling, metrics, tracing, schema validation, and more. Originally the successor to fp-ts, it has grown into a comprehensive platform.

**Strengths**:

- Massive feature set — covers nearly every infrastructure concern
- Strong community and corporate backing
- Excellent type-level error tracking with tagged errors
- Active development with frequent releases
- Growing ecosystem of official packages (Effect/platform, Effect/schema, etc.)

**Weaknesses**:

- Steep learning curve — requires fundamental shift in how code is written
- All-or-nothing adoption pressure — using Effect for errors pulls in the whole model
- Heavy bundle size when using multiple packages
- Opinionated runtime model (fibers, layers) that permeates the entire codebase
- Complex type signatures that can intimidate newcomers

**Maintenance Health**: Excellent — daily commits, responsive maintainers, active Discord
**Target Audience**: Teams building complex systems willing to invest in the Effect paradigm

---

### fp-ts (~3.9M weekly downloads)

**Overview**: The original Haskell-inspired FP library for TypeScript. Provides HKTs, type classes, and algebraic data types including Either (Result equivalent) and Option.

**Strengths**:

- Large existing user base and extensive ecosystem (fp-ts-contrib, io-ts, etc.)
- Theoretically rigorous — follows established FP patterns
- Well-documented with community-written guides

**Weaknesses**:

- **Actively declining** — maintainer has joined Effect; fp-ts is merging into Effect
- Haskell naming conventions alienate mainstream TS developers (Either, Left, Right)
- HKT encoding is complex and produces poor error messages
- No active development — primarily in maintenance/migration mode
- Pipe-based API feels foreign in modern TypeScript

**Maintenance Health**: Declining — minimal updates, migration to Effect in progress
**Target Audience**: Legacy users; new adoption not recommended

---

### neverthrow (~1.4M weekly downloads)

**Overview**: The most popular focused Result library. Provides `Result<T, E>` and `ResultAsync<T, E>` with a clean, pragmatic API.

**Strengths**:

- Market leader in the focused-tool segment with strong brand recognition
- Simple, approachable API — low learning curve
- Good async support with `ResultAsync`
- ESLint plugin (`eslint-plugin-neverthrow`) to enforce `.match()` / error handling
- Active maintenance with regular releases
- Solid documentation

**Weaknesses**:

- No tagged error discrimination (no `catchTag` / `catchTags`)
- No effect system or error contracts
- No Option/Maybe type — only Result
- Limited combinators compared to more feature-rich alternatives
- No do-notation or generator-based composition
- No `createErrorGroup` or error aggregation patterns
- Class-based implementation (not frozen/immutable)

**Maintenance Health**: Good — regular updates, responsive to issues
**Target Audience**: Teams wanting typed errors with minimal ceremony

---

### true-myth (~485k weekly downloads)

**Overview**: A lightweight library providing Result, Maybe, and Task types with a focus on simplicity and correctness.

**Strengths**:

- Clean, well-designed API
- Includes Maybe (Option) type alongside Result
- Task type for async operations
- Good TypeScript support
- Thorough documentation with practical examples

**Weaknesses**:

- Limited API surface — basic combinators only (~20 methods)
- No tagged error support
- No effect system or error contracts
- Smaller community than neverthrow
- No generator/do-notation support
- No error grouping or aggregation

**Maintenance Health**: Moderate — maintained but slower release cadence
**Target Audience**: Teams wanting a lightweight, correct Result + Maybe library

---

### ts-results (~152k weekly downloads)

**Overview**: A minimal Rust-inspired Result library. Focuses on being small and simple.

**Strengths**:

- Very small bundle size (~3kb)
- Rust-familiar API naming
- Simple to understand and adopt

**Weaknesses**:

- Minimal feature set — basic Ok/Err only
- No async support
- No Option type
- Limited combinators
- Infrequent updates
- No tagged errors, no effect system

**Maintenance Health**: Low — infrequent updates
**Target Audience**: Developers wanting the absolute minimum Result implementation

---

### purify-ts (~66k weekly downloads)

**Overview**: A functional programming standard library for TypeScript, inspired by Haskell. Provides Maybe, Either, Codec, and other algebraic types.

**Strengths**:

- Comprehensive FP toolkit (Maybe, Either, Codec, NonEmptyList, Tuple, etc.)
- Good TypeScript types
- Codec system for runtime validation
- Well-documented

**Weaknesses**:

- Haskell naming (Either, not Result) alienates mainstream developers
- Small and shrinking community
- Competes directly with Effect's expanding scope
- No tagged error discrimination
- No effect system
- Academic feel may deter practical-minded developers

**Maintenance Health**: Low — infrequent updates, small contributor base
**Target Audience**: FP enthusiasts who want a lighter alternative to fp-ts

---

### oxide.ts (~27k weekly downloads)

**Overview**: A minimal Rust-inspired library providing Result and Option types with Rust naming conventions.

**Strengths**:

- Faithful Rust API (unwrap, unwrapOr, isOk, isErr, etc.)
- Very small and focused
- Zero dependencies
- Familiar to Rust developers

**Weaknesses**:

- Minimal feature set
- Very small community
- Limited async support
- No tagged errors or effect system
- No do-notation or generators
- Low download numbers suggest limited adoption

**Maintenance Health**: Low — sporadic updates
**Target Audience**: Rust developers wanting familiar Result/Option types in TypeScript

---

## Feature Comparison Matrix

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                        FEATURE COMPARISON MATRIX                                 │
 ├────────────────┬────────┬───────┬───────────┬──────────┬──────────┬─────────────┤
 │ Feature        │ Effect │ fp-ts │ neverthrow │ true-    │ oxide.ts │ @hex-di/    │
 │                │        │       │            │ myth     │          │ result      │
 ├────────────────┼────────┼───────┼───────────┼──────────┼──────────┼─────────────┤
 │ Result type    │   ●    │   ●   │     ●     │    ●     │    ●     │      ●      │
 │ Option type    │   ●    │   ●   │     ○     │    ●     │    ●     │      ●      │
 │ ResultAsync    │   ●    │   ○   │     ●     │    ●     │    ○     │      ●      │
 │ Tagged errors  │   ●    │   ○   │     ○     │    ○     │    ○     │      ●      │
 │ catchTag       │   ●    │   ○   │     ○     │    ○     │    ○     │      ●      │
 │ Effect system  │   ●    │   ○   │     ○     │    ○     │    ○     │      ●      │
 │ Contracts      │   ●    │   ○   │     ○     │    ○     │    ○     │      ●      │
 │ Do-notation    │   ●    │   ●   │     ○     │    ○     │    ○     │      ●      │
 │ Error groups   │   ●    │   ○   │     ○     │    ○     │    ○     │      ●      │
 │ Pattern match  │   ●    │   ●   │     ●     │    ●     │    ○     │      ●      │
 │ Immutable      │   ●    │   ●   │     ○     │    ●     │    ○     │      ●      │
 │ Zero deps      │   ○    │   ●   │     ●     │    ●     │    ●     │      ●      │
 │ Standalone     │   ○    │   ●   │     ●     │    ●     │    ●     │      ●      │
 │ ESLint plugin  │   ○    │   ○   │     ●     │    ○     │    ○     │      ○      │
 ├────────────────┼────────┼───────┼───────────┼──────────┼──────────┼─────────────┤
 │ TOTAL  (/ 14)  │  11    │   7   │     7     │    7     │    4     │     12      │
 └────────────────┴────────┴───────┴───────────┴──────────┴──────────┴─────────────┘
   ● = yes    ○ = no

   @hex-di/result matches Effect on features while remaining standalone — a unique combination.
```

## Competitive Positioning Map

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                 │
 │  Feature          ┆                  ┆                                          │
 │  Richness         ┆                  ┆                                          │
 │    ▲              ┆   ECOSYSTEM      ┆       STANDALONE                         │
 │    │              ┆   LOCK-IN        ┆       INDEPENDENCE                       │
 │    │              ┆                  ┆                                          │
 │ 12 ┤··············┆···┌──────────┐···┆···············┌──────────────┐···········│
 │    │              ┆   │  Effect  │   ┆               │ @hex-di/     │           │
 │    │              ┆   │  11/14   │   ┆               │ result       │           │
 │ 10 ┤              ┆   └──────────┘   ┆               │ 12/14        │           │
 │    │              ┆                  ┆               │ (TARGET)     │           │
 │    │              ┆                  ┆               └──────────────┘           │
 │  8 ┤··············┆··················┆··········································│
 │    │              ┆  ┌────────┐      ┆     ┌───────────┐                        │
 │    │              ┆  │ fp-ts  │      ┆     │neverthrow │                        │
 │  6 ┤              ┆  │  7/14  │      ┆     │  7/14     │                        │
 │    │              ┆  └────────┘      ┆     └───────────┘                        │
 │    │  ┌──────────┐┆                  ┆     ┌───────────┐                        │
 │  4 ┤··│purify-ts │┆··················┆·····│ true-myth │························│
 │    │  │  5/14    │┆                  ┆     │  7/14     │                        │
 │    │  └──────────┘┆                  ┆     └───────────┘  ┌──────────┐          │
 │  2 ┤              ┆                  ┆     ┌──────────┐   │ oxide.ts │          │
 │    │              ┆                  ┆     │ts-results│   │  4/14    │          │
 │    │              ┆                  ┆     │  3/14    │   └──────────┘          │
 │  0 ┤              ┆                  ┆     └──────────┘                         │
 │    └──────────────┆──────────────────┆──────────────────────────────────►       │
 │                   ┆                  ┆                          Standalone      │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

@hex-di/result targets the upper-right quadrant: high feature richness with standalone independence — a space currently unoccupied by any competitor.

## Competitor Health Dashboard

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                     MAINTENANCE & HEALTH SIGNALS                                │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                 │
 │  Library       Commits   Issues     Release     Community     Overall           │
 │                Activity  Response   Cadence     Activity      Health            │
 │  ─────────────────────────────────────────────────────────────────────          │
 │  Effect        ●●●●●     ●●●●●     ●●●●●       ●●●●●         EXCELLENT        │
 │  neverthrow    ●●●○○     ●●●●○     ●●●○○       ●●●○○         GOOD             │
 │  true-myth     ●●○○○     ●●●○○     ●●○○○       ●●○○○         MODERATE         │
 │  fp-ts         ●○○○○     ●○○○○     ○○○○○       ●●●○○         DECLINING        │
 │  purify-ts     ●○○○○     ●○○○○     ●○○○○       ●○○○○         LOW              │
 │  ts-results    ●○○○○     ○○○○○     ●○○○○       ●○○○○         LOW              │
 │  oxide.ts      ○○○○○     ○○○○○     ○○○○○       ○○○○○         MINIMAL          │
 │                                                                                 │
 │  ● = strong    ○ = weak                                                         │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```
