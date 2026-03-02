import { describe, it, expect } from "vitest";
import { getPortMetadata } from "@hex-di/core";
import {
  GuardLibraryInspectorAdapter,
  GuardLibraryInspectorPort,
  GuardInspectorPort,
  GuardInspector,
} from "../../src/index.js";

describe("GuardLibraryInspectorAdapter", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(GuardLibraryInspectorAdapter)).toBe(true);
  });

  it("provides GuardLibraryInspectorPort", () => {
    expect(GuardLibraryInspectorAdapter.provides).toBe(GuardLibraryInspectorPort);
  });

  it("requires [GuardInspectorPort]", () => {
    expect(GuardLibraryInspectorAdapter.requires).toHaveLength(1);
    expect(GuardLibraryInspectorAdapter.requires[0]).toBe(GuardInspectorPort);
  });

  it("has singleton lifetime", () => {
    expect(GuardLibraryInspectorAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(GuardLibraryInspectorAdapter.factoryKind).toBe("sync");
  });

  it("factory returns a LibraryInspector with name 'guard'", () => {
    const inspector = new GuardInspector();
    const result = GuardLibraryInspectorAdapter.factory({
      GuardInspector: inspector,
    });

    expect(result.name).toBe("guard");
    expect(typeof result.getSnapshot).toBe("function");
  });

  it("factory delegates getSnapshot to GuardInspector", () => {
    const inspector = new GuardInspector();
    inspector.registerPolicy("MyPort", "hasPermission");

    const result = GuardLibraryInspectorAdapter.factory({
      GuardInspector: inspector,
    });

    const snapshot = result.getSnapshot();
    expect(snapshot.activePolicies).toStrictEqual({ MyPort: "hasPermission" });
  });
});

describe("GuardLibraryInspectorPort (auto-registration precondition)", () => {
  it("has category 'library-inspector'", () => {
    const meta = getPortMetadata(GuardLibraryInspectorPort);
    expect(meta?.category).toBe("library-inspector");
  });
});
