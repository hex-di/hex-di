/**
 * EducationalPrompts — Contextual hints and first-time prompts for the Guard Panel.
 *
 * Shows contextual educational prompts based on what the user is viewing,
 * with dismiss and disable options.
 *
 * Spec: 12-educational-features.md (12.7-12.9)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState } from "react";

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardEducationalPromptsProps {
  readonly context: string;
  readonly onDismiss: () => void;
}

// ── Context Messages ────────────────────────────────────────────────────────

const CONTEXT_MESSAGES: Readonly<Record<string, string>> = {
  tree: "The tree view shows how authorization policies are composed. Green nodes allowed access; red nodes denied it.",
  log: "The decision log shows every evaluation in chronological order. Click a row to inspect the full trace.",
  paths:
    "Path analysis shows all possible routes through the policy tree. Higher coverage means more paths have been exercised.",
  sankey:
    "The access flow diagram shows how subjects flow through evaluations to allow or deny outcomes.",
  timeline:
    "The timeline shows evaluation durations over time. Look for outliers that may indicate performance issues.",
  roles: "The role hierarchy shows how roles inherit from each other and accumulate permissions.",
  overview: "The overview dashboard provides a high-level summary of all guard activity.",
  "first-deny":
    "A deny decision was observed. Check the decision log to understand why access was refused.",
  "slow-eval": "A slow evaluation was detected. Check the timeline view for duration outliers.",
  "circular-role":
    "Circular role inheritance was detected. This may cause unexpected permission resolution.",
};

// ── Component ───────────────────────────────────────────────────────────────

function GuardEducationalPrompts({
  context,
  onDismiss,
}: GuardEducationalPromptsProps): React.ReactElement {
  const [visible, setVisible] = useState(true);
  const [hintsDisabled, setHintsDisabled] = useState(
    () =>
      typeof window !== "undefined" && localStorage.getItem("hex-guard-hints-disabled") === "true"
  );

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible || hintsDisabled) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 10_000);
    return () => clearTimeout(timer);
  }, [visible, hintsDisabled, onDismiss]);

  // Reset visibility when context changes
  useEffect(() => {
    setVisible(true);
  }, [context]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  const handleDisableHints = useCallback(() => {
    setHintsDisabled(true);
    setVisible(false);
    localStorage.setItem("hex-guard-hints-disabled", "true");
    onDismiss();
  }, [onDismiss]);

  const message = CONTEXT_MESSAGES[context];

  if (!visible || hintsDisabled || !message) {
    return <div data-testid="guard-educational-prompt" data-visible="false" />;
  }

  return (
    <div
      data-testid="guard-educational-prompt"
      data-visible="true"
      data-context={context}
      role="status"
      aria-live="polite"
    >
      <span data-testid="guard-prompt-message">{message}</span>

      <button data-testid="guard-prompt-dismiss" onClick={handleDismiss} aria-label="Dismiss hint">
        x
      </button>

      <button
        data-testid="guard-prompt-disable"
        onClick={handleDisableHints}
        aria-label="Disable all hints"
      >
        Don't show hints
      </button>
    </div>
  );
}

export { GuardEducationalPrompts };
export type { GuardEducationalPromptsProps };
