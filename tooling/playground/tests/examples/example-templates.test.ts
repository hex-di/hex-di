import { describe, it, expect } from "vitest";
import { ExampleRegistry } from "../../src/examples/example-registry.js";
import type { ExampleCategory, ExampleTemplate } from "../../src/examples/types.js";

const VALID_CATEGORIES: readonly ExampleCategory[] = [
  "basics",
  "patterns",
  "result",
  "libraries",
  "advanced",
];

describe("ExampleTemplate validation", () => {
  const registry = new ExampleRegistry();
  const allTemplates = registry.getAll();

  it("all templates have valid structure", () => {
    for (const template of allTemplates) {
      // Non-empty id
      expect(template.id).toBeTruthy();
      expect(typeof template.id).toBe("string");

      // Non-empty title
      expect(template.title).toBeTruthy();
      expect(typeof template.title).toBe("string");

      // Non-empty description
      expect(template.description).toBeTruthy();
      expect(typeof template.description).toBe("string");

      // Valid category
      expect(VALID_CATEGORIES).toContain(template.category);

      // Non-empty files map
      expect(template.files.size).toBeGreaterThan(0);

      // Valid entryPoint (must exist in files)
      expect(template.entryPoint).toBeTruthy();
      expect(template.files.has(template.entryPoint)).toBe(true);

      // All file contents must be non-empty strings
      for (const [path, content] of template.files) {
        expect(path).toBeTruthy();
        expect(typeof path).toBe("string");
        expect(content).toBeTruthy();
        expect(typeof content).toBe("string");
      }

      // defaultPanel is optional but if present must be a non-empty string
      if (template.defaultPanel !== undefined) {
        expect(typeof template.defaultPanel).toBe("string");
        expect(template.defaultPanel).toBeTruthy();
      }

      // timeoutMs is optional but if present must be a positive number
      if (template.timeoutMs !== undefined) {
        expect(typeof template.timeoutMs).toBe("number");
        expect(template.timeoutMs).toBeGreaterThan(0);
      }
    }
  });

  it("all template ids are unique", () => {
    const ids = allTemplates.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("multi-library-composition is a multi-file example", () => {
    const template = registry.getById("multi-library-composition");
    expect(template).toBeDefined();
    const tmpl = template as ExampleTemplate;
    expect(tmpl.files.size).toBeGreaterThan(1);
    expect(tmpl.category).toBe("advanced");

    // Verify it has the expected multi-file structure
    const paths = Array.from(tmpl.files.keys());
    expect(paths).toContain("main.ts");
    // Should have sub-directory files
    const subDirFiles = paths.filter(p => p.includes("/"));
    expect(subDirFiles.length).toBeGreaterThan(0);
  });

  it("all basics templates have expected default panels", () => {
    const basics = registry.getByCategory("basics");
    for (const template of basics) {
      expect(template.defaultPanel).toBeDefined();
    }
  });

  it("every template entryPoint ends with .ts", () => {
    for (const template of allTemplates) {
      expect(template.entryPoint).toMatch(/\.ts$/);
    }
  });
});
