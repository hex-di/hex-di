import { type ReactNode, useCallback } from "react";
import type { SlideMetadata } from "../slides";

interface SidebarProps {
  readonly slides: readonly SlideMetadata[];
  readonly activeId: string;
}

const phaseColors: Record<number, string> = {
  1: "text-hex-accent",
  2: "text-hex-primary",
  3: "text-hex-green",
  4: "text-hex-amber",
  5: "text-hex-pink",
};

const phaseBorderColors: Record<number, string> = {
  1: "border-hex-accent",
  2: "border-hex-primary",
  3: "border-hex-green",
  4: "border-hex-amber",
  5: "border-hex-pink",
};

const phaseLabels: Record<number, string> = {
  1: "THE PROBLEM",
  2: "GUARD PRIMITIVES",
  3: "COMPOSITION",
  4: "DAVINCI MIGRATION",
  5: "VISIBILITY & QUALITY",
};

export function Sidebar({ slides, activeId }: SidebarProps): ReactNode {
  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth" });
  }, []);

  let currentPhase = 0;

  return (
    <aside className="fixed left-0 top-12 bottom-0 w-56 bg-hex-bg/80 backdrop-blur-sm border-r border-hex-primary/8 overflow-y-auto z-40">
      <div className="py-4">
        {slides.map(slide => {
          const nodes: ReactNode[] = [];

          if (slide.phase !== currentPhase) {
            currentPhase = slide.phase;
            nodes.push(
              <div key={`phase-${slide.phase}`} className="px-4 pt-5 pb-2">
                <span
                  className={`font-mono text-[11px] tracking-[0.2em] uppercase ${phaseColors[slide.phase] ?? "text-hex-muted"}`}
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
