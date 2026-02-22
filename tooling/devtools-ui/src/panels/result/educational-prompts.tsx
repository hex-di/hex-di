/**
 * EducationalPrompts — Contextual hints and first-time experience overlay.
 *
 * Spec: 12-educational-features.md (12.7-12.9)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface PromptTrigger {
  readonly type: string;
  readonly message: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface EducationalPromptsProps {
  readonly triggers: readonly PromptTrigger[];
  readonly activeTrigger?: string;
  readonly showWelcome?: boolean;
  readonly onStartGuidedTour?: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function EducationalPrompts({
  triggers,
  activeTrigger,
  showWelcome = false,
  onStartGuidedTour,
}: EducationalPromptsProps): React.ReactElement {
  const [dismissed, setDismissed] = useState(false);
  const [hintsDisabled, setHintsDisabled] = useState(
    () => localStorage.getItem("hex-hints-disabled") === "true"
  );
  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => localStorage.getItem("hex-welcome-dismissed") === "true"
  );
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!activeTrigger || dismissed || hintsDisabled) return;
    const timer = setTimeout(() => {
      setDismissed(true);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [activeTrigger, dismissed, hintsDisabled]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleDontShow = useCallback(() => {
    setHintsDisabled(true);
    setDismissed(true);
    localStorage.setItem("hex-hints-disabled", "true");
  }, []);

  const handleExplore = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem("hex-welcome-dismissed", "true");
    }
    setWelcomeDismissed(true);
  }, [dontShowAgain]);

  const handleStartTour = useCallback(() => {
    setWelcomeDismissed(true);
    onStartGuidedTour?.();
  }, [onStartGuidedTour]);

  const handleDontShowAgain = useCallback(() => {
    setDontShowAgain(true);
    localStorage.setItem("hex-welcome-dismissed", "true");
  }, []);

  // ── Find active prompt ─────────────────────────────────────────────────

  const activePrompt =
    activeTrigger && !dismissed && !hintsDisabled
      ? triggers.find(t => t.type === activeTrigger)
      : undefined;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="educational-prompts">
      {/* Welcome overlay */}
      {showWelcome && !welcomeDismissed && (
        <div data-testid="welcome-overlay">
          <h2>Welcome to the Result Panel</h2>
          <p>Visualize and debug your Result chains.</p>
          <button data-testid="welcome-start-tour" onClick={handleStartTour}>
            Start Guided Tour
          </button>
          <button data-testid="welcome-explore" onClick={handleExplore}>
            Explore on My Own
          </button>
          <label>
            <input
              type="checkbox"
              data-testid="welcome-dont-show-again"
              checked={dontShowAgain}
              onChange={handleDontShowAgain}
            />
            Don&apos;t show again
          </label>
        </div>
      )}

      {/* Contextual prompt */}
      {activePrompt && (
        <div data-testid="educational-prompt">
          <span>{activePrompt.message}</span>
          <button data-testid="prompt-dismiss" onClick={handleDismiss}>
            ×
          </button>
          <button data-testid="prompt-dont-show" onClick={handleDontShow}>
            Don&apos;t show hints
          </button>
        </div>
      )}
    </div>
  );
}

export { EducationalPrompts };
export type { EducationalPromptsProps };
