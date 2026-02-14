import { describe, it, expect } from "vitest";
import { ExampleRegistry, exampleRegistry } from "../../src/examples/example-registry.js";
import type { ExampleCategory } from "../../src/examples/types.js";

describe("ExampleRegistry", () => {
  it("returns all 18 templates", () => {
    const registry = new ExampleRegistry();
    const all = registry.getAll();
    expect(all).toHaveLength(18);
  });

  it("getById returns correct template", () => {
    const registry = new ExampleRegistry();
    const template = registry.getById("basic-registration");
    expect(template).toBeDefined();
    expect(template?.id).toBe("basic-registration");
    expect(template?.title).toBe("Basic Port & Adapter Registration");
    expect(template?.category).toBe("basics");
  });

  it("getById returns undefined for unknown id", () => {
    const registry = new ExampleRegistry();
    const result = registry.getById("nonexistent-template");
    expect(result).toBeUndefined();
  });

  it("getByCategory returns only templates in that category", () => {
    const registry = new ExampleRegistry();

    const basics = registry.getByCategory("basics");
    expect(basics).toHaveLength(5);
    for (const template of basics) {
      expect(template.category).toBe("basics");
    }

    const patterns = registry.getByCategory("patterns");
    expect(patterns).toHaveLength(1);
    for (const template of patterns) {
      expect(template.category).toBe("patterns");
    }

    const result = registry.getByCategory("result");
    expect(result).toHaveLength(7);
    for (const template of result) {
      expect(template.category).toBe("result");
    }

    const libraries = registry.getByCategory("libraries");
    expect(libraries).toHaveLength(4);
    for (const template of libraries) {
      expect(template.category).toBe("libraries");
    }

    const advanced = registry.getByCategory("advanced");
    expect(advanced).toHaveLength(1);
    for (const template of advanced) {
      expect(template.category).toBe("advanced");
    }
  });

  it("getByCategory returns empty array for unknown category", () => {
    const registry = new ExampleRegistry();
    // Cast needed in test only - tests have relaxed lint rules
    const result = registry.getByCategory("nonexistent" as ExampleCategory);
    expect(result).toEqual([]);
  });

  it("exports a singleton instance", () => {
    expect(exampleRegistry).toBeInstanceOf(ExampleRegistry);
    expect(exampleRegistry.getAll()).toHaveLength(18);
  });
});
