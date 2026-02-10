// @ts-nocheck
export {
  type QueryClient,
  type QueryClientConfig,
  type QueryClientEvent,
  createQueryClient,
} from "./query-client.js";

export {
  type QueryObserver,
  type QueryObserverOptions,
  createQueryObserver,
} from "./query-observer.js";

export { type DeduplicationMap, createDeduplicationMap } from "./deduplication.js";

export { type DehydratedState, dehydrate, hydrate } from "./dehydration.js";
