# Result Presentation - Narrative Structure

## The Story: "From Chaos to Clarity"

The presentation tells the story of a codebase that starts with good intentions but accumulates error handling debt over time. The audience watches familiar patterns emerge, feels the pain, then discovers a way out.

---

## Act 1: "The Familiar Chaos" (Slides 1-12)

### Opening Hook (Slides 1-2)

**Slide 1 - Title Slide**

- Title: "When `catch` Isn't Enough"
- Subtitle: "A story about errors, types, and the code we actually ship"
- Visual: A try/catch block that's 47 lines long, semi-transparent, fading into purple fog
- No logos, no agenda - just the hook

**Slide 2 - The Question**

- "What happens when your application fails?"
- Three animated options appear:
  1. "It throws an exception and someone gets paged"
  2. "It returns null and nobody notices for 3 weeks"
  3. "It logs to console and the user sees a white screen"
- Pause for recognition. All three are real failure modes.

### The Crime Scene (Slides 3-7)

Each slide shows a **real code example** from the Sanofi codebase (anonymized variable names, same structure). The slide highlights what's wrong with a subtle red annotation.

**Slide 3 - "The Silent Swallower"**

- Pattern: `.catch(() => null)` and empty catch blocks
- Real example from: Photo fetching hook that returns null on auth errors, network errors, and missing photos identically
- Annotation: "Three different failure modes. One response: `null`. Good luck debugging at 2 AM."
- Key insight: The caller cannot distinguish between "user has no photo" and "our auth token expired"

**Slide 4 - "The Generic Thrower"**

- Pattern: `throw new Error('Failed to do X')` that wraps typed API errors into generic strings
- Real example from: API service functions that receive typed error objects from OpenAPI clients, then throw `new Error(error.message.toString())`
- Annotation: "We had the type. We threw it away."
- Key insight: The error object from the API client had structure (status code, message, details). The throw reduced it to a string.

**Slide 5 - "The Unsafe Cast"**

- Pattern: `(error as Error).message` in catch blocks
- Real example from: Controller catch blocks that cast unknown errors to Error
- Annotation: "TypeScript told us this is `unknown`. We said 'trust me'. TypeScript was right."
- Key insight: Not all thrown values are Error instances. A rejected promise can contain anything.

**Slide 6 - "The Callback Pyramid"**

- Pattern: Deeply nested callbacks with error handling at different levels
- Real example from: Multi-step form submission with createAsset -> updateAsset -> POST chain, each with different error handling strategies
- Annotation: "Three operations. Three different error strategies. Zero type safety across the chain."
- Key insight: Each callback handles errors differently, some throw, some toast, some log. No consistent contract.

**Slide 7 - "The Success That Wasn't"**

- Pattern: Showing success UI while background operations fail silently
- Real example from: Asset polling that shows success toast while download `.catch()` swallows errors
- Annotation: "The user sees 'Success!'. The file didn't download. Nobody knows."
- Key insight: `.catch()` handlers that log but don't propagate failure to the UI

### The Cost (Slides 8-10)

**Slide 8 - "The Taxonomy of Chaos"**

- Visual: A classification of all the anti-patterns seen so far
  - **Silent failures**: `.catch(() => null)`, empty catch, return undefined
  - **Type erasure**: `as Error`, `throw new Error(string)`, generic catches
  - **Inconsistent contracts**: Some throw, some return null, some toast
  - **Lost context**: Original error details replaced with generic messages
- "These aren't bad developers. These are good developers under pressure."

**Slide 9 - "Why This Happens"**

- TypeScript's type system **stops at the throw boundary**
- `throw` is invisible to the type checker - any function can throw anything
- `catch(error)` gives you `unknown` - TypeScript can't know what was thrown
- There's no language feature to declare "this function can fail with these specific errors"
- The gap between "what TypeScript knows" and "what can actually happen" grows with every try/catch

**Slide 10 - "The Real Question"**

- "What if errors were just... values?"
- "What if TypeScript could track every way a function can fail?"
- "What if your code couldn't compile unless you handled every error case?"
- Transition beat: "Let's find out."

### The Bridge (Slides 11-12)

**Slide 11 - "Errors as Values"**

- Brief history: Rust's `Result<T, E>`, Go's multiple returns, Haskell's `Either`
- The idea: instead of `throw` (invisible to types) use `return` (fully typed)
- No deep theory - just the core insight: "A function that can fail should say so in its return type"

**Slide 12 - "Meet Result"**

- First code snippet:

  ```typescript
  import { ok, err, type Result } from "@hex-di/result";

  const success = ok(42); // Ok<number, never>
  const failure = err("oops"); // Err<never, string>
  ```

- "That's it. Two constructors. One discriminated union. Full type safety."
- Transition: "Now let's fix the code we saw earlier."

---

## Act 2: "The Refactoring" (Slides 13-28)

Each section takes a real problem from Act 1 and transforms it with Result.

### Foundation (Slides 13-16)

**Slide 13 - "Creating Results"**

- `ok(value)` and `err(error)` basics
- `fromThrowable(fn, mapErr)` - wrapping existing code that throws
- `fromNullable(value, onNull)` - converting nullable returns
- `fromPromise(promise, mapErr)` - wrapping promises
- Each with a one-liner example

**Slide 14 - "Checking Results"**

- `isOk()` / `isErr()` with type narrowing demo
- `_tag` discriminator for switch/case
- Pattern: `if (result.isOk()) { result.value }` - TypeScript narrows the type
- Contrast with: `if (response.error) { ... }` which doesn't narrow anything

**Slide 15 - "Transforming Results"**

- `map` / `mapErr` / `mapBoth`
- Visual: The railway metaphor (success track / error track)
- Show how data flows through transformations without any if/else branching
- "The error track carries your failure forward. You don't lose it."

**Slide 16 - "Extracting Values"**

- `match(onOk, onErr)` - the universal extractor
- `unwrapOr(default)` - safe default
- `toNullable()` / `toUndefined()` - bridge back to nullable world
- `intoTuple()` - Go-style `[error, value]` for those who prefer it
- Key point: "You choose when and how to handle the error. Not the runtime."

### Fixing Real Code (Slides 17-22)

**Slide 17 - "Fixing the Silent Swallower"**

- BEFORE: The photo fetch hook with `.catch(() => null)`
- AFTER: Same function returning `ResultAsync<PhotoUrl, PhotoError>`
- PhotoError discriminated union: `AuthExpired | NetworkError | NotFound`
- Caller can now: show different UI for each case, retry on network error, redirect on auth expired
- Side-by-side comparison with line count (similar or fewer lines)

**Slide 18 - "Fixing the Generic Thrower"**

- BEFORE: API function that throws `new Error(error.message.toString())`
- AFTER: API function returning `ResultAsync<SurveyData, ApiError>`
- ApiError preserves: status code, message, original response
- `mapErr` transforms the raw API error to domain error
- Caller gets typed error without any casting

**Slide 19 - "Fixing the Unsafe Cast"**

- BEFORE: Controller catch with `(err as Error).message`
- AFTER: Service returns `Result<Data, ServiceError>`
- Controller uses `match()` to map to HTTP responses
- No catch block needed. No casting. Every error case has a specific HTTP status.

**Slide 20 - "Fixing the Callback Pyramid"**

- BEFORE: The 200-line nested callback chain
- AFTER: Same logic with `safeTry` generator
- ```typescript
  const result = safeTry(async function* () {
    const signedUrl = yield* await getSignedUrl(fileId);
    const content = yield* await fetchContent(signedUrl);
    const asset = yield* await createAsset(content);
    const updated = yield* await updateAsset(asset.id, metadata);
    const localized = yield* await startLocalization(updated.id);
    return ok(localized);
  });
  ```
- "Six operations. Six potential failures. One flat function. Every error type tracked."
- Highlight: This is the Rust `?` operator for TypeScript

**Slide 21 - "Fixing the Success That Wasn't"**

- BEFORE: Download with `.catch()` swallowing errors, toast showing success regardless
- AFTER: Download returns `ResultAsync`, caller checks before showing toast
- ```typescript
  const result = await downloadResults(run);
  result.match(
    () => toast.success("Downloaded successfully"),
    err => toast.error(`Download failed: ${err.message}`)
  );
  ```
- "Now success means success."

**Slide 22 - "The Pattern"**

- Recap transformation pattern:
  1. Identify the function that can fail
  2. Change return type from `Promise<T>` to `ResultAsync<T, E>`
  3. Define the error type as a tagged union
  4. Replace `throw` with `return err(...)`, replace success with `return ok(...)`
  5. At the call site, use `match`, `map`, or `safeTry` to handle the result
- "That's the entire migration strategy."

### Advanced Patterns (Slides 23-28)

**Slide 23 - "Combining Results"**

- `all(r1, r2, r3)` - short-circuit on first error
- `allSettled(r1, r2, r3)` - collect all errors for validation
- `collect({ name: r1, email: r2 })` - combine named results
- Real use case: Form validation where you want ALL errors, not just the first

**Slide 24 - "Error Recovery"**

- `orElse` for recovery chains
- `andThrough` for validation side-effects
- Real use case: Retry with fallback, cache miss -> fetch -> store

**Slide 25 - "Tagged Errors"**

- `createError('NotFound')` factory
- Discriminated unions with `_tag`
- `assertNever` for exhaustive switches
- Real use case: API error handling where different errors need different responses

**Slide 26 - "Async Pipelines"**

- `ResultAsync` chaining: `fromPromise -> map -> andThen -> match`
- Mixed sync/async in same chain
- Real use case: Fetch user -> validate permissions -> load dashboard data

**Slide 27 - "Generator Magic: safeTry"**

- Deep dive into the generator protocol
- `yield*` extracts Ok values or short-circuits on Err
- Async generators for async pipelines
- Real use case: Multi-step transaction with typed rollback information

**Slide 28 - "Testing with Result"**

- Custom Vitest matchers: `toBeOk()`, `toBeErr()`, `toBeOkWith()`, `toBeErrWith()`
- No more `try { await fn(); fail() } catch (e) { expect(e)... }`
- Testing error paths is as clean as testing success paths
- `expect(result).toBeErrSatisfying(e => e._tag === 'NotFound')`

---

## Act 3: "The Bigger Picture" (Slides 29-36)

### The Ecosystem (Slides 29-33)

**Slide 29 - "Result Doesn't Live Alone"**

- Transition: "We fixed error handling. But what if the entire application could be this intentional?"
- Introduce HexDI: "A dependency injection ecosystem where every library reports what it knows"
- The DI container is the nervous system. Result is how we handle failure signals.

**Slide 30 - "The Self-Aware Application"**

- Layer 1 - Structure: `@hex-di/graph` knows your dependency topology
- Layer 2 - Runtime: `@hex-di/runtime` knows what's instantiated
- Layer 3 - Behavior: Every library reports its state
  - `@hex-di/store` - what values are current
  - `@hex-di/query` - what's cached and what's stale
  - `@hex-di/flow` - what state machine states are active
  - `@hex-di/saga` - what workflows are in progress
  - `@hex-di/tracing` - what happened and when
  - `@hex-di/logger` - structured logs with context
- "Your application can answer questions about itself."

**Slide 31 - "Result + Container"**

- `container.resolveResult(port)` returns `Result<T, ResolutionError>` instead of throwing
- `ResolutionError` is a tagged union: `MissingAdapter | CircularDependency | LifetimeMismatch | ...`
- Every container operation is type-safe error handling
- "Even wiring your application can't fail silently."

**Slide 32 - "The Live Demo"**

- Interactive: Show the presentation app's own dependency graph
- The presentation itself uses HexDI - show the container inspector
- Slide navigation is a Flow state machine
- Code examples are fetched via Query with caching
- Slide state is managed by Store
- Every transition is traced
- "This presentation is a self-aware application."

**Slide 33 - "Ports and Adapters"**

- Brief intro to Hexagonal Architecture
- A Port declares a capability (what you need)
- An Adapter provides it (how it works)
- Result connects them: the adapter returns Result, the port declares the error types
- "The boundary between your domain and the outside world is always a Result."

### Closing (Slides 34-36)

**Slide 34 - "The Migration Path"**

- Step 1: Add `@hex-di/result` to your project
- Step 2: Start with one service function - change it to return Result
- Step 3: Propagate outward - callers adopt Result handling
- Step 4: Define domain error types as tagged unions
- Step 5: Reach for `safeTry` when chains get long
- "You don't rewrite everything. You transform one function at a time."

**Slide 35 - "What Changes"**

- Before: "Something went wrong" in production logs
- After: `{ _tag: "RateLimited", retryAfter: 30, endpoint: "/api/users" }`
- Before: `catch(e) { console.error(e) }`
- After: Exhaustive switch on typed error union
- Before: "The app crashed but we don't know why"
- After: Every failure path is a first-class citizen with its own handler
- "The difference isn't the code. It's the conversation you have with your compiler."

**Slide 36 - Closing**

- "Errors aren't exceptional. They're expected."
- "Your type system should know about them."
- "Your application should handle them."
- "HexDI makes this possible."
- Links: Documentation, GitHub, Getting Started Guide
