/**
 * Tests for HTTP request body factory functions and type guards.
 */

import { describe, it, expect } from "vitest";
import {
  emptyBody,
  textBody,
  jsonBody,
  uint8ArrayBody,
  urlEncodedBody,
  formDataBody,
  streamBody,
  isEmptyBody,
  isTextBody,
  isJsonBody,
  isUint8ArrayBody,
  isUrlEncodedBody,
  isFormDataBody,
  isStreamBody,
} from "../../src/types/body.js";
import type { HttpBody } from "../../src/types/body.js";

// ---------------------------------------------------------------------------
// emptyBody
// ---------------------------------------------------------------------------

describe("emptyBody", () => {
  it("has _tag 'EmptyBody'", () => {
    expect(emptyBody()._tag).toBe("EmptyBody");
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(emptyBody())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// textBody
// ---------------------------------------------------------------------------

describe("textBody", () => {
  it("has _tag 'TextBody'", () => {
    expect(textBody("hello")._tag).toBe("TextBody");
  });

  it("stores the text value", () => {
    expect(textBody("hello").value).toBe("hello");
  });

  it("defaults contentType to 'text/plain; charset=utf-8'", () => {
    expect(textBody("hello").contentType).toBe("text/plain; charset=utf-8");
  });

  it("uses a custom contentType when provided", () => {
    expect(textBody("hello", "text/html").contentType).toBe("text/html");
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(textBody("hello"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// jsonBody
// ---------------------------------------------------------------------------

describe("jsonBody", () => {
  it("has _tag 'JsonBody'", () => {
    expect(jsonBody({ a: 1 })._tag).toBe("JsonBody");
  });

  it("stores the value", () => {
    const value = { id: 42, name: "Alice" };
    expect(jsonBody(value).value).toBe(value);
  });

  it("accepts primitives as value", () => {
    expect(jsonBody(null).value).toBeNull();
    expect(jsonBody(42).value).toBe(42);
    expect(jsonBody("text").value).toBe("text");
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(jsonBody({ x: 1 }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// uint8ArrayBody
// ---------------------------------------------------------------------------

describe("uint8ArrayBody", () => {
  it("has _tag 'Uint8ArrayBody'", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(uint8ArrayBody(bytes)._tag).toBe("Uint8ArrayBody");
  });

  it("stores the Uint8Array value", () => {
    const bytes = new Uint8Array([10, 20]);
    expect(uint8ArrayBody(bytes).value).toBe(bytes);
  });

  it("defaults contentType to 'application/octet-stream'", () => {
    const bytes = new Uint8Array([1]);
    expect(uint8ArrayBody(bytes).contentType).toBe("application/octet-stream");
  });

  it("uses a custom contentType when provided", () => {
    const bytes = new Uint8Array([1]);
    expect(uint8ArrayBody(bytes, "image/png").contentType).toBe("image/png");
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(uint8ArrayBody(new Uint8Array([1])))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// urlEncodedBody
// ---------------------------------------------------------------------------

describe("urlEncodedBody", () => {
  it("has _tag 'UrlEncodedBody'", () => {
    expect(urlEncodedBody({ foo: "bar" })._tag).toBe("UrlEncodedBody");
  });

  it("stores a UrlParams value derived from the input", () => {
    const body = urlEncodedBody({ key: "value" });
    expect(body.value).toBeDefined();
    expect(body.value.entries).toBeDefined();
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(urlEncodedBody({ a: "b" }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// formDataBody
// ---------------------------------------------------------------------------

describe("formDataBody", () => {
  it("has _tag 'FormDataBody'", () => {
    const fd = new FormData();
    expect(formDataBody(fd)._tag).toBe("FormDataBody");
  });

  it("stores the FormData value", () => {
    const fd = new FormData();
    fd.append("field", "value");
    expect(formDataBody(fd).value).toBe(fd);
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(formDataBody(new FormData()))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// streamBody
// ---------------------------------------------------------------------------

describe("streamBody", () => {
  it("has _tag 'StreamBody'", () => {
    const stream = new ReadableStream<Uint8Array>();
    expect(streamBody(stream)._tag).toBe("StreamBody");
  });

  it("stores the ReadableStream value", () => {
    const stream = new ReadableStream<Uint8Array>();
    expect(streamBody(stream).value).toBe(stream);
  });

  it("defaults contentType to 'application/octet-stream'", () => {
    const stream = new ReadableStream<Uint8Array>();
    expect(streamBody(stream).contentType).toBe("application/octet-stream");
  });

  it("uses a custom contentType when provided", () => {
    const stream = new ReadableStream<Uint8Array>();
    expect(streamBody(stream, { contentType: "video/mp4" }).contentType).toBe("video/mp4");
  });

  it("stores contentLength when provided", () => {
    const stream = new ReadableStream<Uint8Array>();
    expect(streamBody(stream, { contentLength: 1024 }).contentLength).toBe(1024);
  });

  it("contentLength is undefined when not provided", () => {
    const stream = new ReadableStream<Uint8Array>();
    expect(streamBody(stream).contentLength).toBeUndefined();
  });

  it("returns a frozen object", () => {
    expect(Object.isFrozen(streamBody(new ReadableStream()))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Type guards — true positives
// ---------------------------------------------------------------------------

describe("isEmptyBody", () => {
  it("returns true for EmptyBody", () => {
    expect(isEmptyBody(emptyBody())).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isEmptyBody(textBody("hello"))).toBe(false);
    expect(isEmptyBody(jsonBody({}))).toBe(false);
    expect(isEmptyBody(uint8ArrayBody(new Uint8Array()))).toBe(false);
  });
});

describe("isTextBody", () => {
  it("returns true for TextBody", () => {
    expect(isTextBody(textBody("hello"))).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isTextBody(emptyBody())).toBe(false);
    expect(isTextBody(jsonBody({}))).toBe(false);
  });
});

describe("isJsonBody", () => {
  it("returns true for JsonBody", () => {
    expect(isJsonBody(jsonBody({ a: 1 }))).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isJsonBody(emptyBody())).toBe(false);
    expect(isJsonBody(textBody("hello"))).toBe(false);
  });
});

describe("isUint8ArrayBody", () => {
  it("returns true for Uint8ArrayBody", () => {
    expect(isUint8ArrayBody(uint8ArrayBody(new Uint8Array([1])))).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isUint8ArrayBody(emptyBody())).toBe(false);
    expect(isUint8ArrayBody(jsonBody({}))).toBe(false);
  });
});

describe("isUrlEncodedBody", () => {
  it("returns true for UrlEncodedBody", () => {
    expect(isUrlEncodedBody(urlEncodedBody({ a: "b" }))).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isUrlEncodedBody(emptyBody())).toBe(false);
    expect(isUrlEncodedBody(textBody("hello"))).toBe(false);
  });
});

describe("isFormDataBody", () => {
  it("returns true for FormDataBody", () => {
    expect(isFormDataBody(formDataBody(new FormData()))).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isFormDataBody(emptyBody())).toBe(false);
    expect(isFormDataBody(jsonBody({}))).toBe(false);
  });
});

describe("isStreamBody", () => {
  it("returns true for StreamBody", () => {
    expect(isStreamBody(streamBody(new ReadableStream()))).toBe(true);
  });

  it("returns false for other body types", () => {
    expect(isStreamBody(emptyBody())).toBe(false);
    expect(isStreamBody(textBody("hello"))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type guard cross-checks — every guard returns false for every other type
// ---------------------------------------------------------------------------

describe("type guards — exhaustive cross-checks", () => {
  const allBodies: HttpBody[] = [
    emptyBody(),
    textBody("test"),
    jsonBody({}),
    uint8ArrayBody(new Uint8Array([1])),
    urlEncodedBody({ k: "v" }),
    formDataBody(new FormData()),
    streamBody(new ReadableStream()),
  ];

  const guards = [
    { name: "isEmptyBody", fn: isEmptyBody, tag: "EmptyBody" },
    { name: "isTextBody", fn: isTextBody, tag: "TextBody" },
    { name: "isJsonBody", fn: isJsonBody, tag: "JsonBody" },
    { name: "isUint8ArrayBody", fn: isUint8ArrayBody, tag: "Uint8ArrayBody" },
    { name: "isUrlEncodedBody", fn: isUrlEncodedBody, tag: "UrlEncodedBody" },
    { name: "isFormDataBody", fn: isFormDataBody, tag: "FormDataBody" },
    { name: "isStreamBody", fn: isStreamBody, tag: "StreamBody" },
  ] as const;

  for (const guard of guards) {
    for (const body of allBodies) {
      const expected = body._tag === guard.tag;
      it(`${guard.name}(${body._tag}) === ${String(expected)}`, () => {
        expect(guard.fn(body)).toBe(expected);
      });
    }
  }
});
