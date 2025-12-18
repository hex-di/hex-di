/**
 * Services Tab Tests - Task Group 8.1
 *
 * Tests for the Services Tab implementation including:
 * 1. Service list rendering with all properties
 * 2. Sorting by name, lifetime, count, duration
 * 3. Search/filter functionality
 * 4. Container grouping display
 * 5. Captive warning badges
 * 6. Navigation to Inspector tab
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ServicesView } from "../../src/components/ServicesView.js";
import { PrimitivesProvider } from "../../src/hooks/primitives-context.js";
import { DOMPrimitives } from "../../src/dom/primitives.js";
import type { ServicesViewModel } from "../../src/view-models/services.vm.js";
import { createEmptyServicesViewModel } from "../../src/view-models/services.vm.js";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a wrapper with DOM primitives for testing.
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrimitivesProvider primitives={DOMPrimitives}>
      {children}
    </PrimitivesProvider>
  );
}

/**
 * Creates mock service data for testing.
 */
function createMockServicesViewModel(
  overrides: Partial<ServicesViewModel> = {}
): ServicesViewModel {
  const baseServices = [
    {
      portName: "UserService",
      lifetime: "singleton" as const,
      factoryKind: "sync" as const,
      resolutionCount: 10,
      cacheHitCount: 8,
      cacheHitRate: 0.8,
      avgDurationMs: 5.5,
      avgDurationFormatted: "5.50ms",
      dependencyCount: 3,
      dependentCount: 2,
      containerId: "root",
      containerName: "Root Container",
      isAsync: false,
      asyncStatus: null,
      hasCaptiveWarning: false,
      captiveWarningMessage: null,
    },
    {
      portName: "LoggerService",
      lifetime: "singleton" as const,
      factoryKind: "sync" as const,
      resolutionCount: 50,
      cacheHitCount: 49,
      cacheHitRate: 0.98,
      avgDurationMs: 1.2,
      avgDurationFormatted: "1.20ms",
      dependencyCount: 0,
      dependentCount: 5,
      containerId: "root",
      containerName: "Root Container",
      isAsync: false,
      asyncStatus: null,
      hasCaptiveWarning: false,
      captiveWarningMessage: null,
    },
    {
      portName: "AsyncDataService",
      lifetime: "singleton" as const,
      factoryKind: "async" as const,
      resolutionCount: 5,
      cacheHitCount: 4,
      cacheHitRate: 0.8,
      avgDurationMs: 150.0,
      avgDurationFormatted: "150.00ms",
      dependencyCount: 2,
      dependentCount: 1,
      containerId: "root",
      containerName: "Root Container",
      isAsync: true,
      asyncStatus: "resolved" as const,
      hasCaptiveWarning: false,
      captiveWarningMessage: null,
    },
    {
      portName: "ScopedSession",
      lifetime: "scoped" as const,
      factoryKind: "sync" as const,
      resolutionCount: 25,
      cacheHitCount: 15,
      cacheHitRate: 0.6,
      avgDurationMs: 2.5,
      avgDurationFormatted: "2.50ms",
      dependencyCount: 1,
      dependentCount: 0,
      containerId: "child-1",
      containerName: "Feature Container",
      isAsync: false,
      asyncStatus: null,
      hasCaptiveWarning: true,
      captiveWarningMessage: "Scoped service depends on transient TransientHelper",
    },
  ];

  const baseContainerGroups = [
    {
      containerId: "root",
      containerName: "Root Container",
      containerPhase: "ready" as const,
      serviceCount: 3,
      isExpanded: true,
    },
    {
      containerId: "child-1",
      containerName: "Feature Container",
      containerPhase: "ready" as const,
      serviceCount: 1,
      isExpanded: true,
    },
  ];

  return {
    services: baseServices,
    containerGroups: baseContainerGroups,
    totalServiceCount: 4,
    sortColumn: "name" as const,
    sortDirection: "asc" as const,
    filterText: "",
    showOnlyCaptive: false,
    showOnlyAsync: false,
    isEmpty: false,
    filteredCount: 4,
    hasCaptiveWarnings: true,
    hasAsyncServices: true,
    hasMultipleContainers: true,
    ...overrides,
  };
}

// =============================================================================
// Test 1: Service list rendering with all properties
// =============================================================================

describe("Services Tab - Service list rendering", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all service properties correctly", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    // Check service names are rendered
    expect(screen.getByText("UserService")).toBeDefined();
    expect(screen.getByText("LoggerService")).toBeDefined();
    expect(screen.getByText("AsyncDataService")).toBeDefined();
    expect(screen.getByText("ScopedSession")).toBeDefined();

    // Check lifetime is displayed
    expect(screen.getAllByText("singleton").length).toBeGreaterThan(0);
    expect(screen.getAllByText("scoped").length).toBeGreaterThan(0);

    // Check resolution counts are displayed
    expect(screen.getByText("10")).toBeDefined();
    expect(screen.getByText("50")).toBeDefined();
  });

  it("renders empty state when no services", () => {
    const viewModel = createEmptyServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    expect(screen.getByTestId("services-empty-state")).toBeDefined();
  });
});

// =============================================================================
// Test 2: Sorting by name, lifetime, count, duration
// =============================================================================

describe("Services Tab - Sorting functionality", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onSort when clicking sortable column headers", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    // Click on name header to sort - use getAllByTestId since container groups
    // are rendered and there's only one TableHeader
    const nameHeader = screen.getByTestId("sort-header-name");
    fireEvent.click(nameHeader);
    expect(onSort).toHaveBeenCalledWith("name");

    // Click on lifetime header
    const lifetimeHeader = screen.getByTestId("sort-header-lifetime");
    fireEvent.click(lifetimeHeader);
    expect(onSort).toHaveBeenCalledWith("lifetime");

    // Click on count header
    const countHeader = screen.getByTestId("sort-header-count");
    fireEvent.click(countHeader);
    expect(onSort).toHaveBeenCalledWith("count");

    // Click on duration header
    const durationHeader = screen.getByTestId("sort-header-duration");
    fireEvent.click(durationHeader);
    expect(onSort).toHaveBeenCalledWith("duration");
  });

  it("displays sort indicator on current sort column", () => {
    const viewModel = createMockServicesViewModel({
      sortColumn: "count",
      sortDirection: "desc",
    });
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    const countHeader = screen.getByTestId("sort-header-count");
    // Should have a sort indicator - down arrow for desc
    expect(countHeader.textContent).toContain("\u25BC");
  });
});

// =============================================================================
// Test 3: Search/filter functionality
// =============================================================================

describe("Services Tab - Search/filter functionality", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onFilterChange when typing in search input", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    const searchInput = screen.getByTestId("services-search-input");
    fireEvent.change(searchInput, { target: { value: "User" } });

    expect(onFilterChange).toHaveBeenCalledWith("User");
  });

  it("displays current filter value in search input", () => {
    const viewModel = createMockServicesViewModel({
      filterText: "Logger",
    });
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    const searchInput = screen.getByTestId("services-search-input") as HTMLInputElement;
    expect(searchInput.value).toBe("Logger");
  });
});

// =============================================================================
// Test 4: Container grouping display
// =============================================================================

describe("Services Tab - Container grouping display", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders container groups with correct names and counts", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();
    const onToggleContainerGroup = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
          onToggleContainerGroup={onToggleContainerGroup}
        />
      </TestWrapper>
    );

    // Check container group headers are rendered
    expect(screen.getByText("Root Container")).toBeDefined();
    expect(screen.getByText("Feature Container")).toBeDefined();

    // Check service counts are shown
    expect(screen.getByText("3 services")).toBeDefined();
    expect(screen.getByText("1 services")).toBeDefined();
  });

  it("displays container phase indicator per group", () => {
    const viewModel = createMockServicesViewModel({
      containerGroups: [
        {
          containerId: "root",
          containerName: "Root Container",
          containerPhase: "ready",
          serviceCount: 3,
          isExpanded: true,
        },
        {
          containerId: "child-1",
          containerName: "Feature Container",
          containerPhase: "initializing",
          serviceCount: 1,
          isExpanded: true,
        },
      ],
    });
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    // Check phase badges are displayed
    expect(screen.getByTestId("phase-badge-root")).toBeDefined();
    expect(screen.getByTestId("phase-badge-child-1")).toBeDefined();
  });
});

// =============================================================================
// Test 5: Captive warning badges
// =============================================================================

describe("Services Tab - Captive warning badges", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays warning icon on services with captive dependencies", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    // ScopedSession has captive warning
    const captiveWarningIcon = screen.getByTestId("captive-warning-ScopedSession");
    expect(captiveWarningIcon).toBeDefined();
  });

  it("provides captive warning tooltip with affected dependencies", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    const captiveWarningIcon = screen.getByTestId("captive-warning-ScopedSession");
    // The title attribute should contain the warning message
    expect(captiveWarningIcon.getAttribute("title")).toContain("Scoped service depends on transient");
  });

  it("supports filter toggle to show only captive issues", () => {
    const viewModel = createMockServicesViewModel({
      showOnlyCaptive: false,
      hasCaptiveWarnings: true,
    });
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();
    const onToggleCaptiveFilter = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
          onToggleCaptiveFilter={onToggleCaptiveFilter}
        />
      </TestWrapper>
    );

    const captiveToggle = screen.getByTestId("captive-filter-toggle");
    fireEvent.click(captiveToggle);

    expect(onToggleCaptiveFilter).toHaveBeenCalled();
  });
});

// =============================================================================
// Test 6: Navigation to Inspector tab
// =============================================================================

describe("Services Tab - Navigation to Inspector", () => {
  afterEach(() => {
    cleanup();
  });

  it("calls onServiceSelect when clicking service name", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
        />
      </TestWrapper>
    );

    const userServiceLink = screen.getByTestId("service-link-UserService");
    fireEvent.click(userServiceLink);

    expect(onServiceSelect).toHaveBeenCalledWith("UserService");
  });

  it("navigates to inspector tab when service is selected", () => {
    const viewModel = createMockServicesViewModel();
    const onServiceSelect = vi.fn();
    const onSort = vi.fn();
    const onFilterChange = vi.fn();
    const onNavigateToInspector = vi.fn();

    render(
      <TestWrapper>
        <ServicesView
          viewModel={viewModel}
          onServiceSelect={onServiceSelect}
          onSort={onSort}
          onFilterChange={onFilterChange}
          onNavigateToInspector={onNavigateToInspector}
        />
      </TestWrapper>
    );

    // Click service name to navigate
    const loggerServiceLink = screen.getByTestId("service-link-LoggerService");
    fireEvent.click(loggerServiceLink);

    expect(onServiceSelect).toHaveBeenCalledWith("LoggerService");
    expect(onNavigateToInspector).toHaveBeenCalled();
  });
});
