# Blog Content Plan: @hex-di/result

All articles for the @hex-di/result go-to-market content strategy. Each article lives in this directory as a markdown file. Articles are organized by category and priority within each GTM phase.

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                     CONTENT PUBLICATION ROADMAP                                 │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                 │
 │  Phase    Month 1-2          Month 2-4          Month 4-8          Ongoing      │
 │           FOUNDATION         AWARENESS           INTEGRATION        GROWTH       │
 │           ┄┄┄┄┄┄┄┄┄┄         ┄┄┄┄┄┄┄┄┄           ┄┄┄┄┄┄┄┄┄┄┄      ┄┄┄┄┄┄      │
 │                                                                                 │
 │  Intro    ┌──────────┐                                                          │
 │           │ 01, 02   │                                                          │
 │           └──────────┘                                                          │
 │                                                                                 │
 │  Compare               ┌──────────┐                                             │
 │                         │ 03-07    │                                             │
 │                         └──────────┘                                             │
 │                                                                                 │
 │  Tutorial               ┌──────────────────┐                                    │
 │                         │ 08-13            │                                    │
 │                         └──────────────────┘                                    │
 │                                                                                 │
 │  Migration ┌────────────────────┐                                               │
 │            │ 14-16              │                                               │
 │            └────────────────────┘                                               │
 │                                                                                 │
 │  Deep Dive                       ┌──────────────────┐                           │
 │                                  │ 17-21            │                           │
 │                                  └──────────────────┘                           │
 │                                                                                 │
 │  Integr.                                  ┌──────────────┐                      │
 │                                           │ 22-25        │                      │
 │                                           └──────────────┘                      │
 │                                                                                 │
 │  Community                                                  ┌──────────────┐    │
 │                                                             │ 26-28        │    │
 │                                                             └──────────────┘    │
 │                                                                                 │
 │  Total: 28 articles                                                             │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Introductory (Phase 1 — Foundation)

Articles that introduce the problem space and establish @hex-di/result as the solution.

### 01. `01-stop-throwing-start-returning.md`

**Title**: "Stop Throwing, Start Returning: Why TypeScript Needs the Result Pattern"

The gateway article. Explains why `try-catch` with untyped `unknown` errors is fundamentally broken in TypeScript. Introduces the Result pattern as the alternative — making errors explicit in function signatures. Ends with a brief introduction to @hex-di/result as the most complete standalone implementation. Targets developers who have never used a Result library.

**Audience**: TypeScript developers new to the Result pattern
**Goal**: Problem awareness, top-of-funnel discovery
**SEO**: "typescript result pattern", "typescript error handling", "typescript try catch problems"

### 02. `02-introducing-hex-di-result.md`

**Title**: "Introducing @hex-di/result: The Most Complete Standalone Result Library for TypeScript"

The launch announcement. Covers what @hex-di/result is, why it exists, what makes it different (effect system, catchTag, Option, safeTry, frozen immutability). Includes a quick-start code walkthrough: install, create your first Result, handle errors with match, compose with map/andThen. Links to docs and playground.

**Audience**: TypeScript developers evaluating Result libraries
**Goal**: Product awareness, initial adoption
**SEO**: "typescript result library", "hex-di result", "typed errors typescript"

---

## Comparison Articles (Phase 2 — Awareness)

Head-to-head comparisons. Honest, data-backed, acknowledging competitor strengths while highlighting @hex-di/result's unique advantages.

### 03. `03-vs-neverthrow.md`

**Title**: "@hex-di/result vs neverthrow: Why You Need catchTag"

The most important comparison article. neverthrow is the incumbent in the focused-tool segment (~1.4M weekly downloads). This article acknowledges neverthrow's strengths (simplicity, ESLint plugin, brand) then demonstrates what it lacks: tagged error discrimination with `catchTag`, Option type, do-notation via `safeTry`, `createErrorGroup`, and frozen immutability. Includes side-by-side code examples for a real-world API error handling scenario.

**Audience**: Current neverthrow users, developers comparing Result libraries
**Goal**: Conversion from neverthrow, differentiation
**SEO**: "neverthrow vs", "neverthrow alternative", "typescript result library comparison"

### 04. `04-vs-effect.md`

**Title**: "You Don't Need Effect for Typed Errors"

Targets the growing "Effect fatigue" segment — developers who want catchTag and typed error discrimination but find Effect's full ecosystem too complex. Shows that @hex-di/result provides the same core error-handling capabilities (catchTag, catchTags, contracts, handlers) without the fiber runtime, layers, or ecosystem lock-in. Code comparison: same problem solved in Effect vs @hex-di/result, highlighting the difference in complexity and boilerplate.

**Audience**: Developers evaluating Effect, teams finding Effect too complex
**Goal**: Capture the "Effect is too much" segment
**SEO**: "effect typescript too complex", "effect alternative", "typescript typed errors without effect"

### 05. `05-vs-fp-ts.md`

**Title**: "From Either to Result: Why @hex-di/result Is the fp-ts Successor You Actually Want"

Targets the ~3.9M weekly fp-ts users whose library is merging into Effect. Positions @hex-di/result as the practical alternative: Rust-inspired naming (Result/Ok/Err, not Either/Left/Right), no HKT complexity, clean error messages, active maintenance. Includes a code translation table: fp-ts patterns mapped to @hex-di/result equivalents.

**Audience**: fp-ts users looking for alternatives
**Goal**: Capture the fp-ts migration wave
**SEO**: "fp-ts alternative", "fp-ts migration", "fp-ts deprecated", "either vs result typescript"

### 06. `06-vs-true-myth.md`

**Title**: "@hex-di/result vs true-myth: When You Outgrow the Basics"

Acknowledges true-myth's clean design and correctness, then shows where @hex-di/result picks up: 50+ methods vs ~20, full async support with ResultAsync, tagged errors, effect system, generator-based do-notation. Positioned as "true-myth is great to start, @hex-di/result is where you grow."

**Audience**: true-myth users, developers comparing lightweight options
**Goal**: Capture users who need more than basics
**SEO**: "true-myth alternative", "typescript result option library"

### 07. `07-landscape-2026.md`

**Title**: "The TypeScript Result Library Landscape in 2026"

A neutral-toned overview of the entire market: Effect, fp-ts, neverthrow, true-myth, ts-results, purify-ts, oxide.ts, and @hex-di/result. Includes download data, feature comparison matrix, positioning map, and honest recommendations for different use cases. Positions @hex-di/result as the best choice for the "middle ground" between Effect's complexity and neverthrow's simplicity.

**Audience**: Developers researching which Result library to adopt
**Goal**: SEO capture for "best typescript result library" queries, neutral authority
**SEO**: "best typescript result library 2026", "typescript error handling libraries", "result type typescript comparison"

---

## Tutorial Content (Phase 2 — Awareness)

Practical, hands-on guides that teach through building.

### 08. `08-typed-errors-practical-guide.md`

**Title**: "Typed Errors in TypeScript: A Practical Guide"

A comprehensive introduction to typed error handling in TypeScript. Covers: why `unknown` catch blocks are dangerous, how discriminated unions model errors, the Result pattern as a container, composing Results with map/andThen/match. All examples use @hex-di/result but the concepts are universal. The article developers bookmark and share with their team.

**Audience**: Mid-level TypeScript developers
**Goal**: Education, establish authority, drive adoption
**SEO**: "typed errors typescript", "typescript error handling guide", "typescript discriminated union errors"

### 09. `09-type-safe-api-layer.md`

**Title**: "Building a Type-Safe API Layer with @hex-di/result"

End-to-end tutorial: build a REST API client where every endpoint returns `Result<T, ApiError>`. Covers: defining error types with `_tag` discriminants, wrapping fetch with Result, composing API calls, handling specific errors with `catchTag`, and aggregating errors with `createErrorGroup`. Shows a real-world pattern teams can copy.

**Audience**: Full-stack TypeScript developers
**Goal**: Demonstrate practical value, provide copy-paste patterns
**SEO**: "typescript api error handling", "type safe api client typescript", "result type api"

### 10. `10-rust-to-typescript.md`

**Title**: "From Rust to TypeScript: Error Handling That Feels Like Home"

Written for Rust developers who work in TypeScript. Maps Rust concepts to @hex-di/result: `Result<T, E>` → `Result<T, E>`, `Option<T>` → `Option<T>`, `?` operator → `safeTry` generators, `match` → `.match()`, `unwrap_or` → `.unwrapOr()`, `map_err` → `.mapErr()`, `and_then` → `.andThen()`. Highlights what's the same, what's different, and why @hex-di/result is the closest you'll get to Rust in TypeScript.

**Audience**: Rust developers, Rust-curious TypeScript developers
**Goal**: Capture the Rust-to-TypeScript pipeline
**SEO**: "rust result typescript", "rust error handling typescript", "typescript for rust developers"

### 11. `11-effect-contracts-explained.md`

**Title**: "Effect Contracts Explained: Declare Your Errors, Enforce Them at Compile Time"

Deep dive into @hex-di/result's unique effect system. Explains: what effect contracts are, how they declare which errors a function can produce, how the compiler enforces you handle every declared error, and how effect handlers transform or recover from errors. This is the "wow, I didn't know a Result library could do this" article.

**Audience**: Advanced TypeScript developers, architecture-minded teams
**Goal**: Showcase unique differentiator, drive advanced adoption
**SEO**: "typescript effect contracts", "compile time error handling typescript", "typed error contracts"

### 12. `12-safetry-do-notation.md`

**Title**: "safeTry: TypeScript's Answer to Rust's ? Operator"

Tutorial on generator-based do-notation with `safeTry`. Shows how to write linear, imperative-looking code that short-circuits on errors — without nested callbacks, without `.andThen()` chains, without try-catch. Side-by-side comparison: callback hell vs andThen chains vs safeTry generators. The "aha moment" article for developers who find Result chaining verbose.

**Audience**: Developers familiar with Result but frustrated by chaining verbosity
**Goal**: Remove a key adoption barrier, showcase DX
**SEO**: "typescript do notation", "typescript result generator", "rust question mark operator typescript"

### 13. `13-option-type-guide.md`

**Title**: "Beyond null: TypeScript's Option Type Done Right"

Explains why `T | null | undefined` is insufficient (no methods, no composition, easy to forget checks). Introduces @hex-di/result's `Option<T>` with `Some` and `None`, full combinator set (map, andThen, unwrapOr, filter, zip), and interop with Result via `okOr`/`transpose`. Targets developers who use Optional chaining but want more safety.

**Audience**: TypeScript developers dealing with nullable values
**Goal**: Drive adoption through the Option entry point (not just Result)
**SEO**: "typescript option type", "typescript maybe type", "typescript null handling library"

---

## Migration Guides (Phase 1-2 — Foundation/Awareness)

Step-by-step migration paths. These reduce adoption friction by meeting developers where they are.

### 14. `14-migrate-from-try-catch.md`

**Title**: "Migrating from try-catch to @hex-di/result: A Step-by-Step Guide"

Incremental migration guide. Shows how to wrap existing try-catch code in Results one function at a time, without rewriting everything. Covers: `fromThrowable` to wrap throwing functions, `fromPromise` for async code, gradually replacing `throw` with `Err()` returns, and using `.match()` at the boundary. Emphasizes that migration is incremental — no big bang rewrite needed.

**Audience**: Teams with existing try-catch codebases
**Goal**: Remove the "migration is too expensive" objection
**SEO**: "migrate try catch result typescript", "typescript result migration", "stop using try catch typescript"

### 15. `15-migrate-from-neverthrow.md`

**Title**: "Migrating from neverthrow to @hex-di/result"

API mapping guide: neverthrow method → @hex-di/result equivalent. Covers: `ok()` → `Ok()`, `err()` → `Err()`, `Result.combine` → equivalent, `ResultAsync` → `ResultAsync`, plus what's new (catchTag, Option, safeTry, createErrorGroup). Includes a codemod script or find-and-replace patterns for common transformations.

**Audience**: Teams currently using neverthrow
**Goal**: Direct conversion, reduce switching cost
**SEO**: "neverthrow migration", "switch from neverthrow", "neverthrow replacement"

### 16. `16-migrate-from-fp-ts.md`

**Title**: "Migrating from fp-ts Either to @hex-di/result"

Translation guide for fp-ts users. Maps: `Either` → `Result`, `Option` → `Option`, `pipe(value, E.map(...))` → `value.map(...)`, `E.fold` → `.match()`, `E.tryCatch` → `fromThrowable`. Addresses the philosophical shift: from HKTs and type classes to a practical, Rust-inspired API. Acknowledges what you lose (HKT abstraction) and what you gain (simplicity, active maintenance, effect system).

**Audience**: fp-ts users displaced by the Effect merger
**Goal**: Capture the fp-ts migration wave
**SEO**: "fp-ts migration guide", "fp-ts to result", "fp-ts replacement typescript"

---

## Deep Dive Articles (Phase 3-4 — Integration)

Technical deep dives that establish authority and serve advanced users.

### 17. `17-tagged-errors-pattern.md`

**Title**: "The Tagged Error Pattern: Exhaustive Error Handling in TypeScript"

Explains the tagged error pattern from first principles: why `_tag` discriminants make errors type-safe, how TypeScript's narrowing works with discriminated unions, and how `catchTag`/`catchTags` leverage this for exhaustive error handling. Includes the pattern without a library, then shows how @hex-di/result makes it ergonomic.

**Audience**: TypeScript developers interested in advanced type patterns
**Goal**: Thought leadership, demonstrate depth
**SEO**: "typescript tagged errors", "discriminated union errors", "exhaustive error handling typescript"

### 18. `18-immutability-matters.md`

**Title**: "Why Your Result Library Should Freeze Its Objects"

Makes the case for `Object.freeze()` on Result/Option instances. Covers: accidental mutation bugs, defensive programming, referential transparency, and how frozen objects enable safe sharing across boundaries. Benchmarks the performance impact (spoiler: negligible). Contrasts with class-based implementations (neverthrow) where mutation is possible.

**Audience**: Architecture-minded developers, DI practitioners
**Goal**: Differentiate on quality, attract quality-conscious teams
**SEO**: "immutable result type", "object freeze typescript", "typescript immutability patterns"

### 19. `19-error-groups.md`

**Title**: "createErrorGroup: Aggregating Multiple Error Types Without Losing Type Safety"

Tutorial on `createErrorGroup` — how to combine multiple error types into a single discriminated union while preserving `catchTag` compatibility. Use cases: service layers that call multiple ports, validation that collects multiple errors, API endpoints that aggregate subsystem failures. A unique feature with no equivalent in neverthrow or true-myth.

**Audience**: Teams building layered architectures
**Goal**: Showcase unique feature, drive advanced adoption
**SEO**: "typescript error aggregation", "typescript multiple error types", "discriminated union error group"

### 20. `20-result-in-clean-architecture.md`

**Title**: "Result Types in Clean Architecture: Typed Errors Across Service Boundaries"

Shows how Result types flow naturally through hexagonal architecture: ports return `Result<T, E>`, adapters wrap external calls in Results, use cases compose Results from multiple ports, and the application layer matches on errors. Demonstrates the natural fit between @hex-di/result and the hex-di ecosystem.

**Audience**: Clean architecture / DDD practitioners
**Goal**: Capture the DI/architecture audience, ecosystem synergy
**SEO**: "result type clean architecture", "typescript hexagonal architecture errors", "typed errors ports adapters"

### 21. `21-brand-validation-explained.md`

**Title**: "Phantom Brands in @hex-di/result: How We Guarantee Type Safety at the Compiler Level"

Technical deep dive into how @hex-di/result uses branded types to ensure a `Result` is always a true `Result` — it can't be forged by creating a plain object with the same shape. Covers: what phantom brands are, how they work in TypeScript, why structural typing is insufficient for algebraic types, and how brands provide nominal guarantees in a structural type system.

**Audience**: Advanced TypeScript developers, library authors
**Goal**: Establish technical credibility, attract type-system enthusiasts
**SEO**: "typescript branded types", "phantom types typescript", "nominal types typescript"

---

## Integration Articles (Phase 4 — Ecosystem)

Practical guides for using @hex-di/result with popular frameworks and tools.

### 22. `22-result-with-zod.md`

**Title**: "Type-Safe Validation with Zod and @hex-di/result"

Shows how to wrap Zod's `safeParse` to return `Result<T, ZodError>` instead of Zod's custom `SafeParseReturnType`. Covers: creating a `validateWith` helper, chaining validation with API calls, and using `catchTag` to distinguish validation errors from other error types in a pipeline. Previews the `@hex-di/result-zod` integration package.

**Audience**: Zod users (massive audience — Zod has ~25M weekly downloads)
**Goal**: Adoption through ecosystem integration
**SEO**: "zod result type", "zod error handling typescript", "zod safeParse result"

### 23. `23-result-with-nextjs.md`

**Title**: "Type-Safe Server Actions with Next.js and @hex-di/result"

Patterns for using Result types in Next.js Server Actions and Route Handlers. Covers: returning Results from server actions, serializing Result across the server/client boundary, handling errors in React components, and the `useActionState` + Result pattern. Solves the "how do I return typed errors from server actions" question.

**Audience**: Next.js developers
**Goal**: Framework-specific adoption
**SEO**: "nextjs server actions error handling", "nextjs typed errors", "nextjs result type"

### 24. `24-result-with-trpc.md`

**Title**: "Typed Error Propagation with tRPC and @hex-di/result"

Shows how to use Result types in tRPC procedures: returning `Result<T, E>` from resolvers, propagating typed errors through the tRPC client, and using `catchTag` on the client to handle specific server errors. Contrasts with tRPC's built-in error handling and shows when Result types add value.

**Audience**: tRPC users
**Goal**: Framework-specific adoption
**SEO**: "trpc error handling", "trpc typed errors", "trpc result type"

### 25. `25-result-with-hono.md`

**Title**: "Result-Driven Middleware with Hono and @hex-di/result"

Building Hono middleware that converts Result types to HTTP responses. Covers: a `resultHandler` middleware that maps `Ok` to 200 and `Err` to appropriate status codes based on `_tag`, composing multiple middleware Results, and error logging. A practical pattern for Hono API servers.

**Audience**: Hono users, API developers
**Goal**: Framework-specific adoption
**SEO**: "hono error handling", "hono middleware result", "hono typed errors"

---

## Community & Thought Leadership (Phase 5 — Ongoing)

Articles that build authority and serve the broader community.

### 26. `26-testing-result-types.md`

**Title**: "Testing Result Types: Custom Matchers, Property-Based Testing, and Mutation Testing"

Guide to testing code that uses Result types. Covers: custom Vitest/Jest matchers (`toBeOk`, `toBeErr`, `toMatchOk`), property-based testing with fast-check to verify algebraic laws, and mutation testing to ensure your error paths are actually tested. Shows how @hex-di/result itself is tested as a model.

**Audience**: Testing-focused developers, teams adopting Result types
**Goal**: Remove the "how do I test this" barrier, establish testing authority
**SEO**: "test result type typescript", "vitest custom matchers", "property based testing typescript"

### 27. `27-performance-benchmarks.md`

**Title**: "Result Library Performance: @hex-di/result vs neverthrow vs true-myth vs Effect"

Rigorous benchmarks: creation, mapping, chaining, matching, error path, and async operations. Includes bundle size comparison (tree-shaken). Methodology is transparent and reproducible (published benchmark code). Honest about where competitors win. Updated with each release.

**Audience**: Performance-conscious developers, technical decision-makers
**Goal**: Remove performance concerns, provide data for team buy-in
**SEO**: "typescript result library benchmark", "neverthrow performance", "result type overhead typescript"

### 28. `28-why-not-just-throw.md`

**Title**: "Why Not Just Throw? A Senior Engineer's Case for Result Types in Production"

An opinionated essay arguing for Result types in production TypeScript. Covers: real production incidents caused by untyped errors, the maintenance cost of try-catch at scale, how Result types improve code review (errors are visible in signatures), and when throwing is still appropriate (truly exceptional, unrecoverable situations). Written in a conversational, experience-driven tone.

**Audience**: Senior engineers, tech leads, architects
**Goal**: Win over decision-makers, provide ammunition for team buy-in
**SEO**: "why use result type", "typescript result vs throw", "should i use result type typescript"

---

## Article Index by Priority

```
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │                     PUBLICATION PRIORITY                                        │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                 │
 │  TIER 1 — Publish First (highest impact, foundation for everything else)        │
 │ ┌─────────────────────────────────────────────────────────────────────────────┐ │
 │ │  01  Stop Throwing, Start Returning                          Intro          │ │
 │ │  02  Introducing @hex-di/result                              Launch         │ │
 │ │  03  @hex-di/result vs neverthrow                            Comparison     │ │
 │ │  08  Typed Errors in TypeScript: A Practical Guide           Tutorial       │ │
 │ │  14  Migrating from try-catch                                Migration      │ │
 │ └─────────────────────────────────────────────────────────────────────────────┘ │
 │                                                                                 │
 │  TIER 2 — Publish Next (capture specific audiences)                             │
 │ ┌─────────────────────────────────────────────────────────────────────────────┐ │
 │ │  04  You Don't Need Effect for Typed Errors                  Comparison     │ │
 │ │  05  From Either to Result (fp-ts successor)                 Comparison     │ │
 │ │  07  The TypeScript Result Library Landscape in 2026         Overview       │ │
 │ │  10  From Rust to TypeScript                                 Tutorial       │ │
 │ │  12  safeTry: TypeScript's Answer to Rust's ? Operator       Tutorial       │ │
 │ └─────────────────────────────────────────────────────────────────────────────┘ │
 │                                                                                 │
 │  TIER 3 — Publish After Traction (deepen engagement)                            │
 │ ┌─────────────────────────────────────────────────────────────────────────────┐ │
 │ │  09  Building a Type-Safe API Layer                          Tutorial       │ │
 │ │  11  Effect Contracts Explained                              Deep dive      │ │
 │ │  13  Beyond null: Option Type Done Right                     Tutorial       │ │
 │ │  15  Migrating from neverthrow                               Migration      │ │
 │ │  16  Migrating from fp-ts                                    Migration      │ │
 │ │  17  The Tagged Error Pattern                                Deep dive      │ │
 │ │  28  Why Not Just Throw?                                     Thought piece  │ │
 │ └─────────────────────────────────────────────────────────────────────────────┘ │
 │                                                                                 │
 │  TIER 4 — Publish When Integrations Ship (ecosystem growth)                     │
 │ ┌─────────────────────────────────────────────────────────────────────────────┐ │
 │ │  06  @hex-di/result vs true-myth                             Comparison     │ │
 │ │  18  Why Your Result Library Should Freeze Its Objects        Deep dive      │ │
 │ │  19  createErrorGroup                                        Deep dive      │ │
 │ │  20  Result Types in Clean Architecture                      Deep dive      │ │
 │ │  21  Phantom Brands Explained                                Deep dive      │ │
 │ │  22  Type-Safe Validation with Zod                           Integration    │ │
 │ │  23  Type-Safe Server Actions with Next.js                   Integration    │ │
 │ │  24  Typed Error Propagation with tRPC                       Integration    │ │
 │ │  25  Result-Driven Middleware with Hono                      Integration    │ │
 │ │  26  Testing Result Types                                    Community      │ │
 │ │  27  Performance Benchmarks                                  Community      │ │
 │ └─────────────────────────────────────────────────────────────────────────────┘ │
 │                                                                                 │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

## Publishing Channels

Each article should be published to:

1. **Docusaurus blog** (primary, canonical URL)
2. **dev.to** (cross-post, largest developer audience)
3. **Medium** (cross-post, broader reach)
4. **Hashnode** (cross-post, developer-focused)

Key articles (01, 03, 04, 07, 08, 28) should be submitted to:

- TypeScript Weekly newsletter
- JavaScript Weekly newsletter
- Reddit (r/typescript, r/programming)
