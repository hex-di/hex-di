# Narrowed Errors

Demonstrates `NarrowedError<E, Tags>` — the type-level utility that removes handled error types from a union, enabling progressive error elimination.

**Domain:** Payment retry system — progressively handle different payment failure modes.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  transformEffects,
  type EffectHandler,
  type NarrowedError,
} from "@hex-di/result";

// --- Domain errors ---
type InsufficientFunds = {
  readonly _tag: "InsufficientFunds";
  readonly balance: number;
  readonly required: number;
};
type CardExpired = { readonly _tag: "CardExpired"; readonly expiry: string };
type NetworkTimeout = {
  readonly _tag: "NetworkTimeout";
  readonly gateway: string;
  readonly ms: number;
};
type FraudDetected = { readonly _tag: "FraudDetected"; readonly riskScore: number };

type PaymentError = InsufficientFunds | CardExpired | NetworkTimeout | FraudDetected;

// --- Type-level narrowing ---
type AfterRetry = NarrowedError<PaymentError, "NetworkTimeout">;
// = InsufficientFunds | CardExpired | FraudDetected

type AfterRetryAndExpiry = NarrowedError<AfterRetry, "CardExpired">;
// = InsufficientFunds | FraudDetected

// --- Handlers ---
const retryHandler: EffectHandler<NetworkTimeout, string> = Object.freeze({
  _tag: "retryHandler",
  tags: ["NetworkTimeout"],
  handle(error: NetworkTimeout) {
    return ok(`Retried after ${error.ms}ms timeout on ${error.gateway}`);
  },
});

const expiryHandler: EffectHandler<CardExpired, string> = Object.freeze({
  _tag: "expiryHandler",
  tags: ["CardExpired"],
  handle(error: CardExpired) {
    return ok(`Prompted card update (expired: ${error.expiry})`);
  },
});

// --- Simulated payment ---
function chargeCard(amount: number): Result<string, PaymentError> {
  if (amount > 5000) return err({ _tag: "FraudDetected", riskScore: 95 });
  if (amount > 1000) return err({ _tag: "InsufficientFunds", balance: 500, required: amount });
  if (amount > 500) return err({ _tag: "CardExpired", expiry: "2023-01" });
  if (amount > 100) return err({ _tag: "NetworkTimeout", gateway: "stripe", ms: 30000 });
  return ok(`Charged $${amount}`);
}

// --- Progressive error elimination ---
console.log("--- Step 1: Handle network timeouts ---");
const step1 = transformEffects(chargeCard(200), retryHandler);
console.log("$200:", step1);

console.log("\n--- Step 2: Also handle card expiry ---");
const step2 = transformEffects(chargeCard(600), retryHandler, expiryHandler);
console.log("$600:", step2);

console.log("\n--- Unhandled errors pass through ---");
const step3 = transformEffects(chargeCard(2000), retryHandler, expiryHandler);
console.log("$2000:", step3);
// Error type is now NarrowedError<PaymentError, "NetworkTimeout" | "CardExpired">
// = InsufficientFunds | FraudDetected
```

## Key Takeaways

- `NarrowedError<E, Tags>` removes from union `E` any members whose `_tag` appears in `Tags`
- After `transformEffects`, the return type automatically narrows the error union
- Progressive narrowing lets you handle errors in stages, each stage removing handled types
- Remaining unhandled errors are tracked precisely by the type system
