import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "./components/nav";
import { Sidebar } from "./components/sidebar";
import { PhaseDivider } from "./components/phase-divider";
import { ScrollContainerProvider } from "./context/scroll-container-context";
import { slides } from "./slides";

const phaseLabels: Record<number, string> = {
  1: "FOUNDATIONS",
  2: "TRADITIONAL MODELS",
  3: "ROLE & ATTRIBUTE MODELS",
  4: "MODERN MODELS",
  5: "COMPARISON & TOOLS",
  6: "PRACTICAL GUIDE",
};

const phaseColors: Record<number, string> = {
  1: "#A78BFA",
  2: "#F59E0B",
  3: "#34D399",
  4: "#2DD4BF",
  5: "#F472B6",
  6: "#60A5FA",
};

export function App(): ReactNode {
  const [activeId, setActiveId] = useState(slides[0].id);
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const handleScroll = useCallback(() => {
    const container = mainRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    let current = slides[0].id;

    for (const slide of slides) {
      const el = document.getElementById(slide.id);
      if (el) {
        const offset = el.offsetTop - container.offsetTop;
        if (scrollTop >= offset - 200) {
          current = slide.id;
        }
      }
    }

    setActiveId(current);
  }, []);

  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  let currentPhase = 0;

  return (
    <div className="h-screen flex flex-col bg-auth-bg bg-grid">
      <Nav />

      <div className="flex flex-1 pt-12 overflow-hidden">
        <Sidebar slides={slides} activeId={activeId} />

        <main
          ref={node => {
            mainRef.current = node;
            setScrollContainer(node);
          }}
          className="flex-1 ml-56 overflow-y-auto"
        >
          <ScrollContainerProvider value={scrollContainer}>
            {slides.map(slide => {
              const nodes: ReactNode[] = [];

              if (slide.phase !== currentPhase) {
                currentPhase = slide.phase;
                if (slide.phase > 1) {
                  nodes.push(
                    <PhaseDivider
                      key={`phase-${slide.phase}`}
                      label={phaseLabels[slide.phase]}
                      color={phaseColors[slide.phase]}
                    />
                  );
                }
              }

              nodes.push(<slide.component key={slide.id} />);
              return nodes;
            })}
          </ScrollContainerProvider>
        </main>
      </div>

      <div className="scanline-overlay" />
    </div>
  );
}
