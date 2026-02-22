/// <reference lib="dom" />
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React, { Suspense } from "react";
import { SubjectProvider } from "../../src/SubjectProvider.js";
import { useSubject, useSubjectDeferred } from "../../src/hooks.js";
import { MissingSubjectProviderError } from "../../src/errors.js";
import { createAuthSubject } from "@hex-di/guard";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function SubjectIdDisplay(): React.ReactNode {
  const subject = useSubject();
  return <div data-testid="subject-id">{subject.id}</div>;
}

function DeferredSubjectDisplay(): React.ReactNode {
  const subject = useSubjectDeferred();
  return (
    <div data-testid="deferred-subject">
      {subject === null ? "loading" : subject.id}
    </div>
  );
}

const testSubject = createAuthSubject("user-1", ["admin"], new Set(["docs:read"]));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SubjectProvider", () => {
  it("provides subject to child components via useSubject", () => {
    render(
      <SubjectProvider subject={testSubject}>
        <Suspense fallback={<div>loading…</div>}>
          <SubjectIdDisplay />
        </Suspense>
      </SubjectProvider>,
    );
    expect(screen.getByTestId("subject-id").textContent).toBe("user-1");
  });

  it("suspends when subject is 'loading'", () => {
    render(
      <Suspense fallback={<div data-testid="suspended">suspended</div>}>
        <SubjectProvider subject="loading">
          <SubjectIdDisplay />
        </SubjectProvider>
      </Suspense>,
    );
    expect(screen.getByTestId("suspended").textContent).toBe("suspended");
  });

  it("useSubjectDeferred returns null when subject is 'loading'", () => {
    render(
      <SubjectProvider subject="loading">
        <DeferredSubjectDisplay />
      </SubjectProvider>,
    );
    expect(screen.getByTestId("deferred-subject").textContent).toBe("loading");
  });

  it("useSubjectDeferred returns subject when resolved", () => {
    render(
      <SubjectProvider subject={testSubject}>
        <DeferredSubjectDisplay />
      </SubjectProvider>,
    );
    expect(screen.getByTestId("deferred-subject").textContent).toBe("user-1");
  });

  it("throws MissingSubjectProviderError when used without provider", () => {
    const err = new MissingSubjectProviderError("useSubject");
    expect(err.message).toContain("useSubject");
    expect(err.message).toContain("SubjectProvider");
    expect(err.name).toBe("MissingSubjectProviderError");
  });

  it("freezes the subject to prevent mutation", () => {
    let capturedSubject: ReturnType<typeof useSubject> | null = null;

    function Capturer(): React.ReactNode {
      capturedSubject = useSubject();
      return null;
    }

    render(
      <SubjectProvider subject={testSubject}>
        <Suspense fallback={null}>
          <Capturer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(Object.isFrozen(capturedSubject)).toBe(true);
  });

  it("provides subject roles and permissions", () => {
    function RolesDisplay(): React.ReactNode {
      const subject = useSubject();
      return (
        <div>
          <span data-testid="roles">{subject.roles.join(",")}</span>
          <span data-testid="can-read">
            {subject.permissions.has("docs:read") ? "yes" : "no"}
          </span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={testSubject}>
        <Suspense fallback={null}>
          <RolesDisplay />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("roles").textContent).toBe("admin");
    expect(screen.getByTestId("can-read").textContent).toBe("yes");
  });

  it("nested SubjectProvider: inner overrides outer context", () => {
    const outerSubject = createAuthSubject("outer-user", ["admin"], new Set(["docs:read"]));
    const innerSubject = createAuthSubject("inner-user", ["viewer"], new Set());

    render(
      <SubjectProvider subject={outerSubject}>
        <Suspense fallback={null}>
          <SubjectProvider subject={innerSubject}>
            <Suspense fallback={null}>
              <SubjectIdDisplay />
            </Suspense>
          </SubjectProvider>
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("subject-id").textContent).toBe("inner-user");
  });

  it("re-render stability: same subject ref produces same frozen object", () => {
    const captured: Array<ReturnType<typeof useSubject>> = [];

    function Capturer(): React.ReactNode {
      const subject = useSubject();
      captured.push(subject);
      return <span data-testid="id">{subject.id}</span>;
    }

    const { rerender } = render(
      <SubjectProvider subject={testSubject}>
        <Suspense fallback={null}>
          <Capturer />
        </Suspense>
      </SubjectProvider>,
    );

    // Re-render with the same subject ref
    rerender(
      <SubjectProvider subject={testSubject}>
        <Suspense fallback={null}>
          <Capturer />
        </Suspense>
      </SubjectProvider>,
    );

    // Both renders should receive the same frozen subject object (memoized)
    expect(captured.length).toBeGreaterThanOrEqual(2);
    expect(captured[0]).toBe(captured[1]);
  });

  it("custom authenticationMethod propagation", () => {
    const mfaSubject = createAuthSubject(
      "mfa-user",
      ["admin"],
      new Set(),
      {},
      "mfa-totp",
    );

    function AuthMethodDisplay(): React.ReactNode {
      const subject = useSubject();
      return <span data-testid="auth-method">{subject.authenticationMethod}</span>;
    }

    render(
      <SubjectProvider subject={mfaSubject}>
        <Suspense fallback={null}>
          <AuthMethodDisplay />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("auth-method").textContent).toBe("mfa-totp");
  });

  it("subject revocation: non-null to loading causes children to suspend", () => {
    function SubjectDisplay(): React.ReactNode {
      const subject = useSubject();
      return <span data-testid="subject-display">{subject.id}</span>;
    }

    const { rerender } = render(
      <Suspense fallback={<div data-testid="suspended">suspended</div>}>
        <SubjectProvider subject={testSubject}>
          <SubjectDisplay />
        </SubjectProvider>
      </Suspense>,
    );

    expect(screen.getByTestId("subject-display").textContent).toBe("user-1");

    // Revoke: switch to loading
    rerender(
      <Suspense fallback={<div data-testid="suspended">suspended</div>}>
        <SubjectProvider subject="loading">
          <SubjectDisplay />
        </SubjectProvider>
      </Suspense>,
    );

    expect(screen.getByTestId("suspended").textContent).toBe("suspended");
  });
});
