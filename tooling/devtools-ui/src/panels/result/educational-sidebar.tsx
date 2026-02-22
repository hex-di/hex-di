/**
 * EducationalSidebar — Glossary, walkthroughs, context-aware content.
 *
 * Spec: 12-educational-features.md (12.1-12.9)
 *
 * @packageDocumentation
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ResultCategoryName } from "./types.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface GlossaryEntry {
  readonly method: string;
  readonly category: ResultCategoryName;
  readonly signature: string;
  readonly description: string;
  readonly equivalents: readonly string[];
}

interface WalkthroughStep {
  readonly title: string;
  readonly content: string;
  readonly targetView?: string;
  readonly spotlightSelector?: string;
}

interface WalkthroughDefinition {
  readonly id: string;
  readonly title: string;
  readonly stepCount: number;
  readonly steps: readonly WalkthroughStep[];
}

interface PatternLabel {
  readonly pattern: string;
  readonly label: string;
}

interface ComparisonCard {
  readonly methodA: string;
  readonly methodB: string;
  readonly explanation: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

interface EducationalSidebarProps {
  readonly glossary: readonly GlossaryEntry[];
  readonly walkthroughs: readonly WalkthroughDefinition[];
  readonly patternLabels: readonly PatternLabel[];
  readonly comparisonCards: readonly ComparisonCard[];
  readonly initialOpen?: boolean;
  readonly selectedMethod?: string;
  readonly activeView?: string;
  readonly detectedPattern?: string;
  readonly onNavigateToView?: (view: string) => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function EducationalSidebar({
  glossary,
  walkthroughs,
  patternLabels,
  comparisonCards,
  initialOpen = false,
  selectedMethod,
  activeView,
  detectedPattern,
  onNavigateToView,
}: EducationalSidebarProps): React.ReactElement {
  const [open, setOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState<"glossary" | "walkthrough">("glossary");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Walkthrough state
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | undefined>(undefined);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  // ── Glossary computed ──────────────────────────────────────────────────

  const sortedGlossary = useMemo(() => {
    let entries = [...glossary].sort((a, b) => a.method.localeCompare(b.method));
    if (searchQuery) {
      entries = entries.filter(e => e.method.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      entries = entries.filter(e => e.category === categoryFilter);
    }
    return entries;
  }, [glossary, searchQuery, categoryFilter]);

  const glossaryGroups = useMemo(() => {
    const groups = new Map<string, GlossaryEntry[]>();
    for (const entry of sortedGlossary) {
      const existing = groups.get(entry.category) ?? [];
      existing.push(entry);
      groups.set(entry.category, existing);
    }
    return groups;
  }, [sortedGlossary]);

  // ── Walkthrough computed ───────────────────────────────────────────────

  const currentWalkthrough = activeWalkthrough
    ? walkthroughs.find(w => w.id === activeWalkthrough)
    : undefined;

  const currentStep = currentWalkthrough?.steps[walkthroughStep];

  // ── Context-aware content ──────────────────────────────────────────────

  const contextText = useMemo(() => {
    if (activeView === "cases")
      return "Path analysis shows all possible execution paths through the chain.";
    if (selectedMethod) {
      const entry = glossary.find(e => e.method === selectedMethod);
      if (entry) return `${entry.method}: ${entry.description}`;
    }
    return undefined;
  }, [activeView, selectedMethod, glossary]);

  const matchingComparison = useMemo(() => {
    if (!selectedMethod) return undefined;
    return comparisonCards.find(c => c.methodA === selectedMethod || c.methodB === selectedMethod);
  }, [selectedMethod, comparisonCards]);

  const matchingPattern = useMemo(() => {
    if (!detectedPattern) return undefined;
    return patternLabels.find(p => p.pattern === detectedPattern);
  }, [detectedPattern, patternLabels]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const toggleOpen = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const startWalkthrough = useCallback(
    (id: string) => {
      const wt = walkthroughs.find(w => w.id === id);
      if (!wt) return;

      // Check for saved progress
      const saved = localStorage.getItem(`hex-walkthrough-${id}`);
      const startStep = saved ? Number(saved) : 0;

      setActiveWalkthrough(id);
      setWalkthroughStep(startStep);

      // Auto-navigate if step has targetView
      const step = wt.steps[startStep];
      if (step?.targetView && onNavigateToView) {
        onNavigateToView(step.targetView);
      }
    },
    [walkthroughs, onNavigateToView]
  );

  const nextStep = useCallback(() => {
    if (!currentWalkthrough) return;
    const next = walkthroughStep + 1;
    if (next < currentWalkthrough.steps.length) {
      setWalkthroughStep(next);
      localStorage.setItem(`hex-walkthrough-${currentWalkthrough.id}`, String(next));

      const step = currentWalkthrough.steps[next];
      if (step?.targetView && onNavigateToView) {
        onNavigateToView(step.targetView);
      }
    }
  }, [currentWalkthrough, walkthroughStep, onNavigateToView]);

  const prevStep = useCallback(() => {
    if (walkthroughStep > 0) {
      setWalkthroughStep(walkthroughStep - 1);
    }
  }, [walkthroughStep]);

  const skipWalkthrough = useCallback(() => {
    setActiveWalkthrough(undefined);
    setWalkthroughStep(0);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div data-testid="educational-sidebar">
      <button data-testid="sidebar-toggle" onClick={toggleOpen}>
        [?]
      </button>

      {open && (
        <div data-testid="sidebar-content">
          {/* Tabs */}
          <button
            data-testid="tab-glossary"
            onClick={() => setActiveTab("glossary")}
            aria-pressed={activeTab === "glossary"}
          >
            Glossary
          </button>
          <button
            data-testid="tab-walkthrough"
            onClick={() => setActiveTab("walkthrough")}
            aria-pressed={activeTab === "walkthrough"}
          >
            Walkthroughs
          </button>

          {/* Context info */}
          {contextText && <div data-testid="context-info">{contextText}</div>}

          {/* Comparison card */}
          {matchingComparison && (
            <div data-testid="comparison-card">
              {matchingComparison.methodA} vs {matchingComparison.methodB}:{" "}
              {matchingComparison.explanation}
            </div>
          )}

          {/* Pattern label */}
          {matchingPattern && <div data-testid="pattern-label">{matchingPattern.label}</div>}

          {/* Try in Playground */}
          {selectedMethod && (
            <a data-testid="try-in-playground" href="#">
              Try in Playground
            </a>
          )}

          {/* Glossary tab */}
          {activeTab === "glossary" && (
            <div data-testid="glossary-tab">
              <input
                data-testid="glossary-search"
                type="text"
                placeholder="Search methods..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                data-testid="glossary-category-filter"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                <option value="chaining">chaining</option>
                <option value="transformation">transformation</option>
                <option value="recovery">recovery</option>
                <option value="observation">observation</option>
                <option value="extraction">extraction</option>
                <option value="conversion">conversion</option>
                <option value="constructor">constructor</option>
                <option value="combinator">combinator</option>
                <option value="generator">generator</option>
              </select>

              {/* Grouped entries */}
              {[...glossaryGroups.entries()].map(([category, entries]) => (
                <div key={category} data-testid="glossary-category-group">
                  <h4>{category}</h4>
                  {entries.map(entry => (
                    <div
                      key={entry.method}
                      data-testid="glossary-entry"
                      data-method={entry.method}
                      data-category={entry.category}
                    >
                      <span>{entry.method}</span>
                      <span>{entry.category}</span>
                      <span>{entry.signature}</span>
                      <span>{entry.description}</span>
                      <span>{entry.equivalents.join(", ")}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Walkthrough tab */}
          {activeTab === "walkthrough" && !activeWalkthrough && (
            <div data-testid="walkthrough-list">
              {walkthroughs.map(wt => (
                <div key={wt.id} data-testid="walkthrough-item">
                  <span>{wt.title}</span>
                  <span>{wt.stepCount} steps</span>
                  <button data-testid="walkthrough-start" onClick={() => startWalkthrough(wt.id)}>
                    Start
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Active walkthrough */}
          {activeTab === "walkthrough" && currentStep && (
            <div data-testid="walkthrough-active">
              <div data-testid="walkthrough-active-step">
                <h4>{currentStep.title}</h4>
                <p>{currentStep.content}</p>
              </div>

              {currentStep.spotlightSelector && (
                <div
                  data-testid="walkthrough-spotlight"
                  data-selector={currentStep.spotlightSelector}
                />
              )}

              <button data-testid="walkthrough-prev" onClick={prevStep}>
                Previous
              </button>
              <button data-testid="walkthrough-next" onClick={nextStep}>
                Next
              </button>
              <button data-testid="walkthrough-skip" onClick={skipWalkthrough}>
                Skip
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { EducationalSidebar };
export type { EducationalSidebarProps };
