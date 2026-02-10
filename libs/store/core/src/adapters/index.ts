/**
 * Adapters Module
 *
 * @packageDocumentation
 */

export { createStateAdapter } from "./state-adapter.js";
export { createAtomAdapter } from "./atom-adapter.js";
export { createDerivedAdapter } from "./derived-adapter.js";
export { createAsyncDerivedAdapter } from "./async-derived-adapter.js";
export { createLinkedDerivedAdapter } from "./linked-derived-adapter.js";
export { createEffectAdapter } from "./effect-adapter.js";
export { createHydrationAdapter } from "./hydration-adapter.js";
export type { CreateHydrationAdapterConfig } from "./hydration-adapter.js";
export { isEffectAdapter, withEffectAdapters } from "./discovery.js";
export {
  __stateAdapterBrand,
  __atomAdapterBrand,
  __derivedAdapterBrand,
  __asyncDerivedAdapterBrand,
  __linkedDerivedAdapterBrand,
  __effectBrand,
} from "./brands.js";
export type { EffectAdapterBrand, StoreAdapterResult } from "./brands.js";
