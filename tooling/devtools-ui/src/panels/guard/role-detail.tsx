/**
 * RoleDetail — Permission breakdown for a selected role.
 *
 * Shows the direct permissions, inherited roles, and the full
 * flattened permission set for a role in the hierarchy.
 *
 * Spec: 07-role-hierarchy.md (7.3)
 *
 * @packageDocumentation
 */

import { useMemo } from "react";
import type { SerializedRole } from "./types.js";

// ── Style Constants ─────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(8, 16, 28, 0.7)",
  border: "1px solid rgba(0, 240, 255, 0.1)",
  borderRadius: "8px",
  overflow: "hidden",
  fontFamily: "var(--hex-font-sans, system-ui, sans-serif)",
  fontSize: "13px",
  color: "var(--hex-text-primary, #e2e8f0)",
};

const HEADER_STYLE: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid rgba(0, 240, 255, 0.1)",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: "8px",
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--hex-text-muted, #6b6b80)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
  margin: 0,
  padding: "12px 16px 4px",
};

const PERMISSION_ITEM_STYLE: React.CSSProperties = {
  fontFamily: "var(--hex-font-mono, monospace)",
  fontSize: "12px",
  padding: "4px 16px",
};

const STAT_BOX_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2px",
  flex: 1,
  padding: "8px 4px",
};

const STAT_VALUE_STYLE: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  fontFamily: "var(--hex-font-mono, monospace)",
  color: "var(--hex-text-primary, #e4e4f0)",
};

const STAT_LABEL_STYLE: React.CSSProperties = {
  fontSize: "9px",
  color: "var(--hex-text-muted, #6b6b80)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ── Props ───────────────────────────────────────────────────────────────────

interface RoleDetailProps {
  readonly role: SerializedRole;
  readonly allRoles: readonly SerializedRole[];
  readonly onParentClick?: (roleName: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function RoleDetail({ role, allRoles, onParentClick }: RoleDetailProps): React.ReactElement {
  // ── Inherited permissions breakdown ─────────────────────────────────────

  const inheritedPermissions = useMemo(() => {
    const direct = new Set(role.directPermissions);
    return role.flattenedPermissions.filter(p => !direct.has(p));
  }, [role]);

  const parentRoles = useMemo(
    () =>
      role.inherits
        .map(name => allRoles.find(r => r.name === name))
        .filter((r): r is SerializedRole => r !== undefined),
    [role.inherits, allRoles]
  );

  return (
    <div
      data-testid="guard-role-detail"
      data-role={role.name}
      role="region"
      aria-label={`Role detail: ${role.name}`}
      style={PANEL_STYLE}
    >
      {/* Role header */}
      <div data-testid="guard-role-detail-header" style={HEADER_STYLE}>
        <span
          style={{
            fontWeight: 700,
            fontSize: "16px",
            color: "var(--hex-text-primary, #e4e4f0)",
            fontFamily: "var(--hex-font-mono, monospace)",
            textShadow: "0 0 8px rgba(0, 240, 255, 0.3)",
          }}
        >
          {role.name}
        </span>

        {/* Circular inheritance warning */}
        {role.hasCircularInheritance && (
          <span
            data-testid="guard-role-detail-circular"
            role="alert"
            style={{
              color: "#fff",
              backgroundColor: "rgba(248, 113, 113, 0.2)",
              border: "1px solid rgba(248, 113, 113, 0.4)",
              borderRadius: "12px",
              padding: "2px 10px",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            Circular inheritance
          </span>
        )}
      </div>

      {/* Stats summary bar */}
      <div
        data-testid="guard-role-detail-stats"
        style={{
          display: "flex",
          borderBottom: "1px solid rgba(0, 240, 255, 0.08)",
          padding: "4px 0",
        }}
      >
        <div style={STAT_BOX_STYLE}>
          <span style={STAT_VALUE_STYLE}>{role.directPermissions.length}</span>
          <span style={STAT_LABEL_STYLE}> direct permissions</span>
        </div>
        <div
          style={{
            ...STAT_BOX_STYLE,
            borderLeft: "1px solid rgba(0, 240, 255, 0.08)",
            borderRight: "1px solid rgba(0, 240, 255, 0.08)",
          }}
        >
          <span style={STAT_VALUE_STYLE}>{inheritedPermissions.length}</span>
          <span style={STAT_LABEL_STYLE}> inherited</span>
        </div>
        <div
          style={{
            ...STAT_BOX_STYLE,
            borderRight: "1px solid rgba(0, 240, 255, 0.08)",
          }}
        >
          <span style={STAT_VALUE_STYLE}>{role.flattenedPermissions.length}</span>
          <span style={STAT_LABEL_STYLE}> total</span>
        </div>
        <div style={STAT_BOX_STYLE}>
          <span style={STAT_VALUE_STYLE}>{role.inherits.length}</span>
          <span style={STAT_LABEL_STYLE}> parent roles</span>
        </div>
      </div>

      {/* Direct permissions */}
      <div data-testid="guard-role-detail-direct">
        <h4 style={SECTION_HEADER_STYLE}>Direct Permissions</h4>
        <div role="list" style={{ paddingBottom: "8px" }}>
          {role.directPermissions.map(perm => (
            <div
              key={perm}
              data-testid="guard-role-detail-permission"
              data-source="direct"
              role="listitem"
              style={{
                ...PERMISSION_ITEM_STYLE,
                color: "var(--hex-text-primary, #e4e4f0)",
              }}
            >
              {perm}
            </div>
          ))}
          {role.directPermissions.length === 0 && (
            <span
              style={{
                color: "var(--hex-text-muted, #6b6b80)",
                padding: "4px 16px",
                fontSize: "12px",
              }}
            >
              No direct permissions
            </span>
          )}
        </div>
      </div>

      {/* Inherited permissions */}
      <div
        data-testid="guard-role-detail-inherited"
        style={{ borderTop: "1px solid rgba(0, 240, 255, 0.06)" }}
      >
        <h4 style={SECTION_HEADER_STYLE}>Inherited Permissions</h4>
        <div role="list" style={{ paddingBottom: "8px" }}>
          {inheritedPermissions.map(perm => (
            <div
              key={perm}
              data-testid="guard-role-detail-permission"
              data-source="inherited"
              role="listitem"
              style={{
                ...PERMISSION_ITEM_STYLE,
                color: "var(--hex-text-secondary, #a0a0b8)",
              }}
            >
              {perm}
            </div>
          ))}
          {inheritedPermissions.length === 0 && (
            <span
              style={{
                color: "var(--hex-text-muted, #6b6b80)",
                padding: "4px 16px",
                fontSize: "12px",
              }}
            >
              No inherited permissions
            </span>
          )}
        </div>
      </div>

      {/* Parent roles */}
      <div
        data-testid="guard-role-detail-parents"
        style={{ borderTop: "1px solid rgba(0, 240, 255, 0.06)" }}
      >
        <h4 style={SECTION_HEADER_STYLE}>Inherits From</h4>
        <div role="list" style={{ paddingBottom: "8px" }}>
          {parentRoles.map(parent => (
            <div
              key={parent.name}
              data-testid="guard-role-detail-parent"
              role="listitem"
              onClick={onParentClick ? () => onParentClick(parent.name) : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 16px",
                cursor: onParentClick ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--hex-font-mono, monospace)",
                  fontSize: "12px",
                  color: "var(--hex-text-primary, #e4e4f0)",
                  fontWeight: 600,
                }}
              >
                {parent.name}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--hex-text-muted, #6b6b80)",
                }}
              >
                ({parent.flattenedPermissions.length} permissions)
              </span>
            </div>
          ))}
          {parentRoles.length === 0 && (
            <span
              style={{
                color: "var(--hex-text-muted, #6b6b80)",
                padding: "4px 16px",
                fontSize: "12px",
              }}
            >
              No parent roles
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { RoleDetail };
export type { RoleDetailProps };
