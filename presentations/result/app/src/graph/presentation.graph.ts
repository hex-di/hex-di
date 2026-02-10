import { GraphBuilder } from "@hex-di/graph";
import { ConsoleLoggerAdapter } from "@hex-di/logger";
import { ConsoleTracerAdapter } from "@hex-di/tracing";
import { currentSlideAdapter, presentationModeAdapter } from "../adapters/navigation.adapter.js";
import { slidesAdapter } from "../adapters/slides.adapter.js";
import { codeExamplesAdapter } from "../adapters/code-examples.adapter.js";
import { themeAdapter } from "../adapters/theme.adapter.js";
import { analyticsAdapter } from "../adapters/analytics.adapter.js";

export const presentationGraph = GraphBuilder.create()
  // Infrastructure (logger + tracing)
  .provide(ConsoleLoggerAdapter)
  .provide(ConsoleTracerAdapter)
  // Navigation (flow machine + store atom)
  .provide(currentSlideAdapter)
  .provide(presentationModeAdapter)
  // Content
  .provide(slidesAdapter)
  .provide(codeExamplesAdapter)
  // Theme (store atom)
  .provide(themeAdapter)
  // Analytics (depends on logger + tracer)
  .provide(analyticsAdapter)
  .build();
