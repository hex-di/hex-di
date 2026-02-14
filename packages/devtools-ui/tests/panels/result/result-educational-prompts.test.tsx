/**
 * Component tests for EducationalPrompts (contextual hints + first-time experience).
 *
 * Spec: 12-educational-features.md (12.7-12.9)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { EducationalPrompts } from "../../../src/panels/result/educational-prompts.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

interface PromptTrigger {
  readonly type: string;
  readonly message: string;
}

const triggers: readonly PromptTrigger[] = [
  { type: "unobserved-path", message: "This path has 0% coverage. Consider adding a test." },
  { type: "high-recovery", message: "This chain has >90% recovery rate. That's unusual." },
  { type: "first-sankey", message: "Welcome to the Sankey view! It shows flow statistics." },
  { type: "first-async", message: "This chain uses ResultAsync. Check the Waterfall view." },
];

const storageMap = new Map<string, string>();

function setupEnv(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  storageMap.clear();
  Object.defineProperty(window, "localStorage", {
    writable: true,
    configurable: true,
    value: {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => storageMap.set(key, value),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    },
  });
}

afterEach(() => {
  cleanup();
});

// ── Contextual Prompts ─────────────────────────────────────────────────────

describe("EducationalPrompts — contextual", () => {
  beforeEach(setupEnv);

  it("prompt appears for unobserved path (0% coverage)", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="unobserved-path" />);

    const prompt = screen.getByTestId("educational-prompt");
    expect(prompt.textContent).toContain("0% coverage");
  });

  it("prompt appears for high recovery rate (>90%)", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="high-recovery" />);

    const prompt = screen.getByTestId("educational-prompt");
    expect(prompt.textContent).toContain("90% recovery");
  });

  it("prompt appears for first Sankey view", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="first-sankey" />);

    const prompt = screen.getByTestId("educational-prompt");
    expect(prompt.textContent).toContain("Sankey");
  });

  it("prompt appears for first async chain", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="first-async" />);

    const prompt = screen.getByTestId("educational-prompt");
    expect(prompt.textContent).toContain("ResultAsync");
  });

  it("prompt dismissible with X button", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="unobserved-path" />);

    fireEvent.click(screen.getByTestId("prompt-dismiss"));
    expect(screen.queryByTestId("educational-prompt")).toBeNull();
  });

  it("'Don't show hints' persists to localStorage", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="unobserved-path" />);

    fireEvent.click(screen.getByTestId("prompt-dont-show"));
    expect(localStorage.getItem("hex-hints-disabled")).toBe("true");
  });

  it("maximum one prompt visible at a time", () => {
    render(<EducationalPrompts triggers={triggers} activeTrigger="unobserved-path" />);

    const prompts = screen.getAllByTestId("educational-prompt");
    expect(prompts).toHaveLength(1);
  });

  it("prompt auto-dismisses after 10 seconds", () => {
    vi.useFakeTimers();

    render(<EducationalPrompts triggers={triggers} activeTrigger="unobserved-path" />);

    expect(screen.getByTestId("educational-prompt")).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByTestId("educational-prompt")).toBeNull();

    vi.useRealTimers();
  });
});

// ── First-Time Experience ──────────────────────────────────────────────────

describe("EducationalPrompts — first-time experience", () => {
  beforeEach(setupEnv);

  it("welcome overlay shows on first visit (no localStorage flag)", () => {
    render(<EducationalPrompts triggers={triggers} showWelcome={true} />);

    expect(screen.getByTestId("welcome-overlay")).toBeDefined();
  });

  it("'Start Guided Tour' launches walkthrough #1", () => {
    const onStartTour = vi.fn();
    render(
      <EducationalPrompts triggers={triggers} showWelcome={true} onStartGuidedTour={onStartTour} />
    );

    fireEvent.click(screen.getByTestId("welcome-start-tour"));
    expect(onStartTour).toHaveBeenCalledOnce();
  });

  it("'Explore on My Own' dismisses overlay", () => {
    render(<EducationalPrompts triggers={triggers} showWelcome={true} />);

    fireEvent.click(screen.getByTestId("welcome-explore"));
    expect(screen.queryByTestId("welcome-overlay")).toBeNull();
  });

  it("'Don't show again' checkbox persists dismissal", () => {
    render(<EducationalPrompts triggers={triggers} showWelcome={true} />);

    fireEvent.click(screen.getByTestId("welcome-dont-show-again"));
    fireEvent.click(screen.getByTestId("welcome-explore"));
    expect(localStorage.getItem("hex-welcome-dismissed")).toBe("true");
  });

  it("overlay does not show on subsequent visits", () => {
    localStorage.setItem("hex-welcome-dismissed", "true");

    render(<EducationalPrompts triggers={triggers} showWelcome={true} />);

    expect(screen.queryByTestId("welcome-overlay")).toBeNull();
  });
});
