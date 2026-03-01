import type { ReactNode } from "react";

function HexagonIcon(): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="hexagon-glow">
      {/* Outer hexagon */}
      <path
        d="M12 2L21 7.5V16.5L12 22L3 16.5V7.5L12 2Z"
        stroke="#00F0FF"
        strokeWidth="1.5"
        fill="rgba(0, 240, 255, 0.06)"
      />
      {/* Inner neural connections */}
      <circle cx="12" cy="8" r="1.2" fill="#00F0FF" opacity="0.8" />
      <circle cx="8" cy="14" r="1.2" fill="#FF5E00" opacity="0.8" />
      <circle cx="16" cy="14" r="1.2" fill="#FF5E00" opacity="0.8" />
      <line x1="12" y1="8" x2="8" y2="14" stroke="#00F0FF" strokeWidth="0.6" opacity="0.5" />
      <line x1="12" y1="8" x2="16" y2="14" stroke="#00F0FF" strokeWidth="0.6" opacity="0.5" />
      <line x1="8" y1="14" x2="16" y2="14" stroke="#FF5E00" strokeWidth="0.6" opacity="0.5" />
      {/* Center node */}
      <circle cx="12" cy="12" r="1" fill="#A6E22E" opacity="0.9" />
      <line x1="12" y1="12" x2="12" y2="8" stroke="#A6E22E" strokeWidth="0.4" opacity="0.4" />
      <line x1="12" y1="12" x2="8" y2="14" stroke="#A6E22E" strokeWidth="0.4" opacity="0.4" />
      <line x1="12" y1="12" x2="16" y2="14" stroke="#A6E22E" strokeWidth="0.4" opacity="0.4" />
    </svg>
  );
}

export function Nav(): ReactNode {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-5 bg-hex-bg/90 backdrop-blur-md border-b border-hex-primary/10">
      <div className="flex items-center gap-3">
        <HexagonIcon />
        <span className="font-display font-semibold text-xl tracking-wide text-hex-text">
          @hex-di
          <span className="text-hex-muted mx-2">//</span>
          <span className="text-hex-primary">The Self-Aware Application</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-hex-muted">
          Self-Aware Infrastructure
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-hex-green animate-pulse-glow" />
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-hex-green/70">
            LIVE
          </span>
        </span>
      </div>
    </nav>
  );
}
