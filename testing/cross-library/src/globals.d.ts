declare function setTimeout(
  handler: (...args: never[]) => void,
  timeout?: number,
  ...args: unknown[]
): number;

declare function clearTimeout(id: number | undefined): void;

declare class AbortController {
  readonly signal: AbortSignal;
  abort(reason?: unknown): void;
}

declare class AbortSignal {
  readonly aborted: boolean;
  readonly reason: unknown;
  addEventListener(type: "abort", listener: () => void): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
