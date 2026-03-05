# Handler Composition

Demonstrates `composeHandlers` and `identityHandler` — combining multiple effect handlers into a single handler with left-biased precedence.

**Domain:** Multi-channel notification platform — compose handlers for different delivery failure types.

## Code

```typescript
import {
  ok,
  err,
  type Result,
  composeHandlers,
  identityHandler,
  transformEffects,
  type EffectHandler,
} from "@hex-di/result";

// --- Domain errors ---
type EmailBounced = { readonly _tag: "EmailBounced"; readonly address: string };
type SmsFailed = { readonly _tag: "SmsFailed"; readonly phone: string; readonly carrier: string };
type PushExpired = { readonly _tag: "PushExpired"; readonly deviceId: string };

type NotificationError = EmailBounced | SmsFailed | PushExpired;

// --- Individual handlers ---
const emailHandler: EffectHandler<EmailBounced, string> = Object.freeze({
  _tag: "emailHandler",
  tags: ["EmailBounced"],
  handle(error: EmailBounced) {
    return ok(`Fallback SMS for bounced email: ${error.address}`);
  },
});

const smsHandler: EffectHandler<SmsFailed, string> = Object.freeze({
  _tag: "smsHandler",
  tags: ["SmsFailed"],
  handle(error: SmsFailed) {
    return ok(`Retry via different carrier for ${error.phone} (was: ${error.carrier})`);
  },
});

const pushHandler: EffectHandler<PushExpired, string> = Object.freeze({
  _tag: "pushHandler",
  tags: ["PushExpired"],
  handle(error: PushExpired) {
    return ok(`Re-register device ${error.deviceId}`);
  },
});

// --- Compose handlers ---
const channelHandler = composeHandlers(composeHandlers(emailHandler, smsHandler), pushHandler);

// Identity handler composes neutrally
const withIdentity = composeHandlers(identityHandler, emailHandler);

// --- Simulated notifications ---
function sendNotification(channel: string): Result<string, NotificationError> {
  if (channel === "email") return err({ _tag: "EmailBounced", address: "user@old.com" });
  if (channel === "sms") return err({ _tag: "SmsFailed", phone: "+1234", carrier: "Vodafone" });
  if (channel === "push") return err({ _tag: "PushExpired", deviceId: "dev-99" });
  return ok(`Sent via ${channel}`);
}

// --- Apply composed handler ---
console.log("--- Composed handler handles all error types ---");
for (const channel of ["email", "sms", "push", "webhook"]) {
  const result = sendNotification(channel);
  const handled = transformEffects(result, channelHandler);
  console.log(`${channel}: ${handled._tag === "Ok" ? handled.value : "unhandled"}`);
}
```

## Key Takeaways

- `composeHandlers(h1, h2)` merges two handlers into one that handles the union of both tag sets
- Composition is left-biased: when both handlers declare the same tag, `h1` takes precedence
- `identityHandler` is the identity element — composing with it is a no-op
- Composed handlers can be passed to `transformEffects` just like individual handlers
