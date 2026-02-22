/**
 * Filtering span processor wrapper for PII redaction.
 *
 * Wraps a SpanProcessor with an attribute filter applied before onEnd,
 * ensuring that by the time SpanData reaches any exporter, PII
 * has already been redacted.
 *
 * @packageDocumentation
 */

import type { SpanProcessor } from "../ports/processor.js";
import type { Span, SpanData } from "../types/index.js";
import type { Attributes } from "../types/index.js";

/**
 * Wraps a SpanProcessor with an attribute filter applied before onEnd.
 *
 * The filter is applied to:
 * - Span-level attributes
 * - Event-level attributes (for each span event)
 *
 * This ensures that by the time SpanData reaches any exporter, PII
 * has already been redacted.
 *
 * @param inner - The underlying span processor to delegate to
 * @param filterFn - Attribute filter function (from createAttributeFilter)
 * @returns A new SpanProcessor that filters attributes before delegation
 *
 * @example
 * ```typescript
 * const filter = createAttributeFilter({ blockedKeys: ['user.email'] });
 * const processor = createFilteringProcessor(batchProcessor, filter);
 * ```
 *
 * @public
 */
export function createFilteringProcessor(
  inner: SpanProcessor,
  filterFn: (attributes: Attributes) => Attributes
): SpanProcessor {
  return {
    onStart(span: Span): void {
      inner.onStart(span);
    },
    onEnd(spanData: SpanData): void {
      const filtered: SpanData = {
        context: spanData.context,
        parentSpanId: spanData.parentSpanId,
        name: spanData.name,
        kind: spanData.kind,
        startTime: spanData.startTime,
        endTime: spanData.endTime,
        status: spanData.status,
        attributes: filterFn(spanData.attributes),
        events: spanData.events.map(event => ({
          name: event.name,
          time: event.time,
          attributes: event.attributes ? filterFn(event.attributes) : event.attributes,
        })),
        links: spanData.links,
      };
      inner.onEnd(filtered);
    },
    forceFlush(): Promise<void> {
      return inner.forceFlush();
    },
    shutdown(): Promise<void> {
      return inner.shutdown();
    },
  };
}
