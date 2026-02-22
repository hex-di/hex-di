import { describe } from "vitest";
import {
  createSignatureServiceConformanceSuite,
  createMemorySignatureService,
} from "../../src/index.js";

describe("createSignatureServiceConformanceSuite with MemorySignatureService", () => {
  const suite = createSignatureServiceConformanceSuite(() =>
    createMemorySignatureService({ signerId: "test-user-conformance" }),
  );

  suite();
});
