/**
 * Type-level tests for PanelProps.
 *
 * DoD 43.7:
 * - PanelProps uses InspectorDataSource, not RemoteInspectorAPI
 * - PanelProps fields have correct types
 * - DevToolsPanel component type uses PanelProps
 */

import { describe, it, expectTypeOf } from "vitest";
import type { InspectorDataSource } from "../../src/data/inspector-data-source.js";
import type { PanelProps, DevToolsPanel, ResolvedTheme } from "../../src/panels/types.js";

describe("PanelProps — Type Level", () => {
  it("PanelProps.dataSource is InspectorDataSource", () => {
    expectTypeOf<PanelProps["dataSource"]>().toMatchTypeOf<InspectorDataSource>();
  });

  it("PanelProps.theme is ResolvedTheme ('light' | 'dark')", () => {
    expectTypeOf<PanelProps["theme"]>().toEqualTypeOf<ResolvedTheme>();
    expectTypeOf<PanelProps["theme"]>().toEqualTypeOf<"light" | "dark">();
  });

  it("PanelProps.width is number", () => {
    expectTypeOf<PanelProps["width"]>().toEqualTypeOf<number>();
  });

  it("PanelProps.height is number", () => {
    expectTypeOf<PanelProps["height"]>().toEqualTypeOf<number>();
  });

  it("DevToolsPanel.component accepts PanelProps", () => {
    expectTypeOf<DevToolsPanel["component"]>().toMatchTypeOf<React.ComponentType<PanelProps>>();
  });

  it("DevToolsPanel has id, label, icon, order fields", () => {
    expectTypeOf<DevToolsPanel["id"]>().toEqualTypeOf<string>();
    expectTypeOf<DevToolsPanel["label"]>().toEqualTypeOf<string>();
    expectTypeOf<DevToolsPanel["icon"]>().toEqualTypeOf<string>();
    expectTypeOf<DevToolsPanel["order"]>().toEqualTypeOf<number>();
  });
});
