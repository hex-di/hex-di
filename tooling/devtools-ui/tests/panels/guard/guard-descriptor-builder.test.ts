/**
 * Unit tests for Guard Panel descriptor builder.
 *
 * Spec: 02-instrumentation.md Section 2.3
 */

import { describe, it, expect } from "vitest";
import {
  allOf,
  anyOf,
  createPermission,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  hasSignature,
  not,
  withLabel,
} from "@hex-di/guard";
import { buildDescriptor, extractLeafData } from "../../../src/panels/guard/descriptor-builder.js";

// ── buildDescriptor ─────────────────────────────────────────────────────────

describe("buildDescriptor", () => {
  it("builds a descriptor from a single hasRole leaf", () => {
    const constraint = hasRole("admin");
    const descriptor = buildDescriptor("authPort", constraint);

    expect(descriptor.descriptorId).toBe("guard:authPort");
    expect(descriptor.portName).toBe("authPort");
    expect(descriptor.label).toBe("authPort");
    expect(descriptor.leafCount).toBe(1);
    expect(descriptor.maxDepth).toBe(0);
    expect(descriptor.policyKinds.has("hasRole")).toBe(true);
    expect(descriptor.hasAsyncPolicies).toBe(false);
    expect(descriptor.rootNode.kind).toBe("hasRole");
    expect(descriptor.rootNode.children).toEqual([]);
    expect(descriptor.rootNode.leafData).toEqual({ type: "hasRole", roleName: "admin" });
  });

  it("builds a descriptor from an allOf tree", () => {
    const constraint = allOf(hasRole("admin"), hasRole("editor"));
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.leafCount).toBe(2);
    expect(descriptor.maxDepth).toBe(1);
    expect(descriptor.rootNode.kind).toBe("allOf");
    expect(descriptor.rootNode.children.length).toBe(2);
    expect(descriptor.rootNode.fieldStrategy).toBe("intersection");
  });

  it("builds a descriptor from a nested anyOf/allOf tree", () => {
    const constraint = anyOf(allOf(hasRole("admin"), hasRole("editor")), hasRole("superadmin"));
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.leafCount).toBe(3);
    expect(descriptor.maxDepth).toBe(2);
    expect(descriptor.policyKinds.has("anyOf")).toBe(true);
    expect(descriptor.policyKinds.has("allOf")).toBe(true);
    expect(descriptor.policyKinds.has("hasRole")).toBe(true);
  });

  it("assigns depth-first nodeIds", () => {
    const constraint = allOf(hasRole("a"), hasRole("b"));
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.rootNode.nodeId).toBe("node-0");
    expect(descriptor.rootNode.children[0].nodeId).toBe("node-1");
    expect(descriptor.rootNode.children[1].nodeId).toBe("node-2");
  });

  it("detects async policies from hasRelationship", () => {
    const constraint = hasRelationship("owner");
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.hasAsyncPolicies).toBe(true);
  });

  it("handles not combinator", () => {
    const constraint = not(hasRole("banned"));
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.rootNode.kind).toBe("not");
    expect(descriptor.rootNode.children.length).toBe(1);
    expect(descriptor.leafCount).toBe(1);
    expect(descriptor.policyKinds.has("not")).toBe(true);
  });

  it("handles labeled combinator", () => {
    const constraint = withLabel("Admin check", hasRole("admin"));
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.rootNode.kind).toBe("labeled");
    expect(descriptor.rootNode.label).toBe("Admin check");
    expect(descriptor.rootNode.children.length).toBe(1);
  });

  it("handles hasPermission leaf", () => {
    const perm = createPermission({ resource: "docs", action: "write" });
    const constraint = hasPermission(perm);
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.rootNode.leafData).toEqual({
      type: "hasPermission",
      resource: "docs",
      action: "write",
    });
  });

  it("handles hasSignature leaf", () => {
    const constraint = hasSignature("approval");
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.rootNode.leafData).toEqual({
      type: "hasSignature",
      meaning: "approval",
    });
  });

  it("preserves source location when provided", () => {
    const constraint = hasRole("admin");
    const descriptor = buildDescriptor("port", constraint, "src/app.ts:42");

    expect(descriptor.sourceLocation).toBe("src/app.ts:42");
  });

  it("collects all policy kinds in the tree", () => {
    const constraint = allOf(
      hasRole("admin"),
      anyOf(hasSignature("approval"), hasRelationship("owner"))
    );
    const descriptor = buildDescriptor("port", constraint);

    expect(descriptor.policyKinds.size).toBe(5);
    expect(descriptor.policyKinds.has("allOf")).toBe(true);
    expect(descriptor.policyKinds.has("anyOf")).toBe(true);
    expect(descriptor.policyKinds.has("hasRole")).toBe(true);
    expect(descriptor.policyKinds.has("hasSignature")).toBe(true);
    expect(descriptor.policyKinds.has("hasRelationship")).toBe(true);
  });
});

// ── extractLeafData ─────────────────────────────────────────────────────────

describe("extractLeafData", () => {
  it("returns hasRole data", () => {
    const data = extractLeafData(hasRole("admin"));
    expect(data).toEqual({ type: "hasRole", roleName: "admin" });
  });

  it("returns hasSignature data", () => {
    const data = extractLeafData(hasSignature("approval"));
    expect(data).toEqual({ type: "hasSignature", meaning: "approval" });
  });

  it("returns hasRelationship data", () => {
    const data = extractLeafData(hasRelationship("owner"));
    expect(data).toEqual({ type: "hasRelationship", relation: "owner" });
  });

  it("returns undefined for compound nodes", () => {
    const data = extractLeafData(allOf(hasRole("a"), hasRole("b")));
    expect(data).toBeUndefined();
  });
});
