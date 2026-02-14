/**
 * Tests for actor attribution in inspection results.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { GraphBuilder } from "../src/builder/builder.js";
import { inspectGraph, inspectionToJSON } from "../src/graph/inspection/index.js";
import { toStructuredLogs } from "../src/graph/inspection/structured-logging.js";
import { port, createAdapter } from "@hex-di/core";

interface Logger {
  log(msg: string): void;
}

const LoggerPort = port<Logger>()({ name: "Logger" });

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

describe("Actor Attribution", () => {
  it("inspection includes actor when provided in options", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const inspection = inspectGraph(graph, {
      actor: { type: "user", id: "user-123", name: "Test User" },
    });

    expect(inspection.actor).toBeDefined();
    expect(inspection.actor?.type).toBe("user");
    expect(inspection.actor?.id).toBe("user-123");
    expect(inspection.actor?.name).toBe("Test User");
  });

  it("inspection actor is undefined when not provided", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const inspection = inspectGraph(graph);

    expect(inspection.actor).toBeUndefined();
  });

  it("actor is frozen in inspection result", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const inspection = inspectGraph(graph, {
      actor: { type: "system", id: "ci-pipeline" },
    });

    expect(Object.isFrozen(inspection.actor)).toBe(true);
  });

  it("actor is serialized to JSON", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const inspection = inspectGraph(graph, {
      actor: { type: "process", id: "pid-42", name: "Worker" },
    });
    const json = inspectionToJSON(inspection);

    expect(json.actor).toBeDefined();
    expect(json.actor?.type).toBe("process");
    expect(json.actor?.id).toBe("pid-42");
    expect(json.actor?.name).toBe("Worker");
  });

  it("actor appears in structured logs", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const inspection = inspectGraph(graph, {
      actor: { type: "user", id: "admin", name: "Admin" },
    });
    const logs = toStructuredLogs(inspection);

    const summaryLog = logs.find(l => l.event === "graph.inspection.summary");
    expect(summaryLog).toBeDefined();
    expect(summaryLog?.data.actorType).toBe("user");
    expect(summaryLog?.data.actorId).toBe("admin");
    expect(summaryLog?.data.actorName).toBe("Admin");
  });

  it("structured logs omit actor fields when not provided", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const inspection = inspectGraph(graph);
    const logs = toStructuredLogs(inspection);

    const summaryLog = logs.find(l => l.event === "graph.inspection.summary");
    expect(summaryLog).toBeDefined();
    expect(summaryLog?.data.actorType).toBeUndefined();
    expect(summaryLog?.data.actorId).toBeUndefined();
  });

  it("supports all actor types", () => {
    const graph = GraphBuilder.create().provide(LoggerAdapter).build();

    for (const actorType of ["user", "system", "process"] as const) {
      const inspection = inspectGraph(graph, {
        actor: { type: actorType, id: `${actorType}-id` },
      });
      expect(inspection.actor?.type).toBe(actorType);
    }
  });
});
