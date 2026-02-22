import { createAuditTrailConformanceSuite } from "../../src/conformance/audit-trail.js";
import { createMemoryAuditTrail } from "../../src/memory/audit-trail.js";

/**
 * DoD 13 Test 26/34: Verifies MemoryAuditTrail passes the 17-case conformance suite.
 * This file exists to ensure the conformance suite runs in CI on every commit.
 */
const suite = createAuditTrailConformanceSuite(() => createMemoryAuditTrail());
suite();
