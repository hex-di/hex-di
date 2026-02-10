/**
 * Logger inspector port definition.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { LoggerInspector } from "./inspector.js";

/**
 * Port for the LoggerInspector service.
 */
export const LoggerInspectorPort = port<LoggerInspector>()({
  name: "LoggerInspector",
  direction: "outbound",
  category: "infrastructure",
  tags: ["logging", "observability", "inspection"],
});
