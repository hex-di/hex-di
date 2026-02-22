import { describe, it, expect } from "vitest";
import { createHttpResponse } from "../../src/response/http-response.js";
import {
  isOk,
  isRedirect,
  isClientError,
  isServerError,
  isInformational,
  hasStatus,
  hasStatusInRange,
} from "../../src/response/status.js";
import { get } from "../../src/request/http-request.js";
import { createHeaders } from "../../src/types/headers.js";

function makeResponse(status: number): ReturnType<typeof createHttpResponse> {
  const req = get("https://api.example.com/test");
  return createHttpResponse({
    status,
    statusText: String(status),
    headers: createHeaders(),
    request: req,
  });
}

describe("Response status utilities", () => {
  describe("isOk()", () => {
    it("returns true for 200", () => {
      expect(isOk(makeResponse(200))).toBe(true);
    });

    it("returns true for 201 Created", () => {
      expect(isOk(makeResponse(201))).toBe(true);
    });

    it("returns true for 204 No Content", () => {
      expect(isOk(makeResponse(204))).toBe(true);
    });

    it("returns true for 299 (upper boundary of 2xx)", () => {
      expect(isOk(makeResponse(299))).toBe(true);
    });

    it("returns false for 199 (below 2xx)", () => {
      expect(isOk(makeResponse(199))).toBe(false);
    });

    it("returns false for 300 (redirect)", () => {
      expect(isOk(makeResponse(300))).toBe(false);
    });

    it("returns false for 404 (client error)", () => {
      expect(isOk(makeResponse(404))).toBe(false);
    });

    it("returns false for 500 (server error)", () => {
      expect(isOk(makeResponse(500))).toBe(false);
    });
  });

  describe("isRedirect()", () => {
    it("returns true for 301", () => {
      expect(isRedirect(makeResponse(301))).toBe(true);
    });

    it("returns true for 302 Found", () => {
      expect(isRedirect(makeResponse(302))).toBe(true);
    });

    it("returns true for 307 Temporary Redirect", () => {
      expect(isRedirect(makeResponse(307))).toBe(true);
    });

    it("returns true for 399 (upper boundary of 3xx)", () => {
      expect(isRedirect(makeResponse(399))).toBe(true);
    });

    it("returns true for 300 (lower boundary of 3xx)", () => {
      expect(isRedirect(makeResponse(300))).toBe(true);
    });

    it("returns false for 299 (2xx)", () => {
      expect(isRedirect(makeResponse(299))).toBe(false);
    });

    it("returns false for 400 (4xx)", () => {
      expect(isRedirect(makeResponse(400))).toBe(false);
    });
  });

  describe("isClientError()", () => {
    it("returns true for 400 Bad Request", () => {
      expect(isClientError(makeResponse(400))).toBe(true);
    });

    it("returns true for 401 Unauthorized", () => {
      expect(isClientError(makeResponse(401))).toBe(true);
    });

    it("returns true for 404 Not Found", () => {
      expect(isClientError(makeResponse(404))).toBe(true);
    });

    it("returns true for 422 Unprocessable Entity", () => {
      expect(isClientError(makeResponse(422))).toBe(true);
    });

    it("returns true for 499 (upper boundary of 4xx)", () => {
      expect(isClientError(makeResponse(499))).toBe(true);
    });

    it("returns false for 399 (3xx)", () => {
      expect(isClientError(makeResponse(399))).toBe(false);
    });

    it("returns false for 500 (5xx)", () => {
      expect(isClientError(makeResponse(500))).toBe(false);
    });
  });

  describe("isServerError()", () => {
    it("returns true for 500 Internal Server Error", () => {
      expect(isServerError(makeResponse(500))).toBe(true);
    });

    it("returns true for 502 Bad Gateway", () => {
      expect(isServerError(makeResponse(502))).toBe(true);
    });

    it("returns true for 503 Service Unavailable", () => {
      expect(isServerError(makeResponse(503))).toBe(true);
    });

    it("returns true for 599 (upper boundary of 5xx)", () => {
      expect(isServerError(makeResponse(599))).toBe(true);
    });

    it("returns false for 499 (4xx)", () => {
      expect(isServerError(makeResponse(499))).toBe(false);
    });

    it("returns false for 200 (2xx)", () => {
      expect(isServerError(makeResponse(200))).toBe(false);
    });

    it("returns false for 600 (above 5xx range)", () => {
      expect(isServerError(makeResponse(600))).toBe(false);
    });
  });

  describe("isInformational()", () => {
    it("returns true for 100 Continue", () => {
      expect(isInformational(makeResponse(100))).toBe(true);
    });

    it("returns true for 101 Switching Protocols", () => {
      expect(isInformational(makeResponse(101))).toBe(true);
    });

    it("returns true for 199 (upper boundary of 1xx)", () => {
      expect(isInformational(makeResponse(199))).toBe(true);
    });

    it("returns false for 200 (2xx)", () => {
      expect(isInformational(makeResponse(200))).toBe(false);
    });

    it("returns false for 99 (below 1xx)", () => {
      expect(isInformational(makeResponse(99))).toBe(false);
    });
  });

  describe("hasStatus()", () => {
    it("returns true for an exact match", () => {
      expect(hasStatus(200)(makeResponse(200))).toBe(true);
    });

    it("returns false when status does not match", () => {
      expect(hasStatus(200)(makeResponse(201))).toBe(false);
    });

    it("works for 404", () => {
      expect(hasStatus(404)(makeResponse(404))).toBe(true);
    });

    it("returns false for similar-but-not-equal status", () => {
      expect(hasStatus(500)(makeResponse(502))).toBe(false);
    });
  });

  describe("hasStatusInRange()", () => {
    it("returns true when status is within [min, max]", () => {
      expect(hasStatusInRange(200, 299)(makeResponse(200))).toBe(true);
      expect(hasStatusInRange(200, 299)(makeResponse(250))).toBe(true);
      expect(hasStatusInRange(200, 299)(makeResponse(299))).toBe(true);
    });

    it("returns false when status is below range", () => {
      expect(hasStatusInRange(200, 299)(makeResponse(199))).toBe(false);
    });

    it("returns false when status is above range", () => {
      expect(hasStatusInRange(200, 299)(makeResponse(300))).toBe(false);
    });

    it("works as a single-value range (min === max)", () => {
      expect(hasStatusInRange(200, 200)(makeResponse(200))).toBe(true);
      expect(hasStatusInRange(200, 200)(makeResponse(201))).toBe(false);
    });
  });
});
