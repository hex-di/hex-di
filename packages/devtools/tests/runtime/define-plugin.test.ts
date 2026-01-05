/**
 * Tests for Plugin Factory and Validation Utilities
 *
 * These tests verify:
 * 1. defineDevToolsPlugin() returns a frozen plugin
 * 2. Plugin validation catches missing required fields
 * 3. Plugin id validation (no spaces, lowercase)
 * 4. Descriptive error messages for invalid configs
 */

import { describe, it, expect } from "vitest";
import type { PluginProps } from "../../src/runtime/types.js";
import { defineDevToolsPlugin } from "../../src/runtime/define-plugin.js";
import { validatePluginId, validatePluginConfig } from "../../src/runtime/validation.js";

// =============================================================================
// Mock Component
// =============================================================================

function MockComponent(_props: PluginProps): null {
  return null;
}

// =============================================================================
// defineDevToolsPlugin() Tests
// =============================================================================

describe("defineDevToolsPlugin", () => {
  describe("valid plugin creation", () => {
    it("should return a frozen plugin with all required fields", () => {
      const plugin = defineDevToolsPlugin({
        id: "test-plugin",
        label: "Test Plugin",
        component: MockComponent,
      });

      expect(plugin.id).toBe("test-plugin");
      expect(plugin.label).toBe("Test Plugin");
      expect(plugin.component).toBe(MockComponent);
      expect(Object.isFrozen(plugin)).toBe(true);
    });

    it("should preserve optional fields when provided", () => {
      const icon = { type: "span", props: { children: "icon" } };
      const shortcuts = [
        {
          key: "t",
          action: () => {},
          description: "Focus test tab",
        },
      ] as const;

      const plugin = defineDevToolsPlugin({
        id: "full-plugin",
        label: "Full Plugin",
        component: MockComponent,
        icon: icon as React.ReactElement,
        shortcuts,
      });

      expect(plugin.icon).toBe(icon);
      expect(plugin.shortcuts).toBe(shortcuts);
    });

    it("should create plugin with minimal required config", () => {
      const plugin = defineDevToolsPlugin({
        id: "minimal",
        label: "Minimal",
        component: MockComponent,
      });

      expect(plugin.id).toBe("minimal");
      expect(plugin.icon).toBeUndefined();
      expect(plugin.shortcuts).toBeUndefined();
    });
  });

  describe("validation integration", () => {
    it("should throw error for missing required field: id", () => {
      expect(() =>
        defineDevToolsPlugin({
          id: "",
          label: "Test",
          component: MockComponent,
        })
      ).toThrow(/plugin id/i);
    });

    it("should throw error for missing required field: label", () => {
      expect(() =>
        defineDevToolsPlugin({
          id: "test",
          label: "",
          component: MockComponent,
        })
      ).toThrow(/plugin label/i);
    });

    it("should throw error for missing required field: component", () => {
      expect(() =>
        defineDevToolsPlugin({
          id: "test",
          label: "Test",
          component: undefined as unknown as React.ComponentType<PluginProps>,
        })
      ).toThrow(/plugin component/i);
    });

    it("should throw error for invalid id format (uppercase)", () => {
      expect(() =>
        defineDevToolsPlugin({
          id: "InvalidPlugin",
          label: "Test",
          component: MockComponent,
        })
      ).toThrow(/lowercase/i);
    });

    it("should throw error for invalid id format (spaces)", () => {
      expect(() =>
        defineDevToolsPlugin({
          id: "invalid plugin",
          label: "Test",
          component: MockComponent,
        })
      ).toThrow(/spaces/i);
    });
  });
});

// =============================================================================
// validatePluginId() Tests
// =============================================================================

describe("validatePluginId", () => {
  describe("valid ids", () => {
    it("should accept lowercase alphanumeric id", () => {
      expect(() => validatePluginId("graph")).not.toThrow();
      expect(() => validatePluginId("services")).not.toThrow();
      expect(() => validatePluginId("tracing")).not.toThrow();
    });

    it("should accept id with hyphens", () => {
      expect(() => validatePluginId("my-plugin")).not.toThrow();
      expect(() => validatePluginId("custom-graph-view")).not.toThrow();
    });

    it("should accept id with numbers", () => {
      expect(() => validatePluginId("plugin1")).not.toThrow();
      expect(() => validatePluginId("v2-plugin")).not.toThrow();
    });

    it("should accept id with underscores", () => {
      expect(() => validatePluginId("my_plugin")).not.toThrow();
      expect(() => validatePluginId("graph_v2")).not.toThrow();
    });
  });

  describe("invalid ids", () => {
    it("should reject empty string", () => {
      expect(() => validatePluginId("")).toThrow(/empty/i);
    });

    it("should reject id with spaces", () => {
      expect(() => validatePluginId("my plugin")).toThrow(/spaces/i);
      expect(() => validatePluginId("graph view")).toThrow(/spaces/i);
    });

    it("should reject uppercase letters", () => {
      expect(() => validatePluginId("Graph")).toThrow(/lowercase/i);
      expect(() => validatePluginId("myPlugin")).toThrow(/lowercase/i);
      expect(() => validatePluginId("PLUGIN")).toThrow(/lowercase/i);
    });

    it("should reject special characters", () => {
      expect(() => validatePluginId("my@plugin")).toThrow(/invalid.*character/i);
      expect(() => validatePluginId("plugin!")).toThrow(/invalid.*character/i);
      expect(() => validatePluginId("plugin.name")).toThrow(/invalid.*character/i);
    });

    it("should reject id starting with number", () => {
      expect(() => validatePluginId("123plugin")).toThrow(/start.*letter/i);
    });

    it("should reject id starting with hyphen", () => {
      expect(() => validatePluginId("-plugin")).toThrow(/start.*letter/i);
    });
  });

  describe("error messages", () => {
    it("should provide helpful error message for spaces", () => {
      expect(() => validatePluginId("my plugin")).toThrow(/plugin id must not contain spaces/i);
    });

    it("should provide helpful error message for uppercase", () => {
      expect(() => validatePluginId("MyPlugin")).toThrow(/plugin id must be lowercase/i);
    });

    it("should provide helpful error message for empty id", () => {
      expect(() => validatePluginId("")).toThrow(/plugin id must not be empty/i);
    });
  });
});

// =============================================================================
// validatePluginConfig() Tests
// =============================================================================

describe("validatePluginConfig", () => {
  describe("valid configs", () => {
    it("should accept valid minimal config", () => {
      const config = {
        id: "test",
        label: "Test",
        component: MockComponent,
      };

      expect(() => validatePluginConfig(config)).not.toThrow();
    });

    it("should accept valid full config", () => {
      const config = {
        id: "test",
        label: "Test",
        component: MockComponent,
        icon: { type: "span" } as React.ReactElement,
        shortcuts: [{ key: "t", action: () => {}, description: "Test" }],
      };

      expect(() => validatePluginConfig(config)).not.toThrow();
    });
  });

  describe("missing required fields", () => {
    it("should reject config missing id", () => {
      const config = {
        label: "Test",
        component: MockComponent,
      };

      expect(() =>
        validatePluginConfig(config as Parameters<typeof validatePluginConfig>[0])
      ).toThrow(/plugin id is required/i);
    });

    it("should reject config missing label", () => {
      const config = {
        id: "test",
        component: MockComponent,
      };

      expect(() =>
        validatePluginConfig(config as Parameters<typeof validatePluginConfig>[0])
      ).toThrow(/plugin label is required/i);
    });

    it("should reject config missing component", () => {
      const config = {
        id: "test",
        label: "Test",
      };

      expect(() =>
        validatePluginConfig(config as Parameters<typeof validatePluginConfig>[0])
      ).toThrow(/plugin component is required/i);
    });
  });

  describe("invalid field values", () => {
    it("should reject empty id", () => {
      const config = {
        id: "",
        label: "Test",
        component: MockComponent,
      };

      expect(() => validatePluginConfig(config)).toThrow(/plugin id/i);
    });

    it("should reject empty label", () => {
      const config = {
        id: "test",
        label: "",
        component: MockComponent,
      };

      expect(() => validatePluginConfig(config)).toThrow(/plugin label must not be empty/i);
    });

    it("should reject whitespace-only label", () => {
      const config = {
        id: "test",
        label: "   ",
        component: MockComponent,
      };

      expect(() => validatePluginConfig(config)).toThrow(/plugin label must not be empty/i);
    });

    it("should reject non-function component", () => {
      const config = {
        id: "test",
        label: "Test",
        component: "not a function" as unknown as React.ComponentType<PluginProps>,
      };

      expect(() => validatePluginConfig(config)).toThrow(/plugin component must be a function/i);
    });
  });

  describe("error messages", () => {
    it("should include the field name in error message", () => {
      expect(() =>
        validatePluginConfig({
          id: "test",
          label: "",
          component: MockComponent,
        })
      ).toThrow(/label/i);
    });

    it("should be descriptive about the validation failure", () => {
      expect(() =>
        validatePluginConfig({
          id: "TestPlugin",
          label: "Test",
          component: MockComponent,
        })
      ).toThrow(/lowercase/i);
    });
  });
});
