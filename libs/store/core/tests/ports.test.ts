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
import { getPortMetadata } from "@hex-di/core";
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

// =============================================================================
// Library category detection
// =============================================================================

describe("port metadata category for library detection", () => {
  it("createStatePort sets category to store/state", () => {
    interface S {
      count: number;
    }
    interface A extends ActionMap<S> {
      inc: ActionReducer<S>;
    }
    const port = createStatePort<S, A>()({ name: "Counter" });
    expect(getPortMetadata(port)?.category).toBe("store/state");
  });

  it("createAtomPort sets category to store/atom", () => {
    const port = createAtomPort<string>()({ name: "Theme" });
    expect(getPortMetadata(port)?.category).toBe("store/atom");
  });

  it("createDerivedPort sets category to store/derived", () => {
    const port = createDerivedPort<number>()({ name: "Total" });
    expect(getPortMetadata(port)?.category).toBe("store/derived");
  });

  it("createAsyncDerivedPort sets category to store/async-derived", () => {
    const port = createAsyncDerivedPort<number>()({ name: "Rate" });
    expect(getPortMetadata(port)?.category).toBe("store/async-derived");
  });

  it("createLinkedDerivedPort sets category to store/linked-derived", () => {
    const port = createLinkedDerivedPort<number>()({ name: "Fahrenheit" });
    expect(getPortMetadata(port)?.category).toBe("store/linked-derived");
  });
});
