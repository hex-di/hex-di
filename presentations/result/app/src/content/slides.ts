import type { SlideDefinition } from "./types.js";
import { example as silentSwallower } from "./code-examples/silent-swallower.js";
import { example as genericThrower } from "./code-examples/generic-thrower.js";
import { example as unsafeCast } from "./code-examples/unsafe-cast.js";
import { example as callbackPyramid } from "./code-examples/callback-pyramid.js";
import { example as successThatWasnt } from "./code-examples/success-that-wasnt.js";
import { example as safeTryExample } from "./code-examples/safe-try.js";
import { example as testingExample } from "./code-examples/testing.js";
import { example as fairComparison } from "./code-examples/fair-comparison.js";
import { example as compositionExample } from "./code-examples/composition.js";

export const slides: readonly SlideDefinition[] = [
  // ========== ACT 1: The Problem (slides 1-12) ==========
  {
    index: 1,
    type: "title",
    act: "act1",
    title: "When catch Isn't Enough",
    subtitle: "A journey through error handling in TypeScript",
    presenterNotes:
      "Opening hook. Ask: What happens when your app fails? Do you know? Does your compiler know? FAQ: 'Isn't catch enough with discriminated unions + type guards + ESLint + useUnknownInCatchVariables + Promise.allSettled + exhaustive switches?' That combination works. Result is a single tool that bundles those guarantees into a standard pattern. The talk argues catch alone is insufficient — and Result is a more ergonomic path to the same safety.",
    background: "dark",
  },
  {
    index: 2,
    type: "diagram",
    act: "act1",
    title: "What Happens When Your Application Fails?",
    content: { _tag: "diagram", diagramId: "failure-cascade" },
    presenterNotes: "Build recognition. These are universal experiences.",
    background: "white",
  },
  {
    index: 3,
    type: "code",
    act: "act1",
    title: "The Silent Swallower",
    content: { _tag: "code", content: silentSwallower.before },
    presenterNotes:
      "First anti-pattern. Ask: Who has written .catch(() => null)? Pause for recognition. FAQ: 'ESLint no-floating-promises catches this.' It catches forgotten .catch() — but NOT .catch(() => null). This pattern passes all standard linting rules. The error is 'handled' — just handled badly. Result's match() makes the empty handler visible and greppable.",
    background: "white",
  },
  {
    index: 4,
    type: "code",
    act: "act1",
    title: "The Generic Thrower",
    content: { _tag: "code", content: genericThrower.before },
    presenterNotes:
      "Second anti-pattern. JSON.parse throws SyntaxError — but catch gives you unknown. The native fix is a try/catch with a type guard, but you must repeat it at every parse site. fromThrowable wraps the boundary once. FAQ: 'This is just a one-liner wrapper.' Correct — the value isn't the wrapper, it's the typed error that propagates through the chain.",
    background: "white",
  },
  {
    index: 5,
    type: "code",
    act: "act1",
    title: "The Unsafe Cast",
    content: { _tag: "code", content: unsafeCast.before },
    presenterNotes:
      "Third anti-pattern. (err as Error) -- what if it's not an Error? FAQ: 'useUnknownInCatchVariables (TS 4.4) makes catch unknown by default.' Correct — that solves the cast problem. The remaining gap: even with unknown, the compiler cannot tell you which error types are possible. You must write a type guard for every catch block, with no guarantee the guard is correct or exhaustive. Result's tagged errors provide exhaustive discrimination.",
    background: "white",
  },
  {
    index: 6,
    type: "code",
    act: "act1",
    title: "The Error Tower",
    content: { _tag: "code", content: callbackPyramid.before },
    presenterNotes:
      "The error tower: three try/catch blocks, each handling unknown independently. async/await already solved nesting — the problem here is typed error composition. Each step can fail differently, but every catch starts from unknown. Result composes the error union automatically: FetchError | StockError | PaymentError.",
    background: "white",
  },
  {
    index: 7,
    type: "code",
    act: "act1",
    title: "The Success That Wasn't",
    content: { _tag: "code", content: successThatWasnt.before },
    presenterNotes:
      "Fifth anti-pattern. Success toast displayed even when the operation failed. FAQ: 'Just check failed.length before the toast.' That's what the before code already has — and it didn't work. The developer had Promise.allSettled and still showed a success toast. Result forces the caller to handle the error branch.",
    background: "white",
  },
  {
    index: 8,
    type: "diagram",
    act: "act1",
    title: "The Taxonomy of Chaos",
    content: { _tag: "diagram", diagramId: "error-taxonomy" },
    presenterNotes:
      "Show the audit numbers. 797 throw statements total. But not all are problematic — ~257 are framework-required HTTP exceptions (legitimate). The problematic patterns: ~163 generic throw new Error(string) destroying context, ~257 silent failures (.catch(() => null), empty catches), ~134 unsafe casts ((err as Error), instanceof). ~540 patterns that Result directly addresses.",
    background: "white",
  },
  {
    index: 9,
    type: "diagram",
    act: "act1",
    title: "Why This Happens",
    content: { _tag: "diagram", diagramId: "type-boundary" },
    presenterNotes:
      "The root cause. TypeScript's type system stops at throw/catch. FAQ: 'No throws clause is a deliberate design choice — Java checked exceptions are a mistake.' Correct. Result is NOT checked exceptions. No throws clause, no mandatory catch, no exception hierarchy. It is typed return values — closer to Go/Rust than Java.",
    background: "white",
  },
  {
    index: 10,
    type: "impact",
    act: "act1",
    title: "What if the compiler could see your errors?",
    subtitle: "What if every failure was just another value -- typed, checked, exhaustive?",
    presenterNotes: "Transition beat. Rhetorical. Let it land. Pause 3 seconds.",
    background: "dark",
  },
  {
    index: 11,
    type: "diagram",
    act: "act1",
    title: "Errors as Values",
    content: { _tag: "diagram", diagramId: "language-comparison" },
    presenterNotes:
      "Brief history. Every modern language has solved this. TypeScript hasn't -- until now. FAQ: 'Rust has ? and pattern matching built into the language — this is apples to oranges.' Fair. Result in TypeScript is a library convention, not compiler-enforced. The value is standardization and composition, not enforcement. safeTry approximates ? but does not replace it.",
    background: "white",
  },
  {
    index: 12,
    type: "title",
    act: "act1",
    title: "Meet Result<T, E>",
    subtitle: "ok(value) | err(error)",
    presenterNotes:
      "Transition into Act 2. This is the moment of introduction. Keep it simple: ok() and err().",
    background: "dark",
  },

  // ========== ACT 2: The Solution (slides 13-34) ==========
  {
    index: 13,
    type: "code",
    act: "act2",
    title: "Creating Results",
    content: {
      _tag: "code",
      content: {
        code: `import { ok, err, fromThrowable, fromNullable, fromPromise } from "@hex-di/result";

const success = ok(42);           // Result<number, never>
const failure = err("not found"); // Result<never, string>

const safeJsonParse = fromThrowable(
  JSON.parse,
  (e) => ({ _tag: "ParseError" as const, cause: String(e) })
);
const parsed = safeJsonParse('{"valid": true}'); // Result<unknown, ParseError>

const user = fromNullable(
  findUser("id-123"),
  () => ({ _tag: "NotFound" as const, id: "id-123" })
); // Result<User, NotFound>

const data = fromPromise(
  fetch("/api/data").then(r => r.json()),
  (e) => ({ _tag: "FetchError" as const, cause: String(e) })
);`,
        language: "typescript",
        filename: "creating-results.ts",
      },
    },
    presenterNotes:
      "Foundation: ok(), err(), fromThrowable(), fromNullable(), fromPromise(). One-liners. FAQ: 'fromPromise still receives unknown — the problem is just moved.' Yes — error mapping at the boundary costs the same. The payoff is downstream: every subsequent operation sees typed errors, not unknown. Result quarantines unknown to the boundary where the throw originates.",
    background: "white",
  },
  {
    index: 14,
    type: "code",
    act: "act2",
    title: "Checking Results",
    content: {
      _tag: "code",
      content: {
        code: `import { ok, err } from "@hex-di/result";

const result = ok(42);

// Type guards narrow the type
if (result.isOk()) {
  console.log(result.value); // number -- type narrowed!
}
if (result.isErr()) {
  console.log(result.error); // never -- can't happen here
}

// Discriminated union with _tag
const failed = err({ _tag: "NotFound" as const, id: "123" });
if (failed.isErr()) {
  switch (failed.error._tag) {
    case "NotFound":
      console.log(failed.error.id); // string -- narrowed!
      break;
  }
}`,
        language: "typescript",
        filename: "checking-results.ts",
      },
    },
    presenterNotes: "isOk(), isErr(), _tag discriminator, type narrowing.",
    background: "white",
  },
  {
    index: 15,
    type: "diagram",
    act: "act2",
    title: "Transforming Results",
    subtitle: "The Railway Pattern",
    content: { _tag: "diagram", diagramId: "railway" },
    presenterNotes:
      "Railway diagram. Two tracks: success and error. map stays on success track. mapErr stays on error track. FAQ: 'Error unions explode with many service calls.' Use mapErr at layer boundaries to compress: service returns 4 errors → boundary maps to 2 domain errors → controller maps to 2 HTTP statuses. The union never exceeds what the current layer cares about. FAQ: 'How do you debug chained operations?' Set breakpoints on individual callbacks, use .inspect() for logging, or switch to imperative style: `const r = doThing(); if (r.isErr()) return r;` Same type safety, debugger-friendly.",
    background: "white",
  },
  {
    index: 16,
    type: "code",
    act: "act2",
    title: "Extracting Values",
    content: {
      _tag: "code",
      content: {
        code: `import { ok, err } from "@hex-di/result";

const result = ok(42);

// match: exhaustive pattern matching (recommended)
const message = result.match(
  (value) => \`Success: \${value}\`,
  (error) => \`Failed: \${error}\`
); // "Success: 42"

// unwrapOr: provide a default
const value = result.unwrapOr(0); // 42 (or 0 if err)

// toNullable: interop with nullable APIs
const nullable = result.toNullable(); // 42 | null

// intoTuple: Go-style destructuring
const [val, error] = result.intoTuple();
// val: 42 | null, error: E | null
if (error) {
  // handle error
} else {
  // val is the value
}`,
        language: "typescript",
        filename: "extracting-values.ts",
      },
    },
    presenterNotes:
      "match(), unwrapOr(), toNullable(), intoTuple(). match() is the recommended pattern. FAQ: 'unwrapOr(null) is the same as .catch(() => null).' Correct — it is the same anti-pattern. Use match() when the error matters, unwrapOr only with a meaningful default. expect() is a runtime assertion — reserve for tests and provably-safe unwraps.",
    background: "white",
  },

  // Tagged Errors: moved here so every split slide can omit error definitions
  {
    index: 17,
    type: "code",
    act: "act2",
    title: "Tagged Errors",
    content: {
      _tag: "code",
      content: {
        code: `import { createError, assertNever } from "@hex-di/result";

const NotFound = createError("NotFound");
const Forbidden = createError("Forbidden");
const RateLimited = createError("RateLimited");

NotFound({ id: "user-123" }); // { _tag: "NotFound", id: "user-123" }

type ApiError =
  | ReturnType<typeof NotFound>
  | ReturnType<typeof Forbidden>
  | ReturnType<typeof RateLimited>;

function handleError(error: ApiError): string {
  switch (error._tag) {
    case "NotFound": return \`Not found: \${error.id}\`;
    case "Forbidden": return "Access denied";
    case "RateLimited": return "Slow down!";
    default: return assertNever(error);
  }
}`,
        language: "typescript",
        filename: "tagged-errors.ts",
      },
    },
    presenterNotes:
      "createError() factory, discriminated unions, assertNever for exhaustiveness. This is the foundation -- every fix slide ahead uses this pattern.",
    background: "white",
  },

  // Split slides: before/after comparisons
  {
    index: 18,
    type: "split",
    act: "act2",
    title: "Fixing the Silent Swallower",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "silent-swallower",
        before: silentSwallower.before,
        after: silentSwallower.after,
      },
    },
    presenterNotes:
      "First fix! .catch(() => null) becomes ResultAsync with 4 typed error variants.",
    background: "white",
  },
  {
    index: 19,
    type: "split",
    act: "act2",
    title: "Fixing the Generic Thrower",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "generic-thrower",
        before: genericThrower.before,
        after: genericThrower.after,
      },
    },
    presenterNotes: "throw new Error(msg) becomes safeTry with createError factories.",
    background: "white",
  },
  {
    index: 20,
    type: "split",
    act: "act2",
    title: "Fixing the Unsafe Cast",
    content: {
      _tag: "comparison",
      content: { exampleId: "unsafe-cast", before: unsafeCast.before, after: unsafeCast.after },
    },
    presenterNotes: "(err as Error) becomes match() with _tag discrimination. No casts.",
    background: "white",
  },
  {
    index: 21,
    type: "split",
    act: "act2",
    title: "Fixing the Error Tower",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "callback-pyramid",
        before: callbackPyramid.before,
        after: callbackPyramid.after,
      },
    },
    presenterNotes:
      "Most dramatic transformation. Three try/catch blocks flattened to sequential yield*. This is the crowd-pleaser.",
    background: "white",
  },
  {
    index: 22,
    type: "split",
    act: "act2",
    title: "Fixing the Success That Wasn't",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "success-that-wasnt",
        before: successThatWasnt.before,
        after: successThatWasnt.after,
      },
    },
    presenterNotes: "match() gates the toast on the actual outcome. No more false success.",
    background: "white",
  },
  {
    index: 23,
    type: "impact",
    act: "act2",
    title: "The Pattern",
    subtitle:
      "1. Define errors as tagged types\n2. Return Result instead of throwing\n3. Transform with map/andThen\n4. Extract with match\n5. Compose with safeTry",
    presenterNotes: "Recap the 5-step transformation. This is the takeaway slide for Act 2.",
    background: "dark",
  },

  // Advanced patterns
  {
    index: 24,
    type: "code",
    act: "act2",
    title: "Combining Results",
    content: {
      _tag: "code",
      content: {
        code: `import { all, allSettled, collect } from "@hex-di/result";

// all: succeed only if ALL succeed (short-circuits on first error)
const allValid = all([
  validateName(form.name),
  validateEmail(form.email),
  validateAge(form.age),
]); // Result<[string, string, number], ValidationError>

// allSettled: always runs all, collects every result
const settled = allSettled([
  fetchUser(id1),
  fetchUser(id2),
  fetchUser(id3),
]); // ResultAsync<Result<User, FetchError>[], never>

// collect: object of named results -> result of named values
const config = collect({
  db: loadDatabaseConfig(),
  redis: loadRedisConfig(),
  auth: loadAuthConfig(),
}); // Result<{ db: DbConfig; redis: RedisConfig; auth: AuthConfig }, ConfigError>`,
        language: "typescript",
        filename: "combining-results.ts",
      },
    },
    presenterNotes: "all(), allSettled(), collect(). Form validation use case.",
    background: "white",
  },
  {
    index: 25,
    type: "code",
    act: "act2",
    title: "Error Recovery",
    content: {
      _tag: "code",
      content: {
        code: `import { ok, err } from "@hex-di/result";

// orElse: recover from specific errors
const result = fetchFromCache(key)
  .orElse((cacheError) => {
    if (cacheError._tag === "CacheMiss") {
      return fetchFromDatabase(key); // try fallback
    }
    return err(cacheError); // propagate other errors
  });

// andThrough: run a side effect without changing the value
const saved = createUser(data)
  .andThrough((user) =>
    sendWelcomeEmail(user.email) // fire-and-forget
  )
  .andThrough((user) =>
    trackAnalytics("user.created", { id: user.id })
  );
// saved: Result<User, CreateError>
// email/analytics errors don't affect the user creation`,
        language: "typescript",
        filename: "error-recovery.ts",
      },
    },
    presenterNotes:
      "orElse, andThrough. Retry/fallback use case. FAQ: 'andTee silently swallows errors — isn't that the same anti-pattern?' Intentional: andTee is for fire-and-forget side effects (logging). If you need fallible side effects, use andThrough (propagates errors). If you want exceptions to propagate, use inspect. Three levels of side-effect strictness.",
    background: "white",
  },
  {
    index: 26,
    type: "code",
    act: "act2",
    title: "Async Pipelines",
    content: {
      _tag: "code",
      content: {
        code: `import { ResultAsync, fromPromise } from "@hex-di/result";

const user = fromPromise(
  fetch("/api/user/123").then(r => r.json()),
  () => ({ _tag: "FetchError" as const })
);

// Chain async and sync transforms:
const greeting = user
  .map((u) => u.name)
  .map((name) => \`Hello, \${name}\`)
  .mapErr((e) => ({
    ...e,
    userMessage: "Could not load your profile",
  }));

// Mix sync Results with async:
const result = validateInput(raw)
  .asyncAndThen((input) =>
    submitToApi(input)
  )
  .map((response) => response.id);

const final = await result;
// Result<string, ValidationError | ApiError>`,
        language: "typescript",
        filename: "async-pipelines.ts",
      },
    },
    presenterNotes:
      "ResultAsync chaining, mixed sync/async, fromPromise wrapping. FAQ: 'Result vs ResultAsync is confusing.' Rule of thumb: async function → ResultAsync. Sync function → Result. Need to bridge? .toAsync(). In practice, most app code is async, so ResultAsync is the default.",
    background: "white",
  },

  // safeTry and Testing as split slides (bookend Act 2)
  {
    index: 27,
    type: "split",
    act: "act2",
    title: "Generator Magic: safeTry",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "safe-try",
        before: safeTryExample.before,
        after: safeTryExample.after,
      },
    },
    presenterNotes:
      "Most dramatic visual contrast: nested try/catch vs flat generators. yield* is TypeScript's ? operator. FAQ: 'yield* await is bizarre.' Start with .andThen() chains. Reach for safeTry when chains exceed 3 steps. How it works: yield* on Ok extracts the value, yield* on Err short-circuits the block. That's it.",
    background: "white",
  },
  {
    index: 28,
    type: "split",
    act: "act2",
    title: "Testing with Result",
    content: {
      _tag: "comparison",
      content: { exampleId: "testing", before: testingExample.before, after: testingExample.after },
    },
    presenterNotes:
      "No .rejects.toThrow(). Typed error fields accessible. Structure over string matching.",
    background: "white",
  },
  {
    index: 29,
    type: "diagram",
    act: "act2",
    title: "The Two Kingdoms",
    content: { _tag: "diagram", diagramId: "two-kingdoms" },
    presenterNotes:
      "Result creates two error systems. This is the primary cost — every developer must decide at every boundary: throw or Result? The heuristic: if valid user input can cause this error, use Result. If only a bug can cause it, throw. If the framework requires it (NestJS filters, React boundaries), throw. The boundary translation is explicit and visible, but it is permanent. Each team must weigh typed error propagation against the two-kingdoms tax.",
    background: "white",
  },
  {
    index: 30,
    type: "content",
    act: "act2",
    title: "The Learning Ladder",
    content: {
      _tag: "bullets",
      items: [
        { text: "Day 1: ok, err, match — that's it" },
        { text: "Week 1: fromPromise, mapErr, andThen" },
        { text: "Month 1: safeTry, allSettled, createError" },
        { text: "You don't need 20 functions to start", emphasis: true },
      ],
    },
    presenterNotes:
      "FAQ: 'Day 1 in a mature codebase means encountering fromPromise, andThen, mapErr, safeTry.' True. The learning ladder assumes onboarding, not greenfield. Provide a team style guide listing your chosen ~8 method subset and pair new developers on their first Result PRs.",
    background: "light",
  },

  // New slides: Honest assessment (slides 31-34)
  {
    index: 31,
    type: "content",
    act: "act2",
    title: "The Honest Cost/Benefit",
    content: {
      _tag: "bullets",
      items: [
        {
          text: "Costs: learning curve (~8 core methods), two error systems, third-party wrapping, migration virality, ~5KB bundle",
        },
        {
          text: "Benefits: typed errors in return position, automatic error union composition, exhaustive handling, standardized patterns",
        },
        {
          text: "Native discriminated unions provide typed errors at zero cost — Result adds standardization and composition",
        },
        {
          text: "Choose deliberately: high-value in I/O-heavy domain logic, low-value in thin controller layers",
          emphasis: true,
        },
      ],
    },
    presenterNotes:
      "This is the honest picture. Result is not free. Every team must decide whether typed error propagation justifies the boundary translation tax, the learning investment, and the two-kingdoms reality. For I/O-heavy domain logic with complex error hierarchies, the payoff is high. For thin controller layers over framework code, the payoff may not justify the cost. Choose deliberately.",
    background: "light",
  },
  {
    index: 32,
    type: "code",
    act: "act2",
    title: "Result Anti-Patterns",
    content: {
      _tag: "code",
      content: {
        code: `// The Silent Swallower Returns
const user = result.unwrapOr(null); // Same as .catch(() => null)
// Fix: match() to handle the error meaningfully

// The expect() Time Bomb
const data = result.expect("must exist"); // Runtime panic if Err
// Fix: match() or isOk() checks. Reserve expect() for tests.

// The Untyped Wrapper
fromPromise(fetch(url), (e) => e); // error is still unknown!
// Fix: Map to tagged error: (e) => NetworkError({ cause: String(e) })

// The Nested Match Pyramid
result1.match(
  (a) => result2.match(
    (b) => result3.match(
      (c) => use(a, b, c),  // Callback pyramid reborn
      handleErr),
    handleErr),
  handleErr);
// Fix: Use andThen() chaining or safeTry generators`,
        language: "typescript",
        filename: "anti-patterns.ts",
        annotations: [
          { line: 2, text: "Same as .catch(() => null) -- Slide 3 in disguise", type: "error" },
          {
            line: 6,
            text: "Runtime panic -- non-null assertion with better message",
            type: "error",
          },
          { line: 10, text: "Defeats the entire purpose -- error is still unknown", type: "error" },
          { line: 14, text: "Callback pyramid reborn -- use andThen or safeTry", type: "error" },
        ],
      },
    },
    presenterNotes:
      "Result gives you new ways to write bad code. These are the patterns to watch for in code review. unwrapOr(null) is the exact anti-pattern from our opening slides wearing a new hat. expect() is a non-null assertion. Untyped wrappers defeat the purpose. And nested match() recreates callback hell.",
    background: "white",
  },
  {
    index: 33,
    type: "split",
    act: "act2",
    title: "The Fair Comparison",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "fair-comparison",
        before: fairComparison.before,
        after: fairComparison.after,
      },
    },
    presenterNotes:
      "The fair comparison is Good Native vs Result — not Bad Native vs Result. Good native discriminated unions ARE typed. The Result version offers: (1) standardized shape — no inventing GetUserResult per function, (2) automatic error union composition when chaining operations, (3) less boundary boilerplate. Whether that's worth the dependency is a judgment call.",
    background: "white",
  },
  {
    index: 34,
    type: "split",
    act: "act2",
    title: "The Composition Argument",
    content: {
      _tag: "comparison",
      content: {
        exampleId: "composition",
        before: compositionExample.before,
        after: compositionExample.after,
      },
    },
    presenterNotes:
      "This is where Result earns its keep. One operation? Native discriminated unions are equivalent. Three operations? You're manually threading error types and early-return boilerplate. Ten operations across a service layer? Result's automatic composition prevents real mistakes — forgetting an error variant in the manual union, or returning incompatible shapes.",
    background: "white",
  },

  // ========== ACT 3: The Vision (slides 35-42) ==========
  {
    index: 35,
    type: "title",
    act: "act3",
    title: "Result Doesn't Live Alone",
    subtitle: "The HexDI Ecosystem",
    presenterNotes: "Transition into Act 3. Result is one piece of a larger picture.",
    background: "dark",
  },
  {
    index: 36,
    type: "diagram",
    act: "act3",
    title: "The Self-Aware Application",
    content: { _tag: "diagram", diagramId: "ecosystem" },
    presenterNotes:
      "HexDI package map. Core at center, libraries in ring. Hover to see relationships.",
    background: "white",
  },
  {
    index: 37,
    type: "code",
    act: "act3",
    title: "Result + Container",
    content: {
      _tag: "code",
      content: {
        code: `import { port, createAdapter, SINGLETON } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

const UserServicePort = port<UserService>()({ name: "UserService" });

const userServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [DatabasePort, LoggerPort],
  lifetime: SINGLETON,
  factory: (db, logger) => new UserServiceImpl(db, logger),
});

// Wire, resolve, and handle errors -- all typed
const graph = GraphBuilder.create()
  .provide(databaseAdapter)
  .provide(loggerAdapter)
  .provide(userServiceAdapter)
  .build();
const container = createContainer({ graph, name: "App" });
const result = container.tryResolve(UserServicePort);
result.match(
  (service) => service.getUser("123"),
  (error) => console.error(\`Resolution failed: \${error.message}\`)
);`,
        language: "typescript",
        filename: "container-setup.ts",
      },
    },
    presenterNotes: "container.tryResolve(port) returning Result<T, ResolutionError>. Real API.",
    background: "white",
  },
  {
    index: 38,
    type: "content",
    act: "act3",
    title: "The Live Demo",
    content: {
      _tag: "text",
      body: "This presentation itself uses every HexDI library. Core, Graph, Runtime, and React wire the DI container. Result handles every error boundary. Flow drives the navigation state machine. Store manages theme state. Query loads code examples with caching. Logger and Tracing record your journey. The app you're watching IS the demo.",
    },
    presenterNotes:
      "Meta moment. The app they're watching IS the demo. All 10 HexDI packages are genuinely integrated: core, graph, runtime, react, result, flow, store, query, logger, tracing.",
    background: "light",
  },
  {
    index: 39,
    type: "content",
    act: "act3",
    title: "Ports and Adapters",
    content: {
      _tag: "bullets",
      items: [
        { text: "Ports declare what your app needs" },
        { text: "Adapters provide how it works" },
        { text: "The container wires them together" },
        { text: "Result connects every boundary", emphasis: true },
      ],
    },
    presenterNotes:
      "Brief hexagonal architecture intro. Result as the glue between ports and adapters.",
    background: "light",
  },
  {
    index: 40,
    type: "content",
    act: "act3",
    title: "The Migration Path",
    content: {
      _tag: "bullets",
      items: [
        { text: "Phase 1: API client layer (highest leverage)" },
        { text: "Phase 2: Service layer with safeTry" },
        { text: "Phase 3: Controller/UI boundary mapping" },
        { text: "Phase 4: Utility functions" },
      ],
    },
    presenterNotes:
      "Realistic, incremental. No big bang rewrite. Start where the impact is highest. FAQ: 'Migration is viral and irreversible.' Viral: yes, like any return type change. Irreversible: no — match() or unwrapOr() at any point converts back to native. Any move from throw-based to typed-return-based error handling is equally viral, whether you use Result or hand-rolled discriminated unions.",
    background: "light",
  },
  {
    index: 41,
    type: "impact",
    act: "act3",
    title: "What Changes",
    subtitle:
      "New developers read the type, not the code.\nThe compiler catches forgotten errors.\nEvery team writes the same patterns.",
    presenterNotes:
      "Compound impact. Onboarding, refactoring safety, cross-team consistency. FAQ: 'Bundle size?' Core Result is ~5KB gzipped, tree-shakable, zero dependencies. FAQ: 'Performance?' Each ok()/err() allocates one object. Negligible for I/O-bound app code. For CPU-hot inner loops (>10k iterations/sec), use native patterns at that boundary. FAQ: 'No stack traces with err()?' Include context in error fields. If you need stack traces: add stack: new Error().stack to createError fields.",
    background: "dark",
  },
  {
    index: 42,
    type: "title",
    act: "act3",
    title: "Let's Build Better Software",
    subtitle: "github.com/hex-di",
    presenterNotes:
      "Closing. Clear next step: try Result on one function today. Share the repo link.",
    background: "dark",
  },
];
