/**
 * Visual encoding utilities for the Guard Panel.
 *
 * Pure functions for decision coloring, policy kind icons, duration formatting,
 * and allow-rate zone coloring.
 *
 * Spec: 10-visual-encoding.md Sections 10.1, 10.2, 10.7, 10.10, 10.12
 *
 * @packageDocumentation
 */

import type { PolicyKind } from "@hex-di/guard";

// ── Decision Color Mapping (Section 10.1) ────────────────────────────────────

/** Get the CSS custom property reference for a decision color. */
export function getDecisionColor(decision: "allow" | "deny" | "error" | "skip"): string {
  switch (decision) {
    case "allow":
      return "var(--hex-guard-allow)";
    case "deny":
      return "var(--hex-guard-deny)";
    case "error":
      return "var(--hex-guard-error)";
    case "skip":
      return "var(--hex-guard-skip)";
  }
}

// ── Policy Kind Color Mapping (Section 10.2) ─────────────────────────────────

const POLICY_KIND_COLOR_MAP: Record<PolicyKind, string> = {
  hasPermission: "var(--hex-kind-has-permission)",
  hasRole: "var(--hex-kind-has-role)",
  hasAttribute: "var(--hex-kind-has-attribute)",
  hasResourceAttribute: "var(--hex-kind-has-resource-attribute)",
  hasSignature: "var(--hex-kind-has-signature)",
  hasRelationship: "var(--hex-kind-has-relationship)",
  allOf: "var(--hex-kind-all-of)",
  anyOf: "var(--hex-kind-any-of)",
  not: "var(--hex-kind-not)",
  labeled: "var(--hex-kind-labeled)",
};

/** Get the CSS custom property reference for a policy kind color. */
export function getPolicyKindColor(kind: PolicyKind): string {
  return POLICY_KIND_COLOR_MAP[kind];
}

// ── Policy Kind Icon Mapping (Section 10.2) ──────────────────────────────────

const POLICY_KIND_ICON_MAP: Record<PolicyKind, string> = {
  hasPermission: "\uD83D\uDD11", // 🔑
  hasRole: "\uD83D\uDC64", // 👤
  hasAttribute: "\uD83D\uDCCB", // 📋
  hasResourceAttribute: "\uD83D\uDCE6", // 📦
  hasSignature: "\u270D", // ✍
  hasRelationship: "\uD83D\uDD17", // 🔗
  allOf: "\u2297", // ⊗
  anyOf: "\u2295", // ⊕
  not: "\u2298", // ⊘
  labeled: "\uD83C\uDFF7", // 🏷
};

/** Get the icon character for a policy kind. */
export function getPolicyKindIcon(kind: PolicyKind): string {
  return POLICY_KIND_ICON_MAP[kind];
}

// ── Duration Formatting (Section 10.7) ───────────────────────────────────────

/**
 * Format a duration in milliseconds to a human-readable string.
 *
 * Guard durations are in milliseconds (not microseconds like Result).
 *
 * | Range               | Format        | Example    |
 * |---------------------|---------------|------------|
 * | < 0.01 ms           | `<0.01ms`     | `<0.01ms`  |
 * | 0.01 - 0.99 ms      | `{N.NN}ms`    | `0.42ms`   |
 * | 1 - 999 ms          | `{N.D}ms`     | `1.2ms`    |
 * | 1 - 59 s            | `{N.D}s`      | `2.3s`     |
 * | 60+ s               | `{M}m {S}s`   | `1m 23s`   |
 */
export function formatGuardDuration(milliseconds: number): string {
  if (milliseconds < 0.01) {
    return "<0.01ms";
  }
  if (milliseconds < 1) {
    return `${Number(milliseconds.toFixed(2))}ms`;
  }
  if (milliseconds < 1_000) {
    if (milliseconds < 10) {
      return `${Number(milliseconds.toFixed(1))}ms`;
    }
    return `${Math.round(milliseconds)}ms`;
  }
  const seconds = milliseconds / 1_000;
  if (seconds < 60) {
    return `${Number(seconds.toFixed(1))}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// ── Allow Rate Zone Color (Section 10.12) ────────────────────────────────────

/** Determine the color zone for an allow rate (0.0 - 1.0). */
export function getAllowRateZoneColor(allowRate: number): "green" | "amber" | "red" {
  if (allowRate >= 0.95) {
    return "green";
  }
  if (allowRate >= 0.8) {
    return "amber";
  }
  return "red";
}
