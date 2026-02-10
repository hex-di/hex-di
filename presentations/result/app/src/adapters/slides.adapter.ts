import { createAdapter, SINGLETON } from "@hex-di/core";
import { SlidesPort, type SlidesService } from "../ports/slides.port.js";
import { slides } from "../content/slides.js";
import type { Act, SlideDefinition } from "../content/types.js";

export const slidesAdapter = createAdapter({
  provides: SlidesPort,
  requires: [],
  lifetime: SINGLETON,
  factory: (): SlidesService => ({
    getSlide(index: number): SlideDefinition | undefined {
      return slides[index - 1];
    },
    getSlidesByAct(act: Act): readonly SlideDefinition[] {
      return slides.filter(s => s.act === act);
    },
    get allSlides(): readonly SlideDefinition[] {
      return slides;
    },
  }),
});
