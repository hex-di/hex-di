/**
 * Tests for layout cache.
 */

import { describe, it, expect } from "vitest";
import { createLayoutCache, computeCacheKey } from "../../../src/panels/graph/layout-cache.js";
import type { ContainerGraphData } from "@hex-di/core";

function createGraphData(): ContainerGraphData {
  return {
    adapters: [
      {
        portName: "A",
        lifetime: "singleton",
        factoryKind: "sync",
        dependencyNames: [],
        origin: "own",
      },
    ],
    containerName: "TestApp",
    kind: "root",
    parentName: null,
  };
}

describe("createLayoutCache", () => {
  it("starts with size 0", () => {
    const cache = createLayoutCache();
    expect(cache.size).toBe(0);
  });

  it("computes and caches layout", () => {
    const cache = createLayoutCache();
    const data = createGraphData();
    const layout1 = cache.get(data, "TB");
    expect(cache.size).toBe(1);
    const layout2 = cache.get(data, "TB");
    expect(layout1).toBe(layout2); // same reference = cache hit
  });

  it("recomputes on direction change", () => {
    const cache = createLayoutCache();
    const data = createGraphData();
    const layoutTB = cache.get(data, "TB");
    const layoutLR = cache.get(data, "LR");
    expect(layoutTB).not.toBe(layoutLR);
  });

  it("invalidates cache", () => {
    const cache = createLayoutCache();
    const data = createGraphData();
    cache.get(data, "TB");
    expect(cache.size).toBe(1);
    cache.invalidate();
    expect(cache.size).toBe(0);
  });
});

describe("computeCacheKey", () => {
  it("produces deterministic key for same data", () => {
    const data = createGraphData();
    const key1 = computeCacheKey(data, "TB");
    const key2 = computeCacheKey(data, "TB");
    expect(key1).toBe(key2);
  });

  it("produces different keys for different directions", () => {
    const data = createGraphData();
    const keyTB = computeCacheKey(data, "TB");
    const keyLR = computeCacheKey(data, "LR");
    expect(keyTB).not.toBe(keyLR);
  });
});
