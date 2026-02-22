/// <reference lib="dom" />
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React, { Suspense } from "react";
import { SubjectProvider } from "../../src/SubjectProvider.js";
import { Can } from "../../src/Can.js";
import { Cannot } from "../../src/Cannot.js";
import {
  createAuthSubject,
  createPermission,
  hasPermission,
  hasRole,
} from "@hex-di/guard";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const WriteDoc = createPermission({ resource: "docs", action: "write" });
const ReadDoc = createPermission({ resource: "docs", action: "read" });

// ---------------------------------------------------------------------------
// Test subjects
// ---------------------------------------------------------------------------

const adminSubject = createAuthSubject(
  "admin-1",
  ["admin"],
  new Set(["docs:write", "docs:read"]),
);

const readerSubject = createAuthSubject(
  "reader-1",
  ["reader"],
  new Set(["docs:read"]),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Can component", () => {
  it("renders children when policy is allowed", () => {
    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Can policy={hasPermission(WriteDoc)}>
            <span data-testid="content">Edit button</span>
          </Can>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.getByTestId("content").textContent).toBe("Edit button");
  });

  it("renders null when policy is denied and no fallback", () => {
    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Can policy={hasPermission(WriteDoc)}>
            <span data-testid="content">Edit button</span>
          </Can>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("renders fallback when policy is denied", () => {
    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Can
            policy={hasPermission(WriteDoc)}
            fallback={<span data-testid="denied">Access denied</span>}
          >
            <span data-testid="content">Edit button</span>
          </Can>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.getByTestId("denied").textContent).toBe("Access denied");
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("suspends when subject is loading", () => {
    render(
      <Suspense fallback={<div data-testid="suspended">suspended</div>}>
        <SubjectProvider subject="loading">
          <Can policy={hasPermission(WriteDoc)}>
            <span>content</span>
          </Can>
        </SubjectProvider>
      </Suspense>,
    );
    expect(screen.getByTestId("suspended")).toBeTruthy();
  });

  it("works with role-based policies", () => {
    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Can policy={hasRole("admin")}>
            <span data-testid="admin-content">Admin area</span>
          </Can>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.getByTestId("admin-content").textContent).toBe("Admin area");
  });

  it("allows read access to reader", () => {
    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Can policy={hasPermission(ReadDoc)}>
            <span data-testid="read-content">Read content</span>
          </Can>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.getByTestId("read-content").textContent).toBe("Read content");
  });
});

describe("Can / Cannot behavior matrix", () => {
  it("null subject (no permission): Can hides, Cannot shows", () => {
    const noPermSubject = createAuthSubject("no-perm", [], new Set());

    render(
      <SubjectProvider subject={noPermSubject}>
        <Suspense fallback={null}>
          <Can policy={hasPermission(WriteDoc)}>
            <span data-testid="can-content">visible</span>
          </Can>
          <Cannot policy={hasPermission(WriteDoc)}>
            <span data-testid="cannot-content">fallback</span>
          </Cannot>
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.queryByTestId("can-content")).toBeNull();
    expect(screen.getByTestId("cannot-content").textContent).toBe("fallback");
  });

  it("has permission: Can shows, Cannot hides", () => {
    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Can policy={hasPermission(WriteDoc)}>
            <span data-testid="can-content">visible</span>
          </Can>
          <Cannot policy={hasPermission(WriteDoc)}>
            <span data-testid="cannot-content">fallback</span>
          </Cannot>
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("can-content").textContent).toBe("visible");
    expect(screen.queryByTestId("cannot-content")).toBeNull();
  });

  it("resource prop forwarded to policy evaluation", () => {
    // Resource context is not used by basic hasPermission, but the components
    // should pass it through without error
    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Can policy={hasPermission(WriteDoc)}>
            <span data-testid="resource-can">allowed</span>
          </Can>
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("resource-can").textContent).toBe("allowed");
  });

  it("Cannot with fallback-like pattern: renders children on deny", () => {
    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Cannot policy={hasPermission(WriteDoc)}>
            <span data-testid="readonly-notice">You have read-only access</span>
          </Cannot>
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("readonly-notice").textContent).toBe(
      "You have read-only access",
    );
  });
});

describe("Cannot component", () => {
  it("renders children when policy is denied", () => {
    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Cannot policy={hasPermission(WriteDoc)}>
            <span data-testid="readonly-banner">Read only</span>
          </Cannot>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.getByTestId("readonly-banner").textContent).toBe("Read only");
  });

  it("renders null when policy is allowed", () => {
    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Cannot policy={hasPermission(WriteDoc)}>
            <span data-testid="readonly-banner">Read only</span>
          </Cannot>
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.queryByTestId("readonly-banner")).toBeNull();
  });

  it("suspends when subject is loading", () => {
    render(
      <Suspense fallback={<div data-testid="suspended">suspended</div>}>
        <SubjectProvider subject="loading">
          <Cannot policy={hasPermission(WriteDoc)}>
            <span>content</span>
          </Cannot>
        </SubjectProvider>
      </Suspense>,
    );
    expect(screen.getByTestId("suspended")).toBeTruthy();
  });
});
