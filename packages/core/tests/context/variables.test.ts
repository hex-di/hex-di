import { describe, it, expect } from "vitest";
import { createContextVariable, withContext, getContext } from "../../src/context/index.js";

describe("Context Variables", () => {
  describe("createContextVariable", () => {
    it("creates a context variable with unique symbol ID", () => {
      const var1 = createContextVariable<string>("userId");
      const var2 = createContextVariable<string>("userId");

      // Same name, but different symbols
      expect(var1.id).not.toBe(var2.id);
      expect(typeof var1.id).toBe("symbol");
      expect(typeof var2.id).toBe("symbol");
    });

    it("creates context variable without default value", () => {
      const variable = createContextVariable<number>("count");

      expect(variable.defaultValue).toBeUndefined();
      expect(typeof variable.id).toBe("symbol");
    });

    it("creates context variable with default value", () => {
      const variable = createContextVariable("retryCount", 3);

      expect(variable.defaultValue).toBe(3);
      expect(typeof variable.id).toBe("symbol");
    });

    it("preserves default value type", () => {
      const stringVar = createContextVariable("name", "default");
      const numberVar = createContextVariable("count", 0);
      const objectVar = createContextVariable("config", { enabled: true });

      expect(stringVar.defaultValue).toBe("default");
      expect(numberVar.defaultValue).toBe(0);
      expect(objectVar.defaultValue).toEqual({ enabled: true });
    });

    it("symbol description includes variable name", () => {
      const variable = createContextVariable("requestId");

      // Symbol description is accessible for debugging
      expect(variable.id.description).toBe("requestId");
    });
  });

  describe("withContext", () => {
    it("returns object with variable and value", () => {
      const userId = createContextVariable<string>("userId");
      const entry = withContext(userId, "user-123");

      expect(entry.variable).toBe(userId);
      expect(entry.value).toBe("user-123");
    });

    it("preserves value type", () => {
      const timeout = createContextVariable<number>("timeout");
      const entry = withContext(timeout, 5000);

      expect(entry.value).toBe(5000);
      expect(typeof entry.value).toBe("number");
    });

    it("works with complex types", () => {
      interface Config {
        retries: number;
        timeout: number;
      }

      const config = createContextVariable<Config>("config");
      const value = { retries: 3, timeout: 5000 };
      const entry = withContext(config, value);

      expect(entry.value).toEqual(value);
      expect(entry.variable).toBe(config);
    });
  });

  describe("getContext", () => {
    it("retrieves value from context map", () => {
      const userId = createContextVariable<string>("userId");
      const context = new Map<symbol, unknown>([[userId.id, "user-123"]]);

      const value = getContext(context, userId);

      expect(value).toBe("user-123");
    });

    it("returns undefined when variable not in context", () => {
      const userId = createContextVariable<string>("userId");
      const context = new Map<symbol, unknown>();

      const value = getContext(context, userId);

      expect(value).toBeUndefined();
    });

    it("returns default value when variable not in context", () => {
      const retryCount = createContextVariable("retryCount", 3);
      const context = new Map<symbol, unknown>();

      const value = getContext(context, retryCount);

      expect(value).toBe(3);
    });

    it("prefers context value over default value", () => {
      const retryCount = createContextVariable("retryCount", 3);
      const context = new Map<symbol, unknown>([[retryCount.id, 10]]);

      const value = getContext(context, retryCount);

      expect(value).toBe(10);
    });

    it("works with multiple variables in same context", () => {
      const userId = createContextVariable<string>("userId");
      const requestId = createContextVariable<string>("requestId");
      const timeout = createContextVariable<number>("timeout");

      const context = new Map<symbol, unknown>([
        [userId.id, "user-123"],
        [requestId.id, "req-456"],
        [timeout.id, 5000],
      ]);

      expect(getContext(context, userId)).toBe("user-123");
      expect(getContext(context, requestId)).toBe("req-456");
      expect(getContext(context, timeout)).toBe(5000);
    });

    it("handles falsy values correctly", () => {
      const enabled = createContextVariable<boolean>("enabled");
      const count = createContextVariable<number>("count");
      const name = createContextVariable<string>("name");

      const context = new Map<symbol, unknown>([
        [enabled.id, false],
        [count.id, 0],
        [name.id, ""],
      ]);

      expect(getContext(context, enabled)).toBe(false);
      expect(getContext(context, count)).toBe(0);
      expect(getContext(context, name)).toBe("");
    });
  });

  describe("Type inference", () => {
    it("infers correct types without explicit annotations", () => {
      // Type inference test - no explicit type annotations needed
      const userId = createContextVariable("userId", "default-id");
      const timeout = createContextVariable("timeout", 1000);

      // These should compile without errors due to proper type inference
      const userEntry = withContext(userId, "new-id");
      const timeoutEntry = withContext(timeout, 5000);

      const context = new Map<symbol, unknown>([
        [userId.id, "user-123"],
        [timeout.id, 3000],
      ]);

      const user = getContext(context, userId);
      const time = getContext(context, timeout);

      // Runtime verification of inferred types
      expect(typeof user).toBe("string");
      expect(typeof time).toBe("number");
    });
  });
});
