/**
 * Benchmark: Sequence generator throughput
 *
 * Measures the throughput of the sequence generator's next() call.
 */

import { bench, describe } from "vitest";
import { createSystemSequenceGenerator } from "../../src/adapters/system-clock.js";

describe("sequence generator", () => {
  const seq = createSystemSequenceGenerator();

  bench("next()", () => {
    seq.next();
  });

  bench("current()", () => {
    seq.current();
  });
});
