/**
 * Port factory tests
 */

import { describe, it, expect } from "vitest";
import {
  createStatePort,
  createAtomPort,
  createDerivedPort,
  createAsyncDerivedPort,
  createLinkedDerivedPort,
} from "../src/index.js";
import type { ActionMap, ActionReducer } from "../src/index.js";

describe("createStatePort", () => {
  interface TestState {
    count: number;
    text: string;
  }

  interface TestActions extends ActionMap<TestState> {
    increment: ActionReducer<TestState>;
    setText: ActionReducer<TestState, string>;
  }

  it("creates a port with the specified name", () => {
    const port = createStatePort<TestState, TestActions>()({
      name: "Counter",
    });

    expect(port.__portName).toBe("Counter");
  });

  it("creates a port with optional metadata", () => {
    const port = createStatePort<TestState, TestActions>()({
      name: "Counter",
      description: "A counter state port",
      category: "ui",
      tags: ["counter", "test"],
    });

    expect(port.__portName).toBe("Counter");
  });

  it("curried form allows separate type annotation and name inference", () => {
    const factory = createStatePort<TestState, TestActions>();
    const port = factory({ name: "MyCounter" });
    expect(port.__portName).toBe("MyCounter");
  });
});

describe("createAtomPort", () => {
  it("creates an atom port with the specified name", () => {
    const port = createAtomPort<"light" | "dark">()({
      name: "Theme",
    });

    expect(port.__portName).toBe("Theme");
  });

  it("creates an atom port for complex types", () => {
    const port = createAtomPort<{ x: number; y: number }>()({
      name: "Position",
      category: "layout",
    });

    expect(port.__portName).toBe("Position");
  });
});

describe("createDerivedPort", () => {
  it("creates a derived port with the specified name", () => {
    const port = createDerivedPort<number>()({
      name: "DoubleCount",
    });

    expect(port.__portName).toBe("DoubleCount");
  });

  it("supports complex derived types", () => {
    interface CartTotal {
      subtotal: number;
      discount: number;
      total: number;
    }

    const port = createDerivedPort<CartTotal>()({
      name: "CartTotal",
      description: "Computed cart totals",
    });

    expect(port.__portName).toBe("CartTotal");
  });
});

describe("createAsyncDerivedPort", () => {
  it("creates an async derived port with the specified name", () => {
    const port = createAsyncDerivedPort<{ rate: number }>()({
      name: "ExchangeRate",
    });

    expect(port.__portName).toBe("ExchangeRate");
  });

  it("supports error type parameter", () => {
    interface NetworkError {
      readonly _tag: "NetworkError";
      readonly cause: unknown;
    }

    const port = createAsyncDerivedPort<string, NetworkError>()({
      name: "UserProfile",
      description: "User profile from API",
    });

    expect(port.__portName).toBe("UserProfile");
  });
});

describe("createLinkedDerivedPort", () => {
  it("creates a linked derived port with the specified name", () => {
    const port = createLinkedDerivedPort<number>()({
      name: "Fahrenheit",
    });

    expect(port.__portName).toBe("Fahrenheit");
  });
});
