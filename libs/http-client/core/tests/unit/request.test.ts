import { describe, it, expect } from "vitest";
import {
  get,
  post,
  put,
  patch,
  del,
  head,
  options,
  request,
} from "../../src/request/http-request.js";

describe("HttpRequest constructors", () => {
  describe("get()", () => {
    it("produces method=GET and the given URL", () => {
      const req = get("https://api.example.com/users");
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("has empty headers by default", () => {
      const req = get("https://api.example.com/users");
      expect(req.headers.entries).toEqual({});
    });

    it("has empty urlParams by default", () => {
      const req = get("https://api.example.com/users");
      expect(req.urlParams.entries).toEqual([]);
    });

    it("has EmptyBody by default", () => {
      const req = get("https://api.example.com/users");
      expect(req.body._tag).toBe("EmptyBody");
    });

    it("is a frozen object", () => {
      const req = get("https://api.example.com/users");
      expect(Object.isFrozen(req)).toBe(true);
    });

    it("has signal=undefined by default", () => {
      const req = get("https://api.example.com/users");
      expect(req.signal).toBeUndefined();
    });

    it("has timeoutMs=undefined by default", () => {
      const req = get("https://api.example.com/users");
      expect(req.timeoutMs).toBeUndefined();
    });

    it("accepts a URL object", () => {
      const url = new URL("https://api.example.com/users");
      const req = get(url);
      expect(req.method).toBe("GET");
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("strips query string from url and populates urlParams", () => {
      const req = get("https://api.example.com/users?page=2&limit=10");
      expect(req.url).toBe("https://api.example.com/users");
      const entries = req.urlParams.entries;
      expect(entries).toContainEqual(["page", "2"]);
      expect(entries).toContainEqual(["limit", "10"]);
    });
  });

  describe("post()", () => {
    it("produces method=POST", () => {
      const req = post("https://api.example.com/users");
      expect(req.method).toBe("POST");
    });

    it("is a frozen object", () => {
      const req = post("https://api.example.com/users");
      expect(Object.isFrozen(req)).toBe(true);
    });

    it("has EmptyBody by default", () => {
      const req = post("https://api.example.com/users");
      expect(req.body._tag).toBe("EmptyBody");
    });
  });

  describe("put()", () => {
    it("produces method=PUT", () => {
      const req = put("https://api.example.com/users/1");
      expect(req.method).toBe("PUT");
      expect(req.url).toBe("https://api.example.com/users/1");
    });

    it("is a frozen object", () => {
      expect(Object.isFrozen(put("https://api.example.com/users/1"))).toBe(true);
    });
  });

  describe("patch()", () => {
    it("produces method=PATCH", () => {
      const req = patch("https://api.example.com/users/1");
      expect(req.method).toBe("PATCH");
    });

    it("is a frozen object", () => {
      expect(Object.isFrozen(patch("https://api.example.com/users/1"))).toBe(true);
    });
  });

  describe("del()", () => {
    it("produces method=DELETE", () => {
      const req = del("https://api.example.com/users/1");
      expect(req.method).toBe("DELETE");
      expect(req.url).toBe("https://api.example.com/users/1");
    });

    it("is a frozen object", () => {
      expect(Object.isFrozen(del("https://api.example.com/users/1"))).toBe(true);
    });
  });

  describe("head()", () => {
    it("produces method=HEAD", () => {
      const req = head("https://api.example.com/users");
      expect(req.method).toBe("HEAD");
    });

    it("is a frozen object", () => {
      expect(Object.isFrozen(head("https://api.example.com/users"))).toBe(true);
    });
  });

  describe("options()", () => {
    it("produces method=OPTIONS", () => {
      const req = options("https://api.example.com/resource");
      expect(req.method).toBe("OPTIONS");
      expect(req.url).toBe("https://api.example.com/resource");
    });

    it("is a frozen object", () => {
      expect(Object.isFrozen(options("https://api.example.com/resource"))).toBe(true);
    });
  });

  describe("request()", () => {
    it('constructs a request with the given method and URL', () => {
      const req = request("OPTIONS", "https://example.com/resource");
      expect(req.method).toBe("OPTIONS");
      expect(req.url).toBe("https://example.com/resource");
    });

    it("works with any HTTP method string", () => {
      const req = request("GET", "https://example.com/ping");
      expect(req.method).toBe("GET");
    });

    it("has empty headers, urlParams and EmptyBody by default", () => {
      const req = request("POST", "https://example.com/data");
      expect(req.headers.entries).toEqual({});
      expect(req.urlParams.entries).toEqual([]);
      expect(req.body._tag).toBe("EmptyBody");
    });

    it("is a frozen object", () => {
      const req = request("DELETE", "https://example.com/item/42");
      expect(Object.isFrozen(req)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Header combinators
// ---------------------------------------------------------------------------

import {
  setRequestHeader,
  setRequestHeaders,
  appendRequestHeader,
  removeRequestHeader,
  bearerToken,
  basicAuth,
  acceptJson,
  accept,
  contentType,
  requestMethodAndUrl,
} from "../../src/request/http-request.js";

describe("Header combinators", () => {
  describe("setRequestHeader()", () => {
    it("sets a header on the request", () => {
      const req = setRequestHeader("x-api-key", "secret")(get("https://api.example.com"));
      expect(req.headers.entries["x-api-key"]).toBe("secret");
    });

    it("normalises key to lowercase", () => {
      const req = setRequestHeader("Authorization", "Bearer tok")(get("https://api.example.com"));
      expect(req.headers.entries["authorization"]).toBe("Bearer tok");
    });

    it("returns a frozen object", () => {
      const req = setRequestHeader("x-foo", "bar")(get("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("setRequestHeaders()", () => {
    it("merges multiple headers at once", () => {
      const req = setRequestHeaders({ "x-a": "1", "x-b": "2" })(get("https://api.example.com"));
      expect(req.headers.entries["x-a"]).toBe("1");
      expect(req.headers.entries["x-b"]).toBe("2");
    });
  });

  describe("appendRequestHeader()", () => {
    it("sets the header when no existing value is present", () => {
      const req = appendRequestHeader("accept", "text/html")(get("https://api.example.com"));
      expect(req.headers.entries["accept"]).toBe("text/html");
    });

    it("concatenates with comma when header already exists", () => {
      const base = setRequestHeader("accept", "text/html")(get("https://api.example.com"));
      const req = appendRequestHeader("accept", "application/json")(base);
      expect(req.headers.entries["accept"]).toBe("text/html, application/json");
    });

    it("normalises key to lowercase when appending", () => {
      const base = setRequestHeader("accept", "text/plain")(get("https://api.example.com"));
      const req = appendRequestHeader("Accept", "text/html")(base);
      expect(req.headers.entries["accept"]).toBe("text/plain, text/html");
    });

    it("returns a frozen object", () => {
      const req = appendRequestHeader("x-foo", "bar")(get("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("removeRequestHeader()", () => {
    it("removes a header from the request", () => {
      const base = setRequestHeader("x-custom", "value")(get("https://api.example.com"));
      const req = removeRequestHeader("x-custom")(base);
      expect(req.headers.entries["x-custom"]).toBeUndefined();
    });

    it("normalises key to lowercase when removing", () => {
      const base = setRequestHeader("x-custom", "value")(get("https://api.example.com"));
      const req = removeRequestHeader("X-Custom")(base);
      expect(req.headers.entries["x-custom"]).toBeUndefined();
    });

    it("is a no-op when the header does not exist", () => {
      const base = get("https://api.example.com");
      const req = removeRequestHeader("x-missing")(base);
      expect(req.headers.entries).toEqual({});
    });

    it("leaves other headers intact", () => {
      const base = setRequestHeaders({ "x-a": "1", "x-b": "2" })(get("https://api.example.com"));
      const req = removeRequestHeader("x-a")(base);
      expect(req.headers.entries["x-b"]).toBe("2");
      expect(req.headers.entries["x-a"]).toBeUndefined();
    });

    it("returns a frozen object", () => {
      const req = removeRequestHeader("x-foo")(get("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("bearerToken()", () => {
    it("sets Authorization: Bearer <token>", () => {
      const req = bearerToken("my-token")(get("https://api.example.com"));
      expect(req.headers.entries["authorization"]).toBe("Bearer my-token");
    });
  });

  describe("basicAuth()", () => {
    it("sets Authorization: Basic <base64>", () => {
      const req = basicAuth("user", "pass")(get("https://api.example.com"));
      const expected = `Basic ${btoa("user:pass")}`;
      expect(req.headers.entries["authorization"]).toBe(expected);
    });
  });

  describe("acceptJson()", () => {
    it("sets accept: application/json", () => {
      const req = acceptJson(get("https://api.example.com"));
      expect(req.headers.entries["accept"]).toBe("application/json");
    });
  });

  describe("accept()", () => {
    it("sets the accept header to the given media type", () => {
      const req = accept("text/html")(get("https://api.example.com"));
      expect(req.headers.entries["accept"]).toBe("text/html");
    });
  });

  describe("contentType()", () => {
    it("sets the content-type header", () => {
      const req = contentType("application/xml")(get("https://api.example.com"));
      expect(req.headers.entries["content-type"]).toBe("application/xml");
    });
  });
});

// ---------------------------------------------------------------------------
// URL combinators
// ---------------------------------------------------------------------------

import {
  prependUrl,
  appendUrl,
  setUrlParam,
  setUrlParams,
  appendUrlParams,
} from "../../src/request/http-request.js";

describe("URL combinators", () => {
  describe("prependUrl()", () => {
    it("prepends a base URL to a relative path", () => {
      const req = prependUrl("https://api.example.com")(get("/users"));
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("handles trailing slash on base URL by removing it", () => {
      const req = prependUrl("https://api.example.com/")(get("/users"));
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("adds a leading slash to path when path has no leading slash", () => {
      const req = prependUrl("https://api.example.com")(get("users"));
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("handles trailing slash on base AND no leading slash on path", () => {
      const req = prependUrl("https://api.example.com/")(get("users"));
      expect(req.url).toBe("https://api.example.com/users");
    });

    it("returns a frozen object", () => {
      const req = prependUrl("https://api.example.com")(get("/ping"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("appendUrl()", () => {
    it("appends a path segment to the request URL", () => {
      const req = appendUrl("/details")(get("https://api.example.com/users"));
      expect(req.url).toBe("https://api.example.com/users/details");
    });

    it("adds leading slash to segment when absent", () => {
      const req = appendUrl("details")(get("https://api.example.com/users"));
      expect(req.url).toBe("https://api.example.com/users/details");
    });

    it("removes trailing slash from base before appending", () => {
      const req = appendUrl("/details")(get("https://api.example.com/users/"));
      expect(req.url).toBe("https://api.example.com/users/details");
    });

    it("returns a frozen object", () => {
      const req = appendUrl("/extra")(get("https://api.example.com/path"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("setUrlParam()", () => {
    it("sets a URL param when none exists", () => {
      const req = setUrlParam("page", 1)(get("https://api.example.com/users"));
      expect(req.urlParams.entries).toContainEqual(["page", "1"]);
    });

    it("replaces an existing param with the same key", () => {
      const base = setUrlParam("page", 1)(get("https://api.example.com/users"));
      const req = setUrlParam("page", 2)(base);
      const pageEntries = req.urlParams.entries.filter(([k]) => k === "page");
      expect(pageEntries).toHaveLength(1);
      expect(pageEntries[0]).toEqual(["page", "2"]);
    });

    it("filters out all previous values for the key then re-appends", () => {
      const base = get("https://api.example.com/users?tag=a&tag=b");
      const req = setUrlParam("tag", "c")(base);
      const tagEntries = req.urlParams.entries.filter(([k]) => k === "tag");
      expect(tagEntries).toHaveLength(1);
      expect(tagEntries[0]).toEqual(["tag", "c"]);
    });

    it("converts number value to string", () => {
      const req = setUrlParam("limit", 50)(get("https://api.example.com/items"));
      expect(req.urlParams.entries).toContainEqual(["limit", "50"]);
    });

    it("converts boolean value to string", () => {
      const req = setUrlParam("active", true)(get("https://api.example.com/items"));
      expect(req.urlParams.entries).toContainEqual(["active", "true"]);
    });
  });

  describe("setUrlParams()", () => {
    it("replaces all URL params with the new set", () => {
      const base = setUrlParam("old", "val")(get("https://api.example.com/items"));
      const req = setUrlParams({ page: "2", limit: "10" })(base);
      expect(req.urlParams.entries).toContainEqual(["page", "2"]);
      expect(req.urlParams.entries).toContainEqual(["limit", "10"]);
      expect(req.urlParams.entries.find(([k]) => k === "old")).toBeUndefined();
    });
  });

  describe("appendUrlParams()", () => {
    it("merges additional params with existing ones", () => {
      const base = setUrlParam("page", 1)(get("https://api.example.com/users"));
      const req = appendUrlParams({ limit: "10", sort: "asc" })(base);
      expect(req.urlParams.entries).toContainEqual(["page", "1"]);
      expect(req.urlParams.entries).toContainEqual(["limit", "10"]);
      expect(req.urlParams.entries).toContainEqual(["sort", "asc"]);
    });

    it("appends to empty params", () => {
      const req = appendUrlParams({ foo: "bar" })(get("https://api.example.com"));
      expect(req.urlParams.entries).toContainEqual(["foo", "bar"]);
    });

    it("supports multiple values for the same key (multi-value params)", () => {
      const req = appendUrlParams([["tag", "a"], ["tag", "b"]])(get("https://api.example.com"));
      const tags = req.urlParams.entries.filter(([k]) => k === "tag");
      expect(tags).toHaveLength(2);
      expect(tags).toContainEqual(["tag", "a"]);
      expect(tags).toContainEqual(["tag", "b"]);
    });
  });
});

// ---------------------------------------------------------------------------
// Body combinators
// ---------------------------------------------------------------------------

import {
  bodyText,
  bodyJson,
  bodyUint8Array,
  bodyFormData,
  bodyStream,
  bodyUrlEncoded,
} from "../../src/request/http-request.js";

describe("Body combinators", () => {
  describe("bodyText()", () => {
    it("sets a TextBody with the given text", () => {
      const req = bodyText("hello world")(post("https://api.example.com"));
      expect(req.body._tag).toBe("TextBody");
      if (req.body._tag === "TextBody") {
        expect(req.body.value).toBe("hello world");
      }
    });

    it("uses default content type text/plain; charset=utf-8", () => {
      const req = bodyText("data")(post("https://api.example.com"));
      if (req.body._tag === "TextBody") {
        expect(req.body.contentType).toBe("text/plain; charset=utf-8");
      }
    });

    it("uses custom content type when provided", () => {
      const req = bodyText("<xml/>", "application/xml")(post("https://api.example.com"));
      if (req.body._tag === "TextBody") {
        expect(req.body.contentType).toBe("application/xml");
      }
    });
  });

  describe("bodyJson()", () => {
    it("sets a JsonBody and content-type header for valid JSON", () => {
      const result = bodyJson({ id: 1, name: "Alice" })(post("https://api.example.com"));
      expect(result._tag).toBe("Ok");
      if (result._tag === "Ok") {
        expect(result.value.body._tag).toBe("JsonBody");
        expect(result.value.headers.entries["content-type"]).toBe("application/json");
      }
    });

    it("returns Err with reason JsonSerialize for non-serialisable values", () => {
      const circular: Record<string, unknown> = {};
      circular["self"] = circular;
      const result = bodyJson(circular)(post("https://api.example.com"));
      expect(result._tag).toBe("Err");
      if (result._tag === "Err") {
        expect(result.error.reason).toBe("JsonSerialize");
      }
    });
  });

  describe("bodyUint8Array()", () => {
    it("sets a Uint8ArrayBody with the given bytes", () => {
      const data = new TextEncoder().encode("binary");
      const req = bodyUint8Array(data)(post("https://api.example.com"));
      expect(req.body._tag).toBe("Uint8ArrayBody");
      if (req.body._tag === "Uint8ArrayBody") {
        expect(req.body.value).toBe(data);
      }
    });

    it("uses default content type application/octet-stream", () => {
      const data = new Uint8Array([1, 2, 3]);
      const req = bodyUint8Array(data)(post("https://api.example.com"));
      if (req.body._tag === "Uint8ArrayBody") {
        expect(req.body.contentType).toBe("application/octet-stream");
      }
    });

    it("uses custom content type when provided", () => {
      const data = new Uint8Array([0xff, 0xd8]);
      const req = bodyUint8Array(data, "image/jpeg")(post("https://api.example.com"));
      if (req.body._tag === "Uint8ArrayBody") {
        expect(req.body.contentType).toBe("image/jpeg");
      }
    });
  });

  describe("bodyFormData()", () => {
    it("sets a FormDataBody with the given FormData instance", () => {
      const fd = new FormData();
      fd.append("field", "value");
      const req = bodyFormData(fd)(post("https://api.example.com/upload"));
      expect(req.body._tag).toBe("FormDataBody");
      if (req.body._tag === "FormDataBody") {
        expect(req.body.value).toBe(fd);
        expect(req.body.value.get("field")).toBe("value");
      }
    });

    it("returns a frozen object", () => {
      const fd = new FormData();
      const req = bodyFormData(fd)(post("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("bodyStream()", () => {
    it("sets a StreamBody with the given ReadableStream", () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("chunk"));
          controller.close();
        },
      });
      const req = bodyStream(stream)(post("https://api.example.com/upload"));
      expect(req.body._tag).toBe("StreamBody");
      if (req.body._tag === "StreamBody") {
        expect(req.body.value).toBe(stream);
        expect(req.body.contentType).toBe("application/octet-stream");
        expect(req.body.contentLength).toBeUndefined();
      }
    });

    it("accepts custom contentType and contentLength options", () => {
      const stream = new ReadableStream<Uint8Array>({ start(c) { c.close(); } });
      const req = bodyStream(stream, { contentType: "video/mp4", contentLength: 1024 })(
        post("https://api.example.com/upload"),
      );
      if (req.body._tag === "StreamBody") {
        expect(req.body.contentType).toBe("video/mp4");
        expect(req.body.contentLength).toBe(1024);
      }
    });

    it("returns a frozen object", () => {
      const stream = new ReadableStream<Uint8Array>({ start(c) { c.close(); } });
      const req = bodyStream(stream)(post("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe("bodyUrlEncoded()", () => {
    it("sets a UrlEncodedBody and content-type header", () => {
      const req = bodyUrlEncoded({ username: "alice", password: "secret" })(
        post("https://api.example.com/login"),
      );
      expect(req.body._tag).toBe("UrlEncodedBody");
      expect(req.headers.entries["content-type"]).toBe("application/x-www-form-urlencoded");
    });

    it("encodes params correctly in the body", () => {
      const req = bodyUrlEncoded({ page: "2", limit: "10" })(
        post("https://api.example.com/items"),
      );
      if (req.body._tag === "UrlEncodedBody") {
        expect(req.body.value.entries).toContainEqual(["page", "2"]);
        expect(req.body.value.entries).toContainEqual(["limit", "10"]);
      }
    });

    it("returns a frozen object", () => {
      const req = bodyUrlEncoded({ foo: "bar" })(post("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Signal and timeout combinators
// ---------------------------------------------------------------------------

import { withSignal, withTimeout } from "../../src/request/http-request.js";

describe("withSignal() and withTimeout()", () => {
  describe("withSignal()", () => {
    it("attaches the given AbortSignal to the request", () => {
      const controller = new AbortController();
      const req = withSignal(controller.signal)(get("https://api.example.com"));
      expect(req.signal).toBe(controller.signal);
    });

    it("returns a frozen object", () => {
      const controller = new AbortController();
      const req = withSignal(controller.signal)(get("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });

    it("replaces a previous signal", () => {
      const c1 = new AbortController();
      const c2 = new AbortController();
      const req = withSignal(c2.signal)(withSignal(c1.signal)(get("https://api.example.com")));
      expect(req.signal).toBe(c2.signal);
    });
  });

  describe("withTimeout()", () => {
    it("sets timeoutMs on the request", () => {
      const req = withTimeout(5000)(get("https://api.example.com"));
      expect(req.timeoutMs).toBe(5000);
    });

    it("returns a frozen object", () => {
      const req = withTimeout(3000)(get("https://api.example.com"));
      expect(Object.isFrozen(req)).toBe(true);
    });

    it("replaces a previous timeout", () => {
      const req = withTimeout(1000)(withTimeout(9999)(get("https://api.example.com")));
      expect(req.timeoutMs).toBe(1000);
    });
  });
});

// ---------------------------------------------------------------------------
// parseUrlAndParams — URL with query string branch
// ---------------------------------------------------------------------------

describe("parseUrlAndParams — URL with query string", () => {
  it("splits URL at ? and populates urlParams (get with query string)", () => {
    const req = get("https://api.example.com/users?page=1&limit=10");
    expect(req.url).toBe("https://api.example.com/users");
    expect(req.urlParams.entries).toContainEqual(["page", "1"]);
    expect(req.urlParams.entries).toContainEqual(["limit", "10"]);
  });

  it("handles a URL with a single query param", () => {
    const req = post("https://api.example.com/search?q=hello");
    expect(req.url).toBe("https://api.example.com/search");
    expect(req.urlParams.entries).toContainEqual(["q", "hello"]);
  });

  it("handles URL object with search params", () => {
    const url = new URL("https://api.example.com/items?sort=desc&active=true");
    const req = get(url);
    expect(req.url).toBe("https://api.example.com/items");
    expect(req.urlParams.entries).toContainEqual(["sort", "desc"]);
    expect(req.urlParams.entries).toContainEqual(["active", "true"]);
  });
});

// ---------------------------------------------------------------------------
// requestMethodAndUrl()
// ---------------------------------------------------------------------------

describe("requestMethodAndUrl()", () => {
  it("returns 'METHOD URL' for a request with no params", () => {
    const req = get("https://api.example.com/users");
    expect(requestMethodAndUrl(req)).toBe("GET https://api.example.com/users");
  });

  it("appends query string when urlParams are present", () => {
    const req = setUrlParam("page", "2")(get("https://api.example.com/users"));
    expect(requestMethodAndUrl(req)).toBe("GET https://api.example.com/users?page=2");
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests — targeted at surviving Stryker mutants
// ---------------------------------------------------------------------------

describe("setUrlParam() — existing params are preserved when adding new key (kills filter mutations)", () => {
  it("preserves existing params when adding a completely new key", () => {
    // Arrange: request with two existing params
    const base = setUrlParams({ page: "1", limit: "10" })(get("https://api.example.com/users"));
    // Act: set a NEW key that doesn't exist in existing params
    const req = setUrlParam("sort", "asc")(base);
    // Assert: new key is added AND existing keys are preserved
    // If filter(() => undefined) ran, all entries would be removed before append
    expect(req.urlParams.entries).toContainEqual(["sort", "asc"]);
    expect(req.urlParams.entries).toContainEqual(["page", "1"]);
    expect(req.urlParams.entries).toContainEqual(["limit", "10"]);
  });

  it("preserves unrelated params when replacing an existing key", () => {
    // Arrange: request with two existing params
    const base = setUrlParams({ page: "1", limit: "10" })(get("https://api.example.com/items"));
    // Act: replace only the "page" key
    const req = setUrlParam("page", "3")(base);
    // Assert: "limit" is preserved AND "page" is updated to new value
    expect(req.urlParams.entries).toContainEqual(["limit", "10"]);
    expect(req.urlParams.entries).toContainEqual(["page", "3"]);
    // "page" should appear only once
    const pageEntries = req.urlParams.entries.filter(([k]) => k === "page");
    expect(pageEntries).toHaveLength(1);
  });
});

describe("bodyJson() — error message content (kills StringLiteral mutation)", () => {
  it("error message contains 'serialize' or description when serialization fails", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const result = bodyJson(circular)(post("https://api.example.com"));
    expect(result._tag).toBe("Err");
    if (result._tag === "Err") {
      // The error message must not be empty — kills the "" StringLiteral mutant
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(result.error.message).toContain("JSON");
    }
  });
});

describe("appendRequestHeader() — comma-space separator (kills StringLiteral mutation)", () => {
  it("uses exactly ', ' as separator between existing and new value", () => {
    // Set initial header
    const base = setRequestHeader("accept", "application/json")(get("https://api.example.com"));
    // Append second value
    const req = appendRequestHeader("accept", "text/html")(base);
    const value = req.headers.entries["accept"];
    // The separator must be ", " (comma-space), not "," or " " or any other variant
    expect(value).toBe("application/json, text/html");
    // Extra precision: confirm the exact separator string
    expect(value).toContain(", ");
    expect(value).not.toContain(",,");
    expect(value).not.toBe("application/json,text/html");
  });

  it("separator is comma-space not just comma when multiple appends occur", () => {
    const base = setRequestHeader("accept", "text/html")(get("https://api.example.com"));
    const req1 = appendRequestHeader("accept", "application/json")(base);
    const req2 = appendRequestHeader("accept", "text/plain")(req1);
    const value = req2.headers.entries["accept"];
    // All separators must be ", "
    expect(value).toBe("text/html, application/json, text/plain");
  });
});

// ---------------------------------------------------------------------------
// Mutation-killing tests for http-request.ts surviving Stryker mutants
// ---------------------------------------------------------------------------

describe("requestMethodAndUrl() — exact '?' character (kills StringLiteral '?' mutant)", () => {
  it("output contains the literal '?' character between url and query string", () => {
    // Build a request with a URL param so queryString is non-empty
    const req = setUrlParam("q", "hello")(get("/search"));
    const result = requestMethodAndUrl(req);
    // The '?' must appear literally in the output — kills the "" StringLiteral mutant
    expect(result).toBe("GET /search?q=hello");
    // Verify the exact '?' character position
    const questionIndex = result.indexOf("?");
    expect(questionIndex).toBeGreaterThan(0);
    // Chars immediately before and after '?'
    expect(result[questionIndex]).toBe("?");
    expect(result.slice(0, questionIndex)).toBe("GET /search");
    expect(result.slice(questionIndex + 1)).toBe("q=hello");
  });

  it("output format is exactly 'METHOD url?querystring' with the '?' separator", () => {
    const req = setUrlParams({ name: "alice", age: "30" })(post("/users"));
    const result = requestMethodAndUrl(req);
    // Must contain '?' separating url from params
    expect(result.includes("?")).toBe(true);
    // Must start with method and space
    expect(result.startsWith("POST /users?")).toBe(true);
  });
});

describe("prependUrl() — slash normalization kills both EndsWith and StartsWith mutants", () => {
  it("baseUrl WITH trailing slash + url WITHOUT leading slash: produces single slash between them", () => {
    // Both conditions active: strip trailing slash from base AND prepend '/' to path
    const req = prependUrl("https://api.example.com/")(get("users"));
    // If endsWith("/") mutant fires → slash NOT stripped → "https://api.example.com//users"
    // If startsWith("/") mutant fires → slash NOT prepended → "https://api.example.comusers"
    expect(req.url).toBe("https://api.example.com/users");
    // Explicitly verify no double-slash
    expect(req.url).not.toContain("//users"); // Verify no double-slash before the path segment
    expect(req.url.split("//")).toHaveLength(2); // Only one "//" from "https://"
  });

  it("baseUrl WITHOUT trailing slash + url WITHOUT leading slash: slash is inserted between them", () => {
    // Only startsWith("/") condition active: must prepend '/' to path
    const req = prependUrl("https://api.example.com")(get("users"));
    // If startsWith("/") mutant fires → path = "users" (no slash) → result = "https://api.example.comusers"
    expect(req.url).toBe("https://api.example.com/users");
    // Confirm the slash was inserted between base and path
    expect(req.url).toContain("/users");
    expect(req.url.endsWith("/users")).toBe(true);
  });

  it("baseUrl WITH trailing slash + url WITH leading slash: no double-slash (endsWith strips base slash)", () => {
    // endsWith("/") condition active: must strip trailing slash from base
    const req = prependUrl("https://api.example.com/")(get("/users"));
    // If endsWith("/") mutant fires → base becomes "https://api.example.co" (wrong char stripped)
    // or "/" not stripped → "https://api.example.com//users"
    expect(req.url).toBe("https://api.example.com/users");
    expect(req.url).not.toContain("//users");
  });
});

describe("appendUrl() — slash normalization kills EndsWith and StartsWith mutants", () => {
  it("url WITH trailing slash + suffix WITHOUT leading slash: produces single slash between them", () => {
    // Both conditions active: strip trailing slash from base AND prepend '/' to segment
    const req = appendUrl("users")(get("/api/"));
    // If endsWith("/") mutant fires → slash NOT stripped → "/api//users"
    // If startsWith("/") mutant fires → slash NOT prepended → "/api/users" (happens to be same if base stripped)
    expect(req.url).toBe("/api/users");
    // Explicitly verify no double-slash
    expect(req.url).not.toContain("//");
  });

  it("url WITHOUT trailing slash + suffix WITHOUT leading slash: slash is inserted between them", () => {
    // Only startsWith("/") condition active: must prepend '/' to segment
    const req = appendUrl("users")(get("/api"));
    // If startsWith("/") mutant fires → segment = "users" (no slash) → "/apiusers"
    expect(req.url).toBe("/api/users");
    // Confirm the slash was inserted between base and suffix
    expect(req.url).toContain("/users");
    expect(req.url.endsWith("/users")).toBe(true);
  });

  it("url WITH trailing slash + suffix WITH leading slash: endsWith strips base trailing slash to avoid double-slash", () => {
    // endsWith("/") condition: must strip trailing slash from base
    const req = appendUrl("/users")(get("/api/"));
    // If endsWith("/") mutant fires → "/api//users"
    expect(req.url).toBe("/api/users");
    expect(req.url).not.toContain("//");
  });
});
