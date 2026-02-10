/**
 * Type effectiveness query adapter.
 *
 * Wraps TypeEffectivenessPort.getAllTypes() into a QueryFetcher.
 *
 * @packageDocumentation
 */

import { createAdapter } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import { TypeEffectivenessQueryPort } from "../../ports/query/type-effectiveness-query.js";
import { TypeEffectivenessPort } from "../../ports/type-chart.js";
import type { TypeEffectivenessService } from "../../ports/type-chart.js";

const typeEffectivenessQueryAdapter = createAdapter({
  provides: TypeEffectivenessQueryPort,
  requires: [TypeEffectivenessPort],
  factory: (deps: { readonly TypeEffectiveness: TypeEffectivenessService }) => {
    const typeService = deps.TypeEffectiveness;
    return () => ResultAsync.fromResult(typeService.getAllTypes());
  },
});

export { typeEffectivenessQueryAdapter };
