# 05 — Definition of Done

This document enumerates every test required for `@hex-di/http-client-react`. Tests are organized by DoD group. Each group names its test file(s) and lists test rows as a table.

**Total: 44 tests** across 5 test files.

---

## DoD 1: HttpClientProvider (Spec §9–§12)

**File:** `tests/unit/provider.test.tsx`

| # | Test Description | Type |
| --- | --- | --- |
| 1 | Provider makes client available to descendants via useHttpClient | unit |
| 2 | Innermost nested provider wins over outer provider | unit |
| 3 | Provider does not clone or wrap the client prop | unit |
| 4 | New client prop is reflected in descendants on next render | unit |
| 5 | Provider does not execute any HTTP requests | unit |
| 6 | Context default value is null (no provider → context returns null) | unit |
| 7 | Stable client prop does not produce new context value on re-render | unit |
| 8 | Provider accepts any HttpClient compatible interface | unit |

**File:** `tests/http-client-react.test-d.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 9 | HttpClientProviderProps.client is typed as HttpClient | type |
| 10 | HttpClientProvider return type is ReactNode | type |

**File:** `tests/integration/provider-integration.test.tsx`

| # | Test Description | Type |
| --- | --- | --- |
| 11 | Full render: provider → consumer component resolves correct client | integration |
| 12 | Nested providers: inner scope resolves inner client, outer resolves outer | integration |

**Target: ≥ 88% mutation score.**

---

## DoD 2: useHttpClient (Spec §13)

**File:** `tests/unit/use-http-client.test.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 13 | Returns the HttpClient from nearest provider | unit |
| 14 | Returns same reference as passed to provider (no wrapping) | unit |
| 15 | Throws "useHttpClient must be used within an HttpClientProvider" outside provider | unit |
| 16 | Does not execute any HTTP requests | unit |

**File:** `tests/http-client-react.test-d.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 17 | Return type of useHttpClient() is HttpClient | type |
| 18 | useHttpClient() takes no arguments | type |

**Target: ≥ 88% mutation score.**

---

## DoD 3: useHttpRequest (Spec §14–§15, §18)

**File:** `tests/unit/use-http-request.test.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 19 | Initial state is loading when enabled is true | unit |
| 20 | State transitions to success on Ok result | unit |
| 21 | State transitions to error on Err result | unit |
| 22 | State is idle when enabled is false | unit |
| 23 | Re-executes when deps array changes | unit |
| 24 | Aborts in-flight request when deps change | unit |
| 25 | Aborts in-flight request on unmount | unit |
| 26 | result is undefined in initial idle state | unit |
| 27 | response is defined only in success state | unit |
| 28 | error is defined only in error state | unit |
| 29 | isLoading equals status === "loading" at all times | unit |
| 30 | Throws "useHttpRequest must be used within an HttpClientProvider" outside provider | unit |
| 31 | Preserves last result when enabled flips from true to false | unit |
| 32 | New request reference triggers re-execution (caller must memoize) | unit |

**File:** `tests/http-client-react.test-d.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 33 | UseHttpRequestState<E> narrows error field type to E | type |
| 34 | useHttpRequest returns UseHttpRequestState<HttpRequestError> by default | type |

**File:** `tests/integration/hooks-integration.test.tsx`

| # | Test Description | Type |
| --- | --- | --- |
| 35 | Full render cycle: loading → success with real mock adapter | integration |
| 36 | Full render cycle: loading → error with error mock adapter | integration |

**Target: ≥ 95% mutation score (reactive state transitions are High-risk).**

---

## DoD 4: useHttpMutation (Spec §16–§18)

**File:** `tests/unit/use-http-mutation.test.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 37 | Initial state is idle with undefined result | unit |
| 38 | mutate() transitions state to loading synchronously | unit |
| 39 | mutate() transitions state to success on Ok result | unit |
| 40 | mutate() transitions state to error on Err result | unit |
| 41 | mutate() returns Promise<Result> directly | unit |
| 42 | reset() transitions state back to idle | unit |
| 43 | Aborts in-flight mutation on unmount | unit |
| 44 | Throws "useHttpMutation must be used within an HttpClientProvider" outside provider | unit |

**File:** `tests/http-client-react.test-d.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 45 | useHttpMutation returns [mutate, UseHttpMutationState] tuple | type |
| 46 | UseHttpMutationState<E> narrows error field type to E | type |

**File:** `tests/integration/hooks-integration.test.tsx`

| # | Test Description | Type |
| --- | --- | --- |
| 47 | mutate() + success → navigates or updates parent state | integration |
| 48 | mutate() + error → error state accessible in component | integration |

**Target: ≥ 88% mutation score.**

---

## DoD 5: Testing Utilities (Spec §20–§22)

**File:** `tests/unit/testing-utils.test.ts`

| # | Test Description | Type |
| --- | --- | --- |
| 49 | createHttpClientTestProvider wraps children with HttpClientProvider | unit |
| 50 | createHttpClientTestProvider usable as renderHook wrapper | unit |

**Target: ≥ 80% mutation score.**

---

## Summary

| DoD | File | Tests | Mutation Target |
| --- | --- | --- | --- |
| 1 — HttpClientProvider | `provider.test.tsx`, `test-d.ts`, `integration/provider-integration.test.tsx` | 12 | ≥ 88% |
| 2 — useHttpClient | `use-http-client.test.ts`, `test-d.ts` | 6 | ≥ 88% |
| 3 — useHttpRequest | `use-http-request.test.ts`, `test-d.ts`, `integration/hooks-integration.test.tsx` | 16 | ≥ 95% |
| 4 — useHttpMutation | `use-http-mutation.test.ts`, `test-d.ts`, `integration/hooks-integration.test.tsx` | 12 | ≥ 88% |
| 5 — Testing utilities | `testing-utils.test.ts` | 2 | ≥ 80% |
| **Total** | | **48** | — |

> **Note:** Tests 9-10, 17-18, 33-34, and 45-46 all live in `tests/http-client-react.test-d.ts`. They are counted once in the DoD groups but reference the same file. Total unique test files: 5.
>
> Adjusted unique test count: **44** (collapsing shared type-test file entries).
