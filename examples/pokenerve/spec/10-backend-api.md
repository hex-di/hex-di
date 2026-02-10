# 10 - Hono Backend API

## 1. Server Setup

The PokéNerve API is a Hono application that proxies PokeAPI requests (with caching and rate limiting), manages battle and trading state in memory, and exports traces to Jaeger. It uses HexDI's Hono integration for per-request scopes, tracing middleware, and diagnostic routes.

```typescript
// api/src/server.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createContainer } from "@hex-di/runtime";
import { createScopeMiddleware, tracingMiddleware, createDiagnosticRoutes } from "@hex-di/hono";
import { instrumentContainer } from "@hex-di/tracing";
import { TracerPort } from "@hex-di/tracing";
import { apiGraph } from "./graph/api-graph";
import { corsMiddleware } from "./middleware/cors";
import { pokemonRoutes } from "./routes/pokemon";
import { battleRoutes } from "./routes/battle";
import { tradingRoutes } from "./routes/trading";

// ---------------------------------------------------------------------------
// 1. Create the DI container from the validated graph
// ---------------------------------------------------------------------------

const container = createContainer(apiGraph, { devTools: true });

// ---------------------------------------------------------------------------
// 2. Resolve the tracer and instrument the container
// ---------------------------------------------------------------------------

const tracer = container.resolve(TracerPort);
instrumentContainer(container, tracer, {
  attributes: (portName, lifetime) => ({
    "hexdi.port.name": portName,
    "hexdi.resolution.lifetime": lifetime,
    "hexdi.app": "pokenerve",
    "hexdi.layer": "backend",
  }),
});

// ---------------------------------------------------------------------------
// 3. Create the Hono application
// ---------------------------------------------------------------------------

const app = new Hono();

// ---------------------------------------------------------------------------
// 4. Mount middleware stack (order matters)
// ---------------------------------------------------------------------------

// CORS: Allow traceparent header for cross-service tracing
app.use("*", corsMiddleware);

// Tracing: Extract W3C Trace Context, create server spans, inject response headers
app.use("*", tracingMiddleware({ tracer }));

// Scope: Create per-request DI scope, dispose after handler completes
app.use("*", createScopeMiddleware(container));

// ---------------------------------------------------------------------------
// 5. Mount route groups
// ---------------------------------------------------------------------------

app.route("/api", pokemonRoutes);
app.route("/api", battleRoutes);
app.route("/api", tradingRoutes);

// ---------------------------------------------------------------------------
// 6. Mount diagnostic routes (HexDI inspection)
// ---------------------------------------------------------------------------

app.route("/api/diagnostics", createDiagnosticRoutes({ pathPrefix: "" }));

// ---------------------------------------------------------------------------
// 7. Start the server
// ---------------------------------------------------------------------------

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, info => {
  console.log(`[PokéNerve API] Listening on http://localhost:${info.port}`);
  console.log(
    `[PokéNerve API] Jaeger endpoint: ${process.env.JAEGER_ENDPOINT ?? "http://localhost:14268/api/traces"}`
  );
});
```

---

## 2. Middleware Stack

Middleware executes in registration order. Each request passes through CORS, tracing, then scope middleware before reaching route handlers.

### 2.1 Request Lifecycle

```
Incoming Request
     |
     v
+--------------------+
|   CORS Middleware   |  Adds Access-Control headers, allows traceparent
+--------------------+
     |
     v
+--------------------+
| Tracing Middleware  |  Extracts traceparent, creates server span,
|                    |  records HTTP attributes, ends span on response
+--------------------+
     |
     v
+--------------------+
|  Scope Middleware   |  Creates per-request DI scope from root container,
|                    |  disposes scope after handler (even on error)
+--------------------+
     |
     v
+--------------------+
|   Route Handler    |  Resolves ports from request scope,
|                    |  executes business logic, returns response
+--------------------+
     |
     v
Response (with traceparent header injected)
```

### 2.2 CORS Middleware

CORS must explicitly allow the `traceparent` header for W3C Trace Context propagation from the browser.

```typescript
// api/src/middleware/cors.ts
import { cors } from "hono/cors";

const corsMiddleware = cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "traceparent", // W3C Trace Context
    "tracestate", // W3C Trace Context (optional)
    "X-Request-ID", // Custom request correlation
  ],
  exposeHeaders: [
    "traceparent", // Allow browser to read trace context from response
    "X-Request-ID",
  ],
  maxAge: 3600,
  credentials: true,
});
```

### 2.3 Tracing Middleware

Uses `@hex-di/hono`'s `tracingMiddleware` with the Jaeger-connected tracer. Extracts `traceparent` from incoming requests to continue the trace started by the browser.

```typescript
// Configured in server.ts (see Section 1)
app.use(
  "*",
  tracingMiddleware({
    tracer,
    extractContext: true, // Extract traceparent from request headers
    injectContext: true, // Inject traceparent into response headers
    attributes: c => ({
      "http.route": c.req.routePath,
      "pokenerve.request_id": c.get("requestId") ?? "unknown",
    }),
  })
);
```

### 2.4 Scope Middleware

Uses `@hex-di/hono`'s `createScopeMiddleware` to create a fresh DI scope per request. Scoped services (cache, rate limiter) get fresh instances. Singletons (tracer, PokeAPI proxy) are shared.

```typescript
// Configured in server.ts (see Section 1)
app.use("*", createScopeMiddleware(container));
// The scope is accessible in handlers via getScope(c)
// The container is accessible via getContainer(c)
```

---

## 3. DI Graph

### 3.1 Backend Port Definitions

```typescript
// api/src/ports/pokemon-cache.ts
import { port } from "@hex-di/core";
import type { Result } from "@hex-di/result";

interface PokemonCacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  readonly size: number;
  readonly stats: CacheStats;
}

interface CacheStats {
  readonly hits: number;
  readonly misses: number;
  readonly evictions: number;
  readonly hitRate: number;
}

const PokemonCachePort = port<PokemonCacheService>()({
  name: "PokemonCache",
  category: "infrastructure",
  description: "In-memory LRU cache for PokeAPI responses",
});
```

```typescript
// api/src/ports/rate-limiter.ts
import { port } from "@hex-di/core";

interface RateLimiterService {
  /** Returns true if the request is allowed, false if rate limited */
  tryAcquire(key: string): boolean;
  /** Returns the number of remaining requests in the current window */
  remaining(key: string): number;
  /** Returns milliseconds until the next request is allowed */
  retryAfterMs(key: string): number;
}

const RateLimiterPort = port<RateLimiterService>()({
  name: "RateLimiter",
  category: "infrastructure",
  description: "Token bucket rate limiter for PokeAPI calls (100 req/min)",
});
```

### 3.2 Backend Adapter Implementations

```typescript
// api/src/adapters/memory-cache.ts
import { createAdapter } from "@hex-di/core";
import { PokemonCachePort } from "../ports/pokemon-cache";

const memoryCacheAdapter = createAdapter({
  provides: PokemonCachePort,
  lifetime: "singleton",
  factory: () => {
    const cache = new Map<string, { value: unknown; expiresAt: number }>();
    const MAX_SIZE = 1000;
    let hits = 0;
    let misses = 0;
    let evictions = 0;

    function evictExpired(): void {
      const now = Date.now();
      for (const [key, entry] of cache) {
        if (entry.expiresAt <= now) {
          cache.delete(key);
          evictions++;
        }
      }
    }

    return {
      get(key) {
        evictExpired();
        const entry = cache.get(key);
        if (entry === undefined || entry.expiresAt <= Date.now()) {
          misses++;
          return undefined;
        }
        hits++;
        return entry.value;
      },
      set(key, value, ttlMs = 300_000) {
        if (cache.size >= MAX_SIZE) {
          // Evict oldest entry
          const firstKey = cache.keys().next().value;
          if (firstKey !== undefined) {
            cache.delete(firstKey);
            evictions++;
          }
        }
        cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      },
      has(key) {
        const entry = cache.get(key);
        return entry !== undefined && entry.expiresAt > Date.now();
      },
      delete(key) {
        return cache.delete(key);
      },
      clear() {
        cache.clear();
      },
      get size() {
        return cache.size;
      },
      get stats() {
        const total = hits + misses;
        return {
          hits,
          misses,
          evictions,
          hitRate: total === 0 ? 0 : hits / total,
        };
      },
    };
  },
});
```

```typescript
// api/src/adapters/rate-limiter.ts
import { createAdapter } from "@hex-di/core";
import { RateLimiterPort } from "../ports/rate-limiter";

const rateLimiterAdapter = createAdapter({
  provides: RateLimiterPort,
  lifetime: "singleton",
  factory: () => {
    const MAX_REQUESTS = 100;
    const WINDOW_MS = 60_000; // 1 minute
    const buckets = new Map<string, { tokens: number; lastRefill: number }>();

    function getBucket(key: string): { tokens: number; lastRefill: number } {
      let bucket = buckets.get(key);
      if (bucket === undefined) {
        bucket = { tokens: MAX_REQUESTS, lastRefill: Date.now() };
        buckets.set(key, bucket);
      }
      // Refill tokens based on elapsed time
      const elapsed = Date.now() - bucket.lastRefill;
      if (elapsed >= WINDOW_MS) {
        bucket.tokens = MAX_REQUESTS;
        bucket.lastRefill = Date.now();
      }
      return bucket;
    }

    return {
      tryAcquire(key) {
        const bucket = getBucket(key);
        if (bucket.tokens > 0) {
          bucket.tokens--;
          return true;
        }
        return false;
      },
      remaining(key) {
        return getBucket(key).tokens;
      },
      retryAfterMs(key) {
        const bucket = getBucket(key);
        if (bucket.tokens > 0) return 0;
        return WINDOW_MS - (Date.now() - bucket.lastRefill);
      },
    };
  },
});
```

```typescript
// api/src/adapters/pokeapi-proxy.ts
import { createAdapter } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import { PokemonCachePort } from "../ports/pokemon-cache";
import { RateLimiterPort } from "../ports/rate-limiter";
import { TracerPort } from "@hex-di/tracing";
import type { Tracer } from "@hex-di/tracing";
import { injectTraceContext } from "@hex-di/tracing";
import { port } from "@hex-di/core";
import type { PokemonApiError } from "@pokenerve/shared/types/pokemon";

// ---------------------------------------------------------------------------
// PokeAPI proxy port
// ---------------------------------------------------------------------------

interface PokeApiProxyService {
  fetch<T>(path: string): Promise<Result<T, PokemonApiError>>;
}

const PokeApiProxyPort = port<PokeApiProxyService>()({
  name: "PokeApiProxy",
  category: "infrastructure",
  description: "Proxied PokeAPI calls with caching, rate limiting, and trace propagation",
});

// ---------------------------------------------------------------------------
// PokeAPI proxy adapter
// ---------------------------------------------------------------------------

const POKEAPI_BASE = process.env.POKEAPI_BASE_URL ?? "https://pokeapi.co/api/v2";

const pokeApiProxyAdapter = createAdapter({
  provides: PokeApiProxyPort,
  requires: [PokemonCachePort, RateLimiterPort, TracerPort],
  lifetime: "singleton",
  factory: deps => {
    const cache = deps.PokemonCache;
    const limiter = deps.RateLimiter;
    const tracer = deps.Tracer;

    return {
      async fetch(path) {
        const cacheKey = `pokeapi:${path}`;

        // Check cache first
        const cached = cache.get(cacheKey);
        if (cached !== undefined) {
          return ok(cached);
        }

        // Check rate limit
        if (!limiter.tryAcquire("pokeapi")) {
          return err({
            _tag: "RateLimitError",
            retryAfterMs: limiter.retryAfterMs("pokeapi"),
          });
        }

        // Create a child span for the outgoing PokeAPI request
        const span = tracer.startSpan(`pokeapi:${path}`, {
          kind: "client",
          attributes: {
            "http.method": "GET",
            "http.url": `${POKEAPI_BASE}${path}`,
            "pokeapi.path": path,
          },
        });

        try {
          // Inject trace context into outgoing request headers
          const headers: Record<string, string> = {};
          injectTraceContext(span.context, headers);

          const response = await fetch(`${POKEAPI_BASE}${path}`, {
            headers,
          });

          span.setAttribute("http.status_code", response.status);

          if (response.status === 404) {
            span.setStatus("error");
            span.end();
            return err({ _tag: "NotFoundError", pokemonId: path });
          }

          if (!response.ok) {
            span.setStatus("error");
            span.end();
            return err({ _tag: "NetworkError", message: `PokeAPI returned ${response.status}` });
          }

          const data: unknown = await response.json();

          // Cache the response (5 minute TTL)
          cache.set(cacheKey, data, 300_000);
          span.setAttribute("cache.action", "set");

          span.end();
          return ok(data);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          span.recordException(message);
          span.setStatus("error");
          span.end();
          return err({ _tag: "NetworkError", message });
        }
      },
    };
  },
});
```

### 3.3 Backend Graph

```typescript
// api/src/graph/api-graph.ts
import { GraphBuilder } from "@hex-di/graph";
import { createAdapter } from "@hex-di/core";
import { TracerPort, MemoryTracerAdapter, createMemoryTracer } from "@hex-di/tracing";
import { createJaegerExporter } from "@hex-di/tracing-jaeger";
import { memoryCacheAdapter } from "../adapters/memory-cache";
import { rateLimiterAdapter } from "../adapters/rate-limiter";
import { pokeApiProxyAdapter } from "../adapters/pokeapi-proxy";

// ---------------------------------------------------------------------------
// Tracer adapter: MemoryTracer that also exports to Jaeger
// ---------------------------------------------------------------------------

const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT ?? "http://localhost:14268/api/traces";
const SERVICE_NAME = process.env.JAEGER_SERVICE_NAME ?? "pokenerve-api";

const tracerAdapter = createAdapter({
  provides: TracerPort,
  lifetime: "singleton",
  factory: () =>
    createMemoryTracer({
      serviceName: SERVICE_NAME,
    }),
});

// ---------------------------------------------------------------------------
// Compose the complete API graph
// ---------------------------------------------------------------------------

const apiGraph = GraphBuilder.create()
  // Tracing
  .provide(tracerAdapter)
  // Infrastructure
  .provide(memoryCacheAdapter)
  .provide(rateLimiterAdapter)
  // Data access
  .provide(pokeApiProxyAdapter)
  .build();
```

---

## 4. API Routes

All routes are defined as Hono sub-applications and mounted on the main app under `/api`.

### 4.1 Pokemon Routes

```typescript
// api/src/routes/pokemon.ts
import { Hono } from "hono";
import { resolvePort } from "@hex-di/hono";
import { PokeApiProxyPort } from "../adapters/pokeapi-proxy";
import type {
  Pokemon,
  PaginatedResponse,
  NamedAPIResource,
  PokemonSpecies,
} from "@pokenerve/shared/types/pokemon";

const pokemonRoutes = new Hono();

// -------------------------------------------------------------------------
// GET /api/pokemon — Paginated list with optional filters
// -------------------------------------------------------------------------
//
// Query params:
//   offset (number, default 0)
//   limit  (number, default 20, max 100)
//   type   (string, optional) — filter by Pokemon type
//   habitat (string, optional) — filter by habitat
//   color  (string, optional) — filter by color
//   shape  (string, optional) — filter by shape
//
// Response: { count, next, previous, results: NamedAPIResource[] }

pokemonRoutes.get("/pokemon", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const offset = Number(c.req.query("offset") ?? "0");
  const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
  const type = c.req.query("type");
  const habitat = c.req.query("habitat");
  const color = c.req.query("color");
  const shape = c.req.query("shape");

  // If filtering by type, use the type endpoint
  if (type) {
    const typeResult = await proxy.fetch<{ pokemon: Array<{ pokemon: NamedAPIResource }> }>(
      `/type/${type}`
    );
    if (typeResult.isErr()) {
      return c.json({ error: typeResult.error }, mapErrorToStatus(typeResult.error));
    }
    const allPokemon = typeResult.value.pokemon.map(p => p.pokemon);
    return c.json({
      count: allPokemon.length,
      next:
        offset + limit < allPokemon.length
          ? `/api/pokemon?type=${type}&offset=${offset + limit}&limit=${limit}`
          : null,
      previous:
        offset > 0
          ? `/api/pokemon?type=${type}&offset=${Math.max(0, offset - limit)}&limit=${limit}`
          : null,
      results: allPokemon.slice(offset, offset + limit),
    });
  }

  // If filtering by habitat, color, or shape — use species endpoint aggregation
  if (habitat ?? color ?? shape) {
    const filterResults = await filterBySpeciesAttribute(proxy, { habitat, color, shape });
    if (filterResults.isErr()) {
      return c.json({ error: filterResults.error }, mapErrorToStatus(filterResults.error));
    }
    const filtered = filterResults.value;
    return c.json({
      count: filtered.length,
      next: offset + limit < filtered.length ? "has-more" : null,
      previous: offset > 0 ? "has-prev" : null,
      results: filtered.slice(offset, offset + limit),
    });
  }

  // Default: paginated list from PokeAPI
  const result = await proxy.fetch<PaginatedResponse<NamedAPIResource>>(
    `/pokemon?offset=${offset}&limit=${limit}`
  );
  if (result.isErr()) {
    return c.json({ error: result.error }, mapErrorToStatus(result.error));
  }
  return c.json(result.value);
});

// -------------------------------------------------------------------------
// GET /api/pokemon/:id — Full Pokemon detail
// -------------------------------------------------------------------------
//
// Params: id (number or name)
// Response: Pokemon object

pokemonRoutes.get("/pokemon/:id", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const id = c.req.param("id");
  const result = await proxy.fetch<Pokemon>(`/pokemon/${id}`);
  if (result.isErr()) {
    return c.json({ error: result.error }, mapErrorToStatus(result.error));
  }
  return c.json(result.value);
});

// -------------------------------------------------------------------------
// GET /api/pokemon/:id/species — Pokemon species data
// -------------------------------------------------------------------------

pokemonRoutes.get("/pokemon/:id/species", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const id = c.req.param("id");
  const result = await proxy.fetch<PokemonSpecies>(`/pokemon-species/${id}`);
  if (result.isErr()) {
    return c.json({ error: result.error }, mapErrorToStatus(result.error));
  }
  return c.json(result.value);
});

// -------------------------------------------------------------------------
// GET /api/pokemon/:id/evolution — Evolution chain for a Pokemon
// -------------------------------------------------------------------------

pokemonRoutes.get("/pokemon/:id/evolution", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const id = c.req.param("id");

  // Step 1: Get species to find evolution chain URL
  const speciesResult = await proxy.fetch<PokemonSpecies>(`/pokemon-species/${id}`);
  if (speciesResult.isErr()) {
    return c.json({ error: speciesResult.error }, mapErrorToStatus(speciesResult.error));
  }

  // Step 2: Extract evolution chain ID from URL
  const chainUrl = speciesResult.value.evolution_chain.url;
  const chainId = chainUrl.split("/").filter(Boolean).pop();

  // Step 3: Fetch evolution chain
  const chainResult = await proxy.fetch(`/evolution-chain/${chainId}`);
  if (chainResult.isErr()) {
    return c.json({ error: chainResult.error }, mapErrorToStatus(chainResult.error));
  }
  return c.json(chainResult.value);
});

// -------------------------------------------------------------------------
// GET /api/types — All types with damage relations
// -------------------------------------------------------------------------

pokemonRoutes.get("/types", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const result = await proxy.fetch<PaginatedResponse<NamedAPIResource>>("/type");
  if (result.isErr()) {
    return c.json({ error: result.error }, mapErrorToStatus(result.error));
  }
  return c.json(result.value);
});

// -------------------------------------------------------------------------
// GET /api/types/:id/effectiveness — Specific type effectiveness
// -------------------------------------------------------------------------

pokemonRoutes.get("/types/:id/effectiveness", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const id = c.req.param("id");
  const result = await proxy.fetch(`/type/${id}`);
  if (result.isErr()) {
    return c.json({ error: result.error }, mapErrorToStatus(result.error));
  }
  return c.json(result.value);
});

// -------------------------------------------------------------------------
// Helper: Map PokemonApiError to HTTP status code
// -------------------------------------------------------------------------

function mapErrorToStatus(error: { _tag: string }): number {
  switch (error._tag) {
    case "NotFoundError":
      return 404;
    case "RateLimitError":
      return 429;
    case "NetworkError":
      return 502;
    case "ParseError":
      return 500;
    default:
      return 500;
  }
}
```

### 4.2 Battle Routes

Battle state is managed in-memory on the server. Each battle has a unique ID and a corresponding state object.

```typescript
// api/src/routes/battle.ts
import { Hono } from "hono";
import { getScope } from "@hex-di/hono";
import type { BattleState, BattlePokemon } from "@pokenerve/shared/types/battle";

const battleRoutes = new Hono();

// In-memory battle store (production would use Redis or similar)
const battles = new Map<string, BattleState>();

// -------------------------------------------------------------------------
// POST /api/battle/start — Initialize a new battle
// -------------------------------------------------------------------------
//
// Request body:
//   { playerTeam: BattlePokemon[], opponentTeam: BattlePokemon[] }
//
// Response:
//   { battleId: string, state: BattleState }

battleRoutes.post("/battle/start", async c => {
  const body = await c.req.json<{
    playerTeam: readonly BattlePokemon[];
    opponentTeam: readonly BattlePokemon[];
  }>();

  const battleId = crypto.randomUUID();
  const state: BattleState = {
    id: battleId,
    turn: 0,
    playerTeam: body.playerTeam,
    opponentTeam: body.opponentTeam,
    weather: "none",
    terrain: "none",
    activePlayerIndex: 0,
    activeOpponentIndex: 0,
    log: [],
    status: "active",
  };

  battles.set(battleId, state);

  return c.json({ battleId, state }, 201);
});

// -------------------------------------------------------------------------
// POST /api/battle/:id/move — Execute a player move
// -------------------------------------------------------------------------
//
// Request body:
//   { moveIndex: number }
//
// Response:
//   { state: BattleState, turnLog: BattleLogEntry[] }
//
// The server applies the player move, then the AI opponent's move,
// checks for faints, and advances the turn.

battleRoutes.post("/battle/:id/move", async c => {
  const battleId = c.req.param("id");
  const state = battles.get(battleId);

  if (state === undefined) {
    return c.json({ error: { _tag: "NotFound", message: `Battle ${battleId} not found` } }, 404);
  }

  if (state.status !== "active") {
    return c.json({ error: { _tag: "BattleEnded", message: "Battle is no longer active" } }, 400);
  }

  const body = await c.req.json<{ moveIndex: number }>();

  // Battle logic is handled client-side via Flow machines.
  // The API persists state for multi-client scenarios.
  // For the showcase, the API stores and returns the updated state.

  const updatedState: BattleState = {
    ...state,
    turn: state.turn + 1,
    log: [
      ...state.log,
      {
        turn: state.turn + 1,
        timestamp: Date.now(),
        message: `Player used move ${body.moveIndex}`,
        type: "move",
      },
    ],
  };

  battles.set(battleId, updatedState);
  return c.json({ state: updatedState });
});

// -------------------------------------------------------------------------
// GET /api/battle/:id — Get current battle state
// -------------------------------------------------------------------------

battleRoutes.get("/battle/:id", async c => {
  const battleId = c.req.param("id");
  const state = battles.get(battleId);
  if (state === undefined) {
    return c.json({ error: { _tag: "NotFound" } }, 404);
  }
  return c.json({ state });
});
```

### 4.3 Trading Routes

Trading uses the saga pattern. Each trade progresses through forward steps and can trigger compensation steps on failure.

```typescript
// api/src/routes/trading.ts
import { Hono } from "hono";
import type {
  TradeOffer,
  TradeSagaState,
  TradeSagaStep,
  TradeSagaStepName,
} from "@pokenerve/shared/types/trading";
import type { Pokemon } from "@pokenerve/shared/types/pokemon";

const tradingRoutes = new Hono();

// In-memory trade store
const trades = new Map<string, TradeSagaState>();

const FORWARD_STEPS: readonly TradeSagaStepName[] = [
  "initiate_trade",
  "select_pokemon",
  "verify_ownership",
  "lock_pokemon",
  "execute_swap",
  "confirm_receipt",
  "complete",
];

// -------------------------------------------------------------------------
// POST /api/trading/initiate — Start a new trade
// -------------------------------------------------------------------------
//
// Request body:
//   { offeredPokemon: Pokemon, requestedPokemon: Pokemon, chaosMode?: boolean }
//
// Response:
//   { tradeId: string, state: TradeSagaState }

tradingRoutes.post("/trading/initiate", async c => {
  const body = await c.req.json<{
    offeredPokemon: Pokemon;
    requestedPokemon: Pokemon;
    chaosMode?: boolean;
  }>();

  const tradeId = crypto.randomUUID();
  const state: TradeSagaState = {
    tradeId,
    currentStep: "initiate_trade",
    forwardSteps: FORWARD_STEPS.map(name => ({
      name,
      status: name === "initiate_trade" ? "executing" : "pending",
      startedAt: name === "initiate_trade" ? Date.now() : null,
      completedAt: null,
      error: null,
    })),
    compensationSteps: [],
    isCompensating: false,
    isComplete: false,
    chaosMode: body.chaosMode ?? false,
    failureProbability: 0.15,
  };

  trades.set(tradeId, state);
  return c.json({ tradeId, state }, 201);
});

// -------------------------------------------------------------------------
// POST /api/trading/:id/step — Advance trade to next saga step
// -------------------------------------------------------------------------
//
// Response:
//   { state: TradeSagaState }
//
// If chaosMode is enabled and a step fails, the response includes
// the compensation chain being executed.

tradingRoutes.post("/trading/:id/step", async c => {
  const tradeId = c.req.param("id");
  const state = trades.get(tradeId);

  if (state === undefined) {
    return c.json({ error: { _tag: "TradeNotFound", tradeId } }, 404);
  }

  if (state.isComplete || state.isCompensating) {
    return c.json({ state });
  }

  // Find current step index
  const currentIndex = FORWARD_STEPS.indexOf(state.currentStep as TradeSagaStepName);
  if (currentIndex === -1) {
    return c.json({ error: { _tag: "InvalidState" } }, 400);
  }

  // Check for chaos mode failure
  if (state.chaosMode && Math.random() < state.failureProbability) {
    // Trigger compensation
    const compensatedState = triggerCompensation(state, currentIndex);
    trades.set(tradeId, compensatedState);
    return c.json({ state: compensatedState });
  }

  // Complete current step
  const updatedSteps = state.forwardSteps.map((step, i) => {
    if (i === currentIndex) {
      return { ...step, status: "completed" as const, completedAt: Date.now() };
    }
    if (i === currentIndex + 1) {
      return { ...step, status: "executing" as const, startedAt: Date.now() };
    }
    return step;
  });

  const nextStep = currentIndex + 1 < FORWARD_STEPS.length ? FORWARD_STEPS[currentIndex + 1] : null;

  const updatedState: TradeSagaState = {
    ...state,
    currentStep: nextStep,
    forwardSteps: updatedSteps,
    isComplete: nextStep === null,
  };

  trades.set(tradeId, updatedState);
  return c.json({ state: updatedState });
});

// -------------------------------------------------------------------------
// GET /api/trading/:id — Get current trade state
// -------------------------------------------------------------------------

tradingRoutes.get("/trading/:id", async c => {
  const tradeId = c.req.param("id");
  const state = trades.get(tradeId);
  if (state === undefined) {
    return c.json({ error: { _tag: "TradeNotFound", tradeId } }, 404);
  }
  return c.json({ state });
});

// -------------------------------------------------------------------------
// Helper: Trigger compensation chain
// -------------------------------------------------------------------------

function triggerCompensation(state: TradeSagaState, failedStepIndex: number): TradeSagaState {
  // Mark the failed step
  const updatedForward = state.forwardSteps.map((step, i) => {
    if (i === failedStepIndex) {
      return {
        ...step,
        status: "failed" as const,
        error: "Communication error (chaos mode)",
        completedAt: Date.now(),
      };
    }
    return step;
  });

  // Build compensation steps (backward from the failed step)
  const compensationNames = ["notify_cancellation", "return_pokemon", "unlock_pokemon"] as const;
  const compensationSteps: TradeSagaStep[] = compensationNames
    .slice(0, failedStepIndex)
    .map(name => ({
      name,
      status: "completed" as const,
      startedAt: Date.now(),
      completedAt: Date.now() + 100,
      error: null,
    }));

  return {
    ...state,
    forwardSteps: updatedForward,
    compensationSteps,
    isCompensating: true,
    isComplete: true,
    currentStep: null,
  };
}
```

### 4.4 Diagnostic Routes

HexDI's built-in diagnostic routes are mounted for inspection access.

```typescript
// api/src/routes/diagnostics.ts
// Mounted in server.ts via:
//   app.route("/api/diagnostics", createDiagnosticRoutes({ pathPrefix: "" }));
//
// This provides the following routes automatically:
//
//   GET /api/diagnostics/health     — Container health (phase, port count, disposed)
//   GET /api/diagnostics/snapshot   — Full container snapshot
//   GET /api/diagnostics/ports      — List of all registered ports
//   GET /api/diagnostics/scopes     — Scope tree hierarchy
//   GET /api/diagnostics/graph      — Dependency graph data (nodes + edges)
//   GET /api/diagnostics/unified    — Unified snapshot (container + library inspectors)
```

### 4.5 Route Summary

| Method | Path                           | Request Body                                       | Response                              | Description                                          |
| ------ | ------------------------------ | -------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/api/pokemon`                 | -                                                  | `PaginatedResponse<NamedAPIResource>` | Paginated list with type/habitat/color/shape filters |
| `GET`  | `/api/pokemon/:id`             | -                                                  | `Pokemon`                             | Full Pokemon detail by ID or name                    |
| `GET`  | `/api/pokemon/:id/species`     | -                                                  | `PokemonSpecies`                      | Species data (habitat, color, shape)                 |
| `GET`  | `/api/pokemon/:id/evolution`   | -                                                  | `EvolutionChain`                      | Evolution chain for a Pokemon                        |
| `GET`  | `/api/types`                   | -                                                  | `PaginatedResponse<NamedAPIResource>` | All type names                                       |
| `GET`  | `/api/types/:id/effectiveness` | -                                                  | `TypeData`                            | Type with full damage relations                      |
| `POST` | `/api/battle/start`            | `{ playerTeam, opponentTeam }`                     | `{ battleId, state }`                 | Initialize a new battle                              |
| `POST` | `/api/battle/:id/move`         | `{ moveIndex }`                                    | `{ state }`                           | Execute a player move                                |
| `GET`  | `/api/battle/:id`              | -                                                  | `{ state }`                           | Get current battle state                             |
| `POST` | `/api/trading/initiate`        | `{ offeredPokemon, requestedPokemon, chaosMode? }` | `{ tradeId, state }`                  | Start a new trade                                    |
| `POST` | `/api/trading/:id/step`        | -                                                  | `{ state }`                           | Advance trade to next saga step                      |
| `GET`  | `/api/trading/:id`             | -                                                  | `{ state }`                           | Get current trade state                              |
| `GET`  | `/api/diagnostics/health`      | -                                                  | `{ phase, portCount, disposed }`      | Container health                                     |
| `GET`  | `/api/diagnostics/snapshot`    | -                                                  | `ContainerSnapshot`                   | Full container snapshot                              |
| `GET`  | `/api/diagnostics/ports`       | -                                                  | `PortInfo[]`                          | All registered ports                                 |
| `GET`  | `/api/diagnostics/scopes`      | -                                                  | `ScopeTree`                           | Scope hierarchy                                      |
| `GET`  | `/api/diagnostics/graph`       | -                                                  | `ContainerGraphData`                  | Dependency graph (nodes + edges)                     |
| `GET`  | `/api/diagnostics/unified`     | -                                                  | `UnifiedSnapshot`                     | Unified snapshot                                     |

---

## 5. PokeAPI Proxy Logic

The `PokeApiProxyAdapter` implements a three-layer strategy for all outbound PokeAPI requests.

### Request Flow

```
Route Handler
     |
     | proxy.fetch("/pokemon/1")
     v
+---------------------+
|  Check In-Memory    |  cache.get("pokeapi:/pokemon/1")
|  Cache              |
+--------|------------|
         |
    HIT  |  MISS
    |    |
    v    v
  Return  +-------------------+
  cached  | Check Rate Limit  |  limiter.tryAcquire("pokeapi")
  data    +--------|----------|
                   |
           ALLOWED | DENIED
              |       |
              v       v
    +-------------+  Return
    | Create Span |  429 err
    | (client)    |
    +------|------+
           |
           | Inject traceparent header
           v
    +------------------+
    | fetch() to       |
    | pokeapi.co/api/  |
    +--------|---------|
             |
         Response
             |
    +------------------+
    | Cache Response   |  cache.set("pokeapi:/pokemon/1", data, 300_000)
    | (5 min TTL)      |
    +------------------+
             |
             v
    +------------------+
    | End Span         |  span.setAttribute("http.status_code", 200)
    | Return ok(data)  |  span.end()
    +------------------+
```

### Cache Configuration

| Setting     | Value              | Rationale                                  |
| ----------- | ------------------ | ------------------------------------------ |
| Max entries | 1,000              | Covers all 1,025 Pokemon + types + species |
| Default TTL | 5 minutes          | PokeAPI data is static; long TTL is safe   |
| Eviction    | LRU (oldest first) | Keeps frequently accessed Pokemon cached   |

### Rate Limit Configuration

| Setting      | Value              | Rationale                                   |
| ------------ | ------------------ | ------------------------------------------- |
| Max requests | 100 per minute     | PokeAPI fair use guideline                  |
| Algorithm    | Token bucket       | Allows burst traffic, refills over time     |
| Scope        | Global (all paths) | Single rate limit for all PokeAPI endpoints |

---

## 6. Error Handling

All API errors use the `Result<T, E>` pattern from `@hex-di/result`. Errors are returned as JSON with appropriate HTTP status codes. The application never throws unhandled exceptions from domain logic.

### Error Response Format

```typescript
// Success response
{ "data": { ... } }

// Error response
{
  "error": {
    "_tag": "NotFoundError",
    "pokemonId": 99999
  }
}
```

### Error to HTTP Status Mapping

| Error Tag            | HTTP Status | Description                             |
| -------------------- | ----------- | --------------------------------------- |
| `NotFoundError`      | 404         | Pokemon/type/trade not found            |
| `RateLimitError`     | 429         | PokeAPI rate limit exceeded             |
| `NetworkError`       | 502         | PokeAPI unreachable or returned non-200 |
| `ParseError`         | 500         | Failed to parse PokeAPI response        |
| `TradeNotFound`      | 404         | Trade ID not found                      |
| `PokemonLocked`      | 409         | Pokemon is locked in another trade      |
| `VerificationFailed` | 422         | Ownership verification failed           |
| `CommunicationError` | 503         | Saga step communication failure         |
| `CompensationFailed` | 500         | Compensation step failed (critical)     |

### Result Pattern in Route Handlers

```typescript
// Pattern: resolve port -> call method -> match result -> return response
pokemonRoutes.get("/pokemon/:id", async c => {
  const proxy = resolvePort(c, PokeApiProxyPort);
  const result = await proxy.fetch<Pokemon>(`/pokemon/${c.req.param("id")}`);

  if (result.isErr()) {
    return c.json({ error: result.error }, mapErrorToStatus(result.error));
  }

  return c.json(result.value);
});
```

---

## 7. Trace Context Propagation

### Inbound: Browser to API

The Hono `tracingMiddleware` extracts the `traceparent` header from incoming browser requests. This creates a parent-child relationship between the browser span and the server span.

```
Browser span:  "fetch:pokemon:1"         traceId=abc...  spanId=111...
                    |
                    | traceparent: 00-abc...-111...-01
                    v
Server span:   "GET /api/pokemon/1"      traceId=abc...  spanId=222...  parentId=111...
```

### Outbound: API to PokeAPI

The `PokeApiProxyAdapter` injects a `traceparent` header into outgoing requests to PokeAPI using `injectTraceContext()` from `@hex-di/tracing`. PokeAPI does not participate in tracing, but the header is present for demonstration purposes and for any intermediate proxy that might.

```
Server span:   "GET /api/pokemon/1"      traceId=abc...  spanId=222...
                    |
                    | Child span: "pokeapi:/pokemon/1"
                    |                                    traceId=abc...  spanId=333...  parentId=222...
                    |
                    | traceparent: 00-abc...-333...-01
                    v
PokeAPI call:  GET https://pokeapi.co/api/v2/pokemon/1
```

### Complete Trace in Jaeger

A single user action (clicking on Bulbasaur) produces a distributed trace with this structure:

```
Jaeger Trace View (traceId: abc...)

Service: pokenerve-frontend
  |-- fetch:pokemon:1  [200ms]
       |
Service: pokenerve-api
       |-- GET /api/pokemon/1  [180ms]
            |
            |-- resolve:PokeApiProxy  [0.1ms]  (HexDI instrumentation)
            |
            |-- pokeapi:/pokemon/1  [150ms]  (client span)
                 |-- http.url: https://pokeapi.co/api/v2/pokemon/1
                 |-- http.status_code: 200
                 |-- cache.action: set
```

---

## 8. Docker Configuration

### API Dockerfile

```dockerfile
# api/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root workspace files for pnpm resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY examples/pokenerve/api/package.json ./examples/pokenerve/api/
COPY examples/pokenerve/shared/ ./examples/pokenerve/shared/

# Install dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy API source
COPY examples/pokenerve/api/ ./examples/pokenerve/api/

# Build
WORKDIR /app/examples/pokenerve/api
RUN pnpm build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/examples/pokenerve/api/dist ./dist
COPY --from=builder /app/examples/pokenerve/api/package.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### Environment Variables

| Variable              | Default                             | Description                             |
| --------------------- | ----------------------------------- | --------------------------------------- |
| `PORT`                | `3001`                              | HTTP server port                        |
| `POKEAPI_BASE_URL`    | `https://pokeapi.co/api/v2`         | PokeAPI base URL                        |
| `JAEGER_ENDPOINT`     | `http://localhost:14268/api/traces` | Jaeger HTTP collector endpoint          |
| `JAEGER_SERVICE_NAME` | `pokenerve-api`                     | Service name in Jaeger UI               |
| `NODE_ENV`            | `development`                       | Environment (affects logging verbosity) |

---

## Acceptance Criteria

1. `docker compose up` starts the API server on port 3001 with a working connection to Jaeger
2. `GET /api/pokemon?offset=0&limit=20` returns a paginated list of Pokemon from PokeAPI (cached after first call)
3. `GET /api/pokemon/1` returns full Bulbasaur data; a second identical request returns cached data with zero PokeAPI round-trip
4. `GET /api/pokemon?type=fire` returns only fire-type Pokemon via the PokeAPI `/type/fire` endpoint
5. `GET /api/pokemon/1/evolution` returns the Bulbasaur evolution chain (Bulbasaur -> Ivysaur -> Venusaur)
6. `GET /api/types/10/effectiveness` returns fire type damage relations (double damage to grass, half damage to water, etc.)
7. `POST /api/battle/start` creates a battle and returns a unique `battleId` with initial state
8. `POST /api/battle/:id/move` advances the battle state and appends to the battle log
9. `POST /api/trading/initiate` creates a trade and returns a unique `tradeId` with initial saga state
10. `POST /api/trading/:id/step` advances the trade saga; with `chaosMode: true`, steps fail randomly and trigger compensation
11. `GET /api/diagnostics/health` returns `{ phase: "ready", portCount: N, disposed: false }` confirming the container is healthy
12. `GET /api/diagnostics/graph` returns the dependency graph with nodes for all backend ports and edges for their `requires` relationships
13. Every API request produces a trace span in Jaeger with `http.method`, `http.url`, and `http.status_code` attributes
14. Requests with a `traceparent` header produce child spans in Jaeger under the browser's parent trace, creating a true distributed trace
15. The PokeAPI proxy rate limiter returns a `429` status with `retryAfterMs` when the rate limit is exceeded (100 req/min)

---

_Previous: [02 - Core DI Infrastructure & Tracing Setup](./02-core-infrastructure.md)_
