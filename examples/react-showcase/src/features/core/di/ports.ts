/**
 * Core feature port definitions.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import type { Config, Logger } from "../../types.js";

/**
 * Port for the application configuration service.
 *
 * Provides application-wide configuration values.
 * Uses async factory to simulate loading from API.
 */
export const ConfigPort = port<Config>()({ name: "Config" });

/**
 * Port for the logging service.
 *
 * Provides structured logging with different log levels.
 */
export const LoggerPort = port<Logger>()({ name: "Logger" });

/**
 * Union of all ports in the core feature.
 */
export type CorePorts = typeof ConfigPort | typeof LoggerPort;
