# Competitive Analysis: @hex-di/clock

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-CLK-CMP-001 |
| Version | Derived from Git -- `git log -1 --format="%H %ai" -- comparisons/competitors.md` |
| Author | Derived from Git -- `git log --format="%an" -1 -- comparisons/competitors.md` |
| Approval Evidence | PR merge to `main` |
| Change History | `git log --oneline --follow -- comparisons/competitors.md` |
| Status | Effective |

## Purpose

This document compares `@hex-di/clock` against clock abstraction and time-testing libraries across eight language ecosystems: TypeScript/JavaScript, Java, Go, Rust, .NET/C#, Python, Perl, and OCaml. Dimensions are chosen to reflect what developers actually care about when selecting a clock library -- not derived from any single library's feature list.

## Honesty Notice

**@hex-di/clock is a specification, not a shipped implementation.** Every other library in this comparison is production code with real users, real bugs, and real performance data. Clock's scores in design-oriented dimensions (D1--D6) reflect the spec's *intent*; its scores in practical dimensions (D7--D12) reflect *reality*. A spec can promise anything. Shipping is what counts.

## Methodology

### Library Selection

Libraries were selected based on:

1. **Ecosystem dominance** -- the de facto standard for clock abstraction or time testing in that language
2. **Architectural relevance** -- libraries whose design influenced `@hex-di/clock` or that occupy a similar design space
3. **Diversity of approach** -- representing distinct architectural patterns (DI-first, monkey-patching, capability-based, service-tag)

### Scoring

Each library is rated 0--10 per dimension:

| Score | Meaning |
|-------|---------|
| 0 | Not supported / not applicable |
| 1--3 | Basic or limited support |
| 4--6 | Moderate support |
| 7--8 | Good support |
| 9--10 | Excellent / comprehensive |

### Dimensions

Six **design** dimensions (what the library can do on paper) and six **practical** dimensions (how it works in the real world):

| # | Dimension | What It Measures |
|---|-----------|------------------|
| D1 | Testability | Deterministic time control for testing: freeze, advance, set, fake clocks |
| D2 | Injectability | Whether the clock is designed to be dependency-injected (port, interface, abstract class, service tag) |
| D3 | Type Safety | Compile-time prevention of time-related bugs: branded types, newtypes, distinct classes, abstract types |
| D4 | Clock Domain Separation | Explicit distinction between monotonic elapsed time and wall-clock calendar time |
| D5 | Timer / Scheduling Abstraction | Injectable timer APIs (setTimeout/setInterval, sleep, delay) with test control |
| D6 | Immutability / Thread Safety | Value semantics, frozen objects, sealed classes, documented thread safety |
| D7 | API Ergonomics | Simplicity, learning curve, cognitive load, documentation quality, API surface size |
| D8 | Production Maturity | Years in production, stability, battle-tested track record, known edge cases |
| D9 | Ecosystem Adoption | Community size, downloads, framework integrations, StackOverflow answers, maintenance status |
| D10 | Performance | Measured or demonstrated low overhead, benchmarks, zero-cost abstractions |
| D11 | Async / Concurrency Support | Integration with async runtimes, fiber systems, goroutines, thread safety under concurrency |
| D12 | Date/Time/Duration Richness | Timezone handling, calendar systems, duration arithmetic, formatting, parsing |

---

## Library Profiles

### TypeScript / JavaScript

#### @sinonjs/fake-timers (v15.1)

The de facto standard for mocking JavaScript timer APIs. Used as the foundation for Jest's and Vitest's time mocking. Provides `install()` / `uninstall()` pattern to replace global `setTimeout`, `setInterval`, `Date`, `performance.now()`, and `process.hrtime()`. Comprehensive timer control (`tick`, `next`, `runAll`, `tickAsync`). No production-grade clock abstraction -- designed exclusively for testing. JavaScript with separate `@types/sinonjs__fake-timers` for TypeScript support.

#### TC39 Temporal (polyfill: @js-temporal/polyfill)

Stage 3 proposal providing modern date/time API for JavaScript. Distinct classes for different concepts (`Instant`, `ZonedDateTime`, `PlainDate`, `PlainTime`, `Duration`). Full timezone and calendar support. No injectable clock interface (`Temporal.Now` is not abstracted). No testing utilities. Focused on correctness of date/time representation, not testability.

#### Effect-TS Clock

Clock service within Effect's functional effect system. `Clock` is a service tag injectable via Context/Layer. Provides `currentTimeMillis`, `currentTimeNanos`, `sleep(duration)`. `TestClock` enables deterministic time control (`adjust`, `setTime`). Branded effect types and `Duration.Duration`. Native integration with Effect's scheduling and fiber system.

#### @nestjstools/clock (v1.4)

Clock abstraction for NestJS. `IClock` interface injected via `@Clock()` decorator. `SystemClock` and `FixedClock` implementations. `ClockModule.forRoot()` / `forFeature()` for NestJS DI registration. `CalendarDate` value object for date-only operations. No monotonic time, no timer scheduling, no time advancement in tests.

#### clock-ts (v0.1.2)

Clock abstraction for the fp-ts functional programming library. Provides time operations in functional composition style. TypeScript with fp-ts type patterns. Limited documentation and small community.

### Java

#### java.time.Clock (JSR-310, JDK 8+)

The canonical clock abstraction in the JVM ecosystem. Abstract class with factory methods: `system()`, `fixed()`, `offset()`, `tick()`. Documentation explicitly recommends dependency injection. All implementations are documented as "final, immutable and thread-safe." `Clock.fixed(Instant, ZoneId)` is the primary testing mechanism. Wall-clock model throughout; no built-in monotonic variant. Works seamlessly with Spring, Guice, and other DI frameworks via constructor injection.

### Go

#### benbjohnson/clock

Interface-based clock abstraction for Go. `Clock` interface with `New()` for production and `NewMock()` for testing. Mock starts at Unix epoch; programmatic advancement via `Add()`. Timers and tickers respect mock time. **Archived and unmaintained** since May 2023.

#### jonboulle/clockwork

Active alternative to benbjohnson/clock. `clockwork.Clock` interface with `FakeClock` for testing. Manual advancement via `Advance()`. Goroutine synchronization with `BlockUntilContext()`. Constructor injection pattern.

#### Go stdlib (time package)

The gold standard for monotonic vs wall-clock separation. `Time` values contain both wall-clock and monotonic readings internally. Clear documented rules: "the wall clock is for telling time and the monotonic clock is for measuring time." `Duration` is a distinct type. All types are immutable value types. No injectable abstraction -- community uses external libraries.

### Rust

#### std::time (Instant, SystemTime, Duration)

Clear architectural separation: `Instant` for monotonic measurement, `SystemTime` for wall-clock interaction. All types are immutable `Copy`/`Clone` value types. No built-in DI mechanism or testing support. Community pattern: abstract behind traits.

#### tokio::time

Async time utilities within tokio runtime. `Sleep`, `Interval`, `Timeout` abstractions. `test-util` feature flag enables `pause()`, `resume()`, `advance()` for deterministic testing. `Instant` is monotonic by default.

#### quanta

High-performance timing with injectable `Clock` abstraction. `Clock::mock()` for testing with time warp control. Dual clock sources: OS-based reference clock and TSC-based source clock. Newtype patterns for `Instant` and `Handle`. `with_clock()` function for DI. Performance-optimized with CPU TSC detection.

### .NET / C#

#### System.TimeProvider (.NET 8+)

Official Microsoft abstraction introduced in .NET 8. Abstract class with `GetUtcNow()` (wall-clock) and `GetTimestamp()` (monotonic). `FakeTimeProvider` in `Microsoft.Extensions.Time.Testing` with `SetUtcNow`, `Advance`, `AutoAdvanceAmount`. `CreateTimer()` for injectable timer creation. First-class `Microsoft.Extensions.DependencyInjection` integration.

#### NodaTime (by Jon Skeet)

Third-party alternative inspired by Joda-Time. `IClock` interface with single `GetCurrentInstant()` method. `FakeClock` with `Advance*` methods and `AutoAdvance`. Type safety champion: `Instant`, `LocalDateTime`, `ZonedDateTime`, `Duration`, `Period` as distinct types. All types documented as immutable. `SystemClock` annotated with `[Immutable]` attribute.

### Python

#### freezegun

Time-mocking via monkey-patching `datetime`, `time`, and `uuid` modules. `@freeze_time` decorator, context manager, and manual control. Can freeze `time.monotonic()` and `time.perf_counter()`. Global mutable state. No DI interface. Widely used in the Python ecosystem.

#### time-machine (by Adam Johnson)

Modern alternative to freezegun with C extension for performance. Same monkey-patching approach but faster. 100% test coverage. Actively maintained for Python 3.8--3.13.

### Perl

#### Test::MockTime

Testing-only module for overriding Perl's `time()`, `localtime()`, `gmtime()`. `set_fixed_time()`, `set_relative_time()`, `restore_time()`. No OO interface, no DI, no type safety. Global function overriding via symbol table manipulation.

### OCaml

#### Jane Street Core.Time_ns

Nanosecond-precision time library. `Time_ns.t` is an abstract type (private `Int63.t`). `Span.t` is a distinct duration type. Excellent type safety with zero-allocation optimization (`[@@zero_alloc]`). No injectable clock interface -- `Time_ns.now()` is a direct function call. No built-in testing utilities.

#### Eio (OCaml 5 effects-based IO)

Capability-based clock abstraction in OCaml 5's effects system. Two explicit clock types: `Eio.Time.clock` (wall-clock) and `Eio.Time.Mono.t` (monotonic). Phantom types differentiate clock kinds. `Eio_mock` provides deterministic testing. Capability-passing is the idiomatic injection mechanism.

---

## Rating Matrix

Scale: 0 = not supported, 10 = comprehensive. Blank cells = 0.

**D1--D6 = design capabilities. D7--D12 = practical qualities.**

| Library | Lang | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D11 | D12 | **Total** |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| java.time.Clock | Java | 7 | 9 | 8 | 3 | 2 | 9 | 9 | 10 | 10 | 9 | 6 | 10 | **92** |
| System.TimeProvider | C# | 8 | 9 | 7 | 7 | 7 | 6 | 8 | 7 | 8 | 8 | 7 | 8 | **90** |
| tokio::time | Rust | 7 | 4 | 7 | 7 | 9 | 6 | 7 | 8 | 8 | 9 | 10 | 3 | **85** |
| Go stdlib (time) | Go | 1 | 2 | 7 | 9 | 6 | 8 | 9 | 10 | 10 | 9 | 7 | 6 | **84** |
| NodaTime | C# | 8 | 8 | 9 | 3 | 1 | 9 | 8 | 9 | 7 | 7 | 4 | 10 | **83** |
| Effect-TS Clock | TS | 8 | 9 | 7 | 5 | 7 | 6 | 5 | 5 | 4 | 6 | 9 | 4 | **75** |
| @sinonjs/fake-timers | JS | 10 | 2 | 2 | 4 | 9 | 2 | 8 | 9 | 10 | 7 | 6 | 3 | **72** |
| std::time (Rust) | Rust | | 2 | 8 | 9 | 1 | 9 | 8 | 10 | 10 | 9 | 4 | 2 | **72** |
| Eio clock | OCaml | 6 | 8 | 8 | 9 | 5 | 8 | 5 | 3 | 2 | 7 | 8 | 2 | **71** |
| **@hex-di/clock** | **TS** | **9** | **10** | **9** | **10** | **9** | **9** | **6** | **0** | **0** | **4** | **7** | **3** | **76** |
| quanta | Rust | 6 | 6 | 7 | 6 | 1 | 7 | 7 | 6 | 5 | 10 | 3 | 1 | **65** |
| jonboulle/clockwork | Go | 7 | 7 | 4 | 2 | 5 | 3 | 8 | 7 | 6 | 7 | 6 | 2 | **64** |
| benbjohnson/clock | Go | 7 | 7 | 4 | 2 | 5 | 3 | 8 | 6 | 6 | 7 | 5 | 2 | **62** |
| Core.Time_ns | OCaml | 1 | 2 | 9 | 3 | 1 | 9 | 5 | 8 | 3 | 9 | 3 | 5 | **58** |
| freezegun | Python | 8 | 1 | 1 | 3 | 3 | 1 | 8 | 8 | 8 | 5 | 2 | 3 | **51** |
| @nestjstools/clock | TS | 5 | 8 | 4 | 1 | 2 | 3 | 7 | 4 | 3 | 6 | 4 | 3 | **50** |
| time-machine | Python | 8 | 1 | 1 | 3 | 3 | 1 | 8 | 6 | 6 | 7 | 3 | 3 | **50** |
| TC39 Temporal | JS | | 1 | 6 | 2 | | 8 | 7 | 3 | 4 | 5 | 2 | 10 | **48** |
| clock-ts | TS | 3 | 5 | 5 | 1 | | 5 | 4 | 2 | 1 | 5 | 2 | 2 | **35** |
| Test::MockTime | Perl | 5 | 1 | | | | | 6 | 7 | 4 | 6 | 1 | 1 | **31** |

### Sorted by Total Score

| Rank | Library | Design (D1--6) | Practical (D7--12) | Total | % |
|------|---------|------:|------:|------:|------:|
| 1 | java.time.Clock | 38 | 54 | **92** | 77% |
| 2 | System.TimeProvider (.NET 8) | 44 | 46 | **90** | 75% |
| 3 | tokio::time | 40 | 45 | **85** | 71% |
| 4 | Go stdlib (time) | 33 | 51 | **84** | 70% |
| 5 | NodaTime | 38 | 45 | **83** | 69% |
| **6** | **@hex-di/clock** | **56** | **20** | **76** | **63%** |
| 7 | Effect-TS Clock | 42 | 33 | **75** | 63% |
| 8 | @sinonjs/fake-timers | 29 | 43 | **72** | 60% |
| 8 | std::time (Rust) | 29 | 43 | **72** | 60% |
| 10 | Eio clock (OCaml 5) | 44 | 27 | **71** | 59% |
| 11 | quanta (Rust) | 33 | 32 | **65** | 54% |
| 12 | jonboulle/clockwork | 28 | 36 | **64** | 53% |
| 13 | benbjohnson/clock | 28 | 34 | **62** | 52% |
| 14 | Core.Time_ns (OCaml) | 25 | 33 | **58** | 48% |
| 15 | freezegun (Python) | 17 | 34 | **51** | 43% |
| 16 | @nestjstools/clock | 23 | 27 | **50** | 42% |
| 16 | time-machine (Python) | 17 | 33 | **50** | 42% |
| 18 | TC39 Temporal | 17 | 31 | **48** | 40% |
| 19 | clock-ts | 19 | 16 | **35** | 29% |
| 20 | Test::MockTime (Perl) | 6 | 25 | **31** | 26% |

---

## What the Scores Reveal

### @hex-di/clock: highest design score, still-low practical score

@hex-di/clock scores **56/60 on design** (D1--D6) -- the best of any surveyed library. It scores **20/60 on practical** (D7--D12) -- improved from its previous 12/60 but still the weakest practical score of any library in the top half. The spec improvements (progressive API tiers, async combinators, branded durations, benchmark specification, testing assertions) closed some gaps, but the fundamental constraint remains: D8 (Production Maturity) and D9 (Ecosystem Adoption) are immovable at 0 until code ships.

The design/practical split highlights a pattern across the field:

| Category | Top Design | Top Practical |
|----------|-----------|--------------|
| Best overall | System.TimeProvider (44 design, 46 practical) | java.time.Clock (38 design, 54 practical) |
| Design-heavy | @hex-di/clock (56 / 20), Eio (44 / 27), Effect-TS (42 / 33) | -- |
| Practical-heavy | -- | Go stdlib (33 / 51), std::time (29 / 43), fake-timers (29 / 43) |
| Balanced | NodaTime (38 / 45), tokio::time (40 / 45) | NodaTime, tokio::time |

System.TimeProvider and NodaTime are the most balanced -- strong design *and* strong practical scores.

### D1: Testability -- Who does it best?

| Score | Libraries | Pattern |
|-------|-----------|---------|
| 10 | @sinonjs/fake-timers | Full timer API replacement, tick/tickAsync, runAll, comprehensive |
| 9 | @hex-di/clock | Virtual clock + assertion helpers + 6 testing recipes + VirtualTimerScheduler |
| 8 | Effect-TS, System.TimeProvider, NodaTime, freezegun, time-machine | Dedicated fake/virtual clock with advance and freeze |
| 7 | java.time.Clock, jonboulle/clockwork, benbjohnson/clock, tokio::time | Fixed clock or mock with manual advancement |
| 5--6 | Eio, quanta, @nestjstools/clock, Test::MockTime | Basic mock or limited time control |
| 0--3 | Go stdlib, std::time, TC39 Temporal, Core.Time_ns, clock-ts | No built-in testing support |

fake-timers earns its 10: it mocks `setTimeout`, `setInterval`, `Date`, `performance.now`, `process.hrtime`, `queueMicrotask`, and `requestAnimationFrame` all at once, with async-aware advancement. No other library covers that breadth.

### D4: Clock Domain Separation

| Tier | Libraries | Approach |
|------|-----------|----------|
| Triple (mono/wall/highres) | @hex-di/clock | Three branded timestamp types with dedicated methods |
| Dual (explicit types) | Go stdlib, std::time, Eio, System.TimeProvider | Distinct types or methods per domain |
| Dual (implicit) | tokio::time, quanta, Effect-TS | Primarily monotonic with wall-clock available |
| Single | java.time.Clock, NodaTime, @nestjstools/clock, freezegun, Test::MockTime | Wall-clock only |

Go's `time` package remains the gold standard here: every `Time` value carries both readings, with clear documented rules about when each is used. @hex-di/clock's triple separation is architecturally novel but unproven in practice.

### D7: API Ergonomics -- improved but still a gap

@hex-di/clock scores **6/10** on ergonomics, up from 4. The spec now provides a Quick Start (§1.5) with 5 copy-paste examples and progressive API tiers (§8.0) that present a 14-export Tier 1 surface to new consumers. However, the full API surface has *grown* (90+ exports including new combinators, duration types, and context utilities), and IDE auto-import still suggests everything.

| Library | What a new user sees first | Score |
|---------|---------------------------|-------|
| java.time.Clock | 1 abstract class, 4 factory methods | 9 |
| Go stdlib time | Time, Duration, Timer, Ticker | 9 |
| NodaTime IClock | 1 interface, 1 method | 8 |
| @sinonjs/fake-timers | install(), tick(), uninstall() | 8 |
| @hex-di/clock | Quick Start: 5 examples, Tier 1: 14 exports | 6 |

The tier system is a genuine improvement -- a developer reading the Quick Start now encounters a comparable surface to simpler libraries. But the full API remains large, and "documentation-level tiers" don't change what the IDE suggests. java.time.Clock still wins "understand in 10 minutes" decisively.

### D8--D9: Production Maturity and Ecosystem -- the gap that matters most

| Library | D8 (Maturity) | D9 (Ecosystem) | Combined |
|---------|---:|---:|---:|
| java.time.Clock | 10 | 10 | 20 |
| Go stdlib | 10 | 10 | 20 |
| std::time | 10 | 10 | 20 |
| @sinonjs/fake-timers | 9 | 10 | 19 |
| NodaTime | 9 | 7 | 16 |
| @hex-di/clock | 0 | 0 | 0 |

This is the honest reality. java.time.Clock has been in production since March 2014 across billions of JVM applications. @hex-di/clock has zero lines of running code. Until it ships, the design scores are aspirational.

### D10: Performance

quanta earns a **10** here -- it uses CPU TSC (Time Stamp Counter) instructions with calibration against the OS reference clock, achieving sub-nanosecond overhead. The Rust and Go stdlib implementations also score high (9) as they're compiler-optimized system calls.

@hex-di/clock scores **4**, up from 2. The spec now includes a benchmark specification (§4.10) with concrete ops/sec floors (10M+ for clock reads, 20M for sequence increment), comparative overhead benchmarks (< 1.5x raw platform API), memory budgets, and CI regression gates. ADR-CK-010 documents three zero-cost patterns (closure capture, one-time freeze, type erasure) with V8 optimization rationale. However, these are *targets*, not *measurements*. No benchmarks have actually been run. The score reflects having a credible performance story with falsifiable targets, not proven performance.

### D12: Date/Time/Duration Richness

| Score | Libraries | Capability |
|-------|-----------|-----------|
| 10 | java.time.Clock, NodaTime, TC39 Temporal | Full timezone, calendar, formatting, parsing, duration, period |
| 8 | System.TimeProvider | Full .NET date/time types accessible |
| 6 | Go stdlib | Zones, formatting, but limited calendar support |
| 3 | @hex-di/clock | Branded duration types, Temporal API interop bridge, but no calendar/timezone |
| 1--2 | quanta, std::time, Eio | Raw timestamps only, no duration types or calendar |

@hex-di/clock now provides branded duration types (`MonotonicDuration`, `WallClockDuration`), the `elapsed()` factory, duration comparison utilities, and a Temporal API interop bridge (`toTemporalInstant`/`fromTemporalInstant`). This lifts it above raw-timestamp-only libraries. However, it deliberately excludes calendar, timezone, and formatting concerns (that's for a date/time library to handle). Developers needing rich date/time handling must pair it with another library.

---

## Architectural Pattern Comparison

Five distinct architectural patterns for clock abstraction emerge across ecosystems:

| Pattern | Examples | Strengths | Weaknesses |
|---------|----------|-----------|------------|
| **Abstract class / DI-first** | java.time.Clock, System.TimeProvider, @hex-di/clock | Clean injection, type-safe, framework integration | Requires DI discipline |
| **Service tag / effect system** | Effect-TS Clock, Eio clock | Compile-time dependency tracking, composable | Requires effect system adoption |
| **Interface + factory** | NodaTime, benbjohnson/clock, clockwork, quanta | Simple, language-idiomatic | No framework integration |
| **Global monkey-patching** | fake-timers, freezegun, time-machine, Test::MockTime | Easy to adopt, no code changes | Mutable global state, not production-safe |
| **Value types only** | Go stdlib, std::time, Core.Time_ns | Immutable, zero-cost | No abstraction layer, not injectable |

---

## Honest Assessment

### What @hex-di/clock does better than anything else (on paper)

1. **Triple clock separation** (monotonic / wall-clock / high-res) -- genuinely novel across all ecosystems
2. **Interface Segregation** for clock concerns -- 6 focused ports vs 1 monolithic interface
3. **Branded timestamp AND duration types** with validated conversion utilities returning `Result<T, E>`, plus `elapsed()` factory for zero-cost branded durations
4. **Multi-platform adapter design** (System, Edge, HostBridge, Hardware)
5. **Async combinators** (`delay`, `timeout`, `measure`, `retry`) composing over injectable `TimerSchedulerPort` -- deterministic in tests via `VirtualTimerScheduler`
6. **Testing assertion helpers** (`assertMonotonic`, `assertTimeBetween`, `assertWallClockPlausible`, `assertSequenceOrdered`) -- no other clock library ships domain-specific test assertions

### What competitors do better (in practice)

1. **java.time.Clock**: 10+ years of production use, billions of runtime hours, entire ecosystem built on it. The standard against which all clock abstractions should be measured.
2. **@sinonjs/fake-timers**: Comprehensive timer mocking that actually works today, used by every major JS test framework. For pure testability of time-dependent JS code, nothing comes close.
3. **NodaTime**: Richest type model for date/time concepts. If you need `Instant` vs `LocalDateTime` vs `ZonedDateTime` vs `Duration` vs `Period` as distinct types, NodaTime is the gold standard.
4. **Go stdlib time**: Best documentation and design rationale for the monotonic/wall-clock split. "The wall clock is for telling time; the monotonic clock is for measuring time." Clear, battle-tested, zero dependencies.
5. **tokio::time**: Best async time testing with `pause`/`advance` -- actually integrated into a production async runtime, not just theorized.
6. **quanta**: Proof that injectable DI clock and extreme performance can coexist. TSC-based timing with mock support.
7. **System.TimeProvider**: The most balanced modern design -- Microsoft took lessons from java.time.Clock, NodaTime, and community feedback to build a well-rounded official abstraction.

### What @hex-di/clock must prove

| Challenge | Status | Why it matters |
|-----------|--------|---------------|
| Ship working code | **Unresolved** | A spec is not a library. The design must survive contact with real TypeScript, real bundlers, real runtimes. This is the blocker for D8 and D9. |
| API complexity tax | **Partially addressed** | Quick Start (§1.5) and progressive tiers (§8.0) present a 14-export Tier 1 surface. But the full API grew to 90+ exports. IDE auto-import still suggests everything. The question remains: will developers actually use the ISP granularity? |
| Performance | **Partially addressed** | Benchmark spec (§4.10) defines falsifiable targets (10M+ ops/sec). Zero-cost ADR documents optimization patterns. But no benchmarks have been run. Targets must be validated against implementation. |
| Adoption | **Unresolved** | The TypeScript ecosystem has no tradition of injectable clock abstractions. Developers use `Date.now()` and `@sinonjs/fake-timers`. Changing that habit requires compelling developer experience, not just better architecture. |
| Justified complexity | **Partially addressed** | Progressive tiers help -- most consumers only see Tier 1. But the spec keeps growing (async combinators, duration types, Temporal bridge, assertion helpers). Each addition is individually justified, but the cumulative surface is a concern. |
| Benchmark validation | **New** | The 10M ops/sec floor and < 1.5x overhead ratio are credible targets for closure-based dispatch, but they must be proven. If the implementation requires class dispatch or prototype lookup, the targets may not hold. |
