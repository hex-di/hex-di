import { port, createAdapter } from "@hex-di/core";
import { TracerPort } from "@hex-di/tracing";
import type { Tracer } from "@hex-di/tracing";
import { injectTraceContext } from "@hex-di/tracing";
import { PokemonCachePort } from "../ports/pokemon-cache.js";
import type { PokemonCacheService } from "../ports/pokemon-cache.js";
import { RateLimiterPort } from "../ports/rate-limiter.js";
import type { RateLimiterService } from "../ports/rate-limiter.js";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

interface PokeApiProxyService {
  fetch(path: string): Promise<unknown>;
}

const PokeApiProxyPort = port<PokeApiProxyService>()({
  name: "PokeApiProxy",
  direction: "outbound",
  description: "Proxied access to PokeAPI with caching, rate limiting, and tracing",
  category: "external-api",
  tags: ["pokeapi", "proxy"],
});

const pokeApiProxyAdapter = createAdapter({
  provides: PokeApiProxyPort,
  requires: [PokemonCachePort, RateLimiterPort, TracerPort],
  lifetime: "singleton",
  factory: (deps: {
    PokemonCache: PokemonCacheService;
    RateLimiter: RateLimiterService;
    Tracer: Tracer;
  }) => {
    const cache = deps.PokemonCache;
    const rateLimiter = deps.RateLimiter;
    const tracer = deps.Tracer;

    return {
      async fetch(path: string): Promise<unknown> {
        return tracer.withSpanAsync(`pokeapi:${path}`, async span => {
          span.setAttribute("pokeapi.path", path);

          // Check cache first
          const cacheKey = `pokeapi:${path}`;
          const cached = cache.get(cacheKey);
          if (cached !== undefined) {
            span.setAttribute("cache.hit", true);
            return cached;
          }
          span.setAttribute("cache.hit", false);

          // Check rate limit
          if (!rateLimiter.tryAcquire()) {
            span.setAttribute("rate_limit.exceeded", true);
            span.setStatus("error");
            const retryMs = rateLimiter.retryAfterMs();
            throw new RateLimitError(retryMs);
          }

          // Build headers with trace context
          const headers: Record<string, string> = {
            Accept: "application/json",
          };
          const spanContext = tracer.getSpanContext();
          if (spanContext) {
            injectTraceContext(spanContext, headers);
          }

          // Make the request
          const url = `${POKEAPI_BASE}${path}`;
          span.setAttribute("http.url", url);

          let response: Response;
          try {
            response = await globalThis.fetch(url, { headers });
          } catch (error) {
            span.setStatus("error");
            const message = error instanceof Error ? error.message : String(error);
            throw new NetworkError(message);
          }

          span.setAttribute("http.status_code", response.status);

          if (response.status === 404) {
            span.setStatus("error");
            throw new NotFoundError(path);
          }

          if (response.status === 429) {
            span.setStatus("error");
            throw new RateLimitError(60000);
          }

          if (!response.ok) {
            span.setStatus("error");
            throw new NetworkError(`PokeAPI returned ${response.status}`);
          }

          let data: unknown;
          try {
            data = await response.json();
          } catch {
            throw new ParseError(`Failed to parse response from ${path}`);
          }

          // Cache successful response
          cache.set(cacheKey, data);

          return data;
        });
      },
    };
  },
});

class RateLimitError extends Error {
  readonly _tag = "RateLimitError";
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limit exceeded. Retry after ${retryAfterMs}ms`);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

class NotFoundError extends Error {
  readonly _tag = "NotFoundError";
  readonly resource: string;

  constructor(resource: string) {
    super(`Resource not found: ${resource}`);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}

class NetworkError extends Error {
  readonly _tag = "NetworkError";

  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

class ParseError extends Error {
  readonly _tag = "ParseError";

  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export { pokeApiProxyAdapter, PokeApiProxyPort };
export type { PokeApiProxyService };
export { RateLimitError, NotFoundError, NetworkError, ParseError };
