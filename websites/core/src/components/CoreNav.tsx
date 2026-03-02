import type { ReactNode } from "react";
import { useState, useCallback, useRef } from "react";
import { LIBRARIES, getLibraryUrl } from "@hex-di/website-theme/libraries";

// ============================================================
// CONSTANTS
// ============================================================

const ACCENT = "#00F0FF";

// ============================================================
// SUB-COMPONENTS
// ============================================================

function CoreNavLink({
  label,
  href,
}: {
  readonly label: string;
  readonly href: string;
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "6px 14px",
        fontFamily: "'Fira Code', monospace",
        fontSize: "0.8rem",
        letterSpacing: "0.04em",
        color: hovered ? ACCENT : "rgba(200, 214, 229, 0.75)",
        textDecoration: "none",
        border: "1px solid",
        borderColor: hovered ? "rgba(0, 240, 255, 0.3)" : "transparent",
        transition: "all 0.2s ease",
      }}
    >
      [{label}]
    </a>
  );
}

function LibraryDropdownLink({
  name,
  url,
  accent,
  current,
}: {
  readonly name: string;
  readonly url: string;
  readonly accent: string;
  readonly current: boolean;
}): ReactNode {
  const [hovered, setHovered] = useState(false);
  const restColor = current ? accent : "rgba(200, 214, 229, 0.75)";
  return (
    <a
      href={url}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        fontFamily: "'Fira Code', monospace",
        fontSize: "0.72rem",
        color: hovered ? accent : restColor,
        textDecoration: "none",
        background: hovered ? `${accent}0d` : "transparent",
        transition: "color 0.2s, background 0.2s",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accent,
          opacity: hovered || current ? 1 : 0.35,
          transition: "opacity 0.2s",
        }}
      />
      {name}
    </a>
  );
}

function LibrariesDropdown(): ReactNode {
  const [open, setOpen] = useState(false);
  const [btnHovered, setBtnHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <div style={{ position: "relative" }} onMouseEnter={show} onMouseLeave={hide}>
      <button
        onMouseEnter={() => setBtnHovered(true)}
        onMouseLeave={() => setBtnHovered(false)}
        style={{
          padding: "6px 14px",
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.8rem",
          letterSpacing: "0.04em",
          color: btnHovered || open ? ACCENT : "rgba(200, 214, 229, 0.75)",
          background: "none",
          border: "1px solid",
          borderColor: btnHovered || open ? "rgba(0, 240, 255, 0.3)" : "transparent",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        [Libraries]
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "rgba(2, 4, 8, 0.97)",
            border: "1px solid rgba(0, 240, 255, 0.15)",
            backdropFilter: "blur(14px)",
            padding: "8px 0",
            minWidth: 200,
            zIndex: 300,
          }}
        >
          {LIBRARIES.map(lib => {
            const isCurrent = lib.id === "core";
            const displayName = isCurrent ? `${lib.name} (Core)` : lib.name;
            return (
              <LibraryDropdownLink
                key={lib.id}
                name={displayName}
                url={getLibraryUrl(lib)}
                accent={lib.accent}
                current={isCurrent}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function GitHubIcon(): ReactNode {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="https://github.com/leaderiop/hex-di"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="GitHub repository"
      style={{
        marginLeft: "12px",
        color: hovered ? ACCENT : "rgba(200, 214, 229, 0.75)",
        transition: "color 0.2s",
        display: "flex",
        alignItems: "center",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    </a>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CoreNav(): ReactNode {
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileLinks = [
    { label: "Docs", href: "/docs" },
    { label: "Blog", href: "/blog" },
    { label: "Presentations", href: "/presentations" },
    { label: "GitHub", href: "https://github.com/leaderiop/hex-di" },
  ];

  return (
    <nav
      data-core-nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: "64px",
        display: "flex",
        alignItems: "center",
        padding: "0 40px",
        background: "rgba(2, 4, 8, 0.9)",
        borderBottom: "1px solid rgba(0, 240, 255, 0.2)",
        boxShadow: "0 4px 20px -10px rgba(0, 240, 255, 0.3)",
        backdropFilter: "blur(12px)",
        fontFamily: "'Fira Code', monospace",
      }}
    >
      {/* Logo */}
      <a
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          marginRight: "auto",
          textDecoration: "none",
          gap: "8px",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polygon
            points="14,2 24,8 24,20 14,26 4,20 4,8"
            stroke="#00F0FF"
            strokeWidth="1.5"
            fill="rgba(0,240,255,0.08)"
          />
          <polygon
            points="14,7 20,11 20,19 14,23 8,19 8,11"
            stroke="#00F0FF"
            strokeWidth="0.8"
            fill="rgba(0,240,255,0.04)"
          />
          <circle cx="14" cy="15" r="2.5" fill="#00F0FF" opacity="0.85" />
        </svg>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "1.25rem",
            color: "#FFFFFF",
          }}
        >
          HexDI
        </span>
      </a>

      {/* Desktop nav */}
      <div
        className="hex-hide-mobile"
        style={{ display: "flex", alignItems: "center", gap: "4px" }}
      >
        <CoreNavLink label="Docs" href="/docs" />
        <LibrariesDropdown />
        <CoreNavLink label="Blog" href="/blog" />
        <CoreNavLink label="Presentations" href="/presentations" />

        {/* Status badge */}
        <div
          style={{
            marginLeft: "16px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.65rem",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: ACCENT,
            border: "1px solid rgba(0, 240, 255, 0.3)",
            padding: "4px 10px",
            background: "rgba(0, 240, 255, 0.05)",
          }}
        >
          <span
            className="pulse-dot"
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: ACCENT,
              boxShadow: `0 0 8px ${ACCENT}`,
            }}
          />
          HEXDI::CORE
        </div>

        <GitHubIcon />
      </div>

      {/* Mobile hamburger */}
      <button
        className="hex-show-mobile"
        onClick={() => setMenuOpen(o => !o)}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        style={{
          background: "none",
          border: "none",
          color: ACCENT,
          cursor: "pointer",
          fontSize: "1.2rem",
          padding: "8px",
          fontFamily: "'Fira Code', monospace",
        }}
      >
        {menuOpen ? "\u2715" : "\u2630"}
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "64px",
            left: 0,
            right: 0,
            background: "rgba(2, 4, 8, 0.97)",
            borderBottom: "1px solid rgba(0, 240, 255, 0.2)",
            display: "flex",
            flexDirection: "column",
            padding: "12px 0",
          }}
        >
          {mobileLinks.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "12px 24px",
                color: "#c8d6e5",
                textDecoration: "none",
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.82rem",
              }}
            >
              [{label}]
            </a>
          ))}
          {/* Libraries section */}
          <div
            style={{
              padding: "8px 24px 4px",
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.65rem",
              color: ACCENT,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginTop: 8,
              borderTop: "1px solid rgba(0, 240, 255, 0.1)",
            }}
          >
            Libraries
          </div>
          {LIBRARIES.map(lib => {
            const isCurrent = lib.id === "core";
            const displayName = isCurrent ? `${lib.name} (Core)` : lib.name;
            return (
              <a
                key={lib.id}
                href={getLibraryUrl(lib)}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 24px 8px 36px",
                  color: isCurrent ? lib.accent : "#8a9bb0",
                  textDecoration: "none",
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.72rem",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: lib.accent,
                    opacity: isCurrent ? 1 : 0.5,
                  }}
                />
                {displayName}
              </a>
            );
          })}
        </div>
      )}
    </nav>
  );
}
