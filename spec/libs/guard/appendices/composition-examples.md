# Appendix U: Cross-Enhancement Composition Examples

> **Document Control**
>
> | Property         | Value                                    |
> |------------------|------------------------------------------|
> | Document ID      | GUARD-15-U                               |
> | Revision         | 1.0                                      |
> | Effective Date   | 2026-02-15                               |
> | Status           | Effective                                |
> | Author           | HexDI Engineering                        |
> | Reviewer         | GxP Compliance Review                    |
> | Approved By      | Technical Lead, Quality Assurance Manager |
> | Classification   | GxP Appendix                             |
> | DMS Reference    | Git VCS (GPG-signed tag: guard/v0.2.5)   |
> | Change History   | 1.0 (2026-02-15): Split from consolidated 15-appendices.md (CCR-GUARD-017) |

_Previous: [Appendix T: Implementation Verification Requirements](./implementation-verification.md) | Next: [Appendix V: Consumer Integration Validation Checklist](./consumer-validation-checklist.md)_

---

This appendix demonstrates how the three v0.1.0 enhancements (async evaluation, field-level union strategy, and ReBAC) compose together in real-world authorization scenarios.

### Example 1: Document Access with ReBAC + Async + Field Union

```typescript
import {
  allOf, anyOf, hasPermission, hasRelationship, hasAttribute,
  guardAsync, evaluateAsync,
} from "@hex-di/guard";

// Permissions
const ReadDocument = createPermission("document", "read");

// Policy: Combine RBAC, ReBAC, ABAC, field union, and async resolution
//
// - hasPermission: standard RBAC gate
// - hasRelationship: ReBAC — owner sees all fields, viewer sees title+summary
// - anyOf with fieldStrategy "union": merges fields from all allowing children
// - hasAttribute: ABAC — classification resolved async if not on subject
// - allOf with fieldStrategy "union": outer union across all sub-policies
const documentAccess = allOf(
  hasPermission(ReadDocument),
  anyOf(
    hasRelationship("owner", { fields: ["title", "content", "metadata"] }),
    hasRelationship("viewer", { fields: ["title", "summary"] }),
    { fieldStrategy: "union" },
  ),
  hasAttribute("classification", inArray(["public", "internal"])),
  { fieldStrategy: "union" },
);

// Guard the document repository adapter with async evaluation
const GuardedDocRepo = guardAsync(DocumentRepoAdapter, {
  resolve: documentAccess,
});
// requires: SubjectProviderPort, AuditTrailPort, RelationshipResolverPort, AttributeResolverPort
```

**Evaluation behavior:**

1. `hasPermission(ReadDocument)` -- sync, checked against subject's permission set
2. `anyOf` with `fieldStrategy: "union"` -- evaluates ALL children (no short-circuit per [ADR #51](../decisions/051-anyof-union-full-evaluation.md)):
   - `hasRelationship("owner")` -- sync via `RelationshipResolver.check()`, grants `{title, content, metadata}`
   - `hasRelationship("viewer")` -- sync via `RelationshipResolver.check()`, grants `{title, summary}`
   - If both match: union = `{title, content, metadata, summary}`
   - If only viewer matches: `{title, summary}`
3. `hasAttribute("classification", inArray(...))` -- if `classification` is missing from subject attributes, `evaluateAsync` resolves it on-demand via `AttributeResolver.resolve(subjectId, "classification", resource)`
4. Outer `allOf` with `fieldStrategy: "union"` -- merges visible fields from all allowing children via union

**Trace output:**

```
allOf [fieldStrategy=union] → ALLOW {title, content, metadata, summary}
  ├─ hasPermission(document:read) → ALLOW
  ├─ anyOf [fieldStrategy=union] → ALLOW {title, content, metadata, summary}
  │   ├─ hasRelationship(owner, document) → ALLOW {title, content, metadata}
  │   └─ hasRelationship(viewer, document) → ALLOW {title, summary}
  └─ hasAttribute(classification ∈ [public, internal]) → ALLOW [async: 12ms]
```

### Example 2: React Integration with All Three Enhancements

```tsx
import {
  SubjectProvider, RelationshipResolverProvider, Can,
  useCanAsync,
} from "@hex-di/guard/react";

function DocumentPage({ docId }: { docId: string }) {
  // useCanAsync handles the async evaluation path (Suspense-compatible)
  const { decision, loading } = useCanAsync(documentAccess, {
    resource: { id: docId, type: "document" },
  });

  if (loading) return <Spinner />;
  if (decision.kind === "deny") return <AccessDenied />;

  // visibleFields from the decision controls which fields to render
  const fields = decision.visibleFields; // e.g., Set{"title", "summary"}

  return (
    <article>
      {fields?.has("title") && <h1>{doc.title}</h1>}
      {fields?.has("summary") && <p>{doc.summary}</p>}
      {fields?.has("content") && <div>{doc.content}</div>}
      {fields?.has("metadata") && <MetadataPanel data={doc.metadata} />}
    </article>
  );
}

// App root wires all providers
function App() {
  return (
    <SubjectProvider subject={currentSubject}>
      <RelationshipResolverProvider resolver={graphResolver}>
        <Suspense fallback={<Loading />}>
          <DocumentPage docId="doc-123" />
        </Suspense>
      </RelationshipResolverProvider>
    </SubjectProvider>
  );
}
```

### Example 3: Port Requirements Detection

When `guardAsync()` scans the policy tree at construction time, it detects which optional ports are needed:

| Policy Kind in Tree   | Port Auto-Added to `requires`  |
|----------------------|-------------------------------|
| `hasRelationship`    | `RelationshipResolverPort`    |
| Any (via guardAsync) | `AttributeResolverPort`       |

```typescript
// guardAsync detects hasRelationship in the policy tree
const GuardedDocRepo = guardAsync(DocumentRepoAdapter, {
  resolve: documentAccess, // contains hasRelationship → adds RelationshipResolverPort
});

// Compile-time: GuardedDocRepo.requires includes:
// - SubjectProviderPort (always)
// - AuditTrailPort (always)
// - RelationshipResolverPort (detected from policy tree)
// - AttributeResolverPort (always for guardAsync)
```

---

_Previous: [Appendix T: Implementation Verification Requirements](./implementation-verification.md) | Next: [Appendix V: Consumer Integration Validation Checklist](./consumer-validation-checklist.md)_
