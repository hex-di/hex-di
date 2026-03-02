/**
 * Playground Toolbar
 *
 * Contains the ExampleDropdown, RunButton, ShareButton, ThemeToggle,
 * and EmbedButton. Provides the primary action bar for the playground.
 *
 * @see spec/playground/05-layout-and-panels.md Section 20.2
 * @see spec/playground/06-examples-and-sharing.md Section 26.3
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useTheme } from "@hex-di/devtools-ui";
import type { ExampleCategory, ExampleRegistryInterface } from "../examples/types.js";
import type { SandboxStatus } from "../context/sandbox-context.js";
import type { VirtualFS } from "../editor/virtual-fs.js";
import { encodeShareableState } from "../sharing/url-encoder.js";
import type { ShareableState } from "../sharing/types.js";
import {
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MoonIcon,
  SunIcon,
  ShareIcon,
  CodeIcon,
  HexLogoIcon,
} from "./icons.js";

// =============================================================================
// Types
// =============================================================================

/** Props for the Toolbar component. */
export interface ToolbarProps {
  /** Example registry for the dropdown. */
  readonly registry: ExampleRegistryInterface;
  /** Current sandbox status. */
  readonly status: SandboxStatus;
  /** Whether the workspace has unsaved modifications. */
  readonly isModified: boolean;
  /** Whether this is embed mode (hides some controls). */
  readonly isEmbed?: boolean;
  /** The virtual filesystem for sharing. */
  readonly virtualFS: VirtualFS;
  /** The currently active file. */
  readonly activeFile: string;

  // Callbacks
  /** Called when the Run button is clicked. */
  readonly onRun: () => void;
  /** Called when an example is selected. */
  readonly onSelectExample: (id: string) => void;
  /** Called when active file changes (from example loading). */
  readonly onActiveFileChange?: (path: string) => void;
}

// =============================================================================
// Category labels for the dropdown
// =============================================================================

const CATEGORY_LABELS: Record<ExampleCategory, string> = {
  basics: "Basics",
  patterns: "Patterns",
  result: "Result",
  guard: "Guard",
  libraries: "Libraries",
  advanced: "Advanced",
};

const CATEGORY_ORDER: readonly ExampleCategory[] = [
  "basics",
  "patterns",
  "result",
  "guard",
  "libraries",
  "advanced",
];

// =============================================================================
// ExampleDropdown
// =============================================================================

function ExampleDropdown(props: {
  readonly registry: ExampleRegistryInterface;
  readonly isModified: boolean;
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  const { registry, isModified, onSelect } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClick(e: MouseEvent): void {
      const target = e.target;
      if (
        dropdownRef.current !== null &&
        target instanceof Node &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleSelect = useCallback(
    (id: string) => {
      if (isModified) {
        const confirmed = confirm("Loading an example will replace your current code. Continue?");
        if (!confirmed) return;
      }
      onSelect(id);
      setIsOpen(false);
    },
    [isModified, onSelect]
  );

  // Group examples by category
  const groupedExamples = useMemo(() => {
    const groups: {
      readonly category: ExampleCategory;
      readonly label: string;
      readonly items: ReturnType<ExampleRegistryInterface["getByCategory"]>;
    }[] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = registry.getByCategory(cat);
      if (items.length > 0) {
        groups.push({ category: cat, label: CATEGORY_LABELS[cat], items });
      }
    }
    return groups;
  }, [registry]);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        data-testid="example-dropdown-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        onMouseEnter={() => setIsButtonHovered(true)}
        onMouseLeave={() => setIsButtonHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          border: "1px solid var(--hex-border, #e2e8f0)",
          borderRadius: "var(--hex-radius-md, 6px)",
          background: isButtonHovered
            ? "var(--hex-bg-hover, #e8e8ec)"
            : "var(--hex-bg-primary, #ffffff)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "var(--hex-font-sans, sans-serif)",
          color: "var(--hex-text-primary, #1e293b)",
          transition: "var(--hex-transition-fast, 100ms ease)",
        }}
      >
        Examples
        {isOpen ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
      </button>

      {isOpen && (
        <div
          data-testid="example-dropdown-menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 100,
            minWidth: 280,
            maxHeight: 400,
            overflow: "auto",
            background: "var(--hex-bg-primary, #ffffff)",
            border: "1px solid var(--hex-border, #e2e8f0)",
            borderRadius: "var(--hex-radius-lg, 8px)",
            boxShadow: "var(--hex-shadow-tooltip, 0 4px 12px rgba(0,0,0,0.1))",
            marginTop: 4,
            animation: "hex-fade-in 150ms ease",
            padding: "4px 0",
          }}
        >
          {groupedExamples.map(group => (
            <div key={group.category}>
              <div
                style={{
                  padding: "8px 14px 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--hex-text-muted, #9b9bb0)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "var(--hex-font-sans, sans-serif)",
                }}
              >
                {group.label}
              </div>
              {group.items.map(example => (
                <button
                  key={example.id}
                  data-testid={`example-item-${example.id}`}
                  onClick={() => handleSelect(example.id)}
                  onMouseEnter={() => setHoveredItem(example.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: "block",
                    width: "calc(100% - 8px)",
                    textAlign: "left",
                    padding: "8px 14px 8px 24px",
                    border: "none",
                    background:
                      hoveredItem === example.id ? "var(--hex-bg-hover, #e8e8ec)" : "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "var(--hex-font-sans, sans-serif)",
                    color: "var(--hex-text-primary, #1e293b)",
                    borderRadius: "var(--hex-radius-sm, 4px)",
                    margin: "0 4px",
                    transition: "var(--hex-transition-fast, 100ms ease)",
                  }}
                  title={example.description}
                >
                  {example.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// RunButton
// =============================================================================

function RunButton(props: {
  readonly status: SandboxStatus;
  readonly onRun: () => void;
}): React.ReactElement {
  const { status, onRun } = props;
  const isRunning = status === "compiling" || status === "executing";
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      data-testid="run-button"
      onClick={onRun}
      disabled={isRunning}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 18px",
        border: "none",
        borderRadius: "var(--hex-radius-md, 6px)",
        background: isRunning
          ? "var(--hex-accent-muted, #a5b4fc)"
          : isHovered
            ? "var(--hex-accent-hover, #5558e6)"
            : "var(--hex-accent, #6366f1)",
        color: "var(--hex-text-inverse, #ffffff)",
        cursor: isRunning ? "not-allowed" : "pointer",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "var(--hex-font-sans, sans-serif)",
        boxShadow: isRunning ? "none" : "0 2px 6px rgba(99, 102, 241, 0.35)",
        transition: "var(--hex-transition-fast, 100ms ease)",
      }}
    >
      {isRunning ? (
        <>
          <span
            data-testid="run-spinner"
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#ffffff",
              borderRadius: "50%",
              animation: "hex-spin 0.6s linear infinite",
            }}
          />
          {status === "compiling" ? "Compiling..." : "Executing..."}
        </>
      ) : (
        <>
          <PlayIcon size={14} />
          Run
        </>
      )}
    </button>
  );
}

// =============================================================================
// ShareButton
// =============================================================================

function ShareButton(props: {
  readonly virtualFS: VirtualFS;
  readonly activeFile: string;
}): React.ReactElement {
  const { virtualFS, activeFile } = props;
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (toastMessage === undefined) return undefined;
    const timeout = setTimeout(() => setToastMessage(undefined), 2000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleShare = useCallback(() => {
    const files = virtualFS.getAll();
    const state: ShareableState = {
      files: [...files.entries()],
      activeFile,
    };

    const result = encodeShareableState(state);

    if (!result.success) {
      setToastMessage("Workspace too large for URL sharing.");
      return;
    }

    // Update the URL hash
    window.location.hash = result.encoded;

    // Copy to clipboard
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => setToastMessage("Link copied to clipboard"),
      () => setToastMessage("URL updated (clipboard unavailable)")
    );
  }, [virtualFS, activeFile]);

  return (
    <div style={{ position: "relative" }}>
      <button
        data-testid="share-button"
        onClick={handleShare}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          border: "1px solid var(--hex-border, #e2e8f0)",
          borderRadius: "var(--hex-radius-md, 6px)",
          background: isHovered ? "var(--hex-bg-hover, #e8e8ec)" : "var(--hex-bg-primary, #ffffff)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "var(--hex-font-sans, sans-serif)",
          color: "var(--hex-text-primary, #1e293b)",
          transition: "var(--hex-transition-fast, 100ms ease)",
        }}
      >
        <ShareIcon size={14} />
      </button>

      {toastMessage !== undefined && (
        <div
          data-testid="share-toast"
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 6,
            padding: "6px 14px",
            background: "var(--hex-bg-tertiary, #334155)",
            color: "var(--hex-text-inverse, #ffffff)",
            borderRadius: "var(--hex-radius-md, 6px)",
            fontSize: 12,
            fontFamily: "var(--hex-font-sans, sans-serif)",
            whiteSpace: "nowrap",
            zIndex: 100,
            boxShadow: "var(--hex-shadow-tooltip, 0 2px 10px rgba(0,0,0,0.12))",
            animation: "hex-fade-in 150ms ease",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ThemeToggle
// =============================================================================

function ThemeToggle(): React.ReactElement {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = useCallback(() => {
    theme.setTheme(theme.resolved === "light" ? "dark" : "light");
  }, [theme]);

  return (
    <button
      data-testid="theme-toggle"
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "7px 14px",
        border: "1px solid var(--hex-border, #e2e8f0)",
        borderRadius: "var(--hex-radius-md, 6px)",
        background: isHovered ? "var(--hex-bg-hover, #e8e8ec)" : "var(--hex-bg-primary, #ffffff)",
        cursor: "pointer",
        fontSize: 14,
        fontFamily: "var(--hex-font-sans, sans-serif)",
        color: "var(--hex-text-primary, #1e293b)",
        transition: "var(--hex-transition-fast, 100ms ease)",
      }}
      title={`Switch to ${theme.resolved === "light" ? "dark" : "light"} theme`}
    >
      {theme.resolved === "light" ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    </button>
  );
}

// =============================================================================
// EmbedButton
// =============================================================================

function EmbedButton(props: {
  readonly virtualFS: VirtualFS;
  readonly activeFile: string;
}): React.ReactElement {
  const { virtualFS, activeFile } = props;
  const [toastMessage, setToastMessage] = useState<string | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (toastMessage === undefined) return undefined;
    const timeout = setTimeout(() => setToastMessage(undefined), 2000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleEmbed = useCallback(() => {
    const files = virtualFS.getAll();
    const state: ShareableState = {
      files: [...files.entries()],
      activeFile,
    };
    const result = encodeShareableState(state);

    if (!result.success) {
      setToastMessage("Workspace too large for embed URL.");
      return;
    }

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const embedUrl = `${baseUrl}?embed=true#${result.encoded}`;

    const iframeSnippet = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="500"\n  style="border: 1px solid #e2e8f0; border-radius: 8px;"\n  title="HexDi Playground"\n  loading="lazy"\n></iframe>`;

    navigator.clipboard.writeText(iframeSnippet).then(
      () => setToastMessage("Embed snippet copied to clipboard"),
      () => setToastMessage("Could not copy to clipboard")
    );
  }, [virtualFS, activeFile]);

  return (
    <div style={{ position: "relative" }}>
      <button
        data-testid="embed-button"
        onClick={handleEmbed}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          border: "1px solid var(--hex-border, #e2e8f0)",
          borderRadius: "var(--hex-radius-md, 6px)",
          background: isHovered ? "var(--hex-bg-hover, #e8e8ec)" : "var(--hex-bg-primary, #ffffff)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "var(--hex-font-sans, sans-serif)",
          color: "var(--hex-text-primary, #1e293b)",
          transition: "var(--hex-transition-fast, 100ms ease)",
        }}
        title="Copy embed snippet"
      >
        <CodeIcon size={14} />
      </button>

      {toastMessage !== undefined && (
        <div
          data-testid="embed-toast"
          style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginTop: 6,
            padding: "6px 14px",
            background: "var(--hex-bg-tertiary, #334155)",
            color: "var(--hex-text-inverse, #ffffff)",
            borderRadius: "var(--hex-radius-md, 6px)",
            fontSize: 12,
            fontFamily: "var(--hex-font-sans, sans-serif)",
            whiteSpace: "nowrap",
            zIndex: 100,
            boxShadow: "var(--hex-shadow-tooltip, 0 2px 10px rgba(0,0,0,0.12))",
            animation: "hex-fade-in 150ms ease",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Toolbar (main component)
// =============================================================================

/**
 * Playground Toolbar with ExampleDropdown, RunButton, ShareButton,
 * ThemeToggle, and EmbedButton.
 */
export function Toolbar(props: ToolbarProps): React.ReactElement {
  const {
    registry,
    status,
    isModified,
    isEmbed = false,
    virtualFS,
    activeFile,
    onRun,
    onSelectExample,
  } = props;

  return (
    <div
      data-testid="toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 20px",
        borderBottom: "1px solid var(--hex-border, #e2e8f0)",
        background: "var(--hex-bg-secondary, #f5f5f7)",
        fontFamily: "var(--hex-font-sans, sans-serif)",
        flexShrink: 0,
        minHeight: 52,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Branding (hidden in embed mode) */}
      {!isEmbed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingRight: 16,
            borderRight: "1px solid var(--hex-border, #e2e8f0)",
            marginRight: 4,
          }}
        >
          <HexLogoIcon size={22} style={{ color: "var(--hex-accent, #6366f1)" }} />
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--hex-text-primary, #1e293b)",
              whiteSpace: "nowrap",
            }}
          >
            HexDI Playground
          </span>
        </div>
      )}

      {/* Example dropdown (hidden in embed mode) */}
      {!isEmbed && (
        <ExampleDropdown registry={registry} isModified={isModified} onSelect={onSelectExample} />
      )}

      {/* Run button */}
      <RunButton status={status} onRun={onRun} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Share button (hidden in embed mode) */}
      {!isEmbed && <ShareButton virtualFS={virtualFS} activeFile={activeFile} />}

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Embed button (hidden in embed mode) */}
      {!isEmbed && <EmbedButton virtualFS={virtualFS} activeFile={activeFile} />}
    </div>
  );
}

// Also export sub-components for direct use
export { ExampleDropdown, RunButton, ShareButton, ThemeToggle, EmbedButton };
