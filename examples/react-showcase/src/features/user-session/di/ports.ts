/**
 * User session feature port definitions.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { UserSession } from "../types.js";

/**
 * Port for the user session service.
 *
 * Provides the current user's identity for the scope.
 */
export const UserSessionPort = createPort<"UserSession", UserSession>("UserSession");

/**
 * Union of all ports in the user session feature.
 */
export type UserSessionPorts = typeof UserSessionPort;
