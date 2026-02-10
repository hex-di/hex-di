import { createQueryPort } from "@hex-di/query";
import type { CodeContent } from "../content/types.js";

export interface CodeExample {
  readonly id: string;
  readonly title: string;
  readonly before: CodeContent;
  readonly after: CodeContent;
}

export interface CodeExampleError {
  readonly _tag: "LoadFailed";
  readonly id: string;
  readonly cause: string;
}

export const EXAMPLE_IDS = [
  "silent-swallower",
  "generic-thrower",
  "unsafe-cast",
  "callback-pyramid",
  "success-that-wasnt",
  "boolean-trap",
  "safe-try",
  "testing",
  "fair-comparison",
  "composition",
] as const;

export const CodeExampleQueryPort = createQueryPort<CodeExample, string, CodeExampleError>()({
  name: "CodeExample",
  defaults: { staleTime: Infinity },
});
