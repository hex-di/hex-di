/**
 * ConsoleRenderer component tests.
 *
 * Covers spec Section 44.8 item 4:
 * 4. Console renders log entries with correct levels and formatting
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import { ConsoleRenderer } from "../../src/console/console-renderer.js";
import type { ConsoleEntry } from "../../src/sandbox/worker-protocol.js";

describe("ConsoleRenderer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders log entries with correct levels", () => {
    const entries: ConsoleEntry[] = [
      {
        type: "log",
        level: "log",
        args: [{ type: "string", value: "hello" }],
        timestamp: Date.now(),
      },
      {
        type: "log",
        level: "warn",
        args: [{ type: "string", value: "warning!" }],
        timestamp: Date.now(),
      },
      {
        type: "log",
        level: "error",
        args: [{ type: "string", value: "oh no" }],
        timestamp: Date.now(),
      },
      {
        type: "log",
        level: "info",
        args: [{ type: "string", value: "info msg" }],
        timestamp: Date.now(),
      },
      {
        type: "log",
        level: "debug",
        args: [{ type: "string", value: "debug msg" }],
        timestamp: Date.now(),
      },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);

    expect(getByTestId("console-renderer")).toBeDefined();
    expect(getByTestId("console-entry-log-log").textContent).toContain("hello");
    expect(getByTestId("console-entry-log-warn").textContent).toContain("warning!");
    expect(getByTestId("console-entry-log-error").textContent).toContain("oh no");
    expect(getByTestId("console-entry-log-info").textContent).toContain("info msg");
    expect(getByTestId("console-entry-log-debug").textContent).toContain("debug msg");
  });

  it("renders multiple args separated by space", () => {
    const entries: ConsoleEntry[] = [
      {
        type: "log",
        level: "log",
        args: [
          { type: "string", value: "hello" },
          { type: "number", value: "42" },
          { type: "boolean", value: "true" },
        ],
        timestamp: Date.now(),
      },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);
    const text = getByTestId("console-entry-log-log").textContent ?? "";
    expect(text).toContain("hello");
    expect(text).toContain("42");
    expect(text).toContain("true");
  });

  it("renders compilation errors with file location", () => {
    const entries: ConsoleEntry[] = [
      {
        type: "compilation-error",
        errors: [
          { file: "main.ts", line: 5, column: 10, message: "Syntax error" },
          { file: "utils.ts", line: 3, column: 1, message: "Missing semicolon" },
        ],
      },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);

    const errorEl = getByTestId("console-entry-compilation-error");
    expect(errorEl.textContent).toContain("main.ts:5:10");
    expect(errorEl.textContent).toContain("Syntax error");
    expect(errorEl.textContent).toContain("utils.ts:3:1");
    expect(errorEl.textContent).toContain("Missing semicolon");
  });

  it("calls onNavigate when compilation error location is clicked", () => {
    const onNavigate = vi.fn();
    const entries: ConsoleEntry[] = [
      {
        type: "compilation-error",
        errors: [{ file: "main.ts", line: 5, column: 10, message: "Error" }],
      },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} onNavigate={onNavigate} />);

    fireEvent.click(getByTestId("compilation-error-location-0"));
    expect(onNavigate).toHaveBeenCalledWith("main.ts", 5, 10);
  });

  it("renders runtime errors with message", () => {
    const entries: ConsoleEntry[] = [
      {
        type: "runtime-error",
        error: {
          name: "TypeError",
          message: "Cannot read properties of undefined",
          stack: "TypeError: Cannot read properties of undefined\n    at main.ts:10:5",
        },
      },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);

    const errorEl = getByTestId("console-entry-runtime-error");
    expect(errorEl.textContent).toContain("TypeError");
    expect(errorEl.textContent).toContain("Cannot read properties of undefined");
    expect(errorEl.textContent).toContain("at main.ts:10:5");
  });

  it("renders timeout entries", () => {
    const entries: ConsoleEntry[] = [{ type: "timeout", timeoutMs: 5000 }];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);

    const timeoutEl = getByTestId("console-entry-timeout");
    expect(timeoutEl.textContent).toContain("Execution timed out after 5000ms");
  });

  it("renders status entries with correct variants", () => {
    const entries: ConsoleEntry[] = [
      { type: "status", message: "Compiling...", variant: "info" },
      { type: "status", message: "Done!", variant: "success" },
      { type: "status", message: "Failed!", variant: "error" },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);

    expect(getByTestId("console-entry-status-info").textContent).toContain("Compiling...");
    expect(getByTestId("console-entry-status-success").textContent).toContain("Done!");
    expect(getByTestId("console-entry-status-error").textContent).toContain("Failed!");
  });

  it("renders empty list without errors", () => {
    const { getByTestId } = render(<ConsoleRenderer entries={[]} />);
    expect(getByTestId("console-renderer")).toBeDefined();
    expect(getByTestId("console-renderer").children.length).toBe(0);
  });

  it("renders all serialized value types", () => {
    const entries: ConsoleEntry[] = [
      {
        type: "log",
        level: "log",
        args: [
          { type: "null", value: "null" },
          { type: "undefined", value: "undefined" },
          { type: "function", value: "[Function: foo]" },
          { type: "symbol", value: "Symbol(test)" },
          { type: "object", value: '{"a":1}' },
          { type: "array", value: "[1,2,3]" },
        ],
        timestamp: Date.now(),
      },
    ];

    const { getByTestId } = render(<ConsoleRenderer entries={entries} />);
    const text = getByTestId("console-entry-log-log").textContent ?? "";
    expect(text).toContain("null");
    expect(text).toContain("undefined");
    expect(text).toContain("[Function: foo]");
  });
});
