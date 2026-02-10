import { createAdapter, SINGLETON } from "@hex-di/core";
import { ResultAsync } from "@hex-di/result";
import {
  CodeExampleQueryPort,
  EXAMPLE_IDS,
  type CodeExample,
  type CodeExampleError,
} from "../ports/code-examples.port.js";

export const codeExamplesAdapter = createAdapter({
  provides: CodeExampleQueryPort,
  requires: [],
  lifetime: SINGLETON,
  factory:
    () =>
    (id: string): ResultAsync<CodeExample, CodeExampleError> => {
      if (!EXAMPLE_IDS.includes(id as (typeof EXAMPLE_IDS)[number])) {
        return ResultAsync.err<CodeExampleError>({
          _tag: "LoadFailed",
          id,
          cause: `Unknown example: ${id}`,
        });
      }

      return ResultAsync.fromPromise(
        import(`../content/code-examples/${id}.js`).then(
          (mod: { example: CodeExample }) => mod.example
        ),
        (): CodeExampleError => ({
          _tag: "LoadFailed",
          id,
          cause: `Failed to load code example: ${id}`,
        })
      );
    },
});
