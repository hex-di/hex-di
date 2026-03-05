# 10 — Contract Validation at Binding

Runtime interface conformance checks when an adapter binds to a port, with blame-aware error attribution when contracts are violated. See [RES-06](../../../research/RES-06-contracts-blame-gradual-typing.md).

## BEH-CO-10-001: Runtime Interface Conformance Check

When an adapter factory produces a service instance, the container verifies that the instance structurally conforms to the port's expected interface before injection. Conformance is checked by enumerating expected members and validating their presence and type category.

```ts
interface ConformanceCheckResult {
  readonly conforms: boolean;
  readonly violations: ReadonlyArray<ContractViolation>;
}

interface ContractViolation {
  readonly _tag: "MissingMethod" | "TypeMismatch" | "MissingProperty";
  readonly memberName: string;
  readonly expected: string; // human-readable type description
  readonly actual: string; // human-readable type description
}

function checkConformance<T>(instance: unknown, portSpec: PortSpec<T>): ConformanceCheckResult;
```

**Exported from**: `contracts/conformance.ts` (proposed).

**Algorithm**:

1. Retrieve the port specification (method/property descriptors registered at port creation)
2. For each expected member in the port spec:
   a. Check if the member exists on the instance (`memberName in instance`)
   b. If missing, record a `MissingMethod` or `MissingProperty` violation
   c. If present, check the type category (`typeof instance[memberName]`)
   d. If the type category does not match (e.g., expected `function`, got `string`), record a `TypeMismatch` violation
3. Collect all violations into a `ConformanceCheckResult`
4. If `violations.length > 0`, `conforms` is `false`
5. `Object.freeze()` the result and all violation objects

**Behavior Table**:

| Instance                                     | Port Spec                                       | `conforms` | Violations                                                                                |
| -------------------------------------------- | ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `{ query: (sql) => [...], close: () => {} }` | `Database { query: Function, close: Function }` | `true`     | `[]`                                                                                      |
| `{ query: (sql) => [...] }`                  | `Database { query: Function, close: Function }` | `false`    | `[{ _tag: "MissingMethod", memberName: "close", ... }]`                                   |
| `{ query: "not a function" }`                | `Database { query: Function }`                  | `false`    | `[{ _tag: "TypeMismatch", memberName: "query", expected: "function", actual: "string" }]` |
| `{}`                                         | `Database { query: Function, close: Function }` | `false`    | Two `MissingMethod` violations                                                            |

**Example**:

```ts
import { port, createAdapter, SINGLETON, ok } from "@hex-di/core";

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
  validate(email: string): boolean;
}

const EmailPort = port<EmailService>()({
  name: "Email",
  direction: "outbound",
});

// Adapter with incomplete implementation
const brokenEmailAdapter = createAdapter({
  provides: [EmailPort],
  factory: () =>
    ok({
      send: async (to: string, subject: string, body: string) => {},
      // Missing: validate method
    }),
  lifetime: SINGLETON,
});

// At binding time, conformance check detects the violation:
// ConformanceCheckResult {
//   conforms: false,
//   violations: [{
//     _tag: "MissingMethod",
//     memberName: "validate",
//     expected: "function",
//     actual: "undefined"
//   }]
// }
```

**Design notes**:

- Runtime checks complement TypeScript's compile-time structural typing. They catch mismatches that occur when the graph is assembled dynamically (e.g., adapters loaded from plugins or configuration).
- Conformance checking is shallow — it validates member presence and type category (`typeof`), not full function signature arity or return types. Deep checking would require runtime type reflection beyond what JavaScript provides natively.
- Port specs are derived from the port's type parameter at registration time using a schema descriptor (not TypeScript reflection, which is erased at runtime).
- Cross-ref: [BEH-CO-05-001](05-frozen-port-references.md) (frozen services), [INV-CO-7](../invariants.md#inv-co-7-factory-errors-flow-through-result).

## BEH-CO-10-002: Method Signature Compatibility Verification

Beyond presence checking, the contract validator performs arity verification on function members and optionally validates return type categories using probe invocations in dev mode.

```ts
interface SignatureCheck {
  readonly memberName: string;
  readonly expectedArity: number;
  readonly actualArity: number;
  readonly arityMatch: boolean;
}

interface PortMethodSpec {
  readonly name: string;
  readonly arity: number;
  readonly isAsync: boolean;
  readonly returnTypeHint?: "void" | "promise" | "result" | "value";
}

function checkSignatures(
  instance: Record<string, unknown>,
  methodSpecs: ReadonlyArray<PortMethodSpec>
): ReadonlyArray<SignatureCheck>;
```

**Exported from**: `contracts/signatures.ts` (proposed).

**Algorithm**:

1. For each method spec in the port's method descriptors:
   a. Access the corresponding member on the instance
   b. If the member is a function, compare `fn.length` (formal parameter count) to `expectedArity`
   c. Record whether the arity matches
   d. If `returnTypeHint` is `"promise"` and dev mode is enabled, invoke with safe sentinel arguments and check `result instanceof Promise`
   e. If `returnTypeHint` is `"result"` and dev mode is enabled, invoke and check for `_tag` property (`"Ok"` or `"Err"`)
2. Return the array of `SignatureCheck` results
3. Arity mismatches are warnings (not errors) since JavaScript functions can accept variable arguments

**Behavior Table**:

| Instance Method                              | Port Spec                         | Arity Match | Notes                                 |
| -------------------------------------------- | --------------------------------- | ----------- | ------------------------------------- |
| `send(to, subject, body) {}` (length: 3)     | `{ name: "send", arity: 3 }`      | `true`      | Exact match                           |
| `send(to, ...rest) {}` (length: 1)           | `{ name: "send", arity: 3 }`      | `false`     | Rest params reduce `fn.length`        |
| `send(to, subject, body, cc) {}` (length: 4) | `{ name: "send", arity: 3 }`      | `false`     | Extra parameter                       |
| Arrow function `(a, b) => {}` (length: 2)    | `{ name: "calculate", arity: 2 }` | `true`      | Arrow functions report correct length |

**Example**:

```ts
import { port, createAdapter, SINGLETON, ok } from "@hex-di/core";

interface Calculator {
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
}

const CalcPort = port<Calculator>()({
  name: "Calculator",
  direction: "outbound",
  // Method specs registered via port schema descriptor
});

const adapter = createAdapter({
  provides: [CalcPort],
  factory: () =>
    ok({
      add: (a: number, b: number) => a + b,
      subtract: (a: number) => -a, // Wrong arity — expects 2 params
    }),
  lifetime: SINGLETON,
});

// Signature check result:
// [
//   { memberName: "add", expectedArity: 2, actualArity: 2, arityMatch: true },
//   { memberName: "subtract", expectedArity: 2, actualArity: 1, arityMatch: false }
// ]
```

**Design notes**:

- Arity checking uses `Function.prototype.length`, which reflects the number of formal parameters before the first one with a default value or rest parameter. This is a known limitation.
- Probe invocations (dev mode only) are inherently unsafe and are opt-in via container configuration. They use `undefined` sentinels and catch all thrown errors.
- Inspired by Findler & Felleisen (2002) — higher-order contract monitoring. The function's arity is the first-order component; return type probing approximates the higher-order component.
- Cross-ref: [BEH-CO-10-001](#beh-co-10-001-runtime-interface-conformance-check), [BEH-CO-06-001](06-blame-aware-errors.md).

## BEH-CO-10-003: Contract Violation Error with Blame Context

When a conformance or signature check fails, a `ContractViolationError` is raised carrying full blame context: which adapter violated which port contract, the specific violations, and the resolution path.

```ts
interface ContractViolationError {
  readonly _tag: "ContractViolationError";
  readonly blame: BlameContext;
  readonly violations: ReadonlyArray<ContractViolation>;
  readonly portName: string;
  readonly adapterName: string;
}

// BlameContext.violationType for contract failures:
type ContractBlame = {
  readonly _tag: "ContractViolation";
  readonly details: string;
  readonly violations: ReadonlyArray<ContractViolation>;
};
```

**Exported from**: `contracts/errors.ts` (proposed).

**Algorithm**:

1. After `checkConformance` returns `conforms: false`, construct a `ContractViolationError`
2. Populate the `blame` field using the current resolution context:
   a. `adapterFactory` from the adapter being bound
   b. `portContract` from the port being resolved
   c. `violationType` with `_tag: "ContractViolation"` and the violation details
   d. `resolutionPath` from the current resolution stack
3. Format a human-readable `details` string summarizing all violations
4. `Object.freeze()` the entire error object
5. Return as `Err(contractViolationError)` through the `Result` channel

**Behavior Table**:

| Violation Count               | Error `details`                                                      | Blame Attribution      |
| ----------------------------- | -------------------------------------------------------------------- | ---------------------- |
| 1 missing method              | `"Missing method 'close' on adapter for port 'Database'"`            | Adapter factory blamed |
| 2 violations                  | `"2 contract violations: missing 'close', type mismatch on 'query'"` | Adapter factory blamed |
| Arity mismatch (warning mode) | No error raised; warning logged                                      | N/A (advisory only)    |
| Arity mismatch (strict mode)  | `"Arity mismatch on 'send': expected 3, got 1"`                      | Adapter factory blamed |

**Example**:

```ts
import { buildContainer, GraphBuilder, port, createAdapter, SINGLETON, ok } from "@hex-di/core";

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  clear(): void;
}

const CachePort = port<Cache>()({
  name: "Cache",
  direction: "outbound",
});

// Adapter missing 'clear' method
const incompleteCache = createAdapter({
  provides: [CachePort],
  factory: () => ok({ get: (k: string) => null, set: (k: string, v: unknown) => {} }),
  lifetime: SINGLETON,
});

// Resolution produces a ContractViolationError:
// {
//   _tag: "ContractViolationError",
//   portName: "Cache",
//   adapterName: "incompleteCache",
//   violations: [{ _tag: "MissingMethod", memberName: "clear", expected: "function", actual: "undefined" }],
//   blame: {
//     adapterFactory: { name: "incompleteCache" },
//     portContract: { name: "Cache", direction: "outbound" },
//     violationType: {
//       _tag: "ContractViolation",
//       details: "Missing method 'clear' on adapter for port 'Cache'",
//       violations: [...]
//     },
//     resolutionPath: ["AppRoot", "Cache"]
//   }
// }
```

**Design notes**:

- Follows the blame theorem from Ahmed et al. (2011): if the port types check at compile time, runtime failures are attributed to the adapter (the dynamic boundary), not to the service consuming the port.
- `ContractViolationError` integrates with the existing `BlameContext` system ([BEH-CO-06-001](06-blame-aware-errors.md)). The `_tag: "ContractViolation"` variant on `BlameViolationType` was already reserved for this purpose.
- Error objects are frozen per [INV-CO-6](../invariants.md#inv-co-6-error-objects-are-frozen).
- Strict mode (arity mismatches as errors) is opt-in via container configuration. Default is warning mode.
- Cross-ref: [INV-CO-3](../invariants.md#inv-co-3-blame-context-on-all-errors), [BEH-CO-06](06-blame-aware-errors.md).
