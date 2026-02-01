/**
 * Port name edge case tests.
 *
 * Tests behavior with various port name formats and styles.
 */

import { describe, expect, it } from "vitest";
import { createPort, createAdapter } from "@hex-di/core";
import { GraphBuilder } from "../../src/index.js";

interface Service {
  name: string;
}

describe("port name edge cases", () => {
  it("handles simple ASCII port names", () => {
    const SimplePort = createPort<"Simple", Service>("Simple");
    const adapter = createAdapter({
      provides: SimplePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "simple" }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();

    expect(graph.adapters[0]?.provides.__portName).toBe("Simple");
  });

  it("handles port names with numbers", () => {
    const Service123Port = createPort<"Service123", Service>("Service123");
    const V2ApiPort = createPort<"V2Api", Service>("V2Api");
    const Port2024Port = createPort<"Port2024", Service>("Port2024");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: Service123Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "Service123" }),
        })
      )
      .provide(
        createAdapter({
          provides: V2ApiPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "V2Api" }),
        })
      )
      .provide(
        createAdapter({
          provides: Port2024Port,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "Port2024" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("Service123");
    expect(graph.adapters[1]?.provides.__portName).toBe("V2Api");
    expect(graph.adapters[2]?.provides.__portName).toBe("Port2024");
  });

  it("handles port names with underscores", () => {
    const User_ServicePort = createPort<"User_Service", Service>("User_Service");
    const DB_ConnectionPort = createPort<"DB_Connection", Service>("DB_Connection");
    const _InternalPort = createPort<"_Internal", Service>("_Internal");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: User_ServicePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "User_Service" }),
        })
      )
      .provide(
        createAdapter({
          provides: DB_ConnectionPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "DB_Connection" }),
        })
      )
      .provide(
        createAdapter({
          provides: _InternalPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "_Internal" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("User_Service");
    expect(graph.adapters[1]?.provides.__portName).toBe("DB_Connection");
    expect(graph.adapters[2]?.provides.__portName).toBe("_Internal");
  });

  it("handles CamelCase port names", () => {
    const UserAuthServicePort = createPort<"UserAuthService", Service>("UserAuthService");
    const HTTPClientAdapterPort = createPort<"HTTPClientAdapter", Service>("HTTPClientAdapter");
    const XMLParserImplPort = createPort<"XMLParserImpl", Service>("XMLParserImpl");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: UserAuthServicePort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "UserAuthService" }),
        })
      )
      .provide(
        createAdapter({
          provides: HTTPClientAdapterPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "HTTPClientAdapter" }),
        })
      )
      .provide(
        createAdapter({
          provides: XMLParserImplPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "XMLParserImpl" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("UserAuthService");
    expect(graph.adapters[1]?.provides.__portName).toBe("HTTPClientAdapter");
    expect(graph.adapters[2]?.provides.__portName).toBe("XMLParserImpl");
  });

  it("handles single-character port names", () => {
    const APort = createPort<"A", Service>("A");
    const BPort = createPort<"B", Service>("B");
    const CPort = createPort<"C", Service>("C");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: APort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ name: "A" }),
        })
      )
      .provide(
        createAdapter({
          provides: BPort,
          requires: [APort],
          lifetime: "singleton",
          factory: () => ({ name: "B" }),
        })
      )
      .provide(
        createAdapter({
          provides: CPort,
          requires: [BPort],
          lifetime: "singleton",
          factory: () => ({ name: "C" }),
        })
      )
      .build();

    expect(graph.adapters.length).toBe(3);
    expect(graph.adapters[0]?.provides.__portName).toBe("A");
    expect(graph.adapters[1]?.provides.__portName).toBe("B");
    expect(graph.adapters[2]?.provides.__portName).toBe("C");
  });

  it("handles port names in dependency chains", () => {
    // Create a dependency chain with various name styles
    const BasePort = createPort<"Base", Service>("Base");
    const Service_ImplPort = createPort<"Service_Impl", Service>("Service_Impl");
    const V2WrapperPort = createPort<"V2Wrapper", Service>("V2Wrapper");

    const baseAdapter = createAdapter({
      provides: BasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ name: "Base" }),
    });

    const serviceAdapter = createAdapter({
      provides: Service_ImplPort,
      requires: [BasePort],
      lifetime: "singleton",
      factory: () => ({ name: "Service_Impl" }),
    });

    const wrapperAdapter = createAdapter({
      provides: V2WrapperPort,
      requires: [Service_ImplPort],
      lifetime: "singleton",
      factory: () => ({ name: "V2Wrapper" }),
    });

    const graph = GraphBuilder.create()
      .provide(baseAdapter)
      .provide(serviceAdapter)
      .provide(wrapperAdapter)
      .build();

    expect(graph.adapters.length).toBe(3);

    // Verify dependency relationships are preserved
    expect(wrapperAdapter.requires[0]?.__portName).toBe("Service_Impl");
    expect(serviceAdapter.requires[0]?.__portName).toBe("Base");
  });
});
