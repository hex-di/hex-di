/**
 * HTTP client inspection types.
 * @packageDocumentation
 */

export interface HttpClientSnapshot {
  readonly requestCount: number;
  readonly errorCount: number;
  readonly activeRequests: number;
  readonly registeredClients: readonly string[];
}

export interface HttpClientInspector {
  getSnapshot(): HttpClientSnapshot;
  reset(): void;
}
