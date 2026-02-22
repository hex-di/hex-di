# 14 — Benchmark Suite

Performance measurement and validation for `@hex-di/result`. The benchmark suite proves that the library's runtime overhead is acceptable for production use.

See [ADR-013](../decisions/013-performance-strategy.md) for the strategic context.

## BEH-14-001: Tooling

| Tool | Purpose |
|------|---------|
| [Vitest Bench](https://vitest.dev/guide/features.html#benchmarking) | Micro-benchmarks via `bench()` API (built on Tinybench) |
| `process.memoryUsage()` | Heap measurement for memory benchmarks |
| `node --expose-gc` | Forced GC for accurate memory measurement |

Vitest Bench is chosen over standalone Benchmark.js or Tinybench because:
- Already a project dependency (Vitest is the test runner)
- Integrated reporting with `vitest bench`
- Same file patterns and config as tests

## BEH-14-002: Benchmark Categories

### 1. Construction

Measures the cost of creating `Result` instances.

```ts
// bench/construction.bench.ts

describe("construction", () => {
  bench("ok(value)", () => {
    ok(42);
  });

  bench("err(error)", () => {
    err("fail");
  });

  bench("plain object (baseline)", () => {
    ({ _tag: "Ok" as const, value: 42 });
  });

  bench("Object.freeze plain object", () => {
    Object.freeze({ _tag: "Ok" as const, value: 42 });
  });

  bench("class instance (comparison)", () => {
    new OkBaseline(42);
  });
});
```

**Target**: `ok(value)` within **3x** of plain object creation.

**Rationale**: The factory does more work (closure allocation, brand stamping, freeze). 3x is acceptable because construction cost is amortized across the methods called on the instance.

### 2. Method Chains

Measures chaining throughput — the most common usage pattern.

```ts
// bench/chaining.bench.ts

const source = ok(1);

describe("method chains", () => {
  bench("map (single)", () => {
    source.map((x) => x + 1);
  });

  bench("map → map → map (3-chain)", () => {
    source
      .map((x) => x + 1)
      .map((x) => x * 2)
      .map((x) => String(x));
  });

  bench("map → andThen → match (mixed 3-chain)", () => {
    source
      .map((x) => x + 1)
      .andThen((x) => (x > 0 ? ok(x) : err("negative")))
      .match(
        (v) => v,
        (_e) => 0,
      );
  });

  bench("map → andThen → match (Err path)", () => {
    err("fail")
      .map((x: number) => x + 1)
      .andThen((x) => ok(x))
      .match(
        (v) => v,
        (_e) => 0,
      );
  });

  bench("plain functions (baseline)", () => {
    const a = 1 + 1;
    const b = a * 2;
    String(b);
  });
});
```

**Target**: 3-chain within **2x** of equivalent plain function calls.

**Rationale**: Each chain step creates a new `Result`. The overhead is construction + closure invocation. 2x accounts for this while proving the abstraction cost is bounded.

### 3. Combinators

Measures bulk operations on collections of Results.

```ts
// bench/combinators.bench.ts

const results100 = Array.from({ length: 100 }, (_, i) => ok(i));
const results1000 = Array.from({ length: 1000 }, (_, i) => ok(i));
const mixed1000 = Array.from({ length: 1000 }, (_, i) =>
  i % 10 === 0 ? err(`error-${i}`) : ok(i),
);

describe("combinators", () => {
  bench("all (100 Ok)", () => {
    all(results100);
  });

  bench("all (1000 Ok)", () => {
    all(results1000);
  });

  bench("all (1000 mixed, early Err)", () => {
    all(mixed1000);
  });

  bench("allSettled (1000 mixed)", () => {
    allSettled(mixed1000);
  });

  bench("partition (1000 mixed)", () => {
    partition(mixed1000);
  });

  bench("forEach (1000 items)", () => {
    forEach(
      Array.from({ length: 1000 }, (_, i) => i),
      (i) => ok(i * 2),
    );
  });

  bench("manual loop (baseline)", () => {
    const arr = [];
    for (let i = 0; i < 1000; i++) {
      arr.push(i * 2);
    }
  });
});
```

**Target**: Combinators within **1.5x** of equivalent manual loops.

**Rationale**: Combinators iterate and construct Results. The overhead should be marginal compared to the iteration itself.

### 4. Type Guards

Measures guard check throughput.

```ts
// bench/guards.bench.ts

const okVal = ok(42);
const errVal = err("fail");
const plain = { _tag: "Ok", value: 42 };

describe("guards", () => {
  bench("isResult(ok)", () => {
    isResult(okVal);
  });

  bench("isResult(plain object)", () => {
    isResult(plain);
  });

  bench("isResult(null)", () => {
    isResult(null);
  });

  bench("isOk() instance method", () => {
    okVal.isOk();
  });

  bench("_tag check (baseline)", () => {
    (okVal as any)._tag === "Ok";
  });

  bench("instanceof (comparison)", () => {
    okVal instanceof Object;
  });
});
```

**Target**: `isResult()` brand check within **2x** of a plain property check.

**Rationale**: `Symbol in object` is a fast operation in V8. Should be near-parity with string property checks.

### 5. Memory

Measures per-instance heap cost.

```ts
// bench/memory.bench.ts

function measureHeap(factory: () => unknown, count: number): number {
  globalThis.gc!(); // requires --expose-gc
  const before = process.memoryUsage().heapUsed;
  const arr = Array.from({ length: count }, factory);
  globalThis.gc!();
  const after = process.memoryUsage().heapUsed;
  void arr; // prevent GC of array
  return (after - before) / count;
}

describe("memory per instance", () => {
  const COUNT = 100_000;

  bench("ok(i) bytes", () => {
    measureHeap((_, i) => ok(i), COUNT);
  });

  bench("plain object bytes (baseline)", () => {
    measureHeap((_, i) => ({ _tag: "Ok", value: i }), COUNT);
  });

  bench("class instance bytes (comparison)", () => {
    measureHeap((_, i) => new OkBaseline(i), COUNT);
  });

  bench("frozen plain object bytes", () => {
    measureHeap(
      (_, i) => Object.freeze({ _tag: "Ok", value: i }),
      COUNT,
    );
  });
});
```

**Target**: `ok(value)` within **4x** memory of a plain object.

**Rationale**: With ~30 closures per instance, the current architecture uses significantly more memory. 4x is the acceptable ceiling — if exceeded, the selective prototype optimization from ADR-013 is triggered.

### 6. Extraction

Measures the cost of getting values out of Results.

```ts
// bench/extraction.bench.ts

const okVal = ok(42);
const errVal = err("fail");

describe("extraction", () => {
  bench("match (Ok)", () => {
    okVal.match(
      (v) => v,
      (_e) => 0,
    );
  });

  bench("match (Err)", () => {
    errVal.match(
      (v) => v,
      (_e) => 0,
    );
  });

  bench("unwrapOr (Ok)", () => {
    okVal.unwrapOr(0);
  });

  bench("unwrapOr (Err)", () => {
    errVal.unwrapOr(0);
  });

  bench("toNullable (Ok)", () => {
    okVal.toNullable();
  });

  bench("intoTuple (Ok)", () => {
    okVal.intoTuple();
  });

  bench("direct property access (baseline)", () => {
    (okVal as any).value;
  });
});
```

**Target**: `match()` within **1.5x** of direct property access.

**Rationale**: Extraction methods are thin — they invoke a callback or return a value. Overhead should be minimal.

### 7. Real-World Scenarios

Measures end-to-end overhead in realistic patterns.

```ts
// bench/real-world.bench.ts

// Simulated service calls (sync, to isolate Result overhead from I/O)
function parseInput(raw: string): Result<number, "parse_error"> {
  const n = Number(raw);
  return Number.isNaN(n) ? err("parse_error") : ok(n);
}

function validate(n: number): Result<number, "validation_error"> {
  return n > 0 && n < 1000 ? ok(n) : err("validation_error");
}

function transform(n: number): Result<string, "transform_error"> {
  return ok(String(n * 2));
}

describe("real-world pipelines", () => {
  bench("3-step pipeline (Result)", () => {
    parseInput("42")
      .andThen(validate)
      .andThen(transform)
      .unwrapOr("fallback");
  });

  bench("3-step pipeline (try/catch baseline)", () => {
    try {
      const n = Number("42");
      if (Number.isNaN(n)) throw new Error("parse");
      if (!(n > 0 && n < 1000)) throw new Error("validate");
      String(n * 2);
    } catch {
      "fallback";
    }
  });

  bench("validation pipeline (10 fields)", () => {
    const fields = Array.from({ length: 10 }, (_, i) => String(i + 1));
    all(fields.map((f) => parseInput(f).andThen(validate)));
  });

  bench("validation pipeline (10 fields, try/catch baseline)", () => {
    const fields = Array.from({ length: 10 }, (_, i) => String(i + 1));
    const results = [];
    for (const f of fields) {
      const n = Number(f);
      if (Number.isNaN(n)) throw new Error("parse");
      if (!(n > 0 && n < 1000)) throw new Error("validate");
      results.push(n);
    }
  });

  bench("error path (Err propagation through 5 steps)", () => {
    err("initial")
      .andThen((x: number) => ok(x + 1))
      .andThen((x) => ok(x * 2))
      .andThen((x) => ok(String(x)))
      .andThen((x) => ok(x.length))
      .unwrapOr(0);
  });

  bench("safeTry (3 steps)", () => {
    safeTry(function* () {
      const a = yield* parseInput("42");
      const b = yield* validate(a);
      const c = yield* transform(b);
      return ok(c);
    });
  });
});
```

**Target**: End-to-end Result pipeline within **5% overhead** vs equivalent try/catch.

**Rationale**: In real applications, I/O dominates latency. The Result abstraction overhead should be negligible in context. The 5% target applies to CPU-bound pipeline cost, not total application latency (where I/O makes the difference vanishingly small).

### 8. Async

Measures `ResultAsync` overhead vs raw Promise chains.

```ts
// bench/async.bench.ts

function asyncService(n: number): ResultAsync<number, string> {
  return ResultAsync.fromPromise(
    Promise.resolve(n * 2),
    () => "service_error",
  );
}

describe("async", () => {
  bench("ResultAsync.fromPromise", async () => {
    await ResultAsync.fromPromise(
      Promise.resolve(42),
      () => "error",
    );
  });

  bench("raw Promise (baseline)", async () => {
    await Promise.resolve(42);
  });

  bench("ResultAsync 3-chain", async () => {
    await asyncService(1)
      .map((x) => x + 1)
      .andThen((x) => asyncService(x));
  });

  bench("Promise 3-chain (baseline)", async () => {
    await Promise.resolve(1)
      .then((x) => x * 2)
      .then((x) => x + 1)
      .then((x) => Promise.resolve(x * 2));
  });
});
```

**Target**: `ResultAsync` chain within **1.5x** of equivalent Promise chain.

**Rationale**: `ResultAsync` wraps a single Promise internally. The overhead is the Result construction inside the `.then()` callbacks — should be small relative to the microtask scheduling cost.

## BEH-14-003: Target Summary

| Category | Metric | Target | Trigger for Optimization |
|----------|--------|--------|--------------------------|
| Construction | `ok(v)` vs plain object | <3x | >3x → selective prototype |
| Chaining | 3-chain vs plain functions | <2x | >2x → selective prototype |
| Combinators | `all(1000)` vs manual loop | <1.5x | >2x → investigate allocator |
| Guards | `isResult()` vs property check | <2x | >3x → cache symbol lookup |
| Memory | bytes per `ok(v)` vs plain object | <4x | >4x → selective prototype |
| Extraction | `match()` vs property access | <1.5x | >2x → inline extraction |
| Real-world | pipeline vs try/catch | <5% overhead | >10% → selective prototype |
| Async | `ResultAsync` chain vs Promise chain | <1.5x | >2x → investigate wrapping |

## BEH-14-004: Comparison Targets

Every benchmark runs against these baselines:

| Baseline | What it represents |
|----------|--------------------|
| Plain object `{ _tag, value }` | Zero-overhead structural Result |
| `Object.freeze({ _tag, value })` | Cost of freeze without methods |
| Class instance `new OkImpl(v)` | Prototype-shared methods |
| try/catch | Language-native error handling |
| neverthrow `ok(v)` | Closest competitor (class-based) |
| option-t `createOk(v)` | Minimal competitor (plain object, no methods) |

## BEH-14-005: File Structure

```
bench/
├── construction.bench.ts
├── chaining.bench.ts
├── combinators.bench.ts
├── guards.bench.ts
├── memory.bench.ts
├── extraction.bench.ts
├── real-world.bench.ts
├── async.bench.ts
├── baselines/
│   ├── class-impl.ts          # OkBaseline class for comparison
│   ├── plain-object.ts        # Plain object factories
│   └── try-catch.ts           # try/catch equivalents
└── utils/
    └── measure-heap.ts        # Memory measurement helper
```

## BEH-14-006: CI Integration

- Benchmarks run on: **ubuntu-latest, Node 22** (single environment for consistency)
- Benchmarks run on: **every push to `main`** and **weekly schedule**
- Benchmarks do **not** run on PRs (noisy CI environments produce unreliable numbers)
- Results are stored as CI artifacts (JSON format from `vitest bench --reporter=json`)
- A benchmark regression check compares against the previous `main` run:
  - **>20% regression** on any micro-benchmark → warning comment on the commit
  - **>50% regression** → CI failure

Benchmark results are **not** published to npm. They are available in the repository's CI artifacts and optionally on the documentation site.

## BEH-14-007: Reporting

`vitest bench` outputs a table with ops/sec, margin of error, and relative ranking per group. Example output:

```
 ✓ bench/construction.bench.ts
   construction
     name                           hz       min       max      mean      p75      p99
     · ok(value)              8,234,567    0.0001    0.0003    0.0001   0.0001   0.0002
     · plain object          24,567,890    0.0000    0.0001    0.0000   0.0000   0.0001
     · Object.freeze plain   12,345,678    0.0001    0.0002    0.0001   0.0001   0.0001
     · class instance        18,901,234    0.0000    0.0002    0.0001   0.0001   0.0001

     Fastest: plain object
     Slowest: ok(value)
     Ratio:   ok(value) is 2.98x slower than plain object ✅ (target: <3x)
```

## BEH-14-008: Decision Triggers

After running the full benchmark suite:

| Outcome | Action |
|---------|--------|
| All targets pass | Ship with current closure architecture. Publish results as performance proof. Score: **9/10**. |
| Construction or memory fails, chaining passes | Apply selective prototype ([ADR-013](../decisions/013-performance-strategy.md) Part 2). Re-run. |
| Multiple categories fail | Re-evaluate closure-over-classes architecture. Consider full prototype migration as a new ADR. |
| Real-world <5% regardless of micro-benchmarks | Ship as-is. Micro-benchmark regressions are acceptable if end-to-end overhead is negligible. |
