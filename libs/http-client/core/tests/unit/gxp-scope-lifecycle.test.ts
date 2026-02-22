/**
 * GxP: Scoped client lifecycle — context propagation and isolation.
 */
import { describe, it, expect } from "vitest";
import { createScopedClient } from "../../src/context/scoped-http-client.js";
import { createHttpClient } from "../../src/ports/http-client-factory.js";
import { createHttpResponse } from "../../src/response/http-response.js";
import { createHeaders } from "../../src/types/headers.js";
import { get } from "../../src/request/http-request.js";
import { ResultAsync } from "@hex-di/result";
import type { HttpRequest } from "../../src/request/http-request.js";

function makeInnerClient(capture: (req: HttpRequest) => void) {
  return createHttpClient((req) => {
    capture(req);
    return ResultAsync.fromSafePromise(
      Promise.resolve(
        createHttpResponse({
          status: 200,
          statusText: "OK",
          headers: createHeaders(),
          request: req,
          rawBody: new TextEncoder().encode("{}"),
        }),
      ),
    );
  });
}

describe("GxP: scope lifecycle — header propagation", () => {
  it("all requests carry correlation-id from scope", async () => {
    const captured: HttpRequest[] = [];
    const inner = makeInnerClient((req) => captured.push(req));
    const scoped = createScopedClient(inner, { correlationId: "audit-123" });

    await scoped.get("https://api.example.com/resource");
    await scoped.post("https://api.example.com/data");

    expect(captured).toHaveLength(2);
    for (const req of captured) {
      expect(req.headers.entries["x-correlation-id"]).toBe("audit-123");
    }
  });

  it("scoped client isolation — two scopes don't share headers", async () => {
    const capturedA: HttpRequest[] = [];
    const capturedB: HttpRequest[] = [];
    const innerA = makeInnerClient((req) => capturedA.push(req));
    const innerB = makeInnerClient((req) => capturedB.push(req));

    const scopeA = createScopedClient(innerA, { correlationId: "scope-A" });
    const scopeB = createScopedClient(innerB, { correlationId: "scope-B" });

    await scopeA.get("https://a.example.com/");
    await scopeB.get("https://b.example.com/");

    expect(capturedA[0]?.headers.entries["x-correlation-id"]).toBe("scope-A");
    expect(capturedB[0]?.headers.entries["x-correlation-id"]).toBe("scope-B");
  });

  it("caller-supplied headers override scope headers", async () => {
    const captured: HttpRequest[] = [];
    const inner = makeInnerClient((req) => captured.push(req));
    const scoped = createScopedClient(inner, { correlationId: "original-id" });

    await scoped.get("https://api.example.com/", {
      headers: { "x-correlation-id": "override-id" },
    });

    expect(captured[0]?.headers.entries["x-correlation-id"]).toBe("override-id");
  });

  it("execute() also injects scope headers at request level", async () => {
    const captured: HttpRequest[] = [];
    const inner = makeInnerClient((req) => captured.push(req));
    const scoped = createScopedClient(inner, { tenantId: "tenant-xyz" });

    const req = get("https://api.example.com/users");
    await scoped.execute(req);

    expect(captured[0]?.headers.entries["x-tenant-id"]).toBe("tenant-xyz");
  });
});
