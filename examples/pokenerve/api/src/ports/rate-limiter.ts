import { port } from "@hex-di/core";

interface RateLimiterService {
  tryAcquire(): boolean;
  remaining(): number;
  retryAfterMs(): number;
}

const RateLimiterPort = port<RateLimiterService>()({
  name: "RateLimiter",
  direction: "outbound",
  description: "Token bucket rate limiter for PokeAPI requests",
  category: "infrastructure",
  tags: ["rate-limit", "throttle"],
});

export { RateLimiterPort };
export type { RateLimiterService };
