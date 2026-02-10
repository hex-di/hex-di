/**
 * StoreRuntimeError Union Type
 *
 * Discriminated union of all runtime errors surfaced through
 * StateServiceConfig.onError. All members carry a `_tag` field
 * enabling exhaustive switch/case discrimination.
 *
 * @packageDocumentation
 */

import type {
  EffectFailedError,
  EffectErrorHandlerError,
  EffectAdapterError,
} from "../errors/tagged-errors.js";

/**
 * Union of all errors that can be delivered to StateServiceConfig.onError.
 * All members are `_tag`-discriminated plain objects.
 *
 * - `EffectFailedError`         — `_tag: "EffectFailed"` — an inline effect returned Err
 * - `EffectErrorHandlerError`   — `_tag: "EffectErrorHandlerFailed"` — the onEffectError handler itself threw
 * - `EffectAdapterError`        — `_tag: "EffectAdapterFailed"` — an effect adapter's onAction threw
 */
export type StoreRuntimeError = EffectFailedError | EffectErrorHandlerError | EffectAdapterError;
