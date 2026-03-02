/**
 * Guard inspector port definition.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { GuardInspector } from "./inspector.js";

/**
 * Port for the GuardInspector service.
 */
export const GuardInspectorPort = port<GuardInspector>()({
  name: "GuardInspector",
  direction: "outbound",
  category: "guard/inspector",
  tags: ["guard", "authorization", "observability", "inspection"],
});
