// @ts-nocheck
declare function setTimeout(
  handler: (...args: never[]) => void,
  timeout?: number,
  ...args: unknown[]
): number;

declare const console: {
  log: (...args: unknown[]) => void;
};
