import { expectTypeOf } from "vitest";
import type { Context } from "hono";
import { port } from "@hex-di/core";
import type { Port } from "@hex-di/core";
import { resolvePort, type HexHonoEnv, type WithHexDi } from "../src/index.js";

interface Logger {
  log(message: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

type Env = HexHonoEnv<typeof LoggerPort>;
declare const context: Context<Env>;

expectTypeOf(resolvePort(context, LoggerPort)).toEqualTypeOf<Logger>();

type CustomEnv = WithHexDi<{ Variables: { requestId: string } }, typeof LoggerPort>;
type Variables = CustomEnv["Variables"];
expectTypeOf<Variables["requestId"]>().toEqualTypeOf<string>();

type CustomKeysEnv = HexHonoEnv<
  typeof LoggerPort,
  never,
  never,
  "uninitialized",
  "scope",
  "container"
>;
declare const customContext: Context<CustomKeysEnv>;
expectTypeOf(resolvePort(customContext, LoggerPort, "scope")).toEqualTypeOf<Logger>();

// Ensure HexHonoVariables accepts any port union
type Ports = Port<"Logger", Logger> | Port<"Id", { id: string }>;
type EnvWithUnion = HexHonoEnv<Ports>;
expectTypeOf<EnvWithUnion["Variables"]>().not.toBeNever();
