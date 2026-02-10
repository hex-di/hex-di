/**
 * CircularBuffer Tests
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { CircularBuffer } from "../../src/introspection/circular-buffer.js";

describe("CircularBuffer", () => {
  it("push items within capacity, toArray returns all in order", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    expect(buffer.toArray()).toEqual([1, 2, 3]);
  });

  it("push beyond capacity triggers FIFO eviction", () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    buffer.push(5);

    // Oldest items (1, 2) should be evicted
    expect(buffer.toArray()).toEqual([3, 4, 5]);
  });

  it("length tracks count (capped at capacity)", () => {
    const buffer = new CircularBuffer<string>(3);
    expect(buffer.length).toBe(0);

    buffer.push("a");
    expect(buffer.length).toBe(1);

    buffer.push("b");
    buffer.push("c");
    expect(buffer.length).toBe(3);

    buffer.push("d"); // Exceeds capacity
    expect(buffer.length).toBe(3);
  });

  it("clear resets buffer", () => {
    const buffer = new CircularBuffer<number>(5);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);

    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.toArray()).toEqual([]);
  });

  it("empty buffer returns empty array", () => {
    const buffer = new CircularBuffer<number>(10);

    expect(buffer.toArray()).toEqual([]);
    expect(buffer.length).toBe(0);
  });

  it("zero-capacity buffer ignores pushes", () => {
    const buffer = new CircularBuffer<number>(0);
    buffer.push(1);
    buffer.push(2);

    expect(buffer.length).toBe(0);
    expect(buffer.toArray()).toEqual([]);
  });

  it("capacity-1 buffer replaces single element on each push", () => {
    const buffer = new CircularBuffer<number>(1);
    buffer.push(10);
    expect(buffer.toArray()).toEqual([10]);
    expect(buffer.length).toBe(1);

    buffer.push(20);
    expect(buffer.toArray()).toEqual([20]);
    expect(buffer.length).toBe(1);
  });

  it("toArray returns exact items after wrap-around (no undefined gaps)", () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4); // Evicts 1, head wraps

    const result = buffer.toArray();
    expect(result).toEqual([2, 3, 4]);
    // Verify no undefined entries leaked
    expect(result.every(item => typeof item === "number")).toBe(true);
  });

  it("pre-allocated buffer stores items at correct indices across wrap-around", () => {
    // Tests that pre-allocation (new Array(capacity)) is needed for correct modular indexing
    const buffer = new CircularBuffer<string>(3);
    // Fill to capacity
    buffer.push("a");
    buffer.push("b");
    buffer.push("c");
    // Wrap around twice
    buffer.push("d");
    buffer.push("e");
    buffer.push("f");
    buffer.push("g");

    expect(buffer.toArray()).toEqual(["e", "f", "g"]);
    expect(buffer.length).toBe(3);
  });

  it("zero-capacity buffer length stays 0 after multiple pushes", () => {
    const buffer = new CircularBuffer<string>(0);
    buffer.push("a");
    buffer.push("b");
    buffer.push("c");

    expect(buffer.length).toBe(0);
    expect(buffer.toArray()).toEqual([]);

    buffer.clear();
    expect(buffer.length).toBe(0);
  });
});
