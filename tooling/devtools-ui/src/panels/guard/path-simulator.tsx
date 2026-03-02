/**
 * PathSimulator — What-if form for simulating guard policy evaluations.
 *
 * Allows users to input a hypothetical subject and resource context
 * and simulate which path through the policy tree would be taken.
 *
 * Spec: 06-path-analysis.md (6.5), 11-interactions.md (11.8)
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";
import type { GuardEvaluationDescriptor } from "./types.js";

// ── Simulation Input ────────────────────────────────────────────────────────

interface SimulationInput {
  readonly subjectId: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes: Readonly<Record<string, string>>;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface PathSimulatorProps {
  readonly descriptor: GuardEvaluationDescriptor;
  readonly onSimulate: (input: SimulationInput) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function PathSimulator({ descriptor, onSimulate }: PathSimulatorProps): React.ReactElement {
  const [subjectId, setSubjectId] = useState("");
  const [rolesInput, setRolesInput] = useState("");
  const [permissionsInput, setPermissionsInput] = useState("");
  const [attributeKey, setAttributeKey] = useState("");
  const [attributeValue, setAttributeValue] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});

  const handleAddAttribute = useCallback(() => {
    if (attributeKey.trim()) {
      setAttributes(prev => ({ ...prev, [attributeKey.trim()]: attributeValue }));
      setAttributeKey("");
      setAttributeValue("");
    }
  }, [attributeKey, attributeValue]);

  const handleRemoveAttribute = useCallback((key: string) => {
    setAttributes(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const roles = rolesInput
        .split(",")
        .map(r => r.trim())
        .filter(r => r.length > 0);
      const permissions = permissionsInput
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      onSimulate({
        subjectId: subjectId.trim(),
        roles,
        permissions,
        attributes,
      });
    },
    [subjectId, rolesInput, permissionsInput, attributes, onSimulate]
  );

  const handleReset = useCallback(() => {
    setSubjectId("");
    setRolesInput("");
    setPermissionsInput("");
    setAttributeKey("");
    setAttributeValue("");
    setAttributes({});
  }, []);

  const attributeEntries = Object.entries(attributes);

  return (
    <form
      data-testid="guard-path-simulator"
      data-descriptor-id={descriptor.descriptorId}
      role="form"
      aria-label={`Policy simulator for ${descriptor.label}`}
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--hex-space-sm, 8px)",
        padding: "var(--hex-space-md, 12px)",
      }}
    >
      {/* Header */}
      <div data-testid="guard-simulator-header">
        <span style={{ fontWeight: 600, color: "var(--hex-text-primary, #e4e4f0)" }}>
          What-if Simulator
        </span>
        <span style={{ color: "var(--hex-text-muted, #6b6b80)", marginLeft: 8 }}>
          {descriptor.label}
        </span>
      </div>

      {/* Subject ID */}
      <label data-testid="guard-simulator-subject-label">
        <span
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Subject ID
        </span>
        <input
          data-testid="guard-simulator-subject"
          type="text"
          value={subjectId}
          onChange={e => setSubjectId(e.target.value)}
          placeholder="e.g. user-123"
          aria-label="Subject ID"
        />
      </label>

      {/* Roles */}
      <label data-testid="guard-simulator-roles-label">
        <span
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Roles (comma-separated)
        </span>
        <input
          data-testid="guard-simulator-roles"
          type="text"
          value={rolesInput}
          onChange={e => setRolesInput(e.target.value)}
          placeholder="e.g. admin, editor"
          aria-label="Roles"
        />
      </label>

      {/* Permissions */}
      <label data-testid="guard-simulator-permissions-label">
        <span
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Permissions (comma-separated)
        </span>
        <input
          data-testid="guard-simulator-permissions"
          type="text"
          value={permissionsInput}
          onChange={e => setPermissionsInput(e.target.value)}
          placeholder="e.g. posts:read, posts:write"
          aria-label="Permissions"
        />
      </label>

      {/* Attributes */}
      <div data-testid="guard-simulator-attributes">
        <span
          style={{
            fontSize: "var(--hex-font-size-xs, 11px)",
            color: "var(--hex-text-muted, #6b6b80)",
          }}
        >
          Attributes
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            data-testid="guard-simulator-attr-key"
            type="text"
            value={attributeKey}
            onChange={e => setAttributeKey(e.target.value)}
            placeholder="key"
            aria-label="Attribute key"
          />
          <input
            data-testid="guard-simulator-attr-value"
            type="text"
            value={attributeValue}
            onChange={e => setAttributeValue(e.target.value)}
            placeholder="value"
            aria-label="Attribute value"
          />
          <button type="button" data-testid="guard-simulator-attr-add" onClick={handleAddAttribute}>
            Add
          </button>
        </div>

        {/* Attribute list */}
        {attributeEntries.length > 0 && (
          <div data-testid="guard-simulator-attr-list">
            {attributeEntries.map(([key, value]) => (
              <div
                key={key}
                data-testid="guard-simulator-attr-entry"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--hex-font-size-xs, 11px)",
                  fontFamily: "var(--hex-font-mono, monospace)",
                }}
              >
                <span>
                  {key}={value}
                </span>
                <button
                  type="button"
                  data-testid={`guard-simulator-attr-remove-${key}`}
                  onClick={() => handleRemoveAttribute(key)}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--hex-space-sm, 8px)" }}>
        <button type="submit" data-testid="guard-simulator-run" aria-label="Run simulation">
          Simulate
        </button>
        <button
          type="button"
          data-testid="guard-simulator-reset"
          onClick={handleReset}
          aria-label="Reset simulator"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

export { PathSimulator };
export type { PathSimulatorProps, SimulationInput };
