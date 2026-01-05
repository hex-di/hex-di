/**
 * ContainerHierarchy Component
 *
 * DevTools component for displaying the container parent-child relationships
 * in a tree view.
 *
 * Features:
 * - Tree view of container parent-child relationships
 * - Expandable/collapsible nodes
 * - Service list per container
 * - Visual indication of container kind (root, child, lazy, scope)
 *
 * Matches wireframe: `planning/visuals/layout-wireframes.md` Section 8.3
 *
 * @packageDocumentation
 */

import { useState, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Container kind indicator.
 */
export type ContainerKind = "root" | "child" | "lazy" | "scope";

/**
 * Container entry in the hierarchy.
 */
export interface ContainerHierarchyEntry {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable label */
  readonly label: string;
  /** Container kind */
  readonly kind: ContainerKind;
  /** Parent container ID (null for root) */
  readonly parentId: string | null;
  /** List of services registered in this container */
  readonly services: readonly string[];
}

/**
 * Props for the ContainerHierarchy component.
 */
export interface ContainerHierarchyProps {
  /** List of containers to display */
  readonly containers: readonly ContainerHierarchyEntry[];
  /** Currently selected container ID */
  readonly selectedId?: string;
  /** Callback when a container is selected */
  readonly onSelect?: (id: string) => void;
  /** Whether to show services list */
  readonly showServices?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a tree structure from flat container list.
 */
interface TreeNode {
  readonly container: ContainerHierarchyEntry;
  readonly children: TreeNode[];
}

function buildTree(containers: readonly ContainerHierarchyEntry[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create nodes
  containers.forEach(container => {
    nodeMap.set(container.id, { container, children: [] });
  });

  // Build tree structure
  containers.forEach(container => {
    const node = nodeMap.get(container.id);
    if (!node) return;

    if (container.parentId === null) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(container.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // If parent not found, treat as root
        roots.push(node);
      }
    }
  });

  return roots;
}

// =============================================================================
// Icons
// =============================================================================

function ChevronDownIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ContainerIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function ServiceIcon({ className = "w-3 h-3" }: { readonly className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

// =============================================================================
// Kind Badge Component
// =============================================================================

interface KindBadgeProps {
  readonly kind: ContainerKind;
}

function KindBadge({ kind }: KindBadgeProps) {
  const styles: Record<ContainerKind, string> = {
    root: "bg-blue-100 text-blue-700",
    child: "bg-green-100 text-green-700",
    lazy: "bg-amber-100 text-amber-700",
    scope: "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${styles[kind]}`}>{kind}</span>
  );
}

// =============================================================================
// Tree Node Component
// =============================================================================

interface TreeNodeComponentProps {
  readonly node: TreeNode;
  readonly depth: number;
  readonly selectedId?: string;
  readonly expandedIds: Set<string>;
  readonly onToggle: (id: string) => void;
  readonly onSelect?: (id: string) => void;
  readonly showServices: boolean;
}

function TreeNodeComponent({
  node,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  showServices,
}: TreeNodeComponentProps) {
  const { container, children } = node;
  const isExpanded = expandedIds.has(container.id);
  const isSelected = selectedId === container.id;
  const hasChildren = children.length > 0;

  return (
    <div data-testid={`container-node-${container.id}`}>
      {/* Container Row */}
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
          isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect?.(container.id)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={e => {
              e.stopPropagation();
              onToggle(container.id);
            }}
            className="p-0.5 hover:bg-gray-200 rounded"
            aria-label={isExpanded ? "Collapse toggle" : "Expand toggle"}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-3 h-3 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-4" /> // Spacer for alignment
        )}

        {/* Container Icon */}
        <ContainerIcon className="w-4 h-4 text-gray-500" />

        {/* Label */}
        <span className="flex-1 text-sm font-medium text-gray-700 truncate">{container.label}</span>

        {/* Kind Badge */}
        <KindBadge kind={container.kind} />
      </div>

      {/* Services List (when expanded and showServices is true) */}
      {isExpanded && showServices && container.services.length > 0 && (
        <div
          className="ml-4 border-l-2 border-gray-100 pl-4 py-1 space-y-1"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          {container.services.map(service => (
            <div key={service} className="flex items-center gap-2 text-xs text-gray-500">
              <ServiceIcon className="w-3 h-3" />
              <span className="font-mono">{service}</span>
            </div>
          ))}
        </div>
      )}

      {/* Children (when expanded) */}
      {isExpanded &&
        children.map(child => (
          <TreeNodeComponent
            key={child.container.id}
            node={child}
            depth={depth + 1}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            showServices={showServices}
          />
        ))}
    </div>
  );
}

// =============================================================================
// ContainerHierarchy Component
// =============================================================================

/**
 * Container hierarchy tree view component.
 *
 * Displays all registered containers in a tree structure based on their
 * parent-child relationships. Supports expansion/collapse and service listing.
 *
 * @example
 * ```tsx
 * <ContainerHierarchy
 *   containers={[
 *     { id: "root", label: "Root", kind: "root", parentId: null, services: ["Logger"] },
 *     { id: "dashboard", label: "Dashboard", kind: "child", parentId: "root", services: ["TaskService"] },
 *   ]}
 *   selectedId="root"
 *   onSelect={(id) => console.log("Selected:", id)}
 *   showServices
 * />
 * ```
 */
export function ContainerHierarchy({
  containers,
  selectedId,
  onSelect,
  showServices = false,
}: ContainerHierarchyProps) {
  // Build tree structure
  const tree = useMemo(() => buildTree(containers), [containers]);

  // Track expanded nodes (default: all expanded)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return new Set(containers.map(c => c.id));
  });

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (containers.length === 0) {
    return <div className="p-4 text-center text-gray-400 text-sm">No containers registered</div>;
  }

  return (
    <div className="space-y-1" data-testid="container-hierarchy">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 mb-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Container Hierarchy
        </h4>
        <span className="text-xs text-gray-400">{containers.length} containers</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 px-2 py-1 mb-2 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-gray-500">root</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-500">child</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-gray-500">lazy</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span className="text-gray-500">scope</span>
        </div>
      </div>

      {/* Tree View */}
      <div className="space-y-0.5">
        {tree.map(node => (
          <TreeNodeComponent
            key={node.container.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            onSelect={onSelect}
            showServices={showServices}
          />
        ))}
      </div>
    </div>
  );
}
