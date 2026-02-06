/**
 * Semantic convention mapper for HexDI to OpenTelemetry attributes.
 *
 * Maps HexDI-specific attributes to OpenTelemetry standard semantic conventions
 * while preserving original HexDI attributes for compatibility with HexDI tooling.
 *
 * @packageDocumentation
 */

import type { Attributes } from "@hex-di/tracing";
import { SEMATTRS_CODE_NAMESPACE } from "@opentelemetry/semantic-conventions";

/**
 * Map HexDI attributes to OpenTelemetry semantic conventions.
 *
 * This function creates a new attributes object that includes both:
 * 1. **Original HexDI attributes** (hex-di.*) - for HexDI-specific tooling
 * 2. **OTel standard attributes** - for universal backend compatibility
 *
 * **Why preserve both?**
 * - HexDI attributes are namespaced to avoid collisions
 * - OTel attributes follow standard conventions for backend aggregation
 * - Both sets enable filtering/grouping in different contexts
 *
 * **Mapping rules (OTEL-07):**
 * - `hex-di.port.name` → `code.namespace` (service/port identifier)
 * - `hex-di.resolution.cached` → `custom.cache_hit` (cache hit indicator)
 * - `hex-di.container.id` → `custom.container_id` (container identifier)
 * - `hex-di.resolution.depth` → `custom.resolution_depth` (dependency depth)
 *
 * @param attributes - Immutable HexDI attributes from span
 * @returns New attributes object with both HexDI and OTel conventions
 *
 * @remarks
 * - Input attributes are never mutated (readonly constraint)
 * - Output is a new object - safe for concurrent processing
 * - OTel keys only added if source HexDI key exists
 * - Custom attributes use 'custom.' prefix per OTel guidelines
 *
 * @example
 * ```typescript
 * const hexDiAttributes = {
 *   'hex-di.port.name': 'UserRepository',
 *   'hex-di.resolution.cached': true,
 *   'hex-di.container.id': 'root-container',
 *   'hex-di.resolution.depth': 3,
 * };
 *
 * const mapped = mapHexDiToOtelAttributes(hexDiAttributes);
 * // Result includes:
 * // {
 * //   'hex-di.port.name': 'UserRepository',
 * //   'code.namespace': 'UserRepository',
 * //   'hex-di.resolution.cached': true,
 * //   'custom.cache_hit': true,
 * //   'hex-di.container.id': 'root-container',
 * //   'custom.container_id': 'root-container',
 * //   'hex-di.resolution.depth': 3,
 * //   'custom.resolution_depth': 3,
 * // }
 * ```
 */
export function mapHexDiToOtelAttributes(attributes: Attributes): Attributes {
  // Start with all original HexDI attributes
  const mapped: Record<string, string | number | boolean | string[] | number[] | boolean[]> = {
    ...attributes,
  };

  // Map hex-di.port.name to code.namespace (service/component identifier)
  if ("hex-di.port.name" in attributes) {
    mapped[SEMATTRS_CODE_NAMESPACE] = attributes["hex-di.port.name"];
  }

  // Map hex-di.resolution.cached to custom.cache_hit (boolean cache indicator)
  if ("hex-di.resolution.cached" in attributes) {
    mapped["custom.cache_hit"] = attributes["hex-di.resolution.cached"];
  }

  // Map hex-di.container.id to custom.container_id (container identifier)
  if ("hex-di.container.id" in attributes) {
    mapped["custom.container_id"] = attributes["hex-di.container.id"];
  }

  // Map hex-di.resolution.depth to custom.resolution_depth (dependency depth)
  if ("hex-di.resolution.depth" in attributes) {
    mapped["custom.resolution_depth"] = attributes["hex-di.resolution.depth"];
  }

  return mapped;
}
