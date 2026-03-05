/**
 * Result: Handler Composition
 *
 * Demonstrates composeHandlers and identityHandler — combining multiple
 * effect handlers into a single handler with left-biased precedence.
 * Scenario: multi-channel notification platform with composable failure recovery.
 */

import type { ExampleTemplate } from "../types.js";

const MAIN_TS = `import {
  ok, err, type Result,
  composeHandlers, identityHandler, transformEffects,
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
    return ok(\`Fallback SMS for bounced: \${error.address}\`);
  },
});

const smsHandler: EffectHandler<SmsFailed, string> = Object.freeze({
  _tag: "smsHandler",
  tags: ["SmsFailed"],
  handle(error: SmsFailed) {
    return ok(\`Retry via alt carrier for \${error.phone} (was: \${error.carrier})\`);
  },
});

const pushHandler: EffectHandler<PushExpired, string> = Object.freeze({
  _tag: "pushHandler",
  tags: ["PushExpired"],
  handle(error: PushExpired) {
    return ok(\`Re-register device \${error.deviceId}\`);
  },
});

// --- Compose handlers ---
const channelHandler = composeHandlers(composeHandlers(emailHandler, smsHandler), pushHandler);

console.log("--- Composed handler tag:", channelHandler._tag, "---");
console.log("Handles tags:", channelHandler.tags);

// --- identityHandler composes neutrally ---
const withId = composeHandlers(identityHandler, emailHandler);
console.log("\\n--- Identity composition tag:", withId._tag, "---");

// --- Simulated notifications ---
function sendNotification(channel: string): Result<string, NotificationError> {
  if (channel === "email") return err({ _tag: "EmailBounced", address: "user@old.com" });
  if (channel === "sms") return err({ _tag: "SmsFailed", phone: "+1234", carrier: "Vodafone" });
  if (channel === "push") return err({ _tag: "PushExpired", deviceId: "dev-99" });
  return ok(\`Sent via \${channel}\`);
}

console.log("\\n--- Apply composed handler ---");
for (const channel of ["email", "sms", "push", "webhook"]) {
  const result = sendNotification(channel);
  const handled = transformEffects(result, channelHandler);
  console.log(\`\${channel}: \${handled._tag === "Ok" ? handled.value : "unhandled"}\`);
}

console.log("\\nHandler composition demonstrated.");
`;

export const resultComposeHandlers: ExampleTemplate = {
  id: "result-compose-handlers",
  title: "Result: Handler Composition",
  description:
    "composeHandlers, identityHandler — combine effect handlers with left-biased precedence",
  category: "result",
  files: new Map([["main.ts", MAIN_TS]]),
  entryPoint: "main.ts",
  defaultPanel: "health",
};
