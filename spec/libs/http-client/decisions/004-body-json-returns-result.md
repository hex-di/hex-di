# ADR-HC-004: bodyJson Returns Result Rather Than Throwing

## Status

Accepted

## Context

Setting a JSON request body requires calling `JSON.stringify()`, which can throw a `TypeError` for:
- Circular references in the value
- `BigInt` values (without a custom replacer)
- Non-serializable objects (functions, Symbols in certain positions)

Most HTTP libraries either (a) throw synchronously from a body-setting method, or (b) defer the error to the `send` call and wrap it in a network error. Both approaches lose type information: the caller cannot distinguish a serialization failure from a network failure.

For `@hex-di/http-client`, body construction happens **before** the request is sent. If `bodyJson` follows the never-throw contract (ADR-HC-003), the error must be surfaced in the `Result` type. The alternative — making `bodyJson` a throwing function — would break the combinator composition model and require `try/catch` around request construction.

## Decision

`bodyJson` returns `(req: HttpRequest) => Result<HttpRequest, HttpBodyError>` rather than `(req: HttpRequest) => HttpRequest`:

```typescript
function bodyJson(value: unknown): (req: HttpRequest) => Result<HttpRequest, HttpBodyError> {
  return (req) => {
    try {
      const json = JSON.stringify(value);
      return Result.ok(
        Object.freeze({
          ...req,
          body: { _tag: "JsonBody", json },
          headers: Object.freeze({
            ...req.headers,
            "content-type": "application/json",
          }),
        })
      );
    } catch (err) {
      return Result.err(
        httpBodyError("JsonSerialize", `Failed to serialize request body as JSON: ${String(err)}`, err)
      );
    }
  };
}
```

This integrates naturally with the `Result` chain:

```typescript
const response = pipe(
  HttpRequest.post("https://api.example.com/users"),
  HttpRequest.bearerToken("tok_abc"),
  HttpRequest.bodyJson({ name: "Alice" })  // Result<HttpRequest, HttpBodyError>
).asyncAndThen(req => http.execute(req));  // ResultAsync<HttpResponse, HttpRequestError | HttpBodyError>
```

All other body combinators (`bodyText`, `bodyUint8Array`, `bodyUrlEncoded`, `bodyFormData`, `bodyStream`) cannot fail and return `HttpRequest` directly.

## Consequences

**Positive**:
- Serialization failures are typed as `HttpBodyError` and flow through the `Result` chain without interrupting the composition.
- The full error type of a request-to-response pipeline is: `HttpBodyError | HttpRequestError | HttpResponseError` — all visible in the type signature.
- `JSON.stringify` errors are never swallowed or silently ignored.

**Negative**:
- `bodyJson` has a different return type from all other body combinators. Callers building conditional request pipelines must handle the asymmetry.
- Pattern matching on `Result` is required even before sending the request.

**Trade-off accepted**: The type asymmetry is intentional and surfaced explicitly. Developers who encounter `Result<HttpRequest, HttpBodyError>` will investigate rather than ignoring a potential serialization failure.

**Affected invariants**: [INV-HC-7](../invariants.md#inv-hc-7-never-throw-contract)

**Affected spec sections**: [§13](../03-http-request.md#13-body-combinators)
