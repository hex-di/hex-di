/**
 * In-memory saga persister adapter.
 *
 * Provides an in-memory persistence layer for saga execution state.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { SagaPersisterPort, createInMemoryPersister } from "@hex-di/saga";

const persisterAdapter = createAdapter({
  provides: SagaPersisterPort,
  lifetime: "singleton",
  factory: () => createInMemoryPersister(),
});

export { persisterAdapter };
