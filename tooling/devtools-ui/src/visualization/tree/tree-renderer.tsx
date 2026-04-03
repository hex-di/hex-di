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

interface TreeRendererKeyContext<T> {
  readonly visibleKeys: string[];
  readonly currentIndex: number;
  readonly focusedKey: string;
  readonly expandedKeys: ReadonlySet<string>;
  readonly setFocusedKey: (key: string) => void;
  readonly toggleExpanded: (key: string) => void;
  readonly onSelect: ((key: string) => void) | undefined;
  readonly root: T;
  readonly getChildren: (node: T) => readonly T[];
  readonly getKey: (node: T) => string;
}

/* eslint-disable @typescript-eslint/naming-convention */
const treeRendererKeyHandlers: Record<string, <T>(ctx: TreeRendererKeyContext<T>) => void> = {
  "focus-next"({ visibleKeys, currentIndex, setFocusedKey }) {
    if (currentIndex < visibleKeys.length - 1) {
      setFocusedKey(visibleKeys[currentIndex + 1]);
    }
  },
  "focus-prev"({ visibleKeys, currentIndex, setFocusedKey }) {
    if (currentIndex > 0) {
      setFocusedKey(visibleKeys[currentIndex - 1]);
    }
  },
  expand({ focusedKey, expandedKeys, toggleExpanded, setFocusedKey, visibleKeys, currentIndex }) {
    if (!expandedKeys.has(focusedKey)) {
      toggleExpanded(focusedKey);
    } else {
      const nextIndex = currentIndex + 1;
      if (nextIndex < visibleKeys.length) {
        setFocusedKey(visibleKeys[nextIndex]);
      }
    }
  },
  collapse({ focusedKey, expandedKeys, toggleExpanded, setFocusedKey, root, getChildren, getKey }) {
    if (expandedKeys.has(focusedKey)) {
      toggleExpanded(focusedKey);
    } else {
      const parentKey = findParentKey(root, focusedKey, getChildren, getKey);
      if (parentKey !== undefined) {
        setFocusedKey(parentKey);
      }
    }
  },
  select({ focusedKey, onSelect }) {
    onSelect?.(focusedKey);
  },
  "focus-first"({ visibleKeys, setFocusedKey }) {
    if (visibleKeys.length > 0) {
      setFocusedKey(visibleKeys[0]);
    }
  },
  "focus-last"({ visibleKeys, setFocusedKey }) {
    if (visibleKeys.length > 0) {
      setFocusedKey(visibleKeys[visibleKeys.length - 1]);
    }
  },
};
/* eslint-enable @typescript-eslint/naming-convention */

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

      const handler = treeRendererKeyHandlers[action.type];
      if (handler !== undefined) {
        handler({
          visibleKeys,
          currentIndex,
          focusedKey,
          expandedKeys,
          setFocusedKey,
          toggleExpanded,
          onSelect,
          root,
          getChildren,
          getKey,
        });
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
