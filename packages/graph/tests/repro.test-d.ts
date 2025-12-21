
import { expectTypeOf, it } from "vitest";
import { createPort, type Port } from "@hex-di/ports";
import { createAdapter, type InferAdapterProvides, type Adapter } from "../src/index.js";

interface Logger {}
const LoggerPort = createPort<"Logger", Logger>("Logger");
type LoggerPortType = typeof LoggerPort;

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({}),
});

it("minimal port check", () => {
  expectTypeOf<LoggerPortType>().toEqualTypeOf<Port<Logger, "Logger">>();
});

it("adapter provides check", () => {
  type Provided = InferAdapterProvides<typeof LoggerAdapter>;
  expectTypeOf<Provided>().toEqualTypeOf<LoggerPortType>();
});

it("adapter type check", () => {
   type A = typeof LoggerAdapter;
   expectTypeOf<A>().toMatchTypeOf<Adapter<LoggerPortType, never, "singleton", "sync">>();
});
