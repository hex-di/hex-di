import { type ReactNode, useCallback } from "react";
import type { SlideMetadata } from "../slides";

interface SidebarProps {
  readonly slides: readonly SlideMetadata[];
  readonly activeId: string;
}

const phaseColors: Record<number, string> = {
  1: "text-auth-primary",
  2: "text-auth-accent",
  3: "text-auth-green",
  4: "text-auth-teal",
  5: "text-auth-pink",
  6: "text-auth-blue",
};

const phaseBorderColors: Record<number, string> = {
  1: "border-auth-primary",
  2: "border-auth-accent",
  3: "border-auth-green",
  4: "border-auth-teal",
  5: "border-auth-pink",
  6: "border-auth-blue",
};

const phaseLabels: Record<number, string> = {
  1: "FOUNDATIONS",
  2: "TRADITIONAL MODELS",
  3: "ROLE & ATTRIBUTE",
  4: "MODERN MODELS",
  5: "COMPARISON & TOOLS",
  6: "PRACTICAL GUIDE",
};

export function Sidebar({ slides, activeId }: SidebarProps): ReactNode {
  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  let currentPhase = 0;

  return (
    <aside className="fixed left-0 top-12 bottom-0 w-56 bg-auth-bg/80 backdrop-blur-sm border-r border-auth-primary/8 overflow-y-auto z-40">
      <div className="py-4">
        {slides.map(slide => {
          const nodes: ReactNode[] = [];

          if (slide.phase !== currentPhase) {
            currentPhase = slide.phase;
            nodes.push(
              <div key={`phase-${slide.phase}`} className="px-4 pt-5 pb-2">
                <span
                  className={`font-mono text-[11px] tracking-[0.2em] uppercase ${phaseColors[slide.phase] ?? "text-auth-muted"}`}
                >
                  {phaseLabels[slide.phase]}
                </span>
              </div>
            );
          }

          const isActive = activeId === slide.id;

          nodes.push(
            <button
              key={slide.id}
              onClick={() => handleClick(slide.id)}
              className={`sidebar-item block w-full text-left font-sans truncate ${
                isActive
                  ? `sidebar-item-active ${phaseBorderColors[slide.phase] ?? ""} ${phaseColors[slide.phase] ?? ""}`
                  : ""
              }`}
            >
              <span className="font-mono text-xs opacity-50 mr-1.5">
                {slide.number.toString().padStart(2, "0")}
              </span>
              {slide.title}
            </button>
          );

          return nodes;
        })}
      </div>
    </aside>
  );
}
