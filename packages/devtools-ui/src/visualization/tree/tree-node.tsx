/**
 * TreeNode component for rendering a single node in the tree.
 *
 * @packageDocumentation
 */

interface TreeNodeProps<T> {
  readonly node: T;
  readonly depth: number;
  readonly getChildren: (node: T) => readonly T[];
  readonly getKey: (node: T) => string;
  readonly renderNode: (node: T, depth: number) => React.ReactNode;
  readonly expandedKeys: ReadonlySet<string>;
  readonly selectedKey: string | undefined;
  readonly focusedKey: string | undefined;
  readonly onToggle: (key: string) => void;
  readonly onSelect: (key: string) => void;
  readonly onFocus: (key: string) => void;
}

/**
 * TreeNode renders a node and its children recursively.
 */
function TreeNode<T>({
  node,
  depth,
  getChildren,
  getKey,
  renderNode,
  expandedKeys,
  selectedKey,
  focusedKey,
  onToggle,
  onSelect,
  onFocus,
}: TreeNodeProps<T>): React.ReactElement {
  const key = getKey(node);
  const children = getChildren(node);
  const hasChildren = children.length > 0;
  const isExpanded = expandedKeys.has(key);
  const isSelected = key === selectedKey;
  const isFocused = key === focusedKey;

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      <div
        data-testid={`tree-node-${key}`}
        onClick={() => {
          onFocus(key);
          onSelect(key);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          paddingLeft: `${depth * 16}px`,
          paddingTop: "2px",
          paddingBottom: "2px",
          paddingRight: "var(--hex-space-sm)",
          cursor: "pointer",
          backgroundColor: isSelected
            ? "var(--hex-bg-active)"
            : isFocused
              ? "var(--hex-bg-hover)"
              : "transparent",
          outline: isFocused ? "1px solid var(--hex-accent)" : "none",
          fontFamily: "var(--hex-font-mono)",
          fontSize: "var(--hex-font-size-sm)",
        }}
      >
        {hasChildren ? (
          <span
            data-testid={`tree-chevron-${key}`}
            onClick={e => {
              e.stopPropagation();
              onToggle(key);
            }}
            style={{
              display: "inline-flex",
              width: "16px",
              height: "16px",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
              color: "var(--hex-text-secondary)",
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 100ms ease",
            }}
            aria-hidden="true"
          >
            {"\u25B6"}
          </span>
        ) : (
          <span style={{ display: "inline-block", width: "16px", flexShrink: 0 }} />
        )}
        <span
          style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {renderNode(node, depth)}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div role="group">
          {children.map(child => (
            <TreeNode
              key={getKey(child)}
              node={child}
              depth={depth + 1}
              getChildren={getChildren}
              getKey={getKey}
              renderNode={renderNode}
              expandedKeys={expandedKeys}
              selectedKey={selectedKey}
              focusedKey={focusedKey}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { TreeNode };
export type { TreeNodeProps };
