// @traces BEH-R02-001 BEH-R02-002 BEH-R02-003 BEH-R02-004 BEH-R03-001 BEH-R03-002 BEH-R03-003 BEH-R03-004
import { describe, it, expectTypeOf } from "vitest";
import {
  ok,
  err,
  ResultAsync,
  type Result,
  type Err,
} from "@hex-di/result";
import { useResult } from "../../src/hooks/use-result.js";
import { useResultAsync } from "../../src/hooks/use-result-async.js";
import type {
  UseResultAsyncOptions,
  UseResultAsyncReturn,
} from "../../src/hooks/use-result-async.js";
import { useResultAction } from "../../src/hooks/use-result-action.js";
import type { UseResultActionReturn } from "../../src/hooks/use-result-action.js";
import { useSafeTry } from "../../src/hooks/use-safe-try.js";
import type { UseSafeTryReturn } from "../../src/hooks/use-safe-try.js";
import { useResultSuspense } from "../../src/hooks/use-result-suspense.js";
import { createResultResource } from "../../src/hooks/create-result-resource.js";
import type { ResultResource } from "../../src/hooks/create-result-resource.js";
import { useOptimisticResult } from "../../src/hooks/use-optimistic-result.js";
import { useResultTransition } from "../../src/hooks/use-result-transition.js";

describe("useResult types (BEH-R03-001)", () => {
  it("without initial: result is Result<T,E> | undefined", () => {
    const hook = useResult<string, number>();
    expectTypeOf(hook.result).toEqualTypeOf<Result<string, number> | undefined>();
    expectTypeOf(hook.setOk).toEqualTypeOf<(value: string) => void>();
    expectTypeOf(hook.setErr).toEqualTypeOf<(error: number) => void>();
    expectTypeOf(hook.set).toEqualTypeOf<(result: Result<string, number>) => void>();
    expectTypeOf(hook.reset).toEqualTypeOf<() => void>();
  });

  it("with initial: result is Result<T,E> (not undefined)", () => {
    const hook = useResult(ok("hello") as Result<string, number>);
    expectTypeOf(hook.result).toEqualTypeOf<Result<string, number>>();
  });
});

describe("useResultAsync types (BEH-R02-001)", () => {
  it("returns UseResultAsyncReturn<T, E>", () => {
    const hook = useResultAsync(
      (_signal) => ResultAsync.ok("data"),
      [],
    );
    expectTypeOf(hook).toEqualTypeOf<UseResultAsyncReturn<string, never>>();
    expectTypeOf(hook.result).toEqualTypeOf<Result<string, never> | undefined>();
    expectTypeOf(hook.isLoading).toEqualTypeOf<boolean>();
    expectTypeOf(hook.refetch).toEqualTypeOf<() => void>();
  });

  it("options generic is inferred from error type", () => {
    const opts: UseResultAsyncOptions<string> = {
      retry: 3,
      retryDelay: (attempt, error) => {
        expectTypeOf(attempt).toEqualTypeOf<number>();
        expectTypeOf(error).toEqualTypeOf<string>();
        return 1000;
      },
      retryOn: (error) => {
        expectTypeOf(error).toEqualTypeOf<string>();
        return true;
      },
    };
    void opts;
  });
});

describe("useResultAction types (BEH-R02-002)", () => {
  it("infers argument types from fn, signal is stripped from execute", () => {
    const hook = useResultAction(
      (_signal: AbortSignal, name: string, age: number) =>
        ResultAsync.ok({ name, age }),
    );
    expectTypeOf(hook).toEqualTypeOf<
      UseResultActionReturn<[string, number], { name: string; age: number }, never>
    >();
    expectTypeOf(hook.execute).toEqualTypeOf<
      (name: string, age: number) => Promise<Result<{ name: string; age: number }, never>>
    >();
    expectTypeOf(hook.reset).toEqualTypeOf<() => void>();
    expectTypeOf(hook.isLoading).toEqualTypeOf<boolean>();
  });
});

describe("useSafeTry types (BEH-R03-003)", () => {
  it("returns UseSafeTryReturn<T, E>", () => {
    const hook = useSafeTry(function* () {
      const a = yield* ok(1);
      return ok(a + 1);
    }, []);
    expectTypeOf(hook).toEqualTypeOf<UseSafeTryReturn<number, never>>();
    expectTypeOf(hook.result).toEqualTypeOf<Result<number, never> | undefined>();
    expectTypeOf(hook.isLoading).toEqualTypeOf<boolean>();
  });
});

describe("useResultSuspense types (BEH-R02-003)", () => {
  it("returns Result<T, E> (never undefined)", () => {
    const result = useResultSuspense(
      () => ResultAsync.ok("data"),
      [],
    );
    expectTypeOf(result).toEqualTypeOf<Result<string, never>>();
  });
});

describe("createResultResource types (BEH-R02-004)", () => {
  it("returns ResultResource<T, E>", () => {
    const resource = createResultResource(() => ResultAsync.ok("data"));
    expectTypeOf(resource).toEqualTypeOf<ResultResource<string, never>>();
    expectTypeOf(resource.read()).toEqualTypeOf<Result<string, never>>();
    expectTypeOf(resource.preload).toEqualTypeOf<() => void>();
    expectTypeOf(resource.invalidate).toEqualTypeOf<() => void>();
  });
});

describe("useOptimisticResult types (BEH-R03-002)", () => {
  it("returns result and setOptimistic", () => {
    const authoritative: Result<string, number> = ok("hello");
    const hook = useOptimisticResult(
      authoritative,
      (_current, optimistic) => {
        expectTypeOf(optimistic).toEqualTypeOf<string>();
        return ok(optimistic) as Result<string, number>;
      },
    );
    expectTypeOf(hook.result).toEqualTypeOf<Result<string, number>>();
    expectTypeOf(hook.setOptimistic).toEqualTypeOf<(value: string) => void>();
  });
});

describe("useResultTransition types (BEH-R03-004)", () => {
  it("returns result, isPending, startResultTransition", () => {
    const hook = useResultTransition<string, number>();
    expectTypeOf(hook.result).toEqualTypeOf<Result<string, number> | undefined>();
    expectTypeOf(hook.isPending).toEqualTypeOf<boolean>();
    expectTypeOf(hook.startResultTransition).toEqualTypeOf<
      (fn: () => ResultAsync<string, number> | Promise<Result<string, number>>) => void
    >();
  });
});
