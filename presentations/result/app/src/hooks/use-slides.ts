import { usePort } from "@hex-di/react";
import { SlidesPort, type SlidesService } from "../ports/slides.port.js";

export function useSlides(): SlidesService {
  return usePort(SlidesPort);
}
