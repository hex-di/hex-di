// @ts-nocheck
import { AsyncFactoryError } from "../src/index.js";

interface ProcessLike {
  on(event: "unhandledRejection", listener: (reason: unknown) => void): this;
}

const nodeProcess = (globalThis as { process?: ProcessLike }).process;
if (nodeProcess !== undefined) {
  nodeProcess.on("unhandledRejection", (reason: unknown) => {
    if (reason instanceof AsyncFactoryError) {
      return;
    }
    throw reason;
  });
}
