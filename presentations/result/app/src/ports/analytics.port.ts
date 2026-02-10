import { port } from "@hex-di/core";

export interface AnalyticsService {
  trackSlideView(slide: number): void;
  trackInteraction(action: string, detail?: string): void;
}

export const AnalyticsPort = port<AnalyticsService>()({
  name: "Analytics",
  description: "Presentation event tracking",
  category: "presentation",
});
