# @hex-di/http-client — Invariants

Runtime guarantees enforced by the implementation. These invariants are the anchor for the traceability chain: each connects to FMEA failure modes in [risk-assessment.md](./risk-assessment.md), DoD verification items in [17-definition-of-done.md](./17-definition-of-done.md), and specific test files.

## Document Control

| Field | Value |
|-------|-------|
| Document ID | SPEC-HTTP-INV-001 |
| Version | Derived from Git — `git log -1 --format="%H %ai" -- spec/libs/http-client/invariants.md` |
| Author | Derived from Git — `git log --format="%an" -1 -- spec/libs/http-client/invariants.md` |
| Approval Evidence | PR merge to `main` |
| Status | Effective |

---

## INV-HC-1: Request Immutability

Every `HttpRequest` instance is frozen with `Object.freeze()` immediately after construction before any reference escapes. Combinator functions (e.g., `setRequestHeader`, `prependUrl`, `bodyJson`) return a **new** frozen request; the original is never mutated.

**Source**: `src/request/request.ts` — `Object.freeze()` called on the object literal before return in every constructor and combinator.

**Implication**: Consumers can safely share `HttpRequest` instances across concurrent calls, across combinator chains, and across logging/tracing pipelines without defensive copying. A request captured at one point in the pipeline is guaranteed to be identical at any later point.

**Related**: [§9, §10–§14](./03-http-request.md), [ADR-HC-002](./decisions/002-frozen-value-objects.md), [FM-1](./risk-assessment.md#fm-1-request-mutation-after-construction).

---

## INV-HC-2: Response Body Caching

Each body accessor (`json`, `text`, `arrayBuffer`, `blob`, `formData`) on `HttpResponse` is a lazy `ResultAsync` that reads the underlying body stream **once** on first access. Subsequent invocations of the **same** accessor return the cached `Result` without re-reading the stream.

**Source**: `src/response/response.ts` — accessor implementations cache the settled `ResultAsync` behind a `let` slot initialized to `undefined`.

**Implication**: Callers may invoke `response.json` any number of times without side effects beyond the first call. The `ResultAsync` is idempotent after the first resolution.

**Related**: [§15, §16](./04-http-response.md), [ADR-HC-005](./decisions/005-lazy-body-accessors.md), [FM-2](./risk-assessment.md#fm-2-body-double-read-data-loss).

---

## INV-HC-3: Body Single-Consumption Boundary

Once any body accessor has consumed the underlying stream, calling a **different** accessor returns `Err(HttpResponseError)` with `reason: "BodyAlreadyConsumed"`. The same accessor still returns the cached result (INV-HC-2). The raw `stream` accessor is excluded from caching — it is a one-shot `ReadableStream`.

**Source**: `src/response/response.ts` — each accessor sets a shared `consumed` flag; subsequent different-accessor calls short-circuit to `Err(bodyAlreadyConsumed(...))`.

**Implication**: Callers must decide which body format to use before consuming it. Once consumed, the body cannot be re-read in a different format. This is a platform constraint (HTTP response bodies are streams) surfaced as an explicit error rather than a silent corruption.

**Related**: [§15, §16](./04-http-response.md), [ADR-HC-005](./decisions/005-lazy-body-accessors.md), [FM-3](./risk-assessment.md#fm-3-body-already-consumed-silent-failure).

---

## INV-HC-4: Error Object Immutability

All error constructor functions (`httpRequestError`, `httpResponseError`, `httpBodyError`) call `Object.freeze()` on the fully-populated error object **before** returning it and before any reference to the mutable object escapes.

**Source**: `src/errors/errors.ts` — construction follows the populate-freeze-return 3-step sequence. No intermediate variable is stored or passed before freeze.

**Implication**: Error objects captured in audit trail entries, history stores, or logging pipelines are guaranteed to be identical to what was produced at failure time. Downstream handlers cannot alter `reason`, `message`, `cause`, or `request` fields after the fact.

**Related**: [§23](./05-error-types.md), [ADR-HC-006](./decisions/006-error-freeze-for-alcoa.md), [FM-4](./risk-assessment.md#fm-4-error-mutation-post-construction).

---

## INV-HC-5: Error Populate-Freeze-Return Ordering

Error construction follows an exact 3-step sequence with zero mutation window:

1. **Populate** — all fields are assigned in a single object literal expression.
2. **Freeze** — `Object.freeze()` is called on the fully-populated object immediately.
3. **Return** — the frozen object is returned to the caller.

No intermediate reference to the mutable object may be stored, yielded, or passed to a callback between steps 1 and 2.

**Source**: `src/errors/errors.ts` — enforced by code structure (single-expression object literal passed directly to `Object.freeze()`).

**Implication**: Concurrent construction of errors produces independent frozen instances with no shared mutable state. The mutation window between construction and freezing is eliminated.

**Related**: [§23](./05-error-types.md), [ADR-HC-006](./decisions/006-error-freeze-for-alcoa.md), [FM-5](./risk-assessment.md#fm-5-zero-mutation-window-violation), `tests/unit/error-freezing.test.ts` (EF-001 – EF-005, defense-in-depth unit tests).

---

## INV-HC-6: Error Discriminant Exhaustiveness

All `HttpClientError` variants carry a `_tag` field with a unique literal string value:
- `HttpRequestError._tag === "HttpRequestError"`
- `HttpResponseError._tag === "HttpResponseError"`
- `HttpBodyError._tag === "HttpBodyError"`

The union `HttpClientError = HttpRequestError | HttpResponseError | HttpBodyError` is exhaustive — no other variants exist at runtime.

**Source**: `src/errors/types.ts` — each interface declares `readonly _tag` as a literal type. The union is sealed.

**Implication**: TypeScript `switch` statements on `error._tag` receive exhaustiveness checking. Runtime `if` chains can safely assume the `else` branch is unreachable after handling all three tags.

**Related**: [§19](./05-error-types.md), [FM-6](./risk-assessment.md#fm-6-unhandled-error-tag).

---

## INV-HC-7: Never-Throw Contract

`HttpClient.execute` and all convenience methods (`get`, `post`, `put`, `patch`, `del`, `head`) return `ResultAsync<HttpResponse, HttpRequestError>` and **never throw** — synchronously or asynchronously — under any input. All errors, including platform exceptions, are caught and wrapped in `Err(HttpRequestError)`.

**Source**: `src/client/client.ts` — transport adapter calls are wrapped in `ResultAsync.fromPromise(...)` which captures promise rejections. Synchronous exceptions from request construction are caught in the adapter's `execute` implementation.

**Implication**: Callers never need `try/catch` around HTTP calls. The full error space is encoded in the `Result` type and visible to TypeScript at compile time.

**Related**: [§25](./06-http-client-port.md), [ADR-HC-003](./decisions/003-result-only-error-channel.md), [FM-7](./risk-assessment.md#fm-7-unexpected-throw).

---

## INV-HC-8: Response Request Back-Reference

Every `HttpResponse` instance carries a `request` field containing the originating `HttpRequest`. The back-reference is set by the transport adapter at response construction time and is never `undefined`.

**Source**: `src/response/response.ts` — `HttpResponse` interface declares `readonly request: HttpRequest`. Transport adapters set it when constructing the response.

**Implication**: Error context (in `HttpResponseError`) always includes the request that triggered it. Logging and audit pipelines can emit both `req.method`, `req.url` and `res.status` from a single error object.

**Related**: [§15](./04-http-response.md), [§20](./05-error-types.md), [ADR-HC-008](./decisions/008-request-back-reference-on-response.md), [FM-8](./risk-assessment.md#fm-8-missing-request-context-in-errors).

---

## INV-HC-9: Combinator Composition Order Determinism

Client combinators execute in the order they are composed via `pipe()`. Request transformations (e.g., `baseUrl`, `bearerAuth`) apply top-to-bottom before the request is sent. Response transformations (e.g., `filterStatusOk`, `retryTransient`) apply bottom-to-top as the response returns. This order is deterministic and not influenced by runtime state.

**Source**: `src/combinators/combinators.ts` — each combinator returns a new `HttpClient` that delegates to the previous one, forming a call stack whose order is fixed at composition time.

**Implication**: The execution order of combinators is visible in the source code and does not depend on registration order, priority values, or any other implicit mechanism. Developers can reason about combinator behavior by reading the `pipe()` call top-to-bottom.

**Related**: [§29](./07-client-combinators.md), [ADR-HC-001](./decisions/001-combinator-over-middleware.md), [FM-9](./risk-assessment.md#fm-9-undefined-combinator-execution-order).

---

## INV-HC-10: Header Key Case-Normalization

Header keys are stored and compared in lowercase. All `createHeaders`, `setHeader`, `appendHeader`, `removeHeader`, and `getHeader` operations normalize keys to lowercase. Header lookup is therefore case-insensitive: `"Content-Type"`, `"content-type"`, and `"CONTENT-TYPE"` resolve to the same entry.

**Source**: `src/types/headers.ts` — `createHeaders` lowercases all input keys; `setHeader`, `appendHeader`, `removeHeader`, and `getHeader` lowercase the key before access.

**Implication**: Consumers and transport adapters can use any casing convention when reading or writing headers without risk of missed lookups or duplicate keys with different casing.

**Related**: [§7](./02-core-types.md), tests CT-001, CT-004, CT-006, [FM-10](./risk-assessment.md#fm-10-header-case-collision).
