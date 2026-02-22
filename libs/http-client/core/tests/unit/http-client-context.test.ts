/**
 * Tests for HttpClientContextVar — the ambient HTTP client context variable.
 *
 * These tests exist primarily to kill the Stryker StringLiteral mutant that
 * replaces "HttpClientContext" (the name passed to createContextVariable) with "".
 * The name is embedded in the Symbol's description, which is observable via
 * `Symbol.prototype.description` (or `String(symbol)`).
 */

import { describe, it, expect } from "vitest";
import { HttpClientContextVar } from "../../src/context/http-client-context.js";

// ---------------------------------------------------------------------------
// HttpClientContextVar — structure
// ---------------------------------------------------------------------------

describe("HttpClientContextVar — structure", () => {
  it("is defined (not undefined)", () => {
    expect(HttpClientContextVar).toBeDefined();
  });

  it("has an id property that is a Symbol", () => {
    expect(typeof HttpClientContextVar.id).toBe("symbol");
  });

  it("has a defaultValue of null", () => {
    // createContextVariable("HttpClientContext", null) → defaultValue is null.
    // The default must be null to represent "no ambient client".
    expect(HttpClientContextVar.defaultValue).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HttpClientContextVar — name embedded in Symbol description (mutation-killing)
// ---------------------------------------------------------------------------

describe("HttpClientContextVar — Symbol description (kills StringLiteral mutant)", () => {
  it("Symbol description contains 'HttpClientContext'", () => {
    // createContextVariable(name, default) stores Symbol(name).
    // Symbol.description exposes the name string.
    // Mutant replaces "HttpClientContext" with "" → Symbol("") → description is "".
    // This test fails if the name is empty or different.
    expect(HttpClientContextVar.id.description).toBe("HttpClientContext");
  });

  it("Symbol description is not empty", () => {
    // Kills the `"HttpClientContext"` → `""` StringLiteral mutant.
    // With the mutant, Symbol("").description is "" → the assertion `!== ""` fails.
    expect(HttpClientContextVar.id.description).not.toBe("");
  });

  it("Symbol description is exactly 'HttpClientContext' (not a partial or similar name)", () => {
    const description = HttpClientContextVar.id.description;
    expect(description).toBe("HttpClientContext");
    expect(description).not.toBe("HttpClient");
    expect(description).not.toBe("Context");
    expect(description).not.toBe("httpClientContext");
  });

  it("String representation of Symbol contains 'HttpClientContext'", () => {
    // Additional observable: String(Symbol("HttpClientContext")) === "Symbol(HttpClientContext)"
    const symbolStr = String(HttpClientContextVar.id);
    expect(symbolStr).toBe("Symbol(HttpClientContext)");
  });
});
