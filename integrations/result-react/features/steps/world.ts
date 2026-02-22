import { World, setWorldConstructor } from "@cucumber/cucumber";
import type { Result, ResultAsync, Option } from "@hex-di/result";

export class ReactResultWorld extends World {
  result: Result<any, any> | undefined;
  asyncResult: ResultAsync<any, any> | undefined;
  promiseResult: Promise<Result<any, any>> | undefined;
  option: Option<any> | undefined;
  output: any;
  error: any;
  fn: ((...args: any[]) => any) | undefined;
  hookResult: any;
}

setWorldConstructor(ReactResultWorld);
