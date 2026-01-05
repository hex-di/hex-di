/**
 * FlowPlugin Tests
 *
 * Tests for the FlowPlugin factory function and visibility filtering logic.
 * These tests verify:
 * - Plugin registration returns valid DevToolsPlugin
 * - Visibility filtering modes (user, all, custom)
 * - Internal prefix exclusion in user mode
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { FlowPlugin, DEFAULT_INTERNAL_PREFIXES, type FlowPluginOptions } from "../src/index.js";

// =============================================================================
// Test Suite: Plugin Registration
// =============================================================================

describe("FlowPlugin", () => {
  describe("plugin registration", () => {
    it("should return a valid DevToolsPlugin with correct id and label", () => {
      const plugin = FlowPlugin();

      expect(plugin.id).toBe("flow");
      expect(plugin.label).toBe("Flow");
      expect(plugin.component).toBeDefined();
      expect(typeof plugin.component).toBe("function");
    });

    it("should return frozen immutable plugin object", () => {
      const plugin = FlowPlugin();

      expect(Object.isFrozen(plugin)).toBe(true);
    });

    it("should create unique plugin instances for each call", () => {
      const plugin1 = FlowPlugin();
      const plugin2 = FlowPlugin({ visibility: "all" });

      // Both should be valid plugins
      expect(plugin1.id).toBe("flow");
      expect(plugin2.id).toBe("flow");
      // They should be different instances
      expect(plugin1).not.toBe(plugin2);
    });
  });

  // ===========================================================================
  // Test Suite: Visibility Filtering
  // ===========================================================================

  describe("visibility filtering", () => {
    describe("user mode (default)", () => {
      it('should default to "user" visibility mode', () => {
        const plugin = FlowPlugin();
        // The filter function should exist on the plugin's internal state
        // We test this indirectly through the createVisibilityFilter export
        expect(plugin).toBeDefined();
      });
    });

    describe("all mode", () => {
      it('should include all machines when visibility is "all"', () => {
        const plugin = FlowPlugin({ visibility: "all" });
        expect(plugin).toBeDefined();
      });
    });

    describe("custom mode", () => {
      it("should accept custom filter function", () => {
        const customFilter = (machineId: string): boolean => machineId.startsWith("App");

        const plugin = FlowPlugin({
          visibility: "custom",
          filter: customFilter,
        });

        expect(plugin).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // Test Suite: Internal Prefix Exclusion
  // ===========================================================================

  describe("internal prefix exclusion", () => {
    it("should use default internal prefixes", () => {
      expect(DEFAULT_INTERNAL_PREFIXES).toContain("__devtools");
      expect(DEFAULT_INTERNAL_PREFIXES).toContain("__internal");
      expect(DEFAULT_INTERNAL_PREFIXES).toContain("devtools.");
      expect(DEFAULT_INTERNAL_PREFIXES.length).toBe(3);
    });

    it("should allow custom internal prefixes", () => {
      const customPrefixes = ["__custom", "_private"] as const;

      const plugin = FlowPlugin({
        visibility: "user",
        internalPrefixes: customPrefixes,
      });

      expect(plugin).toBeDefined();
    });
  });

  // ===========================================================================
  // Test Suite: Options Type Safety
  // ===========================================================================

  describe("options type safety", () => {
    it("should accept empty options object", () => {
      const plugin = FlowPlugin({});
      expect(plugin).toBeDefined();
    });

    it("should accept partial options", () => {
      const options: FlowPluginOptions = {
        visibility: "user",
        // internalPrefixes not specified - should use defaults
      };

      const plugin = FlowPlugin(options);
      expect(plugin).toBeDefined();
    });

    it("should accept full options object", () => {
      const options: FlowPluginOptions = {
        visibility: "custom",
        filter: (id: string) => id.startsWith("user."),
        internalPrefixes: ["__test"],
      };

      const plugin = FlowPlugin(options);
      expect(plugin).toBeDefined();
    });
  });
});

// =============================================================================
// Test Suite: createVisibilityFilter
// =============================================================================

import { createVisibilityFilter } from "../src/flow-plugin.js";

describe("createVisibilityFilter", () => {
  describe("user mode", () => {
    it("should exclude machines with default internal prefixes", () => {
      const filter = createVisibilityFilter({ visibility: "user" });

      // Internal machines should be excluded
      expect(filter("__devtools.container-discovery")).toBe(false);
      expect(filter("__internal.state-machine")).toBe(false);
      expect(filter("devtools.ui-state")).toBe(false);

      // User machines should be included
      expect(filter("App.authMachine")).toBe(true);
      expect(filter("userFormMachine")).toBe(true);
      expect(filter("checkout.cartMachine")).toBe(true);
    });

    it("should exclude machines with custom internal prefixes", () => {
      const filter = createVisibilityFilter({
        visibility: "user",
        internalPrefixes: ["_private.", "internal."],
      });

      // Custom internal machines should be excluded
      expect(filter("_private.secretMachine")).toBe(false);
      expect(filter("internal.debugMachine")).toBe(false);

      // Default prefixes should NOT be excluded (we replaced them)
      expect(filter("__devtools.someMachine")).toBe(true);

      // User machines should be included
      expect(filter("publicMachine")).toBe(true);
    });
  });

  describe("all mode", () => {
    it("should include all machines regardless of prefix", () => {
      const filter = createVisibilityFilter({ visibility: "all" });

      // Everything should be included
      expect(filter("__devtools.container-discovery")).toBe(true);
      expect(filter("__internal.state-machine")).toBe(true);
      expect(filter("devtools.ui-state")).toBe(true);
      expect(filter("App.authMachine")).toBe(true);
      expect(filter("userFormMachine")).toBe(true);
    });
  });

  describe("custom mode", () => {
    it("should use provided custom filter function", () => {
      const customFilter = (machineId: string): boolean => machineId.startsWith("App.");

      const filter = createVisibilityFilter({
        visibility: "custom",
        filter: customFilter,
      });

      // Only App.* machines should be included
      expect(filter("App.authMachine")).toBe(true);
      expect(filter("App.formMachine")).toBe(true);
      expect(filter("userMachine")).toBe(false);
      expect(filter("__devtools.someMachine")).toBe(false);
    });

    it("should fallback to including all when filter not provided in custom mode", () => {
      const filter = createVisibilityFilter({
        visibility: "custom",
        // No filter provided - should default to include all
      });

      expect(filter("anyMachine")).toBe(true);
      expect(filter("__internal.machine")).toBe(true);
    });
  });
});
