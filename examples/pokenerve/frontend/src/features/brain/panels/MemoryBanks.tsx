/**
 * Memory Banks panel - Scope Tree visualization.
 *
 * Renders the hierarchical scope tree from the DI container with
 * indentation and connecting lines. Active scopes appear with green
 * indicators, disposed scopes appear grayed with strikethrough.
 *
 * @packageDocumentation
 */

import { type ReactNode, useState, useCallback } from "react";
import { useScopeTree } from "@hex-di/react";
import type { ScopeTree } from "@hex-di/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScopeDetailData {
  readonly id: string;
  readonly status: "active" | "disposed";
  readonly resolvedCount: number;
  readonly totalCount: number;
  readonly resolvedPorts: readonly string[];
  readonly childCount: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ScopeNodeProps {
  readonly scope: ScopeTree;
  readonly depth: number;
  readonly isSelected: boolean;
  readonly onSelect: (detail: ScopeDetailData) => void;
}

function ScopeNode({ scope, depth, isSelected, onSelect }: ScopeNodeProps): ReactNode {
  const isActive = scope.status === "active";

  const handleClick = useCallback(() => {
    onSelect({
      id: scope.id,
      status: scope.status,
      resolvedCount: scope.resolvedCount,
      totalCount: scope.totalCount,
      resolvedPorts: scope.resolvedPorts,
      childCount: scope.children.length,
    });
  }, [onSelect, scope]);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-all hover:bg-gray-800/50 ${
          isSelected ? "bg-gray-800/70" : ""
        } ${isActive ? "opacity-100" : "opacity-50"}`}
        style={{ paddingLeft: `${String(depth * 24 + 12)}px` }}
      >
        {/* Connecting line indicator */}
        {depth > 0 && (
          <span
            className="mr-1 inline-block w-4 border-b border-l border-gray-700"
            style={{ height: "12px" }}
          />
        )}

        {/* Status dot */}
        <span
          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
            isActive ? "bg-emerald-400" : "bg-gray-600"
          }`}
        />

        {/* Scope ID */}
        <span
          className={`truncate font-mono text-xs ${isActive ? "text-white" : "text-gray-500 line-through"}`}
        >
          {scope.id}
        </span>

        {/* Resolved count */}
        <span className="ml-auto shrink-0 text-xs text-gray-600">
          {String(scope.resolvedCount)}/{String(scope.totalCount)}
        </span>

        {/* Children count */}
        {scope.children.length > 0 && (
          <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-500">
            {String(scope.children.length)} child{scope.children.length !== 1 ? "ren" : ""}
          </span>
        )}
      </button>

      {/* Render children recursively */}
      {scope.children.map(child => (
        <ScopeNode
          key={child.id}
          scope={child}
          depth={depth + 1}
          isSelected={false}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

interface ScopeDetailPanelProps {
  readonly detail: ScopeDetailData;
  readonly onClose: () => void;
}

function ScopeDetailPanel({ detail, onClose }: ScopeDetailPanelProps): ReactNode {
  const isActive = detail.status === "active";

  return (
    <div
      className="shrink-0 border-l border-gray-800 bg-gray-900/80 p-4"
      style={{ width: "280px" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Scope Detail</h4>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
          x
        </button>
      </div>
      <div className="space-y-3 text-xs">
        <div>
          <span className="text-gray-500">Scope ID</span>
          <p className="break-all font-mono text-white">{detail.id}</p>
        </div>
        <div>
          <span className="text-gray-500">Status</span>
          <p className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-gray-600"}`}
            />
            <span className={isActive ? "text-emerald-400" : "text-gray-500"}>{detail.status}</span>
          </p>
        </div>
        <div>
          <span className="text-gray-500">Resolved Services</span>
          <p className="text-white">
            {String(detail.resolvedCount)} / {String(detail.totalCount)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Children</span>
          <p className="text-white">{String(detail.childCount)}</p>
        </div>
        <div>
          <span className="text-gray-500">
            Resolved Ports ({String(detail.resolvedPorts.length)})
          </span>
          {detail.resolvedPorts.length > 0 ? (
            <ul className="mt-1 max-h-40 space-y-1 overflow-auto">
              {detail.resolvedPorts.map(port => (
                <li key={port} className="truncate font-mono text-blue-400">
                  {port}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">None</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countScopes(tree: ScopeTree): { active: number; disposed: number } {
  let active = tree.status === "active" ? 1 : 0;
  let disposed = tree.status === "disposed" ? 1 : 0;
  for (const child of tree.children) {
    const childCounts = countScopes(child);
    active += childCounts.active;
    disposed += childCounts.disposed;
  }
  return { active, disposed };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function MemoryBanks(): ReactNode {
  const scopeTree = useScopeTree();
  const [selectedDetail, setSelectedDetail] = useState<ScopeDetailData | null>(null);

  const counts = countScopes(scopeTree);

  const handleSelect = useCallback((detail: ScopeDetailData) => {
    setSelectedDetail(prev => (prev?.id === detail.id ? null : detail));
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Summary bar */}
      <div className="flex items-center gap-6 border-b border-gray-800 px-4 py-2 text-xs">
        <span className="text-gray-500">
          Root: <span className="font-mono text-white">{scopeTree.id}</span>
        </span>
        <span className="text-gray-500">
          Active: <span className="text-emerald-400">{String(counts.active)}</span>
        </span>
        <span className="text-gray-500">
          Disposed: <span className="text-gray-400">{String(counts.disposed)}</span>
        </span>
        <span className="text-gray-500">
          Total Resolved: <span className="text-white">{String(scopeTree.resolvedCount)}</span>
        </span>
      </div>

      {/* Tree + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scope tree */}
        <div className="flex-1 overflow-auto">
          <ScopeNode
            scope={scopeTree}
            depth={0}
            isSelected={selectedDetail?.id === scopeTree.id}
            onSelect={handleSelect}
          />
        </div>

        {/* Detail panel */}
        {selectedDetail !== null && (
          <ScopeDetailPanel detail={selectedDetail} onClose={handleCloseDetail} />
        )}
      </div>
    </div>
  );
}

export { MemoryBanks };
