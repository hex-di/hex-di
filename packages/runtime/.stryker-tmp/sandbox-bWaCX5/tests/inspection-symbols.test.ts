/**
 * Tests for src/inspection/symbols.ts
 */
// @ts-nocheck

import { describe, it, expect } from "vitest";
import {
  INTERNAL_ACCESS,
  TRACING_ACCESS,
  ADAPTER_ACCESS,
  HOOKS_ACCESS,
  INSPECTOR,
} from "../src/inspection/symbols.js";

describe("inspection symbols", () => {
  describe("INTERNAL_ACCESS", () => {
    it("is a symbol", () => {
      expect(typeof INTERNAL_ACCESS).toBe("symbol");
    });

    it("has correct description from Symbol.for registry", () => {
      expect(INTERNAL_ACCESS.description).toBe("hex-di/internal-access");
    });

    it("is the same symbol when accessed via Symbol.for", () => {
      expect(INTERNAL_ACCESS).toBe(Symbol.for("hex-di/internal-access"));
    });

    it("is NOT the same as a locally created symbol", () => {
      const localSymbol = Symbol("hex-di/internal-access");
      expect(INTERNAL_ACCESS).not.toBe(localSymbol);
    });
  });

  describe("TRACING_ACCESS", () => {
    it("is a symbol", () => {
      expect(typeof TRACING_ACCESS).toBe("symbol");
    });

    it("has correct description", () => {
      expect(TRACING_ACCESS.description).toBe("hex-di/tracing-access");
    });

    it("is the same symbol via Symbol.for", () => {
      expect(TRACING_ACCESS).toBe(Symbol.for("hex-di/tracing-access"));
    });
  });

  describe("ADAPTER_ACCESS", () => {
    it("is a symbol", () => {
      expect(typeof ADAPTER_ACCESS).toBe("symbol");
    });

    it("has correct description", () => {
      expect(ADAPTER_ACCESS.description).toBe("hex-di/adapter-access");
    });

    it("is the same symbol via Symbol.for", () => {
      expect(ADAPTER_ACCESS).toBe(Symbol.for("hex-di/adapter-access"));
    });
  });

  describe("HOOKS_ACCESS", () => {
    it("is a symbol", () => {
      expect(typeof HOOKS_ACCESS).toBe("symbol");
    });

    it("has correct description", () => {
      expect(HOOKS_ACCESS.description).toBe("hex-di/hooks-access");
    });

    it("is the same symbol via Symbol.for", () => {
      expect(HOOKS_ACCESS).toBe(Symbol.for("hex-di/hooks-access"));
    });
  });

  describe("INSPECTOR", () => {
    it("is a symbol", () => {
      expect(typeof INSPECTOR).toBe("symbol");
    });

    it("has correct description", () => {
      expect(INSPECTOR.description).toBe("hex-di/inspector");
    });

    it("is the same symbol via Symbol.for", () => {
      expect(INSPECTOR).toBe(Symbol.for("hex-di/inspector"));
    });
  });

  describe("symbol uniqueness", () => {
    it("all symbols are distinct", () => {
      const symbols = [INTERNAL_ACCESS, TRACING_ACCESS, ADAPTER_ACCESS, HOOKS_ACCESS, INSPECTOR];
      const uniqueSymbols = new Set(symbols);
      expect(uniqueSymbols.size).toBe(5);
    });
  });
});
