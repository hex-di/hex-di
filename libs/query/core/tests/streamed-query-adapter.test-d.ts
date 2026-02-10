import { describe, it, expectTypeOf } from "vitest";
import type { AdapterConstraint } from "@hex-di/core";
import { port } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";
import { createQueryPort, createStreamedQueryAdapter, type StreamedFetcher } from "../src/index.js";

// =============================================================================
// Setup: Ports
// =============================================================================

const TokensPort = createQueryPort<string, void>()({ name: "Tokens" });
const EventsPort = createQueryPort<string[], { topic: string }, Error>()({ name: "Events" });

const HttpClientPort = port<{ get(url: string): Promise<unknown> }>()({
  name: "HttpClient",
});

// =============================================================================
// Tests
// =============================================================================

describe("Streamed Query Adapter Type-Level Tests", () => {
  it("createStreamedQueryAdapter with no deps returns AdapterConstraint", () => {
    const adapter = createStreamedQueryAdapter(TokensPort, {
      factory: () => () =>
        ({}) as ResultAsync<
          {
            stream: AsyncIterable<string>;
            reducer: (acc: string, chunk: string) => string;
            initialValue: string;
          },
          Error
        >,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("createStreamedQueryAdapter with requires returns AdapterConstraint", () => {
    const adapter = createStreamedQueryAdapter(EventsPort, {
      requires: [HttpClientPort],
      factory: _deps => () =>
        ({}) as ResultAsync<
          {
            stream: AsyncIterable<string>;
            reducer: (acc: string[], chunk: string) => string[];
            initialValue: string[];
          },
          Error
        >,
    });

    expectTypeOf(adapter).toMatchTypeOf<AdapterConstraint>();
  });

  it("StreamedFetcher return type contains stream: AsyncIterable<TChunk>", () => {
    type TestFetcher = StreamedFetcher<string, void, Error, string>;

    // The return type is ResultAsync<{ stream: AsyncIterable<string>; ... }, Error>
    expectTypeOf<TestFetcher>().toBeFunction();

    // Verify the shape by checking a concrete instance
    type ReturnShape = {
      stream: AsyncIterable<string>;
      reducer: (acc: string, chunk: string) => string;
      initialValue: string;
      refetchMode?: "reset" | "append" | "replace";
    };

    // StreamedFetcher returns ResultAsync<ReturnShape, Error>
    type ExpectedReturn = ResultAsync<ReturnShape, Error>;
    type ActualReturn = ReturnType<TestFetcher>;
    expectTypeOf<ActualReturn>().toMatchTypeOf<ExpectedReturn>();
  });

  it("port constraint: only accepts AnyQueryPort", () => {
    const NotAQueryPort = port<string>()({ name: "NotQuery" });

    // @ts-expect-error - NotAQueryPort is not a query port
    createStreamedQueryAdapter(NotAQueryPort, {
      factory: () => () =>
        ({}) as ResultAsync<
          {
            stream: AsyncIterable<string>;
            reducer: (acc: string, chunk: string) => string;
            initialValue: string;
          },
          Error
        >,
    });
  });
});
