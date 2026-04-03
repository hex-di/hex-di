/**
 * useTreeNavigation hook for keyboard-driven tree traversal.
 *
 * Manages focused node, expansion state, and handles arrow key navigation.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";

interface TreeKeyContext {
  readonly visible: readonly string[];
  readonly currentIndex: number;
  readonly focusedId: string;
  readonly expandedIds: ReadonlySet<string>;
  readonly setFocusedState: (id: string) => void;
  readonly toggleExpanded: (id: string) => void;
  readonly getChildren: (id: string) => readonly string[];
  readonly getParent: (id: string) => string | undefined;
}

/* eslint-disable @typescript-eslint/naming-convention */
const treeKeyHandlers: Record<string, (ctx: TreeKeyContext) => void> = {
  ArrowDown({ visible, currentIndex, setFocusedState }) {
    if (currentIndex < visible.length - 1) {
      setFocusedState(visible[currentIndex + 1]);
    }
  },
  ArrowUp({ visible, currentIndex, setFocusedState }) {
    if (currentIndex > 0) {
      setFocusedState(visible[currentIndex - 1]);
    }
  },
  ArrowRight({ focusedId, expandedIds, setFocusedState, toggleExpanded, getChildren }) {
    const children = getChildren(focusedId);
    if (children.length > 0) {
      if (!expandedIds.has(focusedId)) {
        toggleExpanded(focusedId);
      } else {
        setFocusedState(children[0]);
      }
    }
  },
  ArrowLeft({ focusedId, expandedIds, setFocusedState, toggleExpanded, getParent }) {
    if (expandedIds.has(focusedId)) {
      toggleExpanded(focusedId);
    } else {
      const parentId = getParent(focusedId);
      if (parentId !== undefined) {
        setFocusedState(parentId);
      }
    }
  },
  Enter({ focusedId, toggleExpanded }) {
    toggleExpanded(focusedId);
  },
  Home({ visible, setFocusedState }) {
    if (visible.length > 0) {
      setFocusedState(visible[0]);
    }
  },
  End({ visible, setFocusedState }) {
    if (visible.length > 0) {
      setFocusedState(visible[visible.length - 1]);
    }
  },
};
/* eslint-enable @typescript-eslint/naming-convention */

interface TreeNavigationState {
  readonly focusedId: string;
  readonly expandedIds: ReadonlySet<string>;
  handleKeyDown(event: React.KeyboardEvent): void;
  setFocused(id: string): void;
  toggleExpanded(id: string): void;
}

/**
 * Keyboard-driven tree navigation.
 *
 * Supports Arrow Up/Down, Arrow Left/Right for expand/collapse/parent,
 * Enter to toggle expand, Home/End for first/last.
 *
 * @param rootId - The root node ID
 * @param getChildren - Returns child IDs for a given node
 * @param getParent - Returns the parent ID, or undefined for root
 */
export function useTreeNavigation(
  rootId: string,
  getChildren: (id: string) => readonly string[],
  getParent: (id: string) => string | undefined
): TreeNavigationState {
  const [focusedId, setFocusedState] = useState(rootId);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(() => new Set([rootId]));

  const setFocused = useCallback((id: string) => {
    setFocusedState(id);
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Collects all visible node IDs in tree order.
   */
  const getVisibleNodes = useCallback((): readonly string[] => {
    const result: string[] = [];
    const walk = (id: string): void => {
      result.push(id);
      if (expandedIds.has(id)) {
        for (const childId of getChildren(id)) {
          walk(childId);
        }
      }
    };
    walk(rootId);
    return result;
  }, [rootId, getChildren, expandedIds]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const handler = treeKeyHandlers[event.key];
      if (handler === undefined) return;

      event.preventDefault();
      const visible = getVisibleNodes();
      const currentIndex = visible.indexOf(focusedId);
      handler({
        visible,
        currentIndex,
        focusedId,
        expandedIds,
        setFocusedState,
        toggleExpanded,
        getChildren,
        getParent,
      });
    },
    [focusedId, expandedIds, getChildren, getParent, getVisibleNodes, toggleExpanded]
  );

  return {
    focusedId,
    expandedIds,
    handleKeyDown,
    setFocused,
    toggleExpanded,
  };
}
