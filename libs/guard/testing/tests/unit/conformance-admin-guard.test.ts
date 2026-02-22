import { createAdminGuardConformanceSuite } from "../../src/conformance/admin-guard.js";

/**
 * DoD 13 Tests 46–50: Verifies the admin guard conformance suite runs against
 * the canonical in-memory guard setup. Runs in CI on every commit.
 */
const suite = createAdminGuardConformanceSuite();
suite();
