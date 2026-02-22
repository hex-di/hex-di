import { World } from "@cucumber/cucumber";
import type { Result, Option, ResultAsync } from "@hex-di/result";

/**
 * Custom World that holds test state across steps.
 */
export class ResultTestWorld extends World {
  result?: Result<unknown, unknown>;
  option?: Option<unknown>;
  resultAsync?: ResultAsync<unknown, unknown>;
  returnValue?: unknown;
  thrownError?: Error;
  resolvedValue?: unknown;
  rejectedError?: Error;
  resultFixture?: {
    ok: (value?: unknown) => Result<unknown, never>;
    err: <E>(error: E) => Result<never, E>;
    okAsync: (value?: unknown) => ResultAsync<unknown, never>;
    errAsync: <E>(error: E) => ResultAsync<unknown, E>;
  };
  optionFixture?: {
    some: (value?: unknown) => Option<unknown>;
    none: () => Option<unknown>;
  };
  mockRA?: {
    resultAsync: ResultAsync<unknown, unknown>;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  };
}
