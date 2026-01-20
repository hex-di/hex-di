/**
 * Tests for Plugin Preset Factory Functions
 *
 * These tests verify that preset functions return the correct plugins
 * in the correct order, are readonly, and are composable.
 */

import { describe, it, expect } from "vitest";
import { defaultPlugins, minimalPlugins } from "../../src/plugins/presets.js";
import type { DevToolsPlugin } from "../../src/runtime/index.js";

describe("Plugin Presets", () => {
  describe("defaultPlugins", () => {
    it("returns 4 plugins in order: Graph, Services, Tracing, Inspector", () => {
      const plugins = defaultPlugins();

      expect(plugins).toHaveLength(4);
      expect(plugins[0].id).toBe("graph");
      expect(plugins[0].label).toBe("Graph");
      expect(plugins[1].id).toBe("services");
      expect(plugins[1].label).toBe("Services");
      expect(plugins[2].id).toBe("tracing");
      expect(plugins[2].label).toBe("Tracing");
      expect(plugins[3].id).toBe("inspector");
      expect(plugins[3].label).toBe("Inspector");
    });

    it("returns the same cached plugin instances on each call", () => {
      const plugins1 = defaultPlugins();
      const plugins2 = defaultPlugins();

      // Arrays should be the same reference (cached for efficiency)
      // Plugins are immutable frozen objects, so sharing is safe
      expect(plugins1).toBe(plugins2);

      // Each plugin should be the same cached instance
      expect(plugins1[0]).toBe(plugins2[0]);
      expect(plugins1[1]).toBe(plugins2[1]);
      expect(plugins1[2]).toBe(plugins2[2]);
      expect(plugins1[3]).toBe(plugins2[3]);
    });

    it("returns a readonly array", () => {
      const plugins = defaultPlugins();

      // TypeScript should enforce readonly, but we verify the array is frozen at runtime
      expect(Object.isFrozen(plugins)).toBe(true);
    });
  });

  describe("minimalPlugins", () => {
    it("returns 2 plugins: Services, Inspector", () => {
      const plugins = minimalPlugins();

      expect(plugins).toHaveLength(2);
      expect(plugins[0].id).toBe("services");
      expect(plugins[0].label).toBe("Services");
      expect(plugins[1].id).toBe("inspector");
      expect(plugins[1].label).toBe("Inspector");
    });

    it("returns the same cached plugin instances on each call", () => {
      const plugins1 = minimalPlugins();
      const plugins2 = minimalPlugins();

      // Arrays should be the same reference (cached for efficiency)
      // Plugins are immutable frozen objects, so sharing is safe
      expect(plugins1).toBe(plugins2);

      // Each plugin should be the same cached instance
      expect(plugins1[0]).toBe(plugins2[0]);
      expect(plugins1[1]).toBe(plugins2[1]);
    });

    it("returns a readonly array", () => {
      const plugins = minimalPlugins();

      // TypeScript should enforce readonly, but we verify the array is frozen at runtime
      expect(Object.isFrozen(plugins)).toBe(true);
    });
  });

  describe("preset composition", () => {
    it("allows composition with spread operator and custom plugins", () => {
      // Create a mock custom plugin
      const CustomPlugin: DevToolsPlugin = Object.freeze({
        id: "custom",
        label: "Custom",
        component: () => null,
      });

      // Compose minimal plugins with custom plugin
      const composedPlugins = [...minimalPlugins(), CustomPlugin] as const;

      expect(composedPlugins).toHaveLength(3);
      expect(composedPlugins[0].id).toBe("services");
      expect(composedPlugins[1].id).toBe("inspector");
      expect(composedPlugins[2].id).toBe("custom");
    });

    it("allows prepending custom plugins to default plugins", () => {
      // Create a mock custom plugin
      const CustomPlugin: DevToolsPlugin = Object.freeze({
        id: "custom",
        label: "Custom",
        component: () => null,
      });

      // Prepend custom plugin to default plugins
      const composedPlugins = [CustomPlugin, ...defaultPlugins()] as const;

      expect(composedPlugins).toHaveLength(5);
      expect(composedPlugins[0].id).toBe("custom");
      expect(composedPlugins[1].id).toBe("graph");
      expect(composedPlugins[2].id).toBe("services");
      expect(composedPlugins[3].id).toBe("tracing");
      expect(composedPlugins[4].id).toBe("inspector");
    });

    it("allows combining minimal plugins with additional default plugins", () => {
      // Get just the graph plugin from default plugins
      const graphPlugin = defaultPlugins()[0];

      // Compose minimal plugins with graph plugin
      const composedPlugins = [graphPlugin, ...minimalPlugins()] as const;

      expect(composedPlugins).toHaveLength(3);
      expect(composedPlugins[0].id).toBe("graph");
      expect(composedPlugins[1].id).toBe("services");
      expect(composedPlugins[2].id).toBe("inspector");
    });
  });
});
