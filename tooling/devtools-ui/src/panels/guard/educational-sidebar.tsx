/**
 * EducationalSidebar — Glossary and walkthrough sidebar for the Guard Panel.
 *
 * Provides contextual help, policy kind glossary, and guided walkthroughs
 * for understanding guard authorization concepts.
 *
 * Spec: 12-educational-features.md (12.1-12.9)
 *
 * @packageDocumentation
 */

import { useCallback, useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface GuardGlossaryEntry {
  readonly term: string;
  readonly description: string;
  readonly category: "policy" | "decision" | "subject" | "role" | "attribute";
}

interface GuardWalkthroughStep {
  readonly title: string;
  readonly content: string;
}

// ── Glossary Data ───────────────────────────────────────────────────────────

const GUARD_GLOSSARY: readonly GuardGlossaryEntry[] = [
  {
    term: "Policy Tree",
    description: "A hierarchical composition of authorization policies that guards a port.",
    category: "policy",
  },
  {
    term: "allOf",
    description: "A compound policy that requires ALL child policies to allow access.",
    category: "policy",
  },
  {
    term: "anyOf",
    description: "A compound policy that requires ANY child policy to allow access.",
    category: "policy",
  },
  {
    term: "not",
    description: "A compound policy that inverts the decision of its child.",
    category: "policy",
  },
  {
    term: "hasPermission",
    description: "A leaf policy that checks if the subject has a specific permission.",
    category: "policy",
  },
  {
    term: "hasRole",
    description: "A leaf policy that checks if the subject has a specific role.",
    category: "role",
  },
  {
    term: "hasAttribute",
    description: "A leaf policy that checks a subject attribute against a matcher.",
    category: "attribute",
  },
  {
    term: "Allow",
    description: "The policy tree evaluated to grant access.",
    category: "decision",
  },
  {
    term: "Deny",
    description: "The policy tree evaluated to refuse access.",
    category: "decision",
  },
  {
    term: "Subject",
    description: "The authenticated entity being evaluated (user, service, etc).",
    category: "subject",
  },
  {
    term: "Short-circuit",
    description: "Skipping remaining policies when the outcome is already determined.",
    category: "decision",
  },
  {
    term: "Field Masking",
    description: "Restricting which fields are visible based on authorization policies.",
    category: "policy",
  },
];

// ── Walkthrough Data ────────────────────────────────────────────────────────

const GUARD_WALKTHROUGHS: readonly {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly GuardWalkthroughStep[];
}[] = [
  {
    id: "guard-basics",
    title: "Guard Basics",
    steps: [
      {
        title: "What is a Guard?",
        content:
          "A guard protects a port by evaluating an authorization policy tree against a subject.",
      },
      {
        title: "Policy Trees",
        content: "Policies are composed in trees using allOf, anyOf, and not combinators.",
      },
      { title: "Decisions", content: "Each evaluation results in an allow or deny decision." },
    ],
  },
  {
    id: "reading-the-tree",
    title: "Reading the Tree View",
    steps: [
      { title: "Root Node", content: "The root node represents the top-level policy for a port." },
      {
        title: "Leaf Nodes",
        content: "Leaf nodes are the actual checks: hasPermission, hasRole, etc.",
      },
      {
        title: "Traces",
        content: "When an execution is selected, each node shows its evaluation result.",
      },
    ],
  },
];

// ── Props ───────────────────────────────────────────────────────────────────

interface GuardEducationalSidebarProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

function GuardEducationalSidebar({
  isOpen,
  onClose,
}: GuardEducationalSidebarProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"glossary" | "walkthrough">("glossary");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeWalkthroughId, setActiveWalkthroughId] = useState<string | undefined>(undefined);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  // ── Filtered glossary ─────────────────────────────────────────────────

  const filteredGlossary = searchQuery
    ? GUARD_GLOSSARY.filter(
        e =>
          e.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : GUARD_GLOSSARY;

  // ── Active walkthrough ────────────────────────────────────────────────

  const activeWalkthrough = activeWalkthroughId
    ? GUARD_WALKTHROUGHS.find(w => w.id === activeWalkthroughId)
    : undefined;

  const currentStep = activeWalkthrough?.steps[walkthroughStep];

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleStartWalkthrough = useCallback((id: string) => {
    setActiveWalkthroughId(id);
    setWalkthroughStep(0);
  }, []);

  const handleNextStep = useCallback(() => {
    if (activeWalkthrough && walkthroughStep < activeWalkthrough.steps.length - 1) {
      setWalkthroughStep(prev => prev + 1);
    }
  }, [activeWalkthrough, walkthroughStep]);

  const handlePrevStep = useCallback(() => {
    if (walkthroughStep > 0) {
      setWalkthroughStep(prev => prev - 1);
    }
  }, [walkthroughStep]);

  const handleExitWalkthrough = useCallback(() => {
    setActiveWalkthroughId(undefined);
    setWalkthroughStep(0);
  }, []);

  const tabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "var(--hex-space-xs) var(--hex-space-md)",
    borderRadius: "var(--hex-radius-sm)",
    fontSize: "var(--hex-font-size-xs)",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    backgroundColor: isActive ? "var(--hex-accent-muted)" : "transparent",
    color: isActive ? "var(--hex-accent)" : "var(--hex-text-muted)",
    transition: "all var(--hex-transition-fast)",
  });

  const smallButtonStyle: React.CSSProperties = {
    padding: "var(--hex-space-xs) var(--hex-space-sm)",
    border: "1px solid var(--hex-border)",
    borderRadius: "var(--hex-radius-sm)",
    backgroundColor: "transparent",
    color: "var(--hex-text-muted)",
    cursor: "pointer",
    fontSize: "var(--hex-font-size-xs)",
  };

  if (!isOpen) {
    return <div data-testid="guard-educational-sidebar" data-open="false" />;
  }

  return (
    <div
      data-testid="guard-educational-sidebar"
      data-open="true"
      role="complementary"
      aria-label="Guard educational sidebar"
      style={{
        padding: "var(--hex-space-md)",
        backgroundColor: "var(--hex-bg-secondary)",
        borderLeft: "1px solid var(--hex-border)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--hex-space-md)",
        overflow: "auto",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        data-testid="guard-sidebar-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: "var(--hex-text-primary)",
            fontSize: "var(--hex-font-size-sm)",
          }}
        >
          Learn
        </span>
        <button
          data-testid="guard-sidebar-close"
          onClick={onClose}
          aria-label="Close educational sidebar"
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--hex-radius-pill)",
            border: "none",
            backgroundColor: "transparent",
            color: "var(--hex-text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--hex-font-size-sm)",
            transition: "background-color var(--hex-transition-fast)",
          }}
        >
          x
        </button>
      </div>

      {/* Tabs */}
      <div
        data-testid="guard-sidebar-tabs"
        role="tablist"
        style={{ display: "flex", gap: "var(--hex-space-xxs)" }}
      >
        <button
          data-testid="guard-sidebar-tab-glossary"
          role="tab"
          aria-selected={activeTab === "glossary"}
          onClick={() => setActiveTab("glossary")}
          style={tabButtonStyle(activeTab === "glossary")}
        >
          Glossary
        </button>
        <button
          data-testid="guard-sidebar-tab-walkthrough"
          role="tab"
          aria-selected={activeTab === "walkthrough"}
          onClick={() => setActiveTab("walkthrough")}
          style={tabButtonStyle(activeTab === "walkthrough")}
        >
          Walkthroughs
        </button>
      </div>

      {/* Glossary tab */}
      {activeTab === "glossary" && (
        <div
          data-testid="guard-glossary-tab"
          role="tabpanel"
          style={{ display: "flex", flexDirection: "column", gap: "var(--hex-space-sm)" }}
        >
          <input
            data-testid="guard-glossary-search"
            type="text"
            placeholder="Search terms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search glossary"
            style={{
              backgroundColor: "var(--hex-bg-tertiary)",
              color: "var(--hex-text-primary)",
              border: "1px solid var(--hex-border)",
              borderRadius: "var(--hex-radius-sm)",
              padding: "var(--hex-space-xs) var(--hex-space-sm)",
              fontSize: "var(--hex-font-size-xs)",
              fontFamily: "var(--hex-font-sans)",
              outline: "none",
            }}
          />

          <div data-testid="guard-glossary-list" role="list">
            {filteredGlossary.map(entry => (
              <div
                key={entry.term}
                data-testid="guard-glossary-entry"
                data-category={entry.category}
                role="listitem"
                style={{
                  padding: "var(--hex-space-xs) 0",
                  borderBottom: "1px solid var(--hex-border-subtle, transparent)",
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: "var(--hex-text-primary)",
                    fontSize: "var(--hex-font-size-xs)",
                  }}
                >
                  {entry.term}
                </span>
                <span
                  style={{
                    color: "var(--hex-text-muted)",
                    marginLeft: 8,
                    fontSize: "var(--hex-font-size-xs)",
                  }}
                >
                  {entry.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Walkthrough tab */}
      {activeTab === "walkthrough" && !activeWalkthrough && (
        <div
          data-testid="guard-walkthrough-list"
          role="tabpanel"
          style={{ display: "flex", flexDirection: "column", gap: "var(--hex-space-sm)" }}
        >
          {GUARD_WALKTHROUGHS.map(wt => (
            <div
              key={wt.id}
              data-testid="guard-walkthrough-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--hex-space-sm)",
                padding: "var(--hex-space-xs) 0",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "var(--hex-font-size-xs)",
                  color: "var(--hex-text-primary)",
                }}
              >
                {wt.title}
              </span>
              <span style={{ color: "var(--hex-text-muted)", fontSize: "var(--hex-font-size-xs)" }}>
                {wt.steps.length} steps
              </span>
              <button
                data-testid="guard-walkthrough-start"
                onClick={() => handleStartWalkthrough(wt.id)}
                style={smallButtonStyle}
              >
                Start
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active walkthrough */}
      {activeTab === "walkthrough" && currentStep && (
        <div
          data-testid="guard-walkthrough-active"
          role="tabpanel"
          style={{ display: "flex", flexDirection: "column", gap: "var(--hex-space-sm)" }}
        >
          <div
            data-testid="guard-walkthrough-step"
            style={{
              padding: "var(--hex-space-md)",
              backgroundColor: "var(--hex-bg-tertiary)",
              borderRadius: "var(--hex-radius-md)",
              border: "1px solid var(--hex-border)",
            }}
          >
            <h4
              style={{
                margin: "0 0 var(--hex-space-xs) 0",
                fontSize: "var(--hex-font-size-sm)",
                fontWeight: 600,
                color: "var(--hex-text-primary)",
              }}
            >
              {currentStep.title}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "var(--hex-font-size-xs)",
                color: "var(--hex-text-muted)",
                lineHeight: 1.5,
              }}
            >
              {currentStep.content}
            </p>
          </div>
          <div
            data-testid="guard-walkthrough-progress"
            style={{
              fontSize: "var(--hex-font-size-xs)",
              color: "var(--hex-text-muted)",
              textAlign: "center",
            }}
          >
            Step {walkthroughStep + 1} of {activeWalkthrough?.steps.length ?? 0}
          </div>
          <div style={{ display: "flex", gap: "var(--hex-space-xs)" }}>
            <button
              data-testid="guard-walkthrough-prev"
              onClick={handlePrevStep}
              disabled={walkthroughStep === 0}
              style={smallButtonStyle}
            >
              Previous
            </button>
            <button
              data-testid="guard-walkthrough-next"
              onClick={handleNextStep}
              disabled={
                activeWalkthrough ? walkthroughStep >= activeWalkthrough.steps.length - 1 : true
              }
              style={smallButtonStyle}
            >
              Next
            </button>
            <button
              data-testid="guard-walkthrough-exit"
              onClick={handleExitWalkthrough}
              style={smallButtonStyle}
            >
              Exit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { GuardEducationalSidebar };
export type { GuardEducationalSidebarProps };
