/**
 * GuardGlobalSearch — Cross-view search with categorized results for the Guard Panel.
 *
 * Provides search across policies, evaluations, subjects, and roles
 * with grouped, navigable results.
 *
 * Spec: 13-filter-and-search.md (13.8-13.11)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface GuardSearchResult {
  readonly category: "policies" | "evaluations" | "subjects" | "roles";
  readonly label: string;
  readonly detail: string;
  readonly navigateTo: { readonly view: string; readonly context?: string };
}

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardGlobalSearchProps {
  readonly onSearch: (query: string) => void;
  readonly results: readonly GuardSearchResult[];
}

// ── Component ───────────────────────────────────────────────────────────────

function GuardGlobalSearch({ onSearch, results }: GuardGlobalSearchProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Group results by category ───────────────────────────────────────────

  const groupedResults = useMemo(() => {
    const groups: Record<string, GuardSearchResult[]> = {
      policies: [],
      evaluations: [],
      subjects: [],
      roles: [],
    };
    for (const result of results) {
      const group = groups[result.category];
      if (group) {
        group.push(result);
      }
    }
    return groups;
  }, [results]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
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

  // ── Cleanup debounce ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasResults = results.length > 0;

  return (
    <div data-testid="guard-global-search" role="search" aria-label="Guard global search">
      {/* Search trigger button */}
      <button data-testid="guard-search-trigger" onClick={handleOpen} aria-label="Open search">
        Search
      </button>

      {/* Search panel */}
      {open && (
        <div data-testid="guard-search-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              data-testid="guard-search-input"
              type="text"
              placeholder="Search policies, evaluations, subjects, roles..."
              value={query}
              onChange={handleChange}
              autoFocus
              aria-label="Search query"
            />
            <button
              data-testid="guard-search-close"
              onClick={handleClose}
              aria-label="Close search"
            >
              x
            </button>
          </div>

          {/* Results */}
          {hasResults && (
            <div data-testid="guard-search-results" role="listbox">
              {/* Policies */}
              {groupedResults.policies.length > 0 && (
                <div data-testid="guard-search-group-policies">
                  <h4
                    style={{
                      fontSize: "var(--hex-font-size-xs, 11px)",
                      color: "var(--hex-text-muted, #6b6b80)",
                      textTransform: "uppercase",
                    }}
                  >
                    Policies
                  </h4>
                  {groupedResults.policies.map((r, i) => (
                    <div
                      key={i}
                      data-testid="guard-search-result"
                      data-category="policies"
                      role="option"
                    >
                      <span>{r.label}</span>
                      <span style={{ color: "var(--hex-text-muted, #6b6b80)", marginLeft: 8 }}>
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Evaluations */}
              {groupedResults.evaluations.length > 0 && (
                <div data-testid="guard-search-group-evaluations">
                  <h4
                    style={{
                      fontSize: "var(--hex-font-size-xs, 11px)",
                      color: "var(--hex-text-muted, #6b6b80)",
                      textTransform: "uppercase",
                    }}
                  >
                    Evaluations
                  </h4>
                  {groupedResults.evaluations.map((r, i) => (
                    <div
                      key={i}
                      data-testid="guard-search-result"
                      data-category="evaluations"
                      role="option"
                    >
                      <span>{r.label}</span>
                      <span style={{ color: "var(--hex-text-muted, #6b6b80)", marginLeft: 8 }}>
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Subjects */}
              {groupedResults.subjects.length > 0 && (
                <div data-testid="guard-search-group-subjects">
                  <h4
                    style={{
                      fontSize: "var(--hex-font-size-xs, 11px)",
                      color: "var(--hex-text-muted, #6b6b80)",
                      textTransform: "uppercase",
                    }}
                  >
                    Subjects
                  </h4>
                  {groupedResults.subjects.map((r, i) => (
                    <div
                      key={i}
                      data-testid="guard-search-result"
                      data-category="subjects"
                      role="option"
                    >
                      <span>{r.label}</span>
                      <span style={{ color: "var(--hex-text-muted, #6b6b80)", marginLeft: 8 }}>
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Roles */}
              {groupedResults.roles.length > 0 && (
                <div data-testid="guard-search-group-roles">
                  <h4
                    style={{
                      fontSize: "var(--hex-font-size-xs, 11px)",
                      color: "var(--hex-text-muted, #6b6b80)",
                      textTransform: "uppercase",
                    }}
                  >
                    Roles
                  </h4>
                  {groupedResults.roles.map((r, i) => (
                    <div
                      key={i}
                      data-testid="guard-search-result"
                      data-category="roles"
                      role="option"
                    >
                      <span>{r.label}</span>
                      <span style={{ color: "var(--hex-text-muted, #6b6b80)", marginLeft: 8 }}>
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {query.length > 0 && !hasResults && (
            <div data-testid="guard-search-no-results" role="status">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { GuardGlobalSearch };
export type { GuardGlobalSearchProps, GuardSearchResult };
