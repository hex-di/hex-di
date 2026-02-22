/**
 * HTTP method definitions and classification types.
 * @packageDocumentation
 */

export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

/** Methods that MUST NOT have a request body (RFC 9110 §9.3.1, §9.3.2) */
export type BodylessMethod = "GET" | "HEAD" | "OPTIONS";

/** Methods that conventionally carry a request body */
export type BodyMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/** Methods considered safe (no side effects on the server) */
export type SafeMethod = "GET" | "HEAD" | "OPTIONS";

/** Methods considered idempotent (repeated calls produce the same result) */
export type IdempotentMethod = "GET" | "HEAD" | "PUT" | "DELETE" | "OPTIONS";

const HTTP_METHODS: ReadonlyArray<HttpMethod> = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const HTTP_METHODS_SET: ReadonlySet<string> = new Set(HTTP_METHODS);

export function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === "string" && HTTP_METHODS_SET.has(value);
}

export function isBodylessMethod(method: HttpMethod): method is BodylessMethod {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function isBodyMethod(method: HttpMethod): method is BodyMethod {
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

export function isSafeMethod(method: HttpMethod): method is SafeMethod {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function isIdempotentMethod(method: HttpMethod): method is IdempotentMethod {
  return (
    method === "GET" ||
    method === "HEAD" ||
    method === "PUT" ||
    method === "DELETE" ||
    method === "OPTIONS"
  );
}
