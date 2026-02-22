import { describe, it, expect } from "vitest";
import {
  get,
  post,
  setRequestHeader,
  setRequestHeaders,
  appendRequestHeader,
  removeRequestHeader,
  bearerToken,
  basicAuth,
  acceptJson,
  contentType,
  prependUrl,
  appendUrl,
  setUrlParams,
  bodyJson,
  bodyText,
  withTimeout,
  withSignal,
  accept,
  bodyUint8Array,
  bodyUrlEncoded,
  appendUrlParams,
  setUrlParam,
} from "../../src/request/http-request.js";

describe("HttpRequest combinators", () => {
  // ---------------------------------------------------------------------------
  // Header combinators
  // ---------------------------------------------------------------------------

  describe("setRequestHeader()", () => {
    it("adds a header to the request", () => {
      const req = setRequestHeader("x-request-id", "abc123")(get("https://api.example.com"));
      expect(req.headers.entries["x-request-id"]).toBe("abc123");
    });

    it("normalizes header keys to lowercase", () => {
      const req = setRequestHeader("X-Request-ID", "abc")(get("https://api.example.com"));
      expect(req.headers.entries["x-request-id"]).toBe("abc");
    });

    it("overwrites an existing header with the same key", () => {
      const base = setRequestHeader("x-custom", "first")(get("https://api.example.com"));
      const req = setRequestHeader("x-custom", "second")(base);
      expect(req.headers.entries["x-custom"]).toBe("second");
    });

    it("returns a new frozen instance", () => {
      const original = get("https://api.example.com");
      const updated = setRequestHeader("x-foo", "bar")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
    });

    it("does not mutate the original request", () => {
      const original = get("https://api.example.com");
      setRequestHeader("x-foo", "bar")(original);
      expect(original.headers.entries["x-foo"]).toBeUndefined();
    });
  });

  describe("setRequestHeaders()", () => {
    it("merges multiple headers at once", () => {
      const req = setRequestHeaders({ "x-a": "1", "x-b": "2" })(get("https://api.example.com"));
      expect(req.headers.entries["x-a"]).toBe("1");
      expect(req.headers.entries["x-b"]).toBe("2");
    });

    it("normalizes keys to lowercase", () => {
      const req = setRequestHeaders({ "Content-Type": "application/json" })(
        get("https://api.example.com"),
      );
      expect(req.headers.entries["content-type"]).toBe("application/json");
    });

    it("returns a new frozen instance leaving the original unchanged", () => {
      const original = get("https://api.example.com");
      const updated = setRequestHeaders({ "x-foo": "bar" })(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.headers.entries["x-foo"]).toBeUndefined();
    });
  });

  describe("appendRequestHeader()", () => {
    it("sets the header when it does not exist", () => {
      const req = appendRequestHeader("accept", "text/html")(get("https://api.example.com"));
      expect(req.headers.entries["accept"]).toBe("text/html");
    });

    it("appends to an existing header with comma-space separator", () => {
      const base = setRequestHeader("accept", "text/html")(get("https://api.example.com"));
      const req = appendRequestHeader("accept", "application/json")(base);
      expect(req.headers.entries["accept"]).toBe("text/html, application/json");
    });

    it("returns a new frozen instance leaving the original unchanged", () => {
      const original = setRequestHeader("accept", "text/html")(get("https://api.example.com"));
      const updated = appendRequestHeader("accept", "application/json")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.headers.entries["accept"]).toBe("text/html");
    });
  });

  describe("removeRequestHeader()", () => {
    it("removes an existing header", () => {
      const base = setRequestHeader("x-remove-me", "yes")(get("https://api.example.com"));
      const req = removeRequestHeader("x-remove-me")(base);
      expect(req.headers.entries["x-remove-me"]).toBeUndefined();
    });

    it("is a no-op when header does not exist", () => {
      const original = get("https://api.example.com");
      const req = removeRequestHeader("x-nonexistent")(original);
      expect(req.headers.entries["x-nonexistent"]).toBeUndefined();
    });

    it("returns a new frozen instance leaving the original unchanged", () => {
      const original = setRequestHeader("x-token", "secret")(get("https://api.example.com"));
      const updated = removeRequestHeader("x-token")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.headers.entries["x-token"]).toBe("secret");
    });
  });

  describe("bearerToken()", () => {
    it("sets the Authorization header with Bearer scheme", () => {
      const req = bearerToken("my-secret-token")(get("https://api.example.com"));
      expect(req.headers.entries["authorization"]).toBe("Bearer my-secret-token");
    });

    it("returns a new frozen instance", () => {
      const original = get("https://api.example.com");
      const updated = bearerToken("tok")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
    });
  });

  describe("basicAuth()", () => {
    it("sets the Authorization header with Basic scheme (base64)", () => {
      const req = basicAuth("alice", "s3cret")(get("https://api.example.com"));
      const expected = `Basic ${btoa("alice:s3cret")}`;
      expect(req.headers.entries["authorization"]).toBe(expected);
    });

    it("handles empty password", () => {
      const req = basicAuth("user", "")(get("https://api.example.com"));
      const expected = `Basic ${btoa("user:")}`;
      expect(req.headers.entries["authorization"]).toBe(expected);
    });

    it("returns a new frozen instance", () => {
      const original = get("https://api.example.com");
      const updated = basicAuth("u", "p")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
    });
  });

  describe("acceptJson()", () => {
    it("sets Accept: application/json", () => {
      const req = acceptJson(get("https://api.example.com"));
      expect(req.headers.entries["accept"]).toBe("application/json");
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = get("https://api.example.com");
      const updated = acceptJson(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.headers.entries["accept"]).toBeUndefined();
    });
  });

  describe("accept()", () => {
    it("sets the Accept header to the given media type", () => {
      const req = accept("text/html")(get("https://api.example.com"));
      expect(req.headers.entries["accept"]).toBe("text/html");
    });
  });

  describe("contentType()", () => {
    it("sets the Content-Type header", () => {
      const req = contentType("application/json")(post("https://api.example.com/data"));
      expect(req.headers.entries["content-type"]).toBe("application/json");
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = post("https://api.example.com/data");
      const updated = contentType("text/plain")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.headers.entries["content-type"]).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // URL combinators
  // ---------------------------------------------------------------------------

  describe("prependUrl()", () => {
    it("prepends the base URL to a path", () => {
      const req = prependUrl("https://api.example.com")({ ...get("/users"), url: "/users" });
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("strips trailing slash from base before joining", () => {
      const base = get("/users");
      const req = prependUrl("https://api.example.com/")(base);
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("adds a leading slash to path when missing", () => {
      const req = prependUrl("https://api.example.com")({ ...get("users"), url: "users" });
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = get("/users");
      const updated = prependUrl("https://api.example.com")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
    });
  });

  describe("appendUrl()", () => {
    it("appends a path segment", () => {
      const base = get("https://api.example.com/users");
      const req = appendUrl("/123")(base);
      expect(req.url).toBe("https://api.example.com/users/123");
    });

    it("strips trailing slash from base before joining", () => {
      const base = { ...get("https://api.example.com/users/"), url: "https://api.example.com/users/" };
      const req = appendUrl("/123")(base);
      expect(req.url).toBe("https://api.example.com/users/123");
    });

    it("adds a leading slash to segment when missing", () => {
      const base = get("https://api.example.com/users");
      const req = appendUrl("123")(base);
      expect(req.url).toBe("https://api.example.com/users/123");
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = get("https://api.example.com/users");
      const updated = appendUrl("/123")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.url).toBe("https://api.example.com/users");
    });
  });

  describe("setUrlParams()", () => {
    it("replaces urlParams with the given params object", () => {
      const req = setUrlParams({ page: "2", limit: "20" })(get("https://api.example.com/items"));
      const paramMap = Object.fromEntries(req.urlParams.entries);
      expect(paramMap["page"]).toBe("2");
      expect(paramMap["limit"]).toBe("20");
    });

    it("replaces urlParams with the given tuple array", () => {
      const req = setUrlParams([["sort", "asc"]])(get("https://api.example.com/items"));
      expect(req.urlParams.entries).toContainEqual(["sort", "asc"]);
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = get("https://api.example.com/items");
      const updated = setUrlParams({ q: "hello" })(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.urlParams.entries).toEqual([]);
    });
  });

  describe("appendUrlParams()", () => {
    it("appends additional params to existing ones", () => {
      const base = setUrlParams({ page: "1" })(get("https://api.example.com/items"));
      const req = appendUrlParams({ sort: "asc" })(base);
      const keys = req.urlParams.entries.map(([k]) => k);
      expect(keys).toContain("page");
      expect(keys).toContain("sort");
    });
  });

  describe("setUrlParam()", () => {
    it("sets a single url param (replacing existing value)", () => {
      const base = setUrlParams({ page: "1" })(get("https://api.example.com/items"));
      const req = setUrlParam("page", 2)(base);
      const values = req.urlParams.entries.filter(([k]) => k === "page").map(([, v]) => v);
      expect(values).toEqual(["2"]);
    });
  });

  // ---------------------------------------------------------------------------
  // Body combinators
  // ---------------------------------------------------------------------------

  describe("bodyText()", () => {
    it("sets a TextBody with the given text", () => {
      const req = bodyText("hello world")(post("https://api.example.com/echo"));
      expect(req.body._tag).toBe("TextBody");
      if (req.body._tag === "TextBody") {
        expect(req.body.value).toBe("hello world");
      }
    });

    it("uses default content-type text/plain when not specified", () => {
      const req = bodyText("data")(post("https://api.example.com/echo"));
      if (req.body._tag === "TextBody") {
        expect(req.body.contentType).toContain("text/plain");
      }
    });

    it("uses the provided content-type", () => {
      const req = bodyText("<root/>", "application/xml")(post("https://api.example.com/echo"));
      if (req.body._tag === "TextBody") {
        expect(req.body.contentType).toBe("application/xml");
      }
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = post("https://api.example.com/echo");
      const updated = bodyText("hi")(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.body._tag).toBe("EmptyBody");
    });
  });

  describe("bodyJson()", () => {
    it("returns Ok with a JsonBody request on valid data", () => {
      const result = bodyJson({ name: "Alice", age: 30 })(post("https://api.example.com/users"));
      expect(result.isOk()).toBe(true);
      const req = result.expect("should be ok");
      expect(req.body._tag).toBe("JsonBody");
    });

    it("sets Content-Type: application/json automatically", () => {
      const result = bodyJson({ key: "value" })(post("https://api.example.com/data"));
      const req = result.expect("should be ok");
      expect(req.headers.entries["content-type"]).toBe("application/json");
    });

    it("preserves the serialized data in the body", () => {
      const payload = { items: [1, 2, 3], meta: { total: 3 } };
      const result = bodyJson(payload)(post("https://api.example.com/batch"));
      const req = result.expect("should be ok");
      if (req.body._tag === "JsonBody") {
        expect(req.body.value).toEqual(payload);
      }
    });

    it("returns Err with HttpBodyError when JSON.stringify throws", () => {
      const circular: Record<string, unknown> = {};
      circular["self"] = circular;
      const result = bodyJson(circular)(post("https://api.example.com/data"));
      expect(result.isErr()).toBe(true);
      const bodyErr = result.expectErr("should be err");
      expect(bodyErr._tag).toBe("HttpBodyError");
      expect(bodyErr.reason).toBe("JsonSerialize");
    });

    it("returns a new frozen instance leaving original unchanged on success", () => {
      const original = post("https://api.example.com/data");
      const result = bodyJson({ x: 1 })(original);
      const updated = result.expect("should be ok");
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.body._tag).toBe("EmptyBody");
    });
  });

  describe("bodyUint8Array()", () => {
    it("sets a Uint8ArrayBody", () => {
      const bytes = new Uint8Array([1, 2, 3]);
      const req = bodyUint8Array(bytes)(post("https://api.example.com/upload"));
      expect(req.body._tag).toBe("Uint8ArrayBody");
    });

    it("returns a new frozen instance", () => {
      const bytes = new Uint8Array([0xff]);
      const original = post("https://api.example.com/upload");
      const updated = bodyUint8Array(bytes)(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
    });
  });

  describe("bodyUrlEncoded()", () => {
    it("sets a UrlEncodedBody and Content-Type header", () => {
      const req = bodyUrlEncoded({ username: "alice", password: "pw" })(
        post("https://api.example.com/login"),
      );
      expect(req.body._tag).toBe("UrlEncodedBody");
      expect(req.headers.entries["content-type"]).toBe("application/x-www-form-urlencoded");
    });
  });

  // ---------------------------------------------------------------------------
  // Signal & timeout combinators
  // ---------------------------------------------------------------------------

  describe("withTimeout()", () => {
    it("sets the timeoutMs field", () => {
      const req = withTimeout(5000)(get("https://api.example.com"));
      expect(req.timeoutMs).toBe(5000);
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const original = get("https://api.example.com");
      const updated = withTimeout(3000)(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.timeoutMs).toBeUndefined();
    });
  });

  describe("withSignal()", () => {
    it("sets the signal field", () => {
      const controller = new AbortController();
      const req = withSignal(controller.signal)(get("https://api.example.com"));
      expect(req.signal).toBe(controller.signal);
    });

    it("returns a new frozen instance leaving original unchanged", () => {
      const controller = new AbortController();
      const original = get("https://api.example.com");
      const updated = withSignal(controller.signal)(original);
      expect(updated).not.toBe(original);
      expect(Object.isFrozen(updated)).toBe(true);
      expect(original.signal).toBeUndefined();
    });
  });
});
