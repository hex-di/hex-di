/// <reference types="vite/client" />
/**
 * Adapter configuration loading and environment variable parsing.
 *
 * @packageDocumentation
 */

import type { AdapterProfile, AdapterVariants } from "./types.js";
import { DEFAULT_VARIANTS } from "./types.js";
import { developmentProfile } from "./development.js";
import { testProfile } from "./test.js";

// =============================================================================
// Profile Registry
// =============================================================================

/**
 * Built-in profiles registry.
 */
const PROFILES: Record<string, AdapterProfile> = {
  development: developmentProfile,
  test: testProfile,
};

// =============================================================================
// Environment Variable Names
// =============================================================================

/**
 * Environment variable names for configuration.
 * Uses VITE_ prefix for Vite compatibility.
 */
const ENV_VARS = {
  PROFILE: "VITE_DI_PROFILE",
  LOGGER: "VITE_DI_LOGGER",
  MESSAGE_STORE: "VITE_DI_MESSAGE_STORE",
  USER_SESSION: "VITE_DI_USER_SESSION",
} as const;

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Type guard for valid variant values.
 */
function isValidVariant<K extends keyof AdapterVariants>(
  key: K,
  value: unknown
): value is AdapterVariants[K] {
  const validValues: Record<keyof AdapterVariants, readonly string[]> = {
    logger: ["console", "silent"],
    messageStore: ["localStorage", "memory"],
    userSession: ["moduleState"],
  };
  return typeof value === "string" && validValues[key].includes(value);
}

/**
 * Loads adapter configuration from environment variables.
 *
 * Priority (highest to lowest):
 * 1. Individual env vars (VITE_DI_LOGGER, etc.)
 * 2. Profile-based selection (VITE_DI_PROFILE)
 * 3. Default variants
 *
 * @returns The resolved adapter variants configuration
 *
 * @example
 * ```bash
 * # Use test profile
 * VITE_DI_PROFILE=test pnpm dev
 *
 * # Use development with silent logger
 * VITE_DI_PROFILE=development VITE_DI_LOGGER=silent pnpm dev
 * ```
 */
export function loadAdapterConfig(): AdapterVariants {
  // Start with defaults
  let variants = { ...DEFAULT_VARIANTS };

  // Apply profile if specified
  const profileName = import.meta.env[ENV_VARS.PROFILE] as string | undefined;
  if (profileName) {
    const profile = PROFILES[profileName];
    if (profile) {
      variants = { ...variants, ...profile.variants };
      console.log(`[HexDI] Using profile: ${profileName}`);
    } else {
      console.warn(`[HexDI] Unknown profile: ${profileName}, using defaults`);
    }
  }

  // Apply individual overrides
  const loggerOverride = import.meta.env[ENV_VARS.LOGGER];
  if (isValidVariant("logger", loggerOverride)) {
    variants.logger = loggerOverride;
  }

  const messageStoreOverride = import.meta.env[ENV_VARS.MESSAGE_STORE];
  if (isValidVariant("messageStore", messageStoreOverride)) {
    variants.messageStore = messageStoreOverride;
  }

  const userSessionOverride = import.meta.env[ENV_VARS.USER_SESSION];
  if (isValidVariant("userSession", userSessionOverride)) {
    variants.userSession = userSessionOverride;
  }

  return variants;
}

/**
 * Gets the current profile name for logging/debugging.
 */
export function getCurrentProfileName(): string {
  return (import.meta.env[ENV_VARS.PROFILE] as string) ?? "default";
}

/**
 * Registers a custom profile.
 *
 * @param profile - The profile to register
 */
export function registerProfile(profile: AdapterProfile): void {
  PROFILES[profile.name] = profile;
}
