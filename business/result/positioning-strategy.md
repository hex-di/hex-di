# Positioning Strategy: @hex-di/result

## Positioning Statement

> **The most complete standalone Result library for TypeScript — Rust-level safety, zero dependencies, effect-system power without ecosystem lock-in.**

@hex-di/result occupies a unique position: it delivers effect-system capabilities (tagged error discrimination, error contracts, effect handlers) that previously required adopting a full ecosystem like Effect, packaged as a focused, zero-dependency library that integrates with any codebase.

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                 │
 │                      WHERE @hex-di/result LIVES                                 │
 │                                                                                 │
 │  ┌─────────────────────────────────────────────────────────────────────────┐    │
 │  │                                                                         │    │
 │  │                        Effect Ecosystem                                 │    │
 │  │   ┌───────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐      │    │
 │  │   │ DI/Layers │ │ Streams  │ │ Metrics │ │ HTTP   │ │ Schema   │      │    │
 │  │   └───────────┘ └──────────┘ └─────────┘ └────────┘ └──────────┘      │    │
 │  │   ┌───────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐      │    │
 │  │   │ Scheduler │ │ Tracing  │ │ SQL     │ │ Config │ │ Platform │      │    │
 │  │   └───────────┘ └──────────┘ └─────────┘ └────────┘ └──────────┘      │    │
 │  │   ╔═══════════════════════════════════════════╗                         │    │
 │  │   ║  Result + Option + catchTag + Contracts   ║ ◄── Effect has this    │    │
 │  │   ╚═══════════════════════════════════════════╝                         │    │
 │  │                                                                         │    │
 │  └─────────────────────────────────────────────────────────────────────────┘    │
 │                                                                                 │
 │       ╔═══════════════════════════════════════════╗                              │
 │       ║  @hex-di/result                           ║                              │
 │       ║  Result + Option + catchTag + Contracts   ║ ◄── We extract JUST this    │
 │       ║  + safeTry + handlers + error groups      ║     Zero deps. Zero lock-in │
 │       ╚═══════════════════════════════════════════╝                              │
 │                                                                                 │
 │  ┌─────────────────────┐                                                        │
 │  │  neverthrow          │                                                        │
 │  │  Result (basic only) │ ◄── Missing: catchTag, Option, effects, do-notation   │
 │  └─────────────────────┘                                                        │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Unique Differentiators by Competitor

### vs Effect

| Dimension      | Effect                                         | @hex-di/result                       |
| -------------- | ---------------------------------------------- | ------------------------------------ |
| Scope          | Full ecosystem (DI, streams, metrics, HTTP...) | Focused: Result + Option + effects   |
| Lock-in        | High — permeates entire codebase               | Zero — standalone, mix with any code |
| Learning curve | Weeks to months                                | Hours to days                        |
| Bundle size    | Large (multiple packages)                      | Minimal (single zero-dep package)    |
| Tagged errors  | Yes (catchTag)                                 | Yes (catchTag/catchTags)             |
| Adoption model | All-or-nothing paradigm shift                  | Incremental, function-by-function    |

**Key message**: "Effect-system power without the Effect ecosystem. Use catchTag and error contracts without rewriting your entire codebase."

### vs neverthrow

| Dimension      | neverthrow      | @hex-di/result                        |
| -------------- | --------------- | ------------------------------------- |
| Tagged errors  | No              | Yes (catchTag, catchTags)             |
| Effect system  | No              | Yes (contracts, handlers)             |
| Option type    | No              | Yes (full Option<T> with combinators) |
| Do-notation    | No              | Yes (generator-based safeTry)         |
| Error grouping | No              | Yes (createErrorGroup)                |
| API surface    | ~25 methods     | 50+ methods                           |
| ESLint plugin  | Yes             | No (planned)                          |
| Immutability   | Class instances | Frozen objects (Object.freeze)        |

**Key message**: "Everything neverthrow does, plus tagged error discrimination, an effect system, Option type, and do-notation. The Result library that grows with your needs."

### vs true-myth

| Dimension         | true-myth   | @hex-di/result                       |
| ----------------- | ----------- | ------------------------------------ |
| API surface       | ~20 methods | 50+ methods                          |
| Async support     | Task type   | Full ResultAsync + async combinators |
| Tagged errors     | No          | Yes                                  |
| Effect system     | No          | Yes                                  |
| Generator support | No          | Yes (safeTry)                        |
| Error contracts   | No          | Yes                                  |

**Key message**: "A richer Result + Option library with async-first design, tagged errors, and effect-system capabilities that true-myth can't match."

### vs fp-ts

| Dimension      | fp-ts                           | @hex-di/result                   |
| -------------- | ------------------------------- | -------------------------------- |
| Philosophy     | Haskell-inspired (academic)     | Rust-inspired (practical)        |
| Naming         | Either/Left/Right               | Result/Ok/Err + Option/Some/None |
| HKTs           | Complex encoding                | Not needed — focused API         |
| Maintenance    | Declining (merging into Effect) | Active                           |
| Learning curve | Steep (type classes, HKTs)      | Gentle (familiar Rust patterns)  |
| Error messages | Complex (HKT noise)             | Clean (no encoding overhead)     |

**Key message**: "Practical over academic. Rust-inspired naming, clean error messages, and active maintenance — everything fp-ts should have been."

---

## Target Audience Segments

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                       TARGET AUDIENCE FUNNEL                                    │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                 │
 │  ┌───────────────────────────────────────────────────────────────────────────┐  │
 │  │                                                                           │  │
 │  │  SEGMENT 1                SEGMENT 2              SEGMENT 3                │  │
 │  │  Rust → TS devs           Effect refugees         DI practitioners        │  │
 │  │  ┌─────────────┐          ┌─────────────┐         ┌─────────────┐         │  │
 │  │  │ "I miss     │          │ "Effect is  │         │ "I need     │         │  │
 │  │  │  Result<T,E>│          │  too much   │         │  typed err  │         │  │
 │  │  │  and Option"│          │  for this"  │         │  across     │         │  │
 │  │  └──────┬──────┘          └──────┬──────┘         │  service    │         │  │
 │  │         │                        │                │  boundaries"│         │  │
 │  │         │                        │                └──────┬──────┘         │  │
 │  │         ▼                        ▼                       ▼                │  │
 │  │  Hook: Rust-native        Hook: catchTag +        Hook: hex-di            │  │
 │  │  naming, safeTry          contracts, zero         ecosystem, port         │  │
 │  │  generators               lock-in                 integration             │  │
 │  │         │                        │                       │                │  │
 │  │         └────────────────────────┼───────────────────────┘                │  │
 │  │                                  ▼                                        │  │
 │  │                   ┌──────────────────────────┐                            │  │
 │  │                   │     @hex-di/result        │                            │  │
 │  │                   │  "Adopt one function at   │                            │  │
 │  │                   │   a time — grow with us"  │                            │  │
 │  │                   └──────────────────────────┘                            │  │
 │  │                                  │                                        │  │
 │  │                                  ▼                                        │  │
 │  │                       SEGMENT 4: try-catch migrants                       │  │
 │  │                       ┌──────────────────────────┐                        │  │
 │  │                       │ "Stop throwing. Start     │                        │  │
 │  │                       │  returning. Pick the most │                        │  │
 │  │                       │  complete standalone lib." │                        │  │
 │  │                       └──────────────────────────┘                        │  │
 │  │                                                                           │  │
 │  └───────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Rust Developers Moving to TypeScript

- **Profile**: Backend or systems developers working in TypeScript for web/fullstack projects
- **Pain point**: Miss Rust's `Result<T, E>`, `Option<T>`, `?` operator, and pattern matching
- **Hook**: Familiar API naming (Ok, Err, Some, None, unwrap, map, andThen), safeTry generators as `?` operator equivalent
- **Channel**: Rust community forums, r/rust, Rust Discord

### 2. Teams Wanting Typed Errors Without Effect's Complexity

- **Profile**: Mid-size teams building production TypeScript applications
- **Pain point**: Want better error handling than try-catch but find Effect too complex/invasive
- **Hook**: catchTag for error discrimination, effect contracts for safety, zero ecosystem lock-in
- **Channel**: TypeScript community, tech blogs, conference talks

### 3. DI / Clean Architecture Practitioners

- **Profile**: Developers using hexagonal architecture, ports & adapters, or DI patterns
- **Pain point**: Need typed errors that compose well across service boundaries
- **Hook**: Part of the hex-di ecosystem; Result types designed to flow through port boundaries
- **Channel**: Clean architecture communities, DDD forums, hex-di documentation

### 4. Teams Migrating from try-catch to Result Patterns

- **Profile**: Teams that have been burned by untyped exceptions and want to adopt Result patterns
- **Pain point**: Don't know which library to choose; worried about picking the wrong one
- **Hook**: Most complete standalone option; incremental adoption; comprehensive documentation
- **Channel**: Blog posts ("Stop Throwing Exceptions"), migration guides, comparison articles

---

## Key Messaging Pillars

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                        FOUR PILLARS OF MESSAGING                                │
 │                                                                                 │
 │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  ┌─────────────┐  │
 │  │                  │  │                  │  │             │  │             │  │
 │  │  ZERO LOCK-IN    │  │  EFFECT-SYSTEM   │  │  RUST-      │  │  PRODUCTION │  │
 │  │                  │  │  POWER           │  │  NATIVE DX  │  │  READY      │  │
 │  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │  ┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │  ┄┄┄┄┄┄┄┄  │  │  ┄┄┄┄┄┄┄┄  │  │
 │  │  Zero deps       │  │  catchTag        │  │  Ok / Err   │  │  Frozen     │  │
 │  │  Any framework   │  │  catchTags       │  │  Some/None  │  │  Branded    │  │
 │  │  Any codebase    │  │  Contracts       │  │  safeTry    │  │  14 BDD     │  │
 │  │  Incremental     │  │  Handlers        │  │  match      │  │  Mutation   │  │
 │  │  adoption        │  │  Error groups    │  │  unwrapOr   │  │  tested     │  │
 │  │                  │  │                  │  │  andThen    │  │  Property   │  │
 │  │  "Not an         │  │  "Previously     │  │             │  │  tested     │  │
 │  │   ecosystem"     │  │   Effect-only"   │  │  "Feels     │  │             │  │
 │  │                  │  │                  │  │   like home" │  │  "Battle-   │  │
 │  │                  │  │                  │  │             │  │   tested"   │  │
 │  └────────┬─────────┘  └────────┬─────────┘  └──────┬──────┘  └──────┬──────┘  │
 │           │                     │                    │                │          │
 │           └─────────────────────┼────────────────────┘                │          │
 │                                 ▼                                     │          │
 │              ┌──────────────────────────────────────┐                │          │
 │              │  "The most complete standalone Result │◄───────────────┘          │
 │              │   library for TypeScript"             │                           │
 │              └──────────────────────────────────────┘                           │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Zero Lock-in

"A standalone library, not an ecosystem. Use @hex-di/result with any framework, any codebase, any architecture. Adopt one function at a time — no paradigm shift required."

- Zero dependencies
- Works with any existing code
- No special runtime, no fiber model, no layers
- Import what you need, ignore the rest

### 2. Effect-System Power

"The only focused Result library with catchTag, error contracts, and effect handlers. Previously, you needed Effect for this. Now you don't."

- `catchTag` / `catchTags` for discriminated error handling
- Effect contracts that declare and enforce error types
- Effect handlers for error recovery and transformation
- Error group creation for aggregating multiple error types

### 3. Rust-Native DX

"If you know Rust's Result and Option, you already know @hex-di/result. Same patterns, same naming, TypeScript-native."

- `Ok(value)` / `Err(error)` / `Some(value)` / `None`
- `safeTry` generators as TypeScript's answer to Rust's `?` operator
- Pattern matching with `match`
- `unwrapOr`, `mapErr`, `andThen` — all the combinators you expect

### 4. Production-Ready

"Battle-tested with 14 BDD feature specs, mutation testing, property-based testing, and brand validation. Every Result is frozen and immutable."

- `Object.freeze()` on all Result/Option instances — true immutability
- Brand-based type validation — a Result is always a Result at the type level
- 50+ methods with comprehensive test coverage
- Mutation testing ensures every line of code is meaningful

---

## Elevator Pitches

**10-second**: "@hex-di/result is a zero-dependency TypeScript Result library with tagged errors and an effect system — Effect's power without Effect's complexity."

**30-second**: "If you want typed error handling in TypeScript, you currently choose between Effect (powerful but complex) or neverthrow (simple but limited). @hex-di/result gives you the best of both: 50+ methods, catchTag error discrimination, effect contracts, Option types, and do-notation — all in a standalone, zero-dependency package that works with any codebase."

**60-second**: "TypeScript's try-catch is broken — errors are untyped `unknown` values that silently propagate. The Result pattern fixes this by making errors explicit in your type signatures. But until now, getting advanced features like tagged error discrimination meant adopting Effect's entire ecosystem. @hex-di/result changes that. It's the most feature-complete standalone Result library for TypeScript: 50+ methods, an effect system with contracts and handlers, full Option type, generator-based do-notation, and frozen immutable objects. Zero dependencies, incremental adoption, Rust-inspired DX. Stop choosing between power and simplicity."
