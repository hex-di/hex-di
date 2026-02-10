import { createAdapter } from "@hex-di/core";
import { RateLimiterPort } from "../ports/rate-limiter.js";

const MAX_TOKENS = 100;
const REFILL_INTERVAL_MS = 60 * 1000; // 1 minute

const rateLimiterAdapter = createAdapter({
  provides: RateLimiterPort,
  requires: [],
  lifetime: "singleton",
  factory: () => {
    let tokens = MAX_TOKENS;
    let lastRefillTime = Date.now();

    function refill(): void {
      const now = Date.now();
      const elapsed = now - lastRefillTime;
      const tokensToAdd = Math.floor((elapsed / REFILL_INTERVAL_MS) * MAX_TOKENS);
      if (tokensToAdd > 0) {
        tokens = Math.min(MAX_TOKENS, tokens + tokensToAdd);
        lastRefillTime = now;
      }
    }

    return {
      tryAcquire(): boolean {
        refill();
        if (tokens > 0) {
          tokens--;
          return true;
        }
        return false;
      },

      remaining(): number {
        refill();
        return tokens;
      },

      retryAfterMs(): number {
        if (tokens > 0) return 0;
        const elapsed = Date.now() - lastRefillTime;
        const timeUntilRefill = REFILL_INTERVAL_MS - elapsed;
        return Math.max(0, timeUntilRefill);
      },
    };
  },
});

export { rateLimiterAdapter };
