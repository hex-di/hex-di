/**
 * Tests for ContainerSelector React component.
 *
 * These tests verify:
 * 1. Renders dropdown with all registered containers
 * 2. Shows container kind badges (root/child/lazy/scope)
 * 3. Selecting container calls selectContainer
 * 4. Shows "not available" when registry unavailable
 * 5. Shows "no containers" when list empty
 * 6. Compact mode renders correctly
 * 7. Accessible keyboard navigation
 *
 * @packageDocumentation
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ContainerSelector, ContainerKindBadge } from "../../src/react/container-selector.js";
import { ContainerRegistryContext } from "../../src/react/context/container-registry.js";
import type {
  ContainerRegistryValue,
  ContainerEntry,
} from "../../src/react/context/container-registry.js";
import { Some, None, type Option } from "../../src/react/types/adt.js";
import type { InspectableContainer } from "../../src/react/types/inspectable-container.js";
import { INTERNAL_ACCESS, type ContainerInternalState } from "@hex-di/runtime";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a valid ScopeTree for mocks.
 */
function createMockScopeTree(): {
  id: string;
  status: "active" | "disposed";
  resolvedCount: number;
  totalCount: number;
  children: readonly never[];
} {
  return { id: "container", status: "active", resolvedCount: 0, totalCount: 0, children: [] };
}

/**
 * Creates a mock InspectableContainer for testing.
 */
function createMockContainer(): InspectableContainer {
  const mockState: ContainerInternalState = {
    containerId: "mock",
    disposed: false,
    singletonMemo: { size: 0, entries: [] },
    childScopes: [],
    adapterMap: new Map(),
  };
  return {
    [INTERNAL_ACCESS]: () => mockState,
  };
}

/**
 * Creates a mock ContainerEntry for testing.
 */
function createMockContainerEntry(overrides: Partial<ContainerEntry> = {}): ContainerEntry {
  return {
    id: "test-container",
    label: "Test Container",
    kind: "root",
    container: createMockContainer(),
    parentId: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Creates a mock ContainerRegistryValue for testing.
 */
function createMockRegistryValue(
  entries: ContainerEntry[] = [],
  selectedId: string | null = null
): ContainerRegistryValue {
  const containers = new Map<string, ContainerEntry>();
  for (const entry of entries) {
    containers.set(entry.id, entry);
  }

  const selectContainerMock = vi.fn();
  const selectedIdOption: Option<string> = selectedId !== null ? Some(selectedId) : None;
  const selectedEntry = selectedId !== null ? containers.get(selectedId) : undefined;

  return {
    containers,
    selectedId: selectedIdOption,
    selectContainer: selectContainerMock,
    selectedContainer: selectedEntry !== undefined ? Some(selectedEntry.container) : None,
    selectedEntry: selectedEntry !== undefined ? Some(selectedEntry) : None,
    registerContainer: vi.fn(),
    unregisterContainer: vi.fn(),
  };
}

/**
 * Wrapper component that provides ContainerRegistryContext.
 */
function RegistryWrapper({
  children,
  value,
}: {
  readonly children: React.ReactNode;
  readonly value: ContainerRegistryValue | null;
}) {
  return (
    <ContainerRegistryContext.Provider value={value}>{children}</ContainerRegistryContext.Provider>
  );
}

// =============================================================================
// ContainerSelector Tests
// =============================================================================

describe("ContainerSelector Component", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("rendering with registry available", () => {
    it("renders dropdown with all registered containers", () => {
      const entries = [
        createMockContainerEntry({ id: "root", label: "Root Container", kind: "root" }),
        createMockContainerEntry({
          id: "child-1",
          label: "Child Container",
          kind: "child",
          parentId: "root",
        }),
      ];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      // Check that selector is rendered
      const selector = screen.getByTestId("container-selector");
      expect(selector).toBeDefined();

      // Check for the select element
      const selectElement = screen.getByRole("combobox");
      expect(selectElement).toBeDefined();

      // Check that all container options are present
      const options = screen.getAllByRole("option");
      // 1 disabled placeholder + 2 container options
      expect(options.length).toBe(3);

      // Verify container labels in options
      expect(screen.getByText("Root Container (root)")).toBeDefined();
      expect(screen.getByText("Child Container (child)")).toBeDefined();
    });

    it("shows container kind badges when showKind is true (default)", () => {
      const entries = [
        createMockContainerEntry({ id: "root", label: "Root", kind: "root" }),
        createMockContainerEntry({ id: "child", label: "Child", kind: "child" }),
        createMockContainerEntry({ id: "lazy", label: "Lazy", kind: "lazy" }),
        createMockContainerEntry({ id: "scope", label: "Scope", kind: "scope" }),
      ];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector showKind={true} />
        </RegistryWrapper>
      );

      // Verify that kind is included in labels
      expect(screen.getByText("Root (root)")).toBeDefined();
      expect(screen.getByText("Child (child)")).toBeDefined();
      expect(screen.getByText("Lazy (lazy)")).toBeDefined();
      expect(screen.getByText("Scope (scope)")).toBeDefined();
    });

    it("hides container kind when showKind is false", () => {
      const entries = [
        createMockContainerEntry({ id: "root", label: "Root Container", kind: "root" }),
      ];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector showKind={false} />
        </RegistryWrapper>
      );

      // Option should just show label without kind
      expect(screen.getByText("Root Container")).toBeDefined();
      expect(screen.queryByText("Root Container (root)")).toBeNull();
    });

    it("selecting container calls selectContainer", () => {
      const entries = [
        createMockContainerEntry({ id: "root", label: "Root", kind: "root" }),
        createMockContainerEntry({ id: "child", label: "Child", kind: "child" }),
      ];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      const selectElement = screen.getByRole("combobox");

      // Change selection to child container
      fireEvent.change(selectElement, { target: { value: "child" } });

      // Verify selectContainer was called with Some("child")
      expect(registry.selectContainer).toHaveBeenCalledWith(Some("child"));
    });

    it("selecting empty value calls selectContainer with None", () => {
      const entries = [createMockContainerEntry({ id: "root", label: "Root", kind: "root" })];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      const selectElement = screen.getByRole("combobox");

      // Change selection to empty (deselect)
      fireEvent.change(selectElement, { target: { value: "" } });

      // Verify selectContainer was called with None
      expect(registry.selectContainer).toHaveBeenCalledWith(None);
    });
  });

  describe("rendering without registry", () => {
    it("shows 'not available' when registry is not available (null context)", () => {
      render(
        <RegistryWrapper value={null}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      // Should show not available message
      expect(screen.getByText("Container registry not available")).toBeDefined();

      // Should not render the select element
      expect(screen.queryByRole("combobox")).toBeNull();
    });
  });

  describe("rendering with empty registry", () => {
    it("shows 'no containers' when list is empty", () => {
      const registry = createMockRegistryValue([], null);

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      // Should show no containers message
      expect(screen.getByText("No containers registered")).toBeDefined();

      // Should not render the select element
      expect(screen.queryByRole("combobox")).toBeNull();
    });
  });

  describe("compact mode", () => {
    it("renders in compact mode with smaller styling", () => {
      const entries = [createMockContainerEntry({ id: "root", label: "Root", kind: "root" })];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector compact={true} />
        </RegistryWrapper>
      );

      // Component should render
      const selector = screen.getByTestId("container-selector");
      expect(selector).toBeDefined();

      // Compact mode applies different styling - component renders without error
      const selectElement = screen.getByRole("combobox");
      expect(selectElement).toBeDefined();
    });
  });

  describe("accessibility", () => {
    it("has proper aria-label for screen readers", () => {
      const entries = [createMockContainerEntry({ id: "root", label: "Root", kind: "root" })];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      const selectElement = screen.getByRole("combobox");
      expect(selectElement.getAttribute("aria-label")).toBe("Select container to inspect");
    });

    it("has proper label association", () => {
      const entries = [createMockContainerEntry({ id: "root", label: "Root", kind: "root" })];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      // Label should be present
      const label = screen.getByText("Container");
      expect(label).toBeDefined();
      expect(label.tagName.toLowerCase()).toBe("label");

      // Select should have id matching label's htmlFor
      const selectElement = screen.getByRole("combobox");
      expect(selectElement.id).toBe("container-select");
    });

    it("supports keyboard navigation", () => {
      const entries = [
        createMockContainerEntry({ id: "root", label: "Root", kind: "root" }),
        createMockContainerEntry({ id: "child", label: "Child", kind: "child" }),
      ];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector />
        </RegistryWrapper>
      );

      const selectElement = screen.getByRole("combobox");

      // Focus the element using the actual DOM focus method
      selectElement.focus();

      // Native select elements support keyboard navigation by default
      // Just verify it can receive focus
      expect(document.activeElement).toBe(selectElement);
    });
  });

  describe("custom styling", () => {
    it("accepts custom className", () => {
      const entries = [createMockContainerEntry({ id: "root", label: "Root", kind: "root" })];
      const registry = createMockRegistryValue(entries, "root");

      render(
        <RegistryWrapper value={registry}>
          <ContainerSelector className="custom-class" />
        </RegistryWrapper>
      );

      const selector = screen.getByTestId("container-selector");
      expect(selector.className).toContain("custom-class");
    });
  });
});

// =============================================================================
// ContainerKindBadge Tests
// =============================================================================

describe("ContainerKindBadge Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders root kind badge", () => {
    render(<ContainerKindBadge kind="root" />);

    const badge = screen.getByTestId("container-kind-badge");
    expect(badge).toBeDefined();
    expect(badge.textContent).toBe("root");
  });

  it("renders child kind badge", () => {
    render(<ContainerKindBadge kind="child" />);

    const badge = screen.getByTestId("container-kind-badge");
    expect(badge.textContent).toBe("child");
  });

  it("renders lazy kind badge", () => {
    render(<ContainerKindBadge kind="lazy" />);

    const badge = screen.getByTestId("container-kind-badge");
    expect(badge.textContent).toBe("lazy");
  });

  it("renders scope kind badge", () => {
    render(<ContainerKindBadge kind="scope" />);

    const badge = screen.getByTestId("container-kind-badge");
    expect(badge.textContent).toBe("scope");
  });
});
