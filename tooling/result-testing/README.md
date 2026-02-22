# @hex-di/result-testing

Testing utilities for [`@hex-di/result`](https://www.npmjs.com/package/@hex-di/result). Custom Vitest matchers, type-narrowing assertions, test factories, and GxP integrity helpers.

## Install

```bash
npm install -D @hex-di/result-testing
```

**Peer dependency**: `vitest >= 4.0.0`

## Quick Start

Register matchers in your Vitest setup file:

```ts
// vitest.setup.ts
import { setupResultMatchers } from "@hex-di/result-testing";

setupResultMatchers();
```

```ts
// vitest.config.ts
export default defineProject({
  test: {
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Then use them in tests:

```ts
import { ok, err, some, none } from "@hex-di/result";

test("Result matchers", () => {
  expect(ok(42)).toBeOk();
  expect(ok(42)).toBeOk(42);
  expect(ok(42)).toBeOkWith(42);

  expect(err("fail")).toBeErr();
  expect(err("fail")).toBeErr("fail");
  expect(err("fail")).toBeErrWith("fail");

  expect(ok(42)).toContainOk(42);    // strict ===
  expect(err("x")).toContainErr("x"); // strict ===
});

test("Option matchers", () => {
  expect(some(42)).toBeSome();
  expect(some(42)).toBeSome(42);
  expect(none()).toBeNone();
});
```

## API

### Custom Matchers

| Matcher | Description |
|---------|-------------|
| `.toBeOk(expected?)` | Assert Result is Ok. Optionally deep-equals the value. |
| `.toBeErr(expected?)` | Assert Result is Err. Optionally deep-equals the error. |
| `.toBeOkWith(expected)` | Assert Result is Ok with exact value (required arg). |
| `.toBeErrWith(expected)` | Assert Result is Err with exact error (required arg). |
| `.toBeSome(expected?)` | Assert Option is Some. Optionally deep-equals the value. |
| `.toBeNone()` | Assert Option is None. |
| `.toContainOk(value)` | Assert Ok with strict `===` via `Result.contains()`. |
| `.toContainErr(error)` | Assert Err with strict `===` via `Result.containsErr()`. |

All matchers validate input structure and provide clear error messages. `.not` negation works correctly.

### Assertion Helpers

Type-narrowing assertion functions that throw on failure and return the unwrapped value with the correct type:

```ts
import { expectOk, expectErr, expectOkAsync, expectErrAsync, expectSome, expectNone } from "@hex-di/result-testing";

test("type-narrowing assertions", () => {
  const value = expectOk(ok(42));   // value: number
  const error = expectErr(err("x")); // error: string
  const some = expectSome(some(42)); // some: number
  expectNone(none());                // void (throws if Some)
});

test("async assertions", async () => {
  const value = await expectOkAsync(ResultAsync.ok(42));   // number
  const error = await expectErrAsync(ResultAsync.err("x")); // string
});
```

### Test Factories

Reduce boilerplate when creating test data:

```ts
import { createResultFixture, createOptionFixture, mockResultAsync } from "@hex-di/result-testing";

// Result fixture with defaults
const userFixture = createResultFixture({ id: "1", name: "Alice" });

userFixture.ok();                // Ok({ id: "1", name: "Alice" })
userFixture.ok({ name: "Bob" }); // Ok({ name: "Bob" })
userFixture.err("not found");    // Err("not found")
userFixture.okAsync();           // ResultAsync resolving to Ok
userFixture.errAsync("fail");    // ResultAsync resolving to Err

// Option fixture
const configFixture = createOptionFixture({ timeout: 3000 });
configFixture.some();                // Some({ timeout: 3000 })
configFixture.some({ timeout: 0 });  // Some({ timeout: 0 })
configFixture.none();                // None

// Deferred ResultAsync for controlling resolution timing
const mock = mockResultAsync<string, Error>();
// mock.resultAsync is a pending ResultAsync
mock.resolve("hello");  // resolves to Ok("hello")
// or: mock.reject(new Error("fail"));  // resolves to Err(Error)
```

### GxP Integrity Helpers

For validating structural invariants required by `@hex-di/result`:

```ts
import {
  expectFrozen,
  expectResultBrand,
  expectOptionBrand,
  expectImmutableResult,
  expectNeverRejects,
} from "@hex-di/result-testing";

test("immutability", () => {
  expectFrozen(ok(42));             // Object.isFrozen check
  expectResultBrand(ok(42));        // RESULT_BRAND symbol check
  expectOptionBrand(some(42));      // OPTION_BRAND symbol check
  expectImmutableResult(ok(42));    // Compound: frozen + branded + valid _tag + field check
});

test("ResultAsync never rejects", async () => {
  await expectNeverRejects(ResultAsync.ok(42));   // passes
  await expectNeverRejects(ResultAsync.err("x")); // passes (Err is a value, not rejection)
});
```

## Subpath Exports

```ts
import { setupResultMatchers } from "@hex-di/result-testing";            // Main (all exports)
import { setupResultMatchers } from "@hex-di/result-testing/matchers";   // Matchers only
import { expectOk, expectErr } from "@hex-di/result-testing/assertions"; // Assertions only
import { createResultFixture } from "@hex-di/result-testing/factories";  // Factories only
import { expectFrozen } from "@hex-di/result-testing/gxp";              // GxP helpers only
```

## TypeScript Plugin

For compile-time and editor-time static analysis of `@hex-di/result` usage patterns, add [`@hex-di/result-typescript-plugin`](https://www.npmjs.com/package/@hex-di/result-typescript-plugin):

```bash
npm install -D @hex-di/result-typescript-plugin
```

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@hex-di/result-typescript-plugin",
        "unsafeImportGating": {
          "allowPatterns": ["**/tests/**", "**/*.test.ts"]
        }
      }
    ]
  }
}
```

The plugin warns on discarded `Result` values, flags unsafe imports outside test files, detects incomplete `match()` handlers, suggests idiomatic patterns, and provides 9 quick-fix code actions. See the [plugin README](https://www.npmjs.com/package/@hex-di/result-typescript-plugin) for full configuration.

## Related Packages

| Package | Description |
|---------|-------------|
| [`@hex-di/result`](https://www.npmjs.com/package/@hex-di/result) | Core Result and Option types |
| [`@hex-di/result-react`](https://www.npmjs.com/package/@hex-di/result-react) | React hooks, components, and adapters |
| [`@hex-di/result-typescript-plugin`](https://www.npmjs.com/package/@hex-di/result-typescript-plugin) | TypeScript plugin for static analysis |

## License

MIT
