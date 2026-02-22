/**
 * useTreeNavigation hook for keyboard-driven tree traversal.
 *
 * Manages focused node, expansion state, and handles arrow key navigation.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";

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
      const visible = getVisibleNodes();
      const currentIndex = visible.indexOf(focusedId);

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          if (currentIndex < visible.length - 1) {
            setFocusedState(visible[currentIndex + 1]);
          }
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          if (currentIndex > 0) {
            setFocusedState(visible[currentIndex - 1]);
          }
          break;
        }
        case "ArrowRight": {
          event.preventDefault();
          const children = getChildren(focusedId);
          if (children.length > 0) {
            if (!expandedIds.has(focusedId)) {
              toggleExpanded(focusedId);
            } else {
              setFocusedState(children[0]);
            }
          }
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (expandedIds.has(focusedId)) {
            toggleExpanded(focusedId);
          } else {
            const parentId = getParent(focusedId);
            if (parentId !== undefined) {
              setFocusedState(parentId);
            }
          }
          break;
        }
        case "Enter": {
          event.preventDefault();
          toggleExpanded(focusedId);
          break;
        }
        case "Home": {
          event.preventDefault();
          if (visible.length > 0) {
            setFocusedState(visible[0]);
          }
          break;
        }
        case "End": {
          event.preventDefault();
          if (visible.length > 0) {
            setFocusedState(visible[visible.length - 1]);
          }
          break;
        }
      }
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
