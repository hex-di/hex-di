// Context
export { SubjectContext } from "./context.js";

// Provider
export { SubjectProvider } from "./SubjectProvider.js";
export type { SubjectProviderProps } from "./SubjectProvider.js";

// Components
export { Can } from "./Can.js";
export type { CanProps } from "./Can.js";

export { Cannot } from "./Cannot.js";
export type { CannotProps } from "./Cannot.js";

// Hooks
export {
  useSubject,
  useSubjectDeferred,
  useCan,
  useCanDeferred,
  usePolicy,
  usePolicyDeferred,
  usePolicies,
  usePoliciesDeferred,
} from "./hooks.js";

// Factory
export { createGuardHooks } from "./createGuardHooks.js";
export type { GuardHooks } from "./createGuardHooks.js";

// Types
export type { SubjectState, CanResult, PolicyResult } from "./types.js";

// Errors
export { MissingSubjectProviderError } from "./errors.js";
