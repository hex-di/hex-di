/**
 * Profile system exports.
 *
 * @packageDocumentation
 */

export type { AdapterProfile, AdapterVariants } from "./types.js";
export { DEFAULT_VARIANTS } from "./types.js";
export { developmentProfile } from "./development.js";
export { testProfile } from "./test.js";
export {
  loadAdapterConfig,
  getCurrentProfileName,
  registerProfile,
} from "./config.js";
