import { describe, expectTypeOf, it } from "vitest";
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../src/index.js";

const SingletonPort = port<{ doS(): void }>()({ name: "Singleton" });
const ScopedPort = port<{ doScoped(): void }>()({ name: "Scoped" });

type IsCaptiveError<T> = T extends `ERROR[HEX003]: Captive dependency: ${string}` ? true : false;

describe("provideMany batch captive detection", () => {
  it("detects singleton->scoped captive when scoped comes AFTER singleton in batch", () => {
    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [ScopedPort] as const, // Forward ref to ScopedPort
      lifetime: "singleton",
      factory: () => ({ doS: () => {} }),
    });

    const ScopedAdapter = createAdapter({
      provides: ScopedPort,
      requires: [] as const,
      lifetime: "scoped",
      factory: () => ({ doScoped: () => {} }),
    });

    const builder = GraphBuilder.create();
    type Result = ReturnType<
      typeof builder.provideMany<readonly [typeof SingletonAdapter, typeof ScopedAdapter]>
    >;

    // EXPECTED: Should detect captive dependency
    // SingletonPort (singleton) depends on ScopedPort (scoped) - this is a captive dependency
    expectTypeOf<IsCaptiveError<Result>>().toEqualTypeOf<true>();
  });

  it("detects captive when using sequential provide calls", () => {
    const SingletonAdapter = createAdapter({
      provides: SingletonPort,
      requires: [ScopedPort] as const,
      lifetime: "singleton",
      factory: () => ({ doS: () => {} }),
    });

    const ScopedAdapter = createAdapter({
      provides: ScopedPort,
      requires: [] as const,
      lifetime: "scoped",
      factory: () => ({ doScoped: () => {} }),
    });

    // Sequential provide - this DOES detect the captive dependency
    const builder = GraphBuilder.create().provide(SingletonAdapter).provide(ScopedAdapter);

    type IsCaptive = typeof builder extends `ERROR[HEX004]: ${string}` ? true : false;
    expectTypeOf<IsCaptive>().toEqualTypeOf<true>();
  });
});
