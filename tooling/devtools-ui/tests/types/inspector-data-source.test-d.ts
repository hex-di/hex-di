/**
 * Type-level tests for InspectorDataSource.
 *
 * DoD 43.7:
 * - InspectorDataSource methods return optional values
 * - LocalInspectorAdapter satisfies InspectorDataSource
 * - sourceType discriminant types are correct
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  ContainerSnapshot,
  ScopeTree,
  ContainerGraphData,
  UnifiedSnapshot,
  AdapterInfo,
  LibraryInspector,
  ResultStatistics,
  InspectorEvent,
} from "@hex-di/core";
import type { InspectorDataSource } from "../../src/data/inspector-data-source.js";
import type { LocalInspectorAdapter } from "../../src/data/local-inspector-adapter.js";

describe("InspectorDataSource — Type Level", () => {
  it("getSnapshot returns ContainerSnapshot | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getSnapshot"]>>().toEqualTypeOf<
      ContainerSnapshot | undefined
    >();
  });

  it("getScopeTree returns ScopeTree | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getScopeTree"]>>().toEqualTypeOf<
      ScopeTree | undefined
    >();
  });

  it("getGraphData returns ContainerGraphData | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getGraphData"]>>().toEqualTypeOf<
      ContainerGraphData | undefined
    >();
  });

  it("getUnifiedSnapshot returns UnifiedSnapshot | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getUnifiedSnapshot"]>>().toEqualTypeOf<
      UnifiedSnapshot | undefined
    >();
  });

  it("getAdapterInfo returns readonly AdapterInfo[] | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getAdapterInfo"]>>().toEqualTypeOf<
      readonly AdapterInfo[] | undefined
    >();
  });

  it("getLibraryInspectors returns ReadonlyMap<string, LibraryInspector> | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getLibraryInspectors"]>>().toEqualTypeOf<
      ReadonlyMap<string, LibraryInspector> | undefined
    >();
  });

  it("getAllResultStatistics returns ReadonlyMap<string, ResultStatistics> | undefined", () => {
    expectTypeOf<ReturnType<InspectorDataSource["getAllResultStatistics"]>>().toEqualTypeOf<
      ReadonlyMap<string, ResultStatistics> | undefined
    >();
  });

  it("subscribe accepts InspectorEvent listener and returns unsubscribe", () => {
    expectTypeOf<InspectorDataSource["subscribe"]>().toEqualTypeOf<
      (listener: (event: InspectorEvent) => void) => () => void
    >();
  });

  it("sourceType is 'remote' | 'local'", () => {
    expectTypeOf<InspectorDataSource["sourceType"]>().toEqualTypeOf<"remote" | "local">();
  });

  it("displayName is string", () => {
    expectTypeOf<InspectorDataSource["displayName"]>().toEqualTypeOf<string>();
  });

  it("LocalInspectorAdapter satisfies InspectorDataSource", () => {
    expectTypeOf<LocalInspectorAdapter>().toMatchTypeOf<InspectorDataSource>();
  });

  it("LocalInspectorAdapter sourceType is narrowed to 'local'", () => {
    expectTypeOf<LocalInspectorAdapter["sourceType"]>().toEqualTypeOf<"local">();
  });
});
