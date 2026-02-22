import { World, setWorldConstructor } from "@cucumber/cucumber";
import type { Result } from "../../src/index.js";
import type { ResultAsync } from "../../src/index.js";

export class ResultWorld extends World {
  result: Result<any, any> | undefined;
  asyncResult: ResultAsync<any, any> | undefined;
  extractedValue: any;
  option: any;
  sideEffectValue: any;
  tuple: any;
  json: any;
  error: any;
  thrownError: any;
  accumulator: any;
  plainObject: any;
  plainPromise: any;
}

setWorldConstructor(ResultWorld);
