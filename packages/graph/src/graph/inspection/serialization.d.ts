/**
 * JSON serialization for graph inspection results.
 *
 * This module provides functions to convert GraphInspection objects
 * into JSON-serializable formats for logging, storage, and network transport.
 *
 * @packageDocumentation
 */
import type { GraphInspection, GraphInspectionJSON, InspectionToJSONOptions } from "../types/inspection.js";
/**
 * Converts a GraphInspection to a JSON-serializable format.
 *
 * Use this when you need to:
 * - Log graph state as structured JSON
 * - Store inspection results for later analysis
 * - Send graph diagnostics over a network
 * - Compare graph states across builds
 *
 * @example Basic usage
 * ```typescript
 * const info = builder.inspect();
 * const json = inspectionToJSON(info);
 * console.log(JSON.stringify(json, null, 2));
 * ```
 *
 * @example Storing for analysis
 * ```typescript
 * import { writeFileSync } from 'fs';
 *
 * const info = builder.inspect();
 * const json = inspectionToJSON(info);
 * writeFileSync('graph-debug.json', JSON.stringify(json, null, 2));
 * ```
 *
 * @example Deterministic testing with injectable timestamp
 * ```typescript
 * // In tests, use a fixed timestamp for snapshot testing:
 * const json = inspectionToJSON(info, {
 *   timestamp: '2024-01-01T00:00:00.000Z'
 * });
 * expect(json.timestamp).toBe('2024-01-01T00:00:00.000Z');
 * expect(json).toMatchSnapshot();
 * ```
 *
 * @param inspection - The graph inspection result from inspectGraph() or builder.inspect()
 * @param options - Optional configuration for serialization
 * @returns A plain object that can be safely passed to JSON.stringify()
 */
export declare function inspectionToJSON(inspection: GraphInspection, options?: InspectionToJSONOptions): GraphInspectionJSON;
