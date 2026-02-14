/**
 * GraphContextMenu — right-click context menu with traversal operations.
 *
 * @packageDocumentation
 */

import { useCallback } from "react";

interface ContextMenuPosition {
  readonly x: number;
  readonly y: number;
}

interface GraphContextMenuProps {
  readonly position: ContextMenuPosition | undefined;
  readonly portName: string | undefined;
  readonly onClose: () => void;
  readonly onSelectNode: (portName: string) => void;
  readonly onShowDependencies: (portName: string) => void;
  readonly onShowDependents: (portName: string) => void;
  readonly onFindPath: (from: string, to: string) => void;
  readonly onFindCommon: (ports: readonly string[]) => void;
  readonly onHighlightChain: (portName: string) => void;
  readonly onViewMetadata: (portName: string) => void;
  readonly onCopyPortName: (portName: string) => void;
  readonly onNavigateToContainer: (portName: string) => void;
  readonly selectedNodes: ReadonlySet<string>;
}

function GraphContextMenu({
  position,
  portName,
  onClose,
  onSelectNode,
  onShowDependencies,
  onShowDependents,
  onHighlightChain,
  onViewMetadata,
  onCopyPortName,
  onFindCommon,
  selectedNodes,
}: GraphContextMenuProps): React.ReactElement | null {
  if (position === undefined || portName === undefined) return null;

  const handleAction = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose]
  );

  const items: Array<{
    label: string;
    action: () => void;
    disabled?: boolean;
  }> = [
    {
      label: "Select",
      action: () => onSelectNode(portName),
    },
    {
      label: "Show Dependencies",
      action: () => onShowDependencies(portName),
    },
    {
      label: "Show Dependents",
      action: () => onShowDependents(portName),
    },
    {
      label: "Highlight Chain",
      action: () => onHighlightChain(portName),
    },
    {
      label: "Find Common Dependencies",
      action: () => onFindCommon([...selectedNodes, portName]),
      disabled: selectedNodes.size < 1,
    },
    {
      label: "View Metadata",
      action: () => onViewMetadata(portName),
    },
    {
      label: "Copy Port Name",
      action: () => onCopyPortName(portName),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="context-menu-backdrop"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
        }}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        data-testid="graph-context-menu"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          minWidth: 200,
          backgroundColor: "var(--hex-bg-secondary)",
          border: "1px solid var(--hex-border)",
          borderRadius: "var(--hex-radius-sm)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 301,
          fontFamily: "var(--hex-font-sans)",
          fontSize: "var(--hex-font-size-sm)",
          overflow: "hidden",
        }}
        role="menu"
        aria-label={`Context menu for ${portName}`}
      >
        <div
          style={{
            padding: "var(--hex-space-xs) var(--hex-space-sm)",
            borderBottom: "1px solid var(--hex-border)",
            fontFamily: "var(--hex-font-mono)",
            fontWeight: "var(--hex-font-weight-medium)" as string,
            color: "var(--hex-text-primary)",
            fontSize: "var(--hex-font-size-xs)",
          }}
        >
          {portName}
        </div>
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => handleAction(item.action)}
            disabled={item.disabled}
            style={{
              display: "block",
              width: "100%",
              padding: "var(--hex-space-xs) var(--hex-space-sm)",
              border: "none",
              backgroundColor: "transparent",
              color: item.disabled ? "var(--hex-text-muted)" : "var(--hex-text-primary)",
              textAlign: "left",
              cursor: item.disabled ? "default" : "pointer",
              fontFamily: "var(--hex-font-sans)",
              fontSize: "var(--hex-font-size-sm)",
            }}
            role="menuitem"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

export { GraphContextMenu };
export type { GraphContextMenuProps, ContextMenuPosition };
