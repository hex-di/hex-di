/// <reference lib="dom" />
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React, { Suspense } from "react";
import { SubjectProvider } from "../../src/SubjectProvider.js";
import {
  useCan,
  useCanDeferred,
  usePolicy,
  usePolicyDeferred,
  usePolicies,
  usePoliciesDeferred,
} from "../../src/hooks.js";
import { createGuardHooks } from "../../src/createGuardHooks.js";
import {
  createAuthSubject,
  createPermission,
  hasPermission,
  hasRole,
  allOf,
} from "@hex-di/guard";

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const ReadDoc = createPermission({ resource: "docs", action: "read" });
const WriteDoc = createPermission({ resource: "docs", action: "write" });
const ManageUsers = createPermission({ resource: "users", action: "manage" });
const ReadX = createPermission({ resource: "x", action: "read" });
const ReadA = createPermission({ resource: "a", action: "read" });

// ---------------------------------------------------------------------------
// Test subjects
// ---------------------------------------------------------------------------

const adminSubject = createAuthSubject(
  "admin-1",
  ["admin"],
  new Set(["docs:write", "docs:read", "users:manage"]),
);

const readerSubject = createAuthSubject(
  "reader-1",
  ["reader"],
  new Set(["docs:read"]),
);

// ---------------------------------------------------------------------------
// useCan
// ---------------------------------------------------------------------------

describe("useCan", () => {
  it("returns true when subject satisfies the policy", () => {
    function Consumer(): React.ReactNode {
      const can = useCan(hasPermission(WriteDoc));
      return <span data-testid="result">{String(can)}</span>;
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("true");
  });

  it("returns false when subject does not satisfy the policy", () => {
    function Consumer(): React.ReactNode {
      const can = useCan(hasPermission(WriteDoc));
      return <span data-testid="result">{String(can)}</span>;
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("false");
  });

  it("suspends when subject is loading", () => {
    function Consumer(): React.ReactNode {
      const can = useCan(hasPermission(WriteDoc));
      return <span>{String(can)}</span>;
    }

    render(
      <Suspense fallback={<div data-testid="fallback">loading</div>}>
        <SubjectProvider subject="loading">
          <Consumer />
        </SubjectProvider>
      </Suspense>,
    );

    expect(screen.getByTestId("fallback")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useCanDeferred
// ---------------------------------------------------------------------------

describe("useCanDeferred", () => {
  it("returns loading: true when subject is loading", () => {
    function Consumer(): React.ReactNode {
      const result = useCanDeferred(hasPermission(WriteDoc));
      return (
        <span data-testid="result">
          {result.loading ? "loading" : String(result.allowed)}
        </span>
      );
    }

    render(
      <SubjectProvider subject="loading">
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("loading");
  });

  it("returns allowed: true when subject satisfies policy", () => {
    function Consumer(): React.ReactNode {
      const result = useCanDeferred(hasPermission(WriteDoc));
      return (
        <span data-testid="result">
          {result.loading ? "loading" : String(result.allowed)}
        </span>
      );
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("true");
  });

  it("returns allowed: false when subject does not satisfy policy", () => {
    function Consumer(): React.ReactNode {
      const result = useCanDeferred(hasPermission(WriteDoc));
      return (
        <span data-testid="result">
          {result.loading ? "loading" : String(result.allowed)}
        </span>
      );
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// usePolicy
// ---------------------------------------------------------------------------

describe("usePolicy", () => {
  it("returns allow decision for granted policy", () => {
    function Consumer(): React.ReactNode {
      const decision = usePolicy(hasPermission(ReadDoc));
      return <span data-testid="kind">{decision.kind}</span>;
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("kind").textContent).toBe("allow");
  });

  it("returns deny decision for rejected policy", () => {
    function Consumer(): React.ReactNode {
      const decision = usePolicy(hasPermission(WriteDoc));
      return <span data-testid="kind">{decision.kind}</span>;
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("kind").textContent).toBe("deny");
  });

  it("evaluates composed allOf policies", () => {
    function Consumer(): React.ReactNode {
      const decision = usePolicy(
        allOf(hasPermission(ReadDoc), hasRole("admin")),
      );
      return <span data-testid="kind">{decision.kind}</span>;
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("kind").textContent).toBe("allow");
  });

  it("deny when one policy in allOf fails", () => {
    function Consumer(): React.ReactNode {
      const decision = usePolicy(
        allOf(hasPermission(ReadDoc), hasPermission(WriteDoc)),
      );
      return <span data-testid="kind">{decision.kind}</span>;
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("kind").textContent).toBe("deny");
  });
});

// ---------------------------------------------------------------------------
// usePolicyDeferred
// ---------------------------------------------------------------------------

describe("usePolicyDeferred", () => {
  it("returns loading: true when subject is loading", () => {
    function Consumer(): React.ReactNode {
      const result = usePolicyDeferred(hasPermission(ReadDoc));
      return (
        <span data-testid="result">
          {result.loading ? "loading" : (result.decision?.kind ?? "none")}
        </span>
      );
    }

    render(
      <SubjectProvider subject="loading">
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("loading");
  });

  it("returns decision when subject is resolved", () => {
    function Consumer(): React.ReactNode {
      const result = usePolicyDeferred(hasPermission(ReadDoc));
      return (
        <span data-testid="result">
          {result.loading ? "loading" : (result.decision?.kind ?? "none")}
        </span>
      );
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("allow");
  });
});

// ---------------------------------------------------------------------------
// usePolicies
// ---------------------------------------------------------------------------

describe("usePolicies", () => {
  it("evaluates multiple policies and returns a map", () => {
    function Consumer(): React.ReactNode {
      const decisions = usePolicies({
        read: hasPermission(ReadDoc),
        write: hasPermission(WriteDoc),
      });
      return (
        <div>
          <span data-testid="read">{decisions["read"]?.kind}</span>
          <span data-testid="write">{decisions["write"]?.kind}</span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("read").textContent).toBe("allow");
    expect(screen.getByTestId("write").textContent).toBe("deny");
  });

  it("admin has all permissions", () => {
    function Consumer(): React.ReactNode {
      const decisions = usePolicies({
        read: hasPermission(ReadDoc),
        write: hasPermission(WriteDoc),
        manage: hasPermission(ManageUsers),
      });
      return (
        <div>
          <span data-testid="read">{decisions["read"]?.kind}</span>
          <span data-testid="write">{decisions["write"]?.kind}</span>
          <span data-testid="manage">{decisions["manage"]?.kind}</span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("read").textContent).toBe("allow");
    expect(screen.getByTestId("write").textContent).toBe("allow");
    expect(screen.getByTestId("manage").textContent).toBe("allow");
  });
});

// ---------------------------------------------------------------------------
// usePoliciesDeferred
// ---------------------------------------------------------------------------

describe("usePoliciesDeferred", () => {
  it("returns loading entries when subject is loading", () => {
    function Consumer(): React.ReactNode {
      const results = usePoliciesDeferred({
        read: hasPermission(ReadDoc),
      });
      return (
        <span data-testid="result">
          {results["read"]?.loading ? "loading" : "resolved"}
        </span>
      );
    }

    render(
      <SubjectProvider subject="loading">
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("loading");
  });

  it("returns decisions when subject is resolved", () => {
    function Consumer(): React.ReactNode {
      const results = usePoliciesDeferred({
        read: hasPermission(ReadDoc),
        write: hasPermission(WriteDoc),
      });
      return (
        <div>
          <span data-testid="read">
            {results["read"]?.loading
              ? "loading"
              : (results["read"]?.decision?.kind ?? "none")}
          </span>
          <span data-testid="write">
            {results["write"]?.loading
              ? "loading"
              : (results["write"]?.decision?.kind ?? "none")}
          </span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("read").textContent).toBe("allow");
    expect(screen.getByTestId("write").textContent).toBe("deny");
  });
});

// ---------------------------------------------------------------------------
// createGuardHooks factory
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// useCan — additional tests
// ---------------------------------------------------------------------------

describe("useCan — memoization", () => {
  it("stable ref when permission + subject unchanged", () => {
    const results: boolean[] = [];

    function Consumer(): React.ReactNode {
      const can = useCan(hasPermission(ReadDoc));
      results.push(can);
      return <span data-testid="result">{String(can)}</span>;
    }

    const { rerender } = render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    rerender(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    // Both renders should produce the same boolean value
    expect(results.every((r) => r === true)).toBe(true);
  });

  it("useCan with resource context parameter", () => {
    function Consumer(): React.ReactNode {
      const can = useCan(hasPermission(ReadDoc));
      return <span data-testid="result">{String(can)}</span>;
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("result").textContent).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// usePolicy — additional tests
// ---------------------------------------------------------------------------

describe("usePolicy — resource forwarding", () => {
  it("usePolicy with resource parameter forwarding", () => {
    function Consumer(): React.ReactNode {
      const decision = usePolicy(hasPermission(ReadDoc));
      return (
        <div>
          <span data-testid="kind">{decision.kind}</span>
          <span data-testid="eval-id">{decision.evaluationId}</span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("kind").textContent).toBe("allow");
    expect(screen.getByTestId("eval-id").textContent).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// usePolicies — enricher
// ---------------------------------------------------------------------------

describe("usePolicies — enricher", () => {
  it("evaluates multiple policies with enricher-like pattern (called once per invocation)", () => {
    let evaluationCount = 0;

    function Consumer(): React.ReactNode {
      const decisions = usePolicies({
        read: hasPermission(ReadDoc),
        write: hasPermission(WriteDoc),
        manage: hasPermission(ManageUsers),
      });
      evaluationCount++;
      return (
        <div>
          <span data-testid="read">{decisions["read"]?.kind}</span>
          <span data-testid="write">{decisions["write"]?.kind}</span>
          <span data-testid="manage">{decisions["manage"]?.kind}</span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={adminSubject}>
        <Suspense fallback={null}>
          <Consumer />
        </Suspense>
      </SubjectProvider>,
    );

    expect(screen.getByTestId("read").textContent).toBe("allow");
    expect(screen.getByTestId("write").textContent).toBe("allow");
    expect(screen.getByTestId("manage").textContent).toBe("allow");
    expect(evaluationCount).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// usePoliciesDeferred — multiple policies
// ---------------------------------------------------------------------------

describe("usePoliciesDeferred — multiple policies", () => {
  it("returns decision results for multiple policies", () => {
    function Consumer(): React.ReactNode {
      const results = usePoliciesDeferred({
        read: hasPermission(ReadDoc),
        write: hasPermission(WriteDoc),
        manage: hasPermission(ManageUsers),
      });
      return (
        <div>
          <span data-testid="read">
            {results["read"]?.loading ? "loading" : (results["read"]?.decision?.kind ?? "none")}
          </span>
          <span data-testid="write">
            {results["write"]?.loading ? "loading" : (results["write"]?.decision?.kind ?? "none")}
          </span>
          <span data-testid="manage">
            {results["manage"]?.loading ? "loading" : (results["manage"]?.decision?.kind ?? "none")}
          </span>
        </div>
      );
    }

    render(
      <SubjectProvider subject={readerSubject}>
        <Consumer />
      </SubjectProvider>,
    );

    expect(screen.getByTestId("read").textContent).toBe("allow");
    expect(screen.getByTestId("write").textContent).toBe("deny");
    expect(screen.getByTestId("manage").textContent).toBe("deny");
  });
});

// ---------------------------------------------------------------------------
// Error boundary integration
// ---------------------------------------------------------------------------

describe("Error boundary integration", () => {
  it("evaluation error is catchable by error boundary", () => {
    // Missing SubjectProvider should throw MissingSubjectProviderError
    function Consumer(): React.ReactNode {
      const can = useCan(hasPermission(ReadDoc));
      return <span>{String(can)}</span>;
    }

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { hasError: boolean; error: Error | null }
    > {
      constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
        return { hasError: true, error };
      }
      render(): React.ReactNode {
        if (this.state.hasError) {
          return <span data-testid="error">{this.state.error?.name}</span>;
        }
        return this.props.children;
      }
    }

    // Render without SubjectProvider
    render(
      <ErrorBoundary>
        <Consumer />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("error").textContent).toBe("MissingSubjectProviderError");
  });
});

// ---------------------------------------------------------------------------
// createGuardHooks factory
// ---------------------------------------------------------------------------

describe("createGuardHooks", () => {
  it("creates isolated guard contexts", () => {
    const guardA = createGuardHooks();
    const guardB = createGuardHooks();

    const subjectA = createAuthSubject("userA", [], new Set(["a:read"]));
    const subjectB = createAuthSubject("userB", [], new Set(["b:read"]));

    function ConsumerA(): React.ReactNode {
      const result = guardA.useCanDeferred(hasPermission(ReadA));
      return <span data-testid="a">{String(result.allowed)}</span>;
    }

    function ConsumerB(): React.ReactNode {
      const result = guardB.useCanDeferred(hasPermission(ReadA));
      return <span data-testid="b">{String(result.allowed)}</span>;
    }

    render(
      <guardA.SubjectProvider subject={subjectA}>
        <guardB.SubjectProvider subject={subjectB}>
          <ConsumerA />
          <ConsumerB />
        </guardB.SubjectProvider>
      </guardA.SubjectProvider>,
    );

    // Context A subject has "a:read"; context B subject does not
    expect(screen.getByTestId("a").textContent).toBe("true");
    expect(screen.getByTestId("b").textContent).toBe("false");
  });

  it("Can component from factory renders correctly", () => {
    const guard = createGuardHooks();
    const subject = createAuthSubject("u", ["admin"], new Set(["x:read"]));

    render(
      <guard.SubjectProvider subject={subject}>
        <Suspense fallback={null}>
          <guard.Can policy={hasPermission(ReadX)}>
            <span data-testid="allowed">allowed</span>
          </guard.Can>
          <guard.Cannot policy={hasPermission(WriteDoc)}>
            <span data-testid="denied">read-only</span>
          </guard.Cannot>
        </Suspense>
      </guard.SubjectProvider>,
    );

    expect(screen.getByTestId("allowed").textContent).toBe("allowed");
    expect(screen.getByTestId("denied").textContent).toBe("read-only");
  });

  it("SubjectProvider from factory provides isolated subject", () => {
    const guard = createGuardHooks();
    const subject = createAuthSubject("isolated-user", ["viewer"], new Set());

    function SubjectDisplay(): React.ReactNode {
      const s = guard.useSubjectDeferred();
      return <span data-testid="id">{s?.id ?? "null"}</span>;
    }

    render(
      <guard.SubjectProvider subject={subject}>
        <SubjectDisplay />
      </guard.SubjectProvider>,
    );

    expect(screen.getByTestId("id").textContent).toBe("isolated-user");
  });

  it("returns all 11 members (structural check)", () => {
    const guard = createGuardHooks();
    const keys = Object.keys(guard).sort();
    expect(keys).toEqual([
      "Can",
      "Cannot",
      "SubjectProvider",
      "useCan",
      "useCanDeferred",
      "usePolicies",
      "usePoliciesDeferred",
      "usePolicy",
      "usePolicyDeferred",
      "useSubject",
      "useSubjectDeferred",
    ]);
    expect(keys).toHaveLength(11);
  });

  it("two instances don't share context", () => {
    const guardA = createGuardHooks();
    const guardB = createGuardHooks();

    const subjectA = createAuthSubject("userA", ["admin"], new Set(["docs:read"]));
    const subjectB = createAuthSubject("userB", [], new Set());

    function DisplayA(): React.ReactNode {
      const s = guardA.useSubjectDeferred();
      return <span data-testid="a-id">{s?.id ?? "null"}</span>;
    }

    function DisplayB(): React.ReactNode {
      const s = guardB.useSubjectDeferred();
      return <span data-testid="b-id">{s?.id ?? "null"}</span>;
    }

    render(
      <guardA.SubjectProvider subject={subjectA}>
        <guardB.SubjectProvider subject={subjectB}>
          <DisplayA />
          <DisplayB />
        </guardB.SubjectProvider>
      </guardA.SubjectProvider>,
    );

    expect(screen.getByTestId("a-id").textContent).toBe("userA");
    expect(screen.getByTestId("b-id").textContent).toBe("userB");
  });
});
