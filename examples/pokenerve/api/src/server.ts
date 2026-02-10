import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createContainer } from "@hex-di/runtime";
import { TracerPort, instrumentContainer } from "@hex-di/tracing";
import { createScopeMiddleware, tracingMiddleware, createDiagnosticRoutes } from "@hex-di/hono";
import { apiGraph } from "./graph/api-graph.js";
import { corsMiddleware } from "./middleware/cors.js";
import { pokemonRoutes } from "./routes/pokemon.js";
import { battleRoutes } from "./routes/battle.js";
import { tradingRoutes } from "./routes/trading.js";

// Create the DI container from the validated graph
const container = createContainer({ graph: apiGraph, name: "PokenerveAPI" });

// Resolve the tracer for middleware and instrumentation
const tracer = container.resolve(TracerPort);

// Instrument container with distributed tracing
instrumentContainer(container, tracer);

// Create the Hono app
const app = new Hono();

// Global middleware stack
app.use("*", corsMiddleware);
app.use("*", tracingMiddleware({ tracer }));
app.use("*", createScopeMiddleware(container));

// Health endpoint
app.get("/api/health", c => c.json({ status: "ok", service: "pokenerve-api" }));

// Mount route groups
app.route("/api", pokemonRoutes);
app.route("/api", battleRoutes);
app.route("/api", tradingRoutes);

// Diagnostic routes for DI inspection
app.route("/api", createDiagnosticRoutes({ pathPrefix: "/debug" }));

// Start the server
const serverPort = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: serverPort }, info => {
  console.log(`[PokéNerve API] Listening on http://localhost:${info.port}`);
});
