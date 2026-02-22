/**
 * HTTP client registry - tracks named client instances.
 * @packageDocumentation
 */

import type { HttpClient } from "../ports/http-client-port.js";

export interface HttpClientRegistry {
  register(name: string, client: HttpClient): void;
  unregister(name: string): void;
  get(name: string): HttpClient | undefined;
  getAll(): Readonly<Record<string, HttpClient>>;
  getNames(): readonly string[];
}

export function createHttpClientRegistry(): HttpClientRegistry {
  const clients = new Map<string, HttpClient>();

  return {
    register(name, client) {
      clients.set(name, client);
    },
    unregister(name) {
      clients.delete(name);
    },
    get(name) {
      return clients.get(name);
    },
    getAll() {
      const result: Record<string, HttpClient> = {};
      for (const [k, v] of clients) result[k] = v;
      return Object.freeze(result);
    },
    getNames() {
      return Object.freeze([...clients.keys()]);
    },
  };
}
