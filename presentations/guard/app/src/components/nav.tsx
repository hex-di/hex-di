import type { ReactNode } from "react";

function ShieldIcon(): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shield-glow">
      <path
        d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
        stroke="#00F0FF"
        strokeWidth="1.5"
        fill="rgba(0, 240, 255, 0.06)"
      />
      <path
        d="M12 6l-5 3v3.5c0 3.5 2.3 6.7 5 7.5 2.7-.8 5-4 5-7.5V9l-5-3z"
        stroke="#00F0FF"
        strokeWidth="0.8"
        fill="rgba(0, 240, 255, 0.1)"
        opacity="0.6"
      />
      <circle cx="12" cy="12" r="2" fill="#00F0FF" opacity="0.8" />
    </svg>
  );
}

export function Nav(): ReactNode {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-5 bg-hex-bg/90 backdrop-blur-md border-b border-hex-primary/10">
      <div className="flex items-center gap-3">
        <ShieldIcon />
        <span className="font-display font-semibold text-xl tracking-wide text-hex-text">
          @hex-di/<span className="text-hex-primary">guard</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-hex-muted">
          Authorization Framework
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-hex-primary animate-pulse-glow" />
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-hex-primary/70">
            LIVE
          </span>
        </span>
      </div>
    </nav>
  );
}
