import { port } from "@hex-di/core";
import type { Act, SlideDefinition } from "../content/types.js";

export interface SlidesService {
  getSlide(index: number): SlideDefinition | undefined;
  getSlidesByAct(act: Act): readonly SlideDefinition[];
  readonly allSlides: readonly SlideDefinition[];
}

export const SlidesPort = port<SlidesService>()({
  name: "Slides",
  description: "Slide content data access",
  category: "presentation",
});
