/**
 * Core feature port definitions.
 *
 * @packageDocumentation
 */

import { createPort } from "@hex-di/ports";
import type { Config, Logger } from "../../types.js";

/**
 * Port for the application configuration service.
 *
 * Provides application-wide configuration values.
 * Uses async factory to simulate loading from API.
 */
export const ConfigPort = createPort<"Config", Config>("Config");

/**
 * Port for the logging service.
 *
 * Provides structured logging with different log levels.
 */
export const LoggerPort = createPort<"Logger", Logger>("Logger");

/**
 * Union of all ports in the core feature.
 */
export type CorePorts = typeof ConfigPort | typeof LoggerPort;
