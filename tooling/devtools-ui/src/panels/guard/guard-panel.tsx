/**
 * GuardPanel — internal panel component for the Guard Panel.
 *
 * Manages state, view switching, ErrorBoundary, and StatusBar.
 * Renders real view components for all 7 views.
 * Uses GuardDataSource interface (not InspectorDataSource).
 *
 * Spec: 03-views-and-wireframes.md (3.1, 3.2), 14-integration.md (14.1, 14.8)
 *
 * @packageDocumentation
 */

import { Component, useCallback, useEffect, useState } from "react";
import { getAllowRateZoneColor } from "./visual-encoding.js";
import { GuardPanelToolbar } from "./guard-panel-toolbar.js";
import { OverviewDashboard } from "./overview-dashboard.js";
import { PolicyEvaluationTree } from "./policy-evaluation-tree.js";
import { DecisionLog } from "./decision-log.js";
import { PolicyPathExplorer } from "./policy-path-explorer.js";
import { AccessFlowStatistics } from "./access-flow-statistics.js";
import { EvaluationTimeline } from "./evaluation-timeline.js";
import { RoleHierarchyGraph } from "./role-hierarchy-graph.js";
import { RoleDetail } from "./role-detail.js";
import { GuardEducationalSidebar } from "./educational-sidebar.js";
import { GuardFilterSystem } from "./filter-system.js";
import type {
  GuardDataEvent,
  GuardDataSource,
  GuardEvaluationDescriptor,
  GuardFilterState,
  GuardPanelNavigation,
  GuardPanelState,
  GuardPortStatistics,
  GuardViewId,
} from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardPanelProps {
  readonly dataSource: GuardDataSource;
  readonly theme: "light" | "dark";
  readonly navigateTo: (panel: string, context: Record<string, unknown>) => void;
  readonly initialState?: GuardPanelNavigation;
}

// ── Default filter ──────────────────────────────────────────────────────────

const DEFAULT_FILTER: GuardFilterState = {
  portSearch: "",
  subjectId: undefined,
  roleName: undefined,
  decision: "all",
  policyKind: undefined,
  timeRange: "all",
};

// ── Error Boundary (panel-level) ────────────────────────────────────────────

interface PanelErrorBoundaryProps {
  readonly children: React.ReactNode;
}

interface PanelErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: unknown;
}

class GuardPanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: unknown): PanelErrorBoundaryState {
    return { hasError: true, error };
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      const msg =
        this.state.error instanceof Error
          ? this.state.error.message
          : "An unexpected error occurred";
      return (
        <div
          data-testid="guard-error-fallback"
          role="alert"
          style={{
            padding: "var(--hex-space-xl)",
            color: "var(--hex-error)",
          }}
        >
          <strong>Something went wrong</strong>
          <p>{msg}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Status Bar ──────────────────────────────────────────────────────────────

interface StatusBarProps {
  readonly descriptor: GuardEvaluationDescriptor | undefined;
  readonly portStats: GuardPortStatistics | undefined;
}

function GuardPanelStatusBar({ descriptor, portStats }: StatusBarProps): React.ReactElement | null {
  if (!descriptor || !portStats) {
    return null;
  }

  const zone = getAllowRateZoneColor(portStats.allowRate);
  const pct = Math.round(portStats.allowRate * 100);

  return (
    <div
      data-testid="guard-status-bar"
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--hex-space-md)",
        padding: "var(--hex-space-xs) var(--hex-space-md)",
        borderTop: "1px solid var(--hex-border)",
        backgroundColor: "var(--hex-bg-secondary)",
        fontSize: "var(--hex-font-size-xs)",
        color: "var(--hex-text-muted)",
      }}
    >
      <span>{descriptor.label}</span>
      <span>Allow: {portStats.allowCount}</span>
      <span>Deny: {portStats.denyCount}</span>
      <span
        data-testid="allow-rate-badge"
        data-zone={zone}
        style={{
          padding: "1px 6px",
          borderRadius: "var(--hex-radius-pill)",
          fontWeight: 600,
          color: "#fff",
          backgroundColor:
            zone === "green"
              ? "var(--hex-guard-allow)"
              : zone === "amber"
                ? "var(--hex-guard-amber, #f59e0b)"
                : "var(--hex-guard-deny)",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Descriptor Required Prompt ──────────────────────────────────────────────

function DescriptorRequiredPrompt({
  viewId,
}: {
  readonly viewId: GuardViewId;
}): React.ReactElement {
  return (
    <div data-testid={`guard-view-${viewId}`} role="tabpanel" style={{ flex: 1 }}>
      <div
        data-testid="guard-descriptor-required"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--hex-space-xl)",
          color: "var(--hex-text-muted)",
          fontSize: "var(--hex-font-size-sm)",
          textAlign: "center",
          height: "100%",
        }}
      >
        <span>Select a port to view its policy {viewId === "tree" ? "tree" : "paths"}</span>
      </div>
    </div>
  );
}

// ── Active View Renderer ────────────────────────────────────────────────────

interface ActiveViewProps {
  readonly viewId: GuardViewId;
  readonly dataSource: GuardDataSource;
  readonly selectedDescriptor: GuardEvaluationDescriptor | undefined;
  readonly selectedExecutionId: string | undefined;
  readonly selectedNodeId: string | undefined;
  readonly selectedRoleName: string | undefined;
  readonly onSelectExecution: (executionId: string) => void;
  readonly onSelectNode: (nodeId: string) => void;
  readonly onRoleSelect: (roleName: string) => void;
}

function ActiveView({
  viewId,
  dataSource,
  selectedDescriptor,
  selectedExecutionId,
  selectedNodeId: _selectedNodeId,
  selectedRoleName,
  onSelectExecution,
  onSelectNode,
  onRoleSelect,
}: ActiveViewProps): React.ReactElement {
  const snapshot = dataSource.getSnapshot();
  const portStatistics = dataSource.getPortStatistics();
  const roleHierarchy = dataSource.getRoleHierarchy();

  // Get executions for the selected descriptor's port, or from snapshot
  const executions = selectedDescriptor
    ? dataSource.getExecutions(selectedDescriptor.portName)
    : snapshot.recentExecutions;

  // Find the selected execution
  const selectedExecution = selectedExecutionId
    ? executions.find(e => e.executionId === selectedExecutionId)
    : undefined;

  // Get paths for the selected descriptor
  const paths = selectedDescriptor ? dataSource.getPaths(selectedDescriptor.descriptorId) : [];

  switch (viewId) {
    case "overview":
      return (
        <div data-testid="guard-view-overview" role="tabpanel">
          <OverviewDashboard snapshot={snapshot} />
        </div>
      );

    case "tree":
      if (!selectedDescriptor) {
        return <DescriptorRequiredPrompt viewId="tree" />;
      }
      return (
        <div data-testid="guard-view-tree" role="tabpanel">
          <PolicyEvaluationTree
            descriptorId={selectedDescriptor.descriptorId}
            descriptor={selectedDescriptor}
            execution={selectedExecution}
            onNodeSelect={onSelectNode}
          />
        </div>
      );

    case "log":
      return (
        <div data-testid="guard-view-log" role="tabpanel">
          <DecisionLog
            executions={executions}
            onSelect={onSelectExecution}
            selectedId={selectedExecutionId}
          />
        </div>
      );

    case "paths":
      if (!selectedDescriptor) {
        return <DescriptorRequiredPrompt viewId="paths" />;
      }
      return (
        <div data-testid="guard-view-paths" role="tabpanel">
          <PolicyPathExplorer
            paths={paths}
            descriptorId={selectedDescriptor.descriptorId}
            onPathSelect={() => {
              // Path selection — future state integration
            }}
          />
        </div>
      );

    case "sankey":
      return (
        <div data-testid="guard-view-sankey" role="tabpanel">
          <AccessFlowStatistics snapshot={snapshot} portStats={portStatistics} />
        </div>
      );

    case "timeline":
      return (
        <div data-testid="guard-view-timeline" role="tabpanel">
          <EvaluationTimeline executions={executions} selectedExecutionId={selectedExecutionId} />
        </div>
      );

    case "roles": {
      const selectedRoleObj = selectedRoleName
        ? roleHierarchy.find(r => r.name === selectedRoleName)
        : undefined;

      return (
        <div
          data-testid="guard-view-roles"
          role="tabpanel"
          style={{ display: "flex", gap: "16px" }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <RoleHierarchyGraph
              roles={roleHierarchy}
              selectedRole={selectedRoleName}
              onRoleSelect={onRoleSelect}
            />
          </div>
          {selectedRoleObj && (
            <div style={{ width: "320px", flexShrink: 0 }}>
              <RoleDetail
                role={selectedRoleObj}
                allRoles={roleHierarchy}
                onParentClick={onRoleSelect}
              />
            </div>
          )}
        </div>
      );
    }
  }
}

// ── Main Component ──────────────────────────────────────────────────────────

function GuardPanelInner({
  dataSource,
  theme,
  navigateTo: _navigateTo,
  initialState,
}: GuardPanelProps): React.ReactElement {
  // ── State ───────────────────────────────────────────────────────────────

  const [state, setState] = useState<GuardPanelState>(() => ({
    selectedDescriptorId: initialState?.descriptorId,
    selectedExecutionId: initialState?.executionId,
    selectedNodeId: initialState?.nodeId,
    activeView: initialState?.view ?? "overview",
    filter: DEFAULT_FILTER,
    educationalSidebarOpen: false,
    connectionStatus: "connected",
  }));

  // ── Subscription ────────────────────────────────────────────────────────

  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = dataSource.subscribe((event: GuardDataEvent) => {
      if (event.type === "connection-lost") {
        setState(prev => ({ ...prev, connectionStatus: "disconnected" }));
      } else if (event.type === "connection-restored") {
        setState(prev => ({ ...prev, connectionStatus: "connected" }));
      }
      setVersion(v => v + 1);
    });
    return unsub;
  }, [dataSource]);

  // ── Derived data ────────────────────────────────────────────────────────

  const descriptors = dataSource.getDescriptors();
  const portStatistics = dataSource.getPortStatistics();

  const selectedDescriptor =
    state.selectedDescriptorId !== undefined
      ? descriptors.get(state.selectedDescriptorId)
      : undefined;

  const selectedPortStats =
    selectedDescriptor?.portName !== undefined
      ? portStatistics.get(selectedDescriptor.portName)
      : undefined;

  // ── Handlers ────────────────────────────────────────────────────────────

  const setActiveView = useCallback((viewId: GuardViewId) => {
    setState(prev => ({ ...prev, activeView: viewId }));
  }, []);

  const setSelectedDescriptor = useCallback((descriptorId: string) => {
    setState(prev => ({ ...prev, selectedDescriptorId: descriptorId || undefined }));
  }, []);

  const setSelectedExecution = useCallback((executionId: string) => {
    setState(prev => ({ ...prev, selectedExecutionId: executionId || undefined }));
  }, []);

  const setSelectedNode = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId || undefined }));
  }, []);

  const setFilter = useCallback((filter: GuardFilterState) => {
    setState(prev => ({ ...prev, filter }));
  }, []);

  const [selectedRoleName, setSelectedRoleName] = useState<string | undefined>(undefined);

  const handleRoleSelect = useCallback((name: string) => {
    setSelectedRoleName(prev => (prev === name ? undefined : name));
  }, []);

  const toggleEducational = useCallback(() => {
    setState(prev => ({
      ...prev,
      educationalSidebarOpen: !prev.educationalSidebarOpen,
    }));
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────

  if (descriptors.size === 0) {
    return (
      <div
        data-testid="guard-panel"
        data-theme={theme}
        data-connection-status={state.connectionStatus}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          fontFamily: "var(--hex-font-sans)",
          color: "var(--hex-text-primary)",
          backgroundColor: "var(--hex-bg-primary)",
        }}
      >
        <GuardPanelToolbar
          activeView={state.activeView}
          onViewChange={setActiveView}
          descriptors={descriptors}
          selectedDescriptorId={state.selectedDescriptorId}
          onDescriptorChange={setSelectedDescriptor}
          educationalSidebarOpen={state.educationalSidebarOpen}
          onToggleEducational={toggleEducational}
          connectionStatus={state.connectionStatus}
        />
        <div
          data-testid="guard-empty-state"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "var(--hex-space-xl)",
            color: "var(--hex-text-muted)",
          }}
        >
          <span>No guard policies detected</span>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="guard-panel"
      data-theme={theme}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "var(--hex-font-sans)",
        color: "var(--hex-text-primary)",
        backgroundColor: "var(--hex-bg-primary)",
        position: "relative",
      }}
    >
      <GuardPanelToolbar
        activeView={state.activeView}
        onViewChange={setActiveView}
        descriptors={descriptors}
        selectedDescriptorId={state.selectedDescriptorId}
        onDescriptorChange={setSelectedDescriptor}
        educationalSidebarOpen={state.educationalSidebarOpen}
        onToggleEducational={toggleEducational}
        connectionStatus={state.connectionStatus}
      />

      {/* Filter system */}
      <GuardFilterSystem filter={state.filter} onChange={setFilter} />

      {/* Descriptor context */}
      {selectedDescriptor && (
        <span
          style={{
            padding: "var(--hex-space-xs) var(--hex-space-md)",
            fontSize: "var(--hex-font-size-xs)",
            color: "var(--hex-text-muted)",
            fontFamily: "var(--hex-font-mono)",
          }}
        >
          {selectedDescriptor.label}
        </span>
      )}

      {/* Active view */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <ActiveView
          viewId={state.activeView}
          dataSource={dataSource}
          selectedDescriptor={selectedDescriptor}
          selectedExecutionId={state.selectedExecutionId}
          selectedNodeId={state.selectedNodeId}
          selectedRoleName={selectedRoleName}
          onSelectExecution={setSelectedExecution}
          onSelectNode={setSelectedNode}
          onRoleSelect={handleRoleSelect}
        />
      </div>

      {/* Educational sidebar */}
      {state.educationalSidebarOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "var(--hex-sidebar-width, 280px)",
            borderLeft: "1px solid var(--hex-border)",
            backgroundColor: "var(--hex-bg-secondary)",
            zIndex: 10,
          }}
        >
          <GuardEducationalSidebar
            isOpen={state.educationalSidebarOpen}
            onClose={toggleEducational}
          />
        </div>
      )}
      {!state.educationalSidebarOpen && (
        <GuardEducationalSidebar isOpen={false} onClose={toggleEducational} />
      )}

      {/* Status bar */}
      <GuardPanelStatusBar descriptor={selectedDescriptor} portStats={selectedPortStats} />
    </div>
  );
}

/** Top-level GuardPanel wrapped in an error boundary. */
function GuardPanel(props: GuardPanelProps): React.ReactElement {
  return (
    <GuardPanelErrorBoundary>
      <GuardPanelInner {...props} />
    </GuardPanelErrorBoundary>
  );
}

export { GuardPanel };
export type { GuardPanelProps };
