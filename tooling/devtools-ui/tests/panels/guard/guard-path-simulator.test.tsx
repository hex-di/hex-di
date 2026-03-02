/**
 * Unit tests for PathSimulator component.
 *
 * Spec: 06-path-analysis.md (6.5), 11-interactions.md (11.8)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PathSimulator } from "../../../src/panels/guard/path-simulator.js";
import type {
  GuardEvaluationDescriptor,
  PolicyNodeDescriptor,
} from "../../../src/panels/guard/types.js";

// ── Test Fixture Factories ──────────────────────────────────────────────────

function makeNode(overrides?: Partial<PolicyNodeDescriptor>): PolicyNodeDescriptor {
  return {
    nodeId: "node-0",
    kind: "hasRole",
    label: undefined,
    children: [],
    leafData: { type: "hasRole", roleName: "admin" },
    depth: 0,
    fieldStrategy: undefined,
    ...overrides,
  };
}

function makeDescriptor(overrides?: Partial<GuardEvaluationDescriptor>): GuardEvaluationDescriptor {
  return {
    descriptorId: "guard:testPort",
    portName: "testPort",
    label: "testPort",
    rootNode: makeNode(),
    leafCount: 1,
    maxDepth: 0,
    policyKinds: new Set(["hasRole"]),
    hasAsyncPolicies: false,
    sourceLocation: undefined,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("PathSimulator", () => {
  afterEach(cleanup);

  it("renders form", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    const form = screen.getByTestId("guard-path-simulator");
    expect(form).toBeDefined();
    expect(form.getAttribute("role")).toBe("form");
  });

  it("has subject ID input", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    const input = screen.getByTestId("guard-simulator-subject");
    expect(input).toBeDefined();
    expect(input.tagName.toLowerCase()).toBe("input");
  });

  it("has roles input", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    const input = screen.getByTestId("guard-simulator-roles");
    expect(input).toBeDefined();
  });

  it("has permissions input", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    const input = screen.getByTestId("guard-simulator-permissions");
    expect(input).toBeDefined();
  });

  it("calls onSimulate with parsed roles on submit", () => {
    const onSimulate = vi.fn();

    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={onSimulate} />);

    const rolesInput = screen.getByTestId("guard-simulator-roles");
    fireEvent.change(rolesInput, { target: { value: "admin, editor" } });

    const form = screen.getByTestId("guard-path-simulator");
    fireEvent.submit(form);

    expect(onSimulate).toHaveBeenCalledTimes(1);
    const arg = onSimulate.mock.calls[0][0];
    expect(arg.roles).toEqual(["admin", "editor"]);
  });

  it("resets form on reset button click", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    // Fill in fields
    const subjectInput = screen.getByTestId("guard-simulator-subject") as HTMLInputElement;
    const rolesInput = screen.getByTestId("guard-simulator-roles") as HTMLInputElement;
    const permissionsInput = screen.getByTestId("guard-simulator-permissions") as HTMLInputElement;

    fireEvent.change(subjectInput, { target: { value: "user-1" } });
    fireEvent.change(rolesInput, { target: { value: "admin" } });
    fireEvent.change(permissionsInput, { target: { value: "docs:read" } });

    // Click reset
    const resetButton = screen.getByTestId("guard-simulator-reset");
    fireEvent.click(resetButton);

    // Verify inputs are empty
    expect(subjectInput.value).toBe("");
    expect(rolesInput.value).toBe("");
    expect(permissionsInput.value).toBe("");
  });

  it("adds attribute", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    const keyInput = screen.getByTestId("guard-simulator-attr-key");
    const valueInput = screen.getByTestId("guard-simulator-attr-value");
    const addButton = screen.getByTestId("guard-simulator-attr-add");

    fireEvent.change(keyInput, { target: { value: "department" } });
    fireEvent.change(valueInput, { target: { value: "engineering" } });
    fireEvent.click(addButton);

    const entry = screen.getByTestId("guard-simulator-attr-entry");
    expect(entry).toBeDefined();
    expect(entry.textContent).toContain("department");
    expect(entry.textContent).toContain("engineering");
  });

  it("removes attribute", () => {
    render(<PathSimulator descriptor={makeDescriptor()} onSimulate={vi.fn()} />);

    // Add an attribute
    const keyInput = screen.getByTestId("guard-simulator-attr-key");
    const valueInput = screen.getByTestId("guard-simulator-attr-value");
    const addButton = screen.getByTestId("guard-simulator-attr-add");

    fireEvent.change(keyInput, { target: { value: "department" } });
    fireEvent.change(valueInput, { target: { value: "engineering" } });
    fireEvent.click(addButton);

    // Verify entry exists
    expect(screen.getByTestId("guard-simulator-attr-entry")).toBeDefined();

    // Click remove
    const removeButton = screen.getByTestId("guard-simulator-attr-remove-department");
    fireEvent.click(removeButton);

    // Verify entry disappeared
    expect(screen.queryByTestId("guard-simulator-attr-entry")).toBeNull();
  });

  it("shows descriptor label", () => {
    render(
      <PathSimulator
        descriptor={makeDescriptor({ label: "My Guard Policy" })}
        onSimulate={vi.fn()}
      />
    );

    const header = screen.getByTestId("guard-simulator-header");
    expect(header.textContent).toContain("My Guard Policy");
  });
});
