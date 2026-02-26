import type { ReactNode } from "react";

function PolicyIcon(): ReactNode {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="policy-glow">
      <rect
        x="3"
        y="2"
        width="18"
        height="20"
        rx="2"
        stroke="#A78BFA"
        strokeWidth="1.5"
        fill="rgba(167, 139, 250, 0.06)"
      />
      <path
        d="M7 7h10M7 11h10M7 15h6"
        stroke="#A78BFA"
        strokeWidth="1"
        opacity="0.6"
        strokeLinecap="round"
      />
      <circle cx="17" cy="17" r="4" fill="#060210" stroke="#F59E0B" strokeWidth="1.5" />
      <path
        d="M17 15v2l1.5 1"
        stroke="#F59E0B"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Nav(): ReactNode {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-5 bg-auth-bg/90 backdrop-blur-md border-b border-auth-primary/10">
      <div className="flex items-center gap-3">
        <PolicyIcon />
        <span className="font-display font-semibold text-xl tracking-wide text-auth-text">
          Policy <span className="text-auth-primary">Authorization</span>
        </span>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="font-mono text-xs tracking-[0.2em] uppercase text-auth-muted">
          Access Control Models
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-auth-primary animate-pulse-glow" />
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-auth-primary/70">
            LIVE
          </span>
        </span>
      </div>
    </nav>
  );
}
