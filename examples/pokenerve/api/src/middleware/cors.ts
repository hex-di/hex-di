import { cors } from "hono/cors";

const corsMiddleware = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "traceparent", "tracestate", "X-Request-ID"],
  exposeHeaders: ["traceparent", "tracestate", "X-Request-ID"],
  maxAge: 86400,
});

export { corsMiddleware };
