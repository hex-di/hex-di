/**
 * TreeRenderer component for rendering hierarchical data.
 *
 * Supports expand/collapse, keyboard navigation, and selection.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";
import { TreeNode } from "./tree-node.js";
import { mapKeyToAction } from "./tree-keyboard.js";

interface TreeRendererProps<T> {
  readonly root: T;
  readonly getChildren: (node: T) => readonly T[];
  readonly getKey: (node: T) => string;
  readonly renderNode: (node: T, depth: number) => React.ReactNode;
  readonly defaultExpanded?: ReadonlySet<string>;
  readonly onSelect?: (key: string) => void;
  readonly selectedKey?: string;
}

/**
 * Collects all visible node keys in tree order.
 */
function collectVisibleKeys<T>(
  node: T,
  getChildren: (node: T) => readonly T[],
  getKey: (node: T) => string,
  expandedKeys: ReadonlySet<string>
): string[] {
  const result: string[] = [];
  const walk = (n: T): void => {
    const key = getKey(n);
    result.push(key);
    if (expandedKeys.has(key)) {
      for (const child of getChildren(n)) {
        walk(child);
      }
    }
  };
  walk(node);
  return result;
}

/**
 * Finds the parent key of a given key in the tree.
 */
function findParentKey<T>(
  root: T,
  targetKey: string,
  getChildren: (node: T) => readonly T[],
  getKey: (node: T) => string
): string | undefined {
  const walk = (node: T, parentKey: string | undefined): string | undefined => {
    const key = getKey(node);
    if (key === targetKey) return parentKey;
    for (const child of getChildren(node)) {
      const found = walk(child, key);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  return walk(root, undefined);
}

/**
 * TreeRenderer renders hierarchical data with expand/collapse and keyboard nav.
 */
function TreeRenderer<T>({
  root,
  getChildren,
  getKey,
  renderNode,
  defaultExpanded,
  onSelect,
  selectedKey,
}: TreeRendererProps<T>): React.ReactElement {
  const rootKey = getKey(root);

  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(
    () => defaultExpanded ?? new Set([rootKey])
  );
  const [focusedKey, setFocusedKey] = useState(rootKey);

  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (key: string) => {
      onSelect?.(key);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const action = mapKeyToAction(event.key);
      if (action.type === "none") return;

      event.preventDefault();

      const visibleKeys = collectVisibleKeys(root, getChildren, getKey, expandedKeys);
      const currentIndex = visibleKeys.indexOf(focusedKey);

      switch (action.type) {
        case "focus-next": {
          if (currentIndex < visibleKeys.length - 1) {
            setFocusedKey(visibleKeys[currentIndex + 1]);
          }
          break;
        }
        case "focus-prev": {
          if (currentIndex > 0) {
            setFocusedKey(visibleKeys[currentIndex - 1]);
          }
          break;
        }
        case "expand": {
          if (!expandedKeys.has(focusedKey)) {
            toggleExpanded(focusedKey);
          } else {
            // Move to first child if expanded
            const nextIndex = currentIndex + 1;
            if (nextIndex < visibleKeys.length) {
              setFocusedKey(visibleKeys[nextIndex]);
            }
          }
          break;
        }
        case "collapse": {
          if (expandedKeys.has(focusedKey)) {
            toggleExpanded(focusedKey);
          } else {
            // Move to parent
            const parentKey = findParentKey(root, focusedKey, getChildren, getKey);
            if (parentKey !== undefined) {
              setFocusedKey(parentKey);
            }
          }
          break;
        }
        case "select": {
          onSelect?.(focusedKey);
          break;
        }
        case "focus-first": {
          if (visibleKeys.length > 0) {
            setFocusedKey(visibleKeys[0]);
          }
          break;
        }
        case "focus-last": {
          if (visibleKeys.length > 0) {
            setFocusedKey(visibleKeys[visibleKeys.length - 1]);
          }
          break;
        }
      }
    },
    [root, getChildren, getKey, expandedKeys, focusedKey, onSelect, toggleExpanded]
  );

  return (
    <div
      role="tree"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid="tree-renderer"
      style={{ outline: "none" }}
    >
      <TreeNode
        node={root}
        depth={0}
        getChildren={getChildren}
        getKey={getKey}
        renderNode={renderNode}
        expandedKeys={expandedKeys}
        selectedKey={selectedKey}
        focusedKey={focusedKey}
        onToggle={toggleExpanded}
        onSelect={handleSelect}
        onFocus={setFocusedKey}
      />
    </div>
  );
}

export { TreeRenderer };
export type { TreeRendererProps };
