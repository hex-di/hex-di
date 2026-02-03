/**
 * User session feature port definitions.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { UserSession } from "../types.js";

/**
 * Port for the user session service.
 *
 * Provides the current user's identity for the scope.
 */
export const UserSessionPort = port<UserSession>()({ name: "UserSession" });

/**
 * Union of all ports in the user session feature.
 */
export type UserSessionPorts = typeof UserSessionPort;
