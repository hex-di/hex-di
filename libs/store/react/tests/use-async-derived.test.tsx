import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import React from "react";
import { HexDiContainerProvider } from "@hex-di/react";
import { createAsyncDerivedPort } from "@hex-di/store";
import type { AsyncDerivedSnapshot, DeepReadonly } from "@hex-di/store";
import { useAsyncDerived } from "../src/index.js";
import { createMockContainer, createMockAsyncDerivedService } from "./helpers.js";

afterEach(() => {
  cleanup();
});

const AsyncPort = createAsyncDerivedPort<string>()({
  name: "AsyncData",
});

describe("useAsyncDerived", () => {
  it("returns loading snapshot initially", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncDisplay() {
      const { snapshot } = useAsyncDerived(AsyncPort);
      if (snapshot.status === "loading") return <div>Loading...</div>;
      if (snapshot.status === "success") return <div>Data: {snapshot.data}</div>;
      return <div>Other</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <AsyncDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Loading...")).toBeDefined();
  });

  it("transitions to success state", () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncDisplay() {
      const { snapshot } = useAsyncDerived(AsyncPort);
      if (snapshot.status === "loading") return <div>Loading...</div>;
      if (snapshot.status === "success") return <div>Data: {snapshot.data}</div>;
      return <div>Other</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <AsyncDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Loading...")).toBeDefined();

    act(() => {
      setSnapshot({
        status: "success",
        data: "Hello" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
    });

    expect(screen.getByText("Data: Hello")).toBeDefined();
  });

  it("exposes refresh function", () => {
    const { service } = createMockAsyncDerivedService<string>({
      status: "success",
      data: "cached" as DeepReadonly<string>,
      error: undefined,
      isLoading: false,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncDisplay() {
      const { snapshot, refresh } = useAsyncDerived(AsyncPort);
      return (
        <div>
          <span>Data: {snapshot.status === "success" ? snapshot.data : "?"}</span>
          <button onClick={refresh}>Refresh</button>
        </div>
      );
    }

    render(
      <HexDiContainerProvider container={container}>
        <AsyncDisplay />
      </HexDiContainerProvider>
    );

    fireEvent.click(screen.getByText("Refresh"));
    expect(service.refresh).toHaveBeenCalledOnce();
  });

  it("transitions from idle to loading to error", () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "idle",
      data: undefined,
      error: undefined,
      isLoading: false,
    } as AsyncDerivedSnapshot<string, never>);
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function AsyncDisplay() {
      const { snapshot } = useAsyncDerived(AsyncPort);
      if (snapshot.status === "idle") return <div>Idle</div>;
      if (snapshot.status === "loading") return <div>Loading...</div>;
      if (snapshot.status === "error") return <div>Error: {String((snapshot as any).error)}</div>;
      if (snapshot.status === "success") return <div>Data: {snapshot.data}</div>;
      return <div>Unknown</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <AsyncDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Idle")).toBeDefined();

    // Transition to loading
    act(() => {
      setSnapshot({
        status: "loading",
        data: undefined,
        error: undefined,
        isLoading: true,
      });
    });

    expect(screen.getByText("Loading...")).toBeDefined();

    // Transition to error
    act(() => {
      setSnapshot({
        status: "error",
        data: undefined,
        error: "Network failure",
        isLoading: false,
      } as AsyncDerivedSnapshot<string, never>);
    });

    expect(screen.getByText("Error: Network failure")).toBeDefined();
  });

  it("refresh is referentially stable across renders", () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "success",
      data: "v1" as DeepReadonly<string>,
      error: undefined,
      isLoading: false,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    const refreshRefs: unknown[] = [];
    function Capture() {
      const { refresh } = useAsyncDerived(AsyncPort);
      refreshRefs.push(refresh);
      return null;
    }

    render(
      <HexDiContainerProvider container={container}>
        <Capture />
      </HexDiContainerProvider>
    );

    // Trigger a re-render by updating the snapshot
    act(() => {
      setSnapshot({
        status: "success",
        data: "v2" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
    });

    expect(refreshRefs.length).toBeGreaterThanOrEqual(2);
    expect(refreshRefs[0]).toBe(refreshRefs[1]);
  });

  it("snapshot discriminated union narrows data on success", () => {
    const { service, setSnapshot } = createMockAsyncDerivedService<string>({
      status: "loading",
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    const services = new Map<string, unknown>([["AsyncData", service]]);
    const container = createMockContainer(services);

    function NarrowingDisplay() {
      const { snapshot } = useAsyncDerived(AsyncPort);
      // Use discriminated union narrowing: when status === "success",
      // snapshot.data is DeepReadonly<string> (not undefined)
      if (snapshot.status === "success") {
        return <div>Narrowed: {snapshot.data}</div>;
      }
      if (snapshot.status === "loading") {
        return <div>Loading</div>;
      }
      return <div>Other: {snapshot.status}</div>;
    }

    render(
      <HexDiContainerProvider container={container}>
        <NarrowingDisplay />
      </HexDiContainerProvider>
    );

    expect(screen.getByText("Loading")).toBeDefined();

    act(() => {
      setSnapshot({
        status: "success",
        data: "Narrowed value" as DeepReadonly<string>,
        error: undefined,
        isLoading: false,
      });
    });

    // After narrowing via status === "success", data is accessible as string
    expect(screen.getByText("Narrowed: Narrowed value")).toBeDefined();
  });
});
