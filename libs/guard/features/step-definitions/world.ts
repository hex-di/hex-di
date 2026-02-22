import { World } from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import {
  createMemoryAuditTrail,
  createMemorySignatureService,
  createMemoryMetaAuditTrail,
  createMemoryGuardEventSink,
} from "@hex-di/guard-testing";
import type {
  MemoryAuditTrail,
  MemorySignatureService,
  MemoryMetaAuditTrail,
  MemoryGuardEventSink,
} from "@hex-di/guard-testing";
import {
  createAuthSubject,
  createWriteAheadLog,
  createScopeDisposalVerifier,
  enforcePolicy,
  evaluate,
  AccessDeniedError,
  type AuthSubject,
  type PolicyConstraint,
  type AuditEntry,
  type WriteAheadLog,
} from "@hex-di/guard";

export interface EvalResult {
  allowed: boolean;
  denied: boolean;
  error: Error | null;
}

/**
 * Cucumber world class for @hex-di/guard BDD tests.
 * Wraps memory adapters and provides helper methods for step definitions.
 * Resets all state per scenario.
 */
export class GuardCucumberWorld extends World {
  auditTrail: MemoryAuditTrail;
  signatureService: MemorySignatureService;
  metaAuditTrail: MemoryMetaAuditTrail;
  eventSink: MemoryGuardEventSink;
  wal: WriteAheadLog;
  disposalVerifier: ReturnType<typeof createScopeDisposalVerifier>;
  currentSubject: AuthSubject | null = null;
  lastResult: EvalResult = { allowed: false, denied: false, error: null };
  gxpMode = false;
  currentScope = "default-scope";

  // For signature scenarios
  capturedSignatures: Map<string, ReturnType<MemorySignatureService["capture"]>> = new Map();

  // For relationship resolver scenarios
  relationships: Map<string, Set<string>> = new Map();

  // For async attribute scenarios
  attributeStore: Map<string, unknown> = new Map();
  attributeDelayMs = 0;
  resolverCallCount = 0;

  // Role permission/inheritance tracking (used by role steps)
  rolePerms: Map<string, Set<string>> = new Map();
  roleInherits: Map<string, string[]> = new Map();

  // For SoD scenarios
  sodSubjects: Map<string, AuthSubject> = new Map();

  // For WAL scenarios
  walEntries: string[] = [];

  // For disposal verifier scenarios
  registeredScopes: string[] = [];

  // For policy change scenarios
  policyChangeEntries: AuditEntry[] = [];

  constructor(options: IWorldOptions) {
    super(options);
    this.auditTrail = createMemoryAuditTrail();
    this.signatureService = createMemorySignatureService({ signerId: "test-signer", signerName: "Test Signer" });
    this.metaAuditTrail = createMemoryMetaAuditTrail();
    this.eventSink = createMemoryGuardEventSink();
    this.wal = createWriteAheadLog();
    this.disposalVerifier = createScopeDisposalVerifier();
  }

  reset(): void {
    this.auditTrail = createMemoryAuditTrail();
    this.signatureService = createMemorySignatureService({ signerId: "test-signer", signerName: "Test Signer" });
    this.metaAuditTrail = createMemoryMetaAuditTrail();
    this.eventSink = createMemoryGuardEventSink();
    this.wal = createWriteAheadLog();
    this.disposalVerifier = createScopeDisposalVerifier();
    this.currentSubject = null;
    this.lastResult = { allowed: false, denied: false, error: null };
    this.gxpMode = false;
    this.currentScope = "default-scope";
    this.capturedSignatures = new Map();
    this.relationships = new Map();
    this.attributeStore = new Map();
    this.attributeDelayMs = 0;
    this.resolverCallCount = 0;
    this.rolePerms = new Map();
    this.roleInherits = new Map();
    this.sodSubjects = new Map();
    this.walEntries = [];
    this.registeredScopes = [];
    this.policyChangeEntries = [];
  }

  makeSubjectWithPermissions(subjectId: string, permStrs: readonly string[]): AuthSubject {
    return createAuthSubject(subjectId, [], new Set(permStrs));
  }

  makeSubjectWithRoles(subjectId: string, roleNames: readonly string[]): AuthSubject {
    return createAuthSubject(subjectId, roleNames, new Set());
  }

  /**
   * Computes the flattened permission set for the given roles,
   * following inheritance chains tracked in roleInherits.
   */
  resolveRolePermissions(roles: readonly string[]): ReadonlySet<string> {
    const visited = new Set<string>();
    const perms = new Set<string>();

    const visit = (roleName: string): void => {
      if (visited.has(roleName)) return;
      visited.add(roleName);
      for (const p of this.rolePerms.get(roleName) ?? []) {
        perms.add(p);
      }
      for (const parent of this.roleInherits.get(roleName) ?? []) {
        visit(parent);
      }
    };

    for (const r of roles) visit(r);
    return perms;
  }

  /**
   * Rebuilds currentSubject with flattened permissions from role tracking.
   * Call this after modifying rolePerms/roleInherits.
   */
  rebuildSubjectPermissions(): void {
    if (!this.currentSubject) return;
    const flatPerms = this.resolveRolePermissions(this.currentSubject.roles);
    const merged = new Set([...this.currentSubject.permissions, ...flatPerms]);
    this.currentSubject = createAuthSubject(
      this.currentSubject.id,
      [...this.currentSubject.roles],
      merged,
      this.currentSubject.attributes,
      this.currentSubject.authenticationMethod,
      this.currentSubject.authenticatedAt,
    );
  }

  runPolicy(policy: PolicyConstraint): void {
    if (!this.currentSubject) throw new Error("No subject set");
    const subject = this.currentSubject;
    const result = enforcePolicy({
      policy,
      subject,
      portName: "bdd-test",
      scopeId: this.currentScope,
      auditTrail: this.auditTrail,
      failOnAuditError: false,
    });
    if (result.isOk()) {
      this.lastResult = { allowed: true, denied: false, error: null };
    } else {
      const e = result.error;
      const error = e instanceof Error ? e : new Error(e.message);
      this.lastResult = { allowed: false, denied: true, error };
    }
  }

  evaluatePolicy(policy: PolicyConstraint): "allow" | "deny" {
    if (!this.currentSubject) throw new Error("No subject set");
    const result = evaluate(policy, { subject: this.currentSubject });
    if (result.isErr()) throw result.error;
    return result.value.kind;
  }

  getEntries(): readonly AuditEntry[] {
    return this.auditTrail.entries;
  }
}
