/**
 * GuardFilterSystem — Global and view-specific filter controls for the Guard Panel.
 *
 * Provides 6 filter controls: port search, subject ID, role name,
 * decision outcome, policy kind, and time range.
 *
 * Spec: 13-filter-and-search.md (13.1-13.7)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PolicyKind } from "@hex-di/guard";
import type { GuardFilterState } from "./types.js";

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardFilterSystemProps {
  readonly filter: GuardFilterState;
  readonly onChange: (filter: GuardFilterState) => void;
}

// ── Policy Kind Options ─────────────────────────────────────────────────────

const POLICY_KIND_OPTIONS: readonly PolicyKind[] = [
  "hasPermission",
  "hasRole",
  "hasAttribute",
  "hasResourceAttribute",
  "hasSignature",
  "hasRelationship",
  "allOf",
  "anyOf",
  "not",
  "labeled",
];

const POLICY_KIND_SET: ReadonlySet<string> = new Set<string>(POLICY_KIND_OPTIONS);

function isPolicyKind(value: string): value is PolicyKind {
  return POLICY_KIND_SET.has(value);
}

// ── Component ───────────────────────────────────────────────────────────────

function GuardFilterSystem({ filter, onChange }: GuardFilterSystemProps): React.ReactElement {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Active filter count ─────────────────────────────────────────────────

  const activeCount = useMemo(() => {
    let count = 0;
    if (filter.portSearch) count++;
    if (filter.subjectId !== undefined) count++;
    if (filter.roleName !== undefined) count++;
    if (filter.decision !== "all") count++;
    if (filter.policyKind !== undefined) count++;
    if (filter.timeRange !== "all") count++;
    return count;
  }, [filter]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handlePortSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange({ ...filter, portSearch: value });
      }, 150);
    },
    [filter, onChange]
  );

  const handleSubjectId = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange({ ...filter, subjectId: value || undefined });
    },
    [filter, onChange]
  );

  const handleRoleName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChange({ ...filter, roleName: value || undefined });
    },
    [filter, onChange]
  );

  const handleDecision = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onChange({
        ...filter,
        decision:
          value === "all" || value === "allow" || value === "deny" || value === "error"
            ? value
            : "all",
      });
    },
    [filter, onChange]
  );

  const handlePolicyKind = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onChange({
        ...filter,
        policyKind: value !== "" && isPolicyKind(value) ? value : undefined,
      });
    },
    [filter, onChange]
  );

  const handleTimeRange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      const timeRange =
        value === "5m" || value === "1h" || value === "24h" || value === "all" ? value : "all";
      onChange({ ...filter, timeRange });
    },
    [filter, onChange]
  );

  const handleClearAll = useCallback(() => {
    onChange({
      portSearch: "",
      subjectId: undefined,
      roleName: undefined,
      decision: "all",
      policyKind: undefined,
      timeRange: "all",
    });
  }, [onChange]);

  // ── Cleanup debounce ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--hex-bg-tertiary)",
    color: "var(--hex-text-primary)",
    border: "1px solid var(--hex-border)",
    borderRadius: "var(--hex-radius-sm)",
    padding: "var(--hex-space-xs) var(--hex-space-sm)",
    fontSize: "var(--hex-font-size-xs)",
    fontFamily: "var(--hex-font-sans)",
    outline: "none",
    width: 120,
  };

  const selectStyle: React.CSSProperties = {
    backgroundColor: "var(--hex-bg-tertiary)",
    color: "var(--hex-text-primary)",
    border: "1px solid var(--hex-border)",
    borderRadius: "var(--hex-radius-sm)",
    padding: "var(--hex-space-xs) var(--hex-space-sm)",
    fontSize: "var(--hex-font-size-xs)",
    fontFamily: "var(--hex-font-sans)",
    outline: "none",
    width: "auto",
  };

  return (
    <div
      data-testid="guard-filter-system"
      role="search"
      aria-label="Guard filters"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "var(--hex-space-xs)",
        padding: "var(--hex-space-xs) var(--hex-space-md)",
        borderBottom: "1px solid var(--hex-border)",
        backgroundColor: "var(--hex-bg-primary)",
      }}
    >
      {/* Port search */}
      <input
        data-testid="guard-filter-port-search"
        type="text"
        placeholder="Search ports..."
        defaultValue={filter.portSearch}
        onChange={handlePortSearch}
        aria-label="Filter by port name"
        style={inputStyle}
      />

      {/* Subject ID */}
      <input
        data-testid="guard-filter-subject"
        type="text"
        placeholder="Subject ID..."
        value={filter.subjectId ?? ""}
        onChange={handleSubjectId}
        aria-label="Filter by subject ID"
        style={inputStyle}
      />

      {/* Role name */}
      <input
        data-testid="guard-filter-role"
        type="text"
        placeholder="Role name..."
        value={filter.roleName ?? ""}
        onChange={handleRoleName}
        aria-label="Filter by role name"
        style={inputStyle}
      />

      {/* Decision outcome */}
      <select
        data-testid="guard-filter-decision"
        value={filter.decision}
        onChange={handleDecision}
        aria-label="Filter by decision"
        style={selectStyle}
      >
        <option value="all">All decisions</option>
        <option value="allow">Allow</option>
        <option value="deny">Deny</option>
        <option value="error">Error</option>
      </select>

      {/* Policy kind */}
      <select
        data-testid="guard-filter-policy-kind"
        value={filter.policyKind ?? ""}
        onChange={handlePolicyKind}
        aria-label="Filter by policy kind"
        style={selectStyle}
      >
        <option value="">All policy kinds</option>
        {POLICY_KIND_OPTIONS.map(kind => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>

      {/* Time range */}
      <select
        data-testid="guard-filter-time-range"
        value={typeof filter.timeRange === "string" ? filter.timeRange : "custom"}
        onChange={handleTimeRange}
        aria-label="Filter by time range"
        style={selectStyle}
      >
        <option value="5m">5 minutes</option>
        <option value="1h">1 hour</option>
        <option value="24h">24 hours</option>
        <option value="all">All time</option>
      </select>

      {/* Active filter count */}
      {activeCount > 0 && (
        <span
          data-testid="guard-filter-active-count"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 18,
            height: 18,
            borderRadius: "var(--hex-radius-pill)",
            backgroundColor: "var(--hex-accent)",
            color: "#fff",
            fontSize: "var(--hex-font-size-xs)",
            fontWeight: 600,
          }}
        >
          {activeCount}
        </span>
      )}

      {/* Clear all */}
      <button
        data-testid="guard-filter-clear-all"
        onClick={handleClearAll}
        aria-label="Clear all filters"
        style={{
          padding: "var(--hex-space-xs) var(--hex-space-sm)",
          border: "1px solid var(--hex-border)",
          borderRadius: "var(--hex-radius-sm)",
          backgroundColor: "transparent",
          color: "var(--hex-text-muted)",
          cursor: "pointer",
          fontSize: "var(--hex-font-size-xs)",
        }}
      >
        Clear All
      </button>
    </div>
  );
}

export { GuardFilterSystem };
export type { GuardFilterSystemProps };
