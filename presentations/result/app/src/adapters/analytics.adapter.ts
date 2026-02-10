import { createAdapter, SINGLETON } from "@hex-di/core";
import { LoggerPort, type Logger } from "@hex-di/logger";
import { TracerPort, type Tracer } from "@hex-di/tracing";
import { AnalyticsPort, type AnalyticsService } from "../ports/analytics.port.js";

export const analyticsAdapter = createAdapter({
  provides: AnalyticsPort,
  requires: [LoggerPort, TracerPort],
  lifetime: SINGLETON,
  factory: (deps: { Logger: Logger; Tracer: Tracer }): AnalyticsService => {
    const logger = deps.Logger.child({ component: "analytics" });
    const tracer = deps.Tracer;

    return {
      trackSlideView(slide: number) {
        tracer.withSpan("slide.view", span => {
          span.setAttribute("slide.index", slide);
          logger.info("Slide viewed", { slide });
        });
      },
      trackInteraction(action: string, detail?: string) {
        tracer.withSpan("presentation.interaction", span => {
          span.setAttribute("interaction.action", action);
          if (detail !== undefined) {
            span.setAttribute("interaction.detail", detail);
          }
          logger.debug("Interaction tracked", { action, detail });
        });
      },
    };
  },
});
