/**
 * ResultGlobalSearch — Cross-view search with categorized results.
 *
 * Spec: 13-filter-and-search.md (13.8-13.11)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface SearchResult {
  readonly category: "chains" | "operations" | "errors" | "values";
  readonly label: string;
  readonly detail: string;
  readonly navigateTo: { readonly view: string; readonly context?: string };
}

// ── Props ───────────────────────────────────────────────────────────────────

interface ResultGlobalSearchProps {
  readonly onSearch: (query: string) => void;
  readonly results: readonly SearchResult[];
  readonly onNavigate: (target: { readonly view: string; readonly context?: string }) => void;
  readonly initialOpen?: boolean;
  readonly maxPerCategory?: number;
}

// ── Component ───────────────────────────────────────────────────────────────

function ResultGlobalSearch({
  onSearch,
  results,
  onNavigate,
  initialOpen = false,
  maxPerCategory = 10,
}: ResultGlobalSearchProps): React.ReactElement {
  const [open, setOpen] = useState(initialOpen);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Group results ──────────────────────────────────────────────────────

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      chains: [],
      operations: [],
      errors: [],
      values: [],
    };
    for (const result of results) {
      const group = groups[result.category];
      if (group && group.length < maxPerCategory) {
        group.push(result);
      }
    }
    return groups;
  }, [results, maxPerCategory]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearch(value);
      }, 200);
    },
    [onSearch]
  );

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="result-global-search">
      <button data-testid="search-icon" onClick={handleOpen}>
        Search
      </button>

      {open && (
        <div data-testid="search-panel">
          <input
            data-testid="search-input"
            type="text"
            placeholder="Search chains, operations, errors..."
            value={query}
            onChange={handleChange}
            autoFocus
          />

          {/* Chains */}
          {groupedResults.chains.length > 0 && (
            <div data-testid="search-group-chains">
              <h4>Chains</h4>
              {groupedResults.chains.map((r, i) => (
                <div
                  key={i}
                  data-testid="search-result-chains"
                  onClick={() => onNavigate(r.navigateTo)}
                >
                  <span>{r.label}</span>
                  <span>{r.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Operations */}
          {groupedResults.operations.length > 0 && (
            <div data-testid="search-group-operations">
              <h4>Operations</h4>
              {groupedResults.operations.map((r, i) => (
                <div
                  key={i}
                  data-testid="search-result-operations"
                  onClick={() => onNavigate(r.navigateTo)}
                >
                  <span>{r.label}</span>
                  <span>{r.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {groupedResults.errors.length > 0 && (
            <div data-testid="search-group-errors">
              <h4>Errors</h4>
              {groupedResults.errors.map((r, i) => (
                <div
                  key={i}
                  data-testid="search-result-errors"
                  onClick={() => onNavigate(r.navigateTo)}
                >
                  <span>{r.label}</span>
                  <span>{r.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Values */}
          {groupedResults.values.length > 0 && (
            <div data-testid="search-group-values">
              <h4>Values</h4>
              {groupedResults.values.map((r, i) => (
                <div
                  key={i}
                  data-testid="search-result-values"
                  onClick={() => onNavigate(r.navigateTo)}
                >
                  <span>{r.label}</span>
                  <span>{r.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ResultGlobalSearch };
export type { ResultGlobalSearchProps, SearchResult };
