/**
 * JsonTree component for rendering arbitrary JSON data with collapse/expand.
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";
import { JsonValue } from "./json-value.js";

interface JsonTreeProps {
  readonly data: unknown;
  readonly defaultExpandDepth?: number;
  readonly rootLabel?: string;
}

/**
 * Checks if a value is an object (not null, not array).
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns entries for an expandable value (object or array).
 */
function getEntries(value: unknown): readonly (readonly [string, unknown])[] {
  if (Array.isArray(value)) {
    return value.map((v: unknown, i: number) => [String(i), v] satisfies [string, unknown]);
  }
  if (isPlainObject(value)) {
    return Object.entries(value);
  }
  return [];
}

/**
 * Returns the count label for an expandable value.
 */
function getCountLabel(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} items`;
  }
  if (isPlainObject(value)) {
    return `${Object.keys(value).length} keys`;
  }
  return "0 entries";
}

/**
 * Internal recursive node component.
 */
function JsonTreeNode({
  label,
  value,
  depth,
  defaultExpandDepth,
  path,
  expandedPaths,
  onToggle,
}: {
  readonly label: string | undefined;
  readonly value: unknown;
  readonly depth: number;
  readonly defaultExpandDepth: number;
  readonly path: string;
  readonly expandedPaths: ReadonlySet<string>;
  readonly onToggle: (path: string) => void;
}): React.ReactElement {
  const isObj = isPlainObject(value);
  const isArr = Array.isArray(value);
  const isExpandable = isObj || isArr;

  const isExpanded = expandedPaths.has(path);

  if (!isExpandable) {
    return (
      <div
        style={{
          paddingLeft: `${depth * 16}px`,
          display: "flex",
          alignItems: "baseline",
          gap: "var(--hex-space-xs)",
          paddingTop: "1px",
          paddingBottom: "1px",
        }}
      >
        {label !== undefined && (
          <span
            style={{
              color: "var(--hex-text-secondary)",
              fontFamily: "var(--hex-font-mono)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            {label}:
          </span>
        )}
        <JsonValue value={value} />
      </div>
    );
  }

  const entries = getEntries(value);
  const bracketOpen = isArr ? "[" : "{";
  const bracketClose = isArr ? "]" : "}";
  const countLabel = getCountLabel(value);

  return (
    <div>
      <div
        onClick={() => onToggle(path)}
        style={{
          paddingLeft: `${depth * 16}px`,
          display: "flex",
          alignItems: "baseline",
          gap: "var(--hex-space-xs)",
          cursor: "pointer",
          paddingTop: "1px",
          paddingBottom: "1px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: "12px",
            fontSize: "10px",
            color: "var(--hex-text-secondary)",
          }}
        >
          {isExpanded ? "\u25BC" : "\u25B6"}
        </span>
        {label !== undefined && (
          <span
            style={{
              color: "var(--hex-text-secondary)",
              fontFamily: "var(--hex-font-mono)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            {label}:
          </span>
        )}
        {isExpanded ? (
          <span
            style={{
              color: "var(--hex-text-muted)",
              fontFamily: "var(--hex-font-mono)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            {bracketOpen}
          </span>
        ) : (
          <span
            style={{
              color: "var(--hex-text-muted)",
              fontFamily: "var(--hex-font-mono)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            {bracketOpen} {countLabel} {bracketClose}
          </span>
        )}
      </div>
      {isExpanded && (
        <>
          {entries.map(([entryKey, entryValue]) => (
            <JsonTreeNode
              key={entryKey}
              label={entryKey}
              value={entryValue}
              depth={depth + 1}
              defaultExpandDepth={defaultExpandDepth}
              path={`${path}.${entryKey}`}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
            />
          ))}
          <div
            style={{
              paddingLeft: `${depth * 16}px`,
              color: "var(--hex-text-muted)",
              fontFamily: "var(--hex-font-mono)",
              fontSize: "var(--hex-font-size-sm)",
            }}
          >
            {bracketClose}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Collects paths that should be expanded by default up to a given depth.
 */
function collectDefaultExpanded(
  value: unknown,
  depth: number,
  maxDepth: number,
  path: string,
  result: Set<string>
): void {
  if (depth >= maxDepth) return;
  const isObj = isPlainObject(value);
  const isArr = Array.isArray(value);
  if (!isObj && !isArr) return;

  result.add(path);

  const entries = getEntries(value);

  for (const [key, val] of entries) {
    collectDefaultExpanded(val, depth + 1, maxDepth, `${path}.${key}`, result);
  }
}

/**
 * JsonTree renders arbitrary JSON data with collapse/expand for objects and arrays.
 */
function JsonTree({ data, defaultExpandDepth = 2, rootLabel }: JsonTreeProps): React.ReactElement {
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(() => {
    const paths = new Set<string>();
    collectDefaultExpanded(data, 0, defaultExpandDepth, "$", paths);
    return paths;
  });

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div data-testid="json-tree" style={{ fontFamily: "var(--hex-font-mono)" }}>
      <JsonTreeNode
        label={rootLabel}
        value={data}
        depth={0}
        defaultExpandDepth={defaultExpandDepth}
        path="$"
        expandedPaths={expandedPaths}
        onToggle={handleToggle}
      />
    </div>
  );
}

export { JsonTree };
export type { JsonTreeProps };
