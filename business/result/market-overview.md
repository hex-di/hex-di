# Market Overview: TypeScript Error-Handling Libraries

## Market Size

The TypeScript error-handling / Result-type library segment represents a combined **~14M+ weekly npm downloads** (as of March 2026), spanning from full-ecosystem plays like Effect to minimal single-purpose Result wrappers.

```
  Total Market: ~14M+ weekly npm downloads (March 2026)
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                                                             │
 │  FULL ECOSYSTEM (~12M downloads/week — 85% of market)                       │
 │ ┌─────────────────────────────────────────────────────────────────────────┐  │
 │ │  Effect ████████████████████████████████████████  ~8M                  │  │
 │ │  fp-ts  ███████████████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  ~3.9M (declining)   │  │
 │ └─────────────────────────────────────────────────────────────────────────┘  │
 │                                                                             │
 │  FOCUSED RESULT TOOLS (~2M downloads/week — 14% of market)                  │
 │ ┌─────────────────────────────────────────────────────────────────────────┐  │
 │ │  neverthrow  ███████████████  ~1.4M                                    │  │
 │ │  true-myth   █████           ~485k                                     │  │
 │ │  ts-results  ██              ~152k                                     │  │
 │ └─────────────────────────────────────────────────────────────────────────┘  │
 │                                                                             │
 │  NICHE / MINIMAL (~100k downloads/week — <1% of market)                     │
 │ ┌─────────────────────────────────────────────────────────────────────────┐  │
 │ │  purify-ts  █  ~66k                                                    │  │
 │ │  oxide.ts   ▒  ~27k                                                    │  │
 │ └─────────────────────────────────────────────────────────────────────────┘  │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘
   █ = active/growing    ▒ = declining/stagnant
```

## Growth Trends

```
  Market Trend Timeline (2024 ──────────────────────────────────► 2026)
 ┌───────────────────────────────────────────────────────────────────────┐
 │                                                                       │
 │  Effect        ╭───────────────────────────────────────╮              │
 │  downloads    ╱  ~2M ──────► ~5M ──────► ~8M           │  GROWING    │
 │              ╱   fp-ts maintainer joins Effect (2024)   │             │
 │  ───────────╯                                          ╰─────────    │
 │                                                                       │
 │  fp-ts        ───────╲                                                │
 │  downloads            ╲  ~5M ──────► ~4.5M ─────► ~3.9M  DECLINING   │
 │                        ╲──────────────────────────────────────────    │
 │                         merger into Effect announced                   │
 │                                                                       │
 │  neverthrow   ╭────────────────────────────────────────╮              │
 │  downloads   ╱  ~800k ─────► ~1.1M ────► ~1.4M         │  GROWING    │
 │  ───────────╯   Result pattern goes mainstream          ╰─────────    │
 │                                                                       │
 │  Niche libs   ─────────────────────────────────────────   FLAT        │
 │               oxide.ts, purify-ts, ts-results                         │
 │                                                                       │
 └───────────────────────────────────────────────────────────────────────┘
```

### Effect Consolidation (2024-2026)

Effect has emerged as the dominant force in the TypeScript functional programming space. With fp-ts officially merging into the Effect ecosystem, Effect's downloads have accelerated from ~2M to ~8M weekly over 18 months. This consolidation creates both a gravitational pull and a counter-reaction from developers seeking simpler alternatives.

### fp-ts Migration Wave

fp-ts (~3.9M weekly downloads) is in decline as its maintainer has joined the Effect team. This creates a large displaced user base — developers who want typed error handling but may not want to adopt Effect's full ecosystem. Many are evaluating lighter alternatives.

### Result Pattern Mainstreaming

The Result pattern has moved from niche FP territory into mainstream TypeScript development:

- Rust's popularity has normalized `Result<T, E>` as a concept
- Major frameworks and libraries increasingly return Result-like types
- TC39 discussions around safe assignment operators signal language-level interest
- Developer blog posts and conference talks on "stop throwing exceptions" have surged

### TypeScript-First Expectations

Modern TS developers expect libraries to be TypeScript-native, not ported from other languages. Libraries with strong type inference, discriminated unions, and IDE autocomplete win adoption over academic FP ports.

## Market Segments

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                         MARKET SEGMENTATION                                     │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                 │
 │  ┌──────────────────────────────┐    ┌──────────────────────────────────────┐   │
 │  │  1. ECOSYSTEM PLAY           │    │  2. FOCUSED TOOLS                    │   │
 │  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │    │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │   │
 │  │  Player:  Effect             │    │  Players: neverthrow, true-myth,     │   │
 │  │  Scope:   Everything         │    │           ts-results                 │   │
 │  │  Lock-in: HIGH               │    │  Scope:   Result (+ maybe Option)   │   │
 │  │  Power:   HIGH               │    │  Lock-in: LOW                        │   │
 │  │  Curve:   STEEP              │    │  Power:   MODERATE                   │   │
 │  │                              │    │  Curve:   GENTLE                     │   │
 │  │  "The missing stdlib for TS" │    │                                      │   │
 │  └──────────────────────────────┘    │  "Do one thing well"                 │   │
 │                                      └──────────────────────────────────────┘   │
 │  ┌──────────────────────────────┐    ┌──────────────────────────────────────┐   │
 │  │  3. RUST-INSPIRED            │    │  4. ACADEMIC FP                      │   │
 │  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │    │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │   │
 │  │  Players: oxide.ts,          │    │  Players: fp-ts, purify-ts           │   │
 │  │           @hex-di/result     │    │  Scope:   Full FP toolkit            │   │
 │  │  Scope:   Result + Option    │    │  Lock-in: MODERATE                   │   │
 │  │  Lock-in: ZERO               │    │  Power:   HIGH (theoretical)         │   │
 │  │  Power:   VARIES             │    │  Curve:   STEEP                      │   │
 │  │  Curve:   GENTLE (for Rust   │    │                                      │   │
 │  │           developers)        │    │  "Haskell/Scala concepts in TS"      │   │
 │  │                              │    │  Status:  DECLINING                  │   │
 │  │  "Rust ergonomics for TS"    │    └──────────────────────────────────────┘   │
 │  └──────────────────────────────┘                                               │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Ecosystem Play — Effect

- **Strategy**: "The missing standard library for TypeScript"
- **Scope**: Result types, streams, scheduling, concurrency, tracing, metrics, schema validation, HTTP, SQL — everything
- **Trade-off**: Maximum power at maximum complexity and lock-in
- **Audience**: Teams building complex, long-lived systems willing to invest in learning

### 2. Focused Tools — neverthrow, true-myth, ts-results

- **Strategy**: Do one thing well — provide Result/Option types without baggage
- **Scope**: Result type, maybe Option/Maybe, basic combinators
- **Trade-off**: Simpler to adopt but fewer capabilities
- **Audience**: Teams wanting typed errors without changing their entire stack

### 3. Niche / Rust-Inspired — oxide.ts, @hex-di/result

- **Strategy**: Bring Rust's error-handling ergonomics to TypeScript
- **Scope**: Result + Option with Rust-native naming and patterns
- **Trade-off**: Familiar to Rust developers, potentially unfamiliar to pure TS developers
- **Audience**: Rust developers working in TypeScript, Rust-curious TS developers

### 4. Academic FP — fp-ts, purify-ts

- **Strategy**: Port Haskell/Scala FP concepts to TypeScript
- **Scope**: HKTs, monads, functors, type classes — full FP toolkit
- **Trade-off**: Theoretically rigorous but steep learning curve
- **Audience**: FP enthusiasts, developers with Haskell/Scala backgrounds

## Developer Adoption Drivers

```
  What developers evaluate when choosing a Result library
 ┌─────────────────────────────────────────────────────────────────────┐
 │                                                                     │
 │  MUST-HAVES (deal-breakers)                                         │
 │ ┌─────────────────────────────────────────────────────────────────┐ │
 │ │  1. Type safety      Compile-time error handling guarantees     │ │
 │ │  2. DX quality       IDE autocomplete, inference, low noise     │ │
 │ │  3. Bundle size      Tree-shaking, zero/few dependencies        │ │
 │ └─────────────────────────────────────────────────────────────────┘ │
 │           │                                                         │
 │           ▼                                                         │
 │  DIFFERENTIATORS (comparison criteria)                              │
 │ ┌─────────────────────────────────────────────────────────────────┐ │
 │ │  4. Learning curve   Time from install to productive use        │ │
 │ │  5. Migration path   Incremental adoption alongside try-catch   │ │
 │ └─────────────────────────────────────────────────────────────────┘ │
 │           │                                                         │
 │           ▼                                                         │
 │  RETENTION FACTORS (long-term stickiness)                           │
 │ ┌─────────────────────────────────────────────────────────────────┐ │
 │ │  6. Community        Maintenance, docs, ecosystem support       │ │
 │ │  7. Ecosystem fit    Integration with Zod, frameworks, ORMs     │ │
 │ └─────────────────────────────────────────────────────────────────┘ │
 │                                                                     │
 └─────────────────────────────────────────────────────────────────────┘
```

## Market Opportunity

```
  The Complexity Gap — where @hex-di/result fits
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                                                                             │
 │  Power                                                                      │
 │    ▲                                                                        │
 │    │                                                                        │
 │    │  ┌───────────────────────────────────────┐                             │
 │    │  │            Effect                     │  Too much for most teams    │
 │    │  │  DI + streams + scheduling + tracing  │  "I just want typed errors" │
 │    │  │  + metrics + HTTP + SQL + schema ...  │                             │
 │    │  └───────────────────────────────────────┘                             │
 │    │                                                                        │
 │    │          ┌───────────────────────────────────┐                         │
 │    │          │       @hex-di/result              │                         │
 │    │          │  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │                         │
 │    │          │  catchTag + contracts + handlers  │  THE GAP                │
 │    │          │  + Option + safeTry + 50 methods  │  "Just right"           │
 │    │          │  Zero deps. Zero lock-in.         │                         │
 │    │          └───────────────────────────────────┘                         │
 │    │                                                                        │
 │    │  ┌──────────────────────────────────────┐                              │
 │    │  │          neverthrow / true-myth       │  Not enough for growing     │
 │    │  │  Basic Result, limited combinators    │  teams: no catchTag, no     │
 │    │  │  No tagged errors, no effects         │  Option, no do-notation     │
 │    │  └──────────────────────────────────────┘                              │
 │    │                                                                        │
 │    └──────────────────────────────────────────────────────────►  Simplicity  │
 │                                                                             │
 └─────────────────────────────────────────────────────────────────────────────┘
```

The gap between "Effect is too much" and "neverthrow is not enough" represents a significant opportunity. Developers want:

- Tagged error discrimination (catchTag) without learning Effect's entire model
- Effect-like composition without ecosystem lock-in
- Rust-level ergonomics in a TypeScript-native package
- A standalone library that can grow with their needs

This is precisely the space @hex-di/result targets.
