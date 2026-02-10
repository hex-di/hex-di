/**
 * DOD 15: E2E - Temperature Converter with LinkedDerived
 */

import { describe, expect, it } from "vitest";
import { createSignal } from "../../src/reactivity/signals.js";
import { createLinkedDerivedServiceImpl } from "../../src/services/linked-derived-service-impl.js";

describe("Temperature converter E2E", () => {
  it("celsius -> fahrenheit bidirectional conversion", () => {
    const celsius = createSignal(100);

    const fahrenheit = createLinkedDerivedServiceImpl({
      portName: "Fahrenheit",
      containerName: "root",
      select: () => (celsius.get() * 9) / 5 + 32,
      write: (f: number) => celsius.set(((f - 32) * 5) / 9),
    });

    // Read: 100C = 212F
    expect(fahrenheit.value).toBe(212);

    // Write-back: set to 32F = 0C
    fahrenheit.set(32);
    expect(celsius.get()).toBe(0);

    // Now reading fahrenheit should show 32
    expect(fahrenheit.value).toBe(32);
  });

  it("changes propagate through subscriptions", () => {
    const celsius = createSignal(0);

    const fahrenheit = createLinkedDerivedServiceImpl({
      portName: "Fahrenheit",
      containerName: "root",
      select: () => (celsius.get() * 9) / 5 + 32,
      write: (f: number) => celsius.set(((f - 32) * 5) / 9),
    });

    const temps: number[] = [];
    fahrenheit.subscribe(v => temps.push(v as number));

    celsius.set(100);
    expect(temps).toContain(212);
  });
});
