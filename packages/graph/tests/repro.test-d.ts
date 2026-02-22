import { expect, expectTypeOf, it } from "vitest";
import {
  port,
  createAdapter,
  type DirectedPort,
  type Adapter,
  type InferAdapterProvides,
} from "@hex-di/core";
interface Logger {}
const LoggerPort = port<Logger>()({ name: "Logger" });
type LoggerPortType = typeof LoggerPort;

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

it("minimal port check", () => {
  expect(LoggerPort).toBeDefined();
  expectTypeOf<LoggerPortType>().toEqualTypeOf<DirectedPort<"Logger", Logger, "outbound">>();
});

it("adapter provides check", () => {
  expect(LoggerAdapter).toBeDefined();
  type Provided = InferAdapterProvides<typeof LoggerAdapter>;
  expectTypeOf<Provided>().toEqualTypeOf<LoggerPortType>();
});

it("adapter type check", () => {
  expect(LoggerAdapter).toBeDefined();
  type A = typeof LoggerAdapter;
  expectTypeOf<A>().toMatchTypeOf<Adapter<LoggerPortType, never, "singleton", "sync">>();
});
