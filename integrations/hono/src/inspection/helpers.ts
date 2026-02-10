import type { InspectorAPI } from "@hex-di/core";
import type { Context } from "hono";
import { getContainer } from "../helpers.js";

/**
 * Retrieve the InspectorAPI from the container stored on the Hono context.
 *
 * Throws {@link import("../errors.js").MissingContainerError} when the
 * scope middleware was not registered.
 *
 * @param context - Hono request context
 * @param containerKey - Optional custom key used to store the container
 * @returns The InspectorAPI for the container
 */
export function getInspector(context: Context, containerKey?: string): InspectorAPI {
  const container = getContainer(context, containerKey);
  return container.inspector;
}
