/**
 * Retention metadata management for GxP audit records.
 *
 * @packageDocumentation
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Result } from "@hex-di/result";
import { ok, err } from "@hex-di/result";

/** Metadata describing the retention requirements for an audit record. */
export interface RetentionMetadata {
  readonly retentionPeriodDays: number;
  readonly retentionBasis: string;
  readonly retentionStartDate: string;
  readonly retentionExpiryDate: string;
  readonly recordType: string;
}

/** Error returned when retention metadata validation fails. */
export interface RetentionValidationError {
  readonly _tag: "RetentionValidationError";
  readonly field: string;
  readonly message: string;
}

/** Factory for RetentionValidationError — frozen per GxP error immutability. */
export function createRetentionValidationError(field: string, message: string): RetentionValidationError {
  if (stryMutAct_9fa48("929")) {
    {}
  } else {
    stryCov_9fa48("929");
    return Object.freeze(stryMutAct_9fa48("930") ? {} : (stryCov_9fa48("930"), {
      _tag: "RetentionValidationError" as const,
      field,
      message
    }));
  }
}

/** ISO 8601 date string pattern (basic validation). */
function isValidISODate(value: string): boolean {
  if (stryMutAct_9fa48("931")) {
    {}
  } else {
    stryCov_9fa48("931");
    return stryMutAct_9fa48("934") ? /^\d{4}-\d{2}-\d{2}/.test(value) || !isNaN(Date.parse(value)) : stryMutAct_9fa48("933") ? false : stryMutAct_9fa48("932") ? true : (stryCov_9fa48("932", "933", "934"), (stryMutAct_9fa48("941") ? /^\d{4}-\d{2}-\D{2}/ : stryMutAct_9fa48("940") ? /^\d{4}-\d{2}-\d/ : stryMutAct_9fa48("939") ? /^\d{4}-\D{2}-\d{2}/ : stryMutAct_9fa48("938") ? /^\d{4}-\d-\d{2}/ : stryMutAct_9fa48("937") ? /^\D{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("936") ? /^\d-\d{2}-\d{2}/ : stryMutAct_9fa48("935") ? /\d{4}-\d{2}-\d{2}/ : (stryCov_9fa48("935", "936", "937", "938", "939", "940", "941"), /^\d{4}-\d{2}-\d{2}/)).test(value) && (stryMutAct_9fa48("942") ? isNaN(Date.parse(value)) : (stryCov_9fa48("942"), !isNaN(Date.parse(value)))));
  }
}

/**
 * Validates retention metadata for GxP compliance.
 */
export function validateRetentionMetadata(metadata: RetentionMetadata): Result<RetentionMetadata, RetentionValidationError> {
  if (stryMutAct_9fa48("943")) {
    {}
  } else {
    stryCov_9fa48("943");
    if (stryMutAct_9fa48("946") ? !Number.isFinite(metadata.retentionPeriodDays) && metadata.retentionPeriodDays <= 0 : stryMutAct_9fa48("945") ? false : stryMutAct_9fa48("944") ? true : (stryCov_9fa48("944", "945", "946"), (stryMutAct_9fa48("947") ? Number.isFinite(metadata.retentionPeriodDays) : (stryCov_9fa48("947"), !Number.isFinite(metadata.retentionPeriodDays))) || (stryMutAct_9fa48("950") ? metadata.retentionPeriodDays > 0 : stryMutAct_9fa48("949") ? metadata.retentionPeriodDays < 0 : stryMutAct_9fa48("948") ? false : (stryCov_9fa48("948", "949", "950"), metadata.retentionPeriodDays <= 0)))) {
      if (stryMutAct_9fa48("951")) {
        {}
      } else {
        stryCov_9fa48("951");
        return err(createRetentionValidationError(stryMutAct_9fa48("952") ? "" : (stryCov_9fa48("952"), "retentionPeriodDays"), stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), "retentionPeriodDays must be a positive finite number")));
      }
    }
    if (stryMutAct_9fa48("956") ? typeof metadata.retentionBasis !== "string" && metadata.retentionBasis.length === 0 : stryMutAct_9fa48("955") ? false : stryMutAct_9fa48("954") ? true : (stryCov_9fa48("954", "955", "956"), (stryMutAct_9fa48("958") ? typeof metadata.retentionBasis === "string" : stryMutAct_9fa48("957") ? false : (stryCov_9fa48("957", "958"), typeof metadata.retentionBasis !== (stryMutAct_9fa48("959") ? "" : (stryCov_9fa48("959"), "string")))) || (stryMutAct_9fa48("961") ? metadata.retentionBasis.length !== 0 : stryMutAct_9fa48("960") ? false : (stryCov_9fa48("960", "961"), metadata.retentionBasis.length === 0)))) {
      if (stryMutAct_9fa48("962")) {
        {}
      } else {
        stryCov_9fa48("962");
        return err(createRetentionValidationError(stryMutAct_9fa48("963") ? "" : (stryCov_9fa48("963"), "retentionBasis"), stryMutAct_9fa48("964") ? "" : (stryCov_9fa48("964"), "retentionBasis must be a non-empty string")));
      }
    }
    if (stryMutAct_9fa48("967") ? false : stryMutAct_9fa48("966") ? true : stryMutAct_9fa48("965") ? isValidISODate(metadata.retentionStartDate) : (stryCov_9fa48("965", "966", "967"), !isValidISODate(metadata.retentionStartDate))) {
      if (stryMutAct_9fa48("968")) {
        {}
      } else {
        stryCov_9fa48("968");
        return err(createRetentionValidationError(stryMutAct_9fa48("969") ? "" : (stryCov_9fa48("969"), "retentionStartDate"), stryMutAct_9fa48("970") ? "" : (stryCov_9fa48("970"), "retentionStartDate must be a valid ISO 8601 date string")));
      }
    }
    if (stryMutAct_9fa48("973") ? false : stryMutAct_9fa48("972") ? true : stryMutAct_9fa48("971") ? isValidISODate(metadata.retentionExpiryDate) : (stryCov_9fa48("971", "972", "973"), !isValidISODate(metadata.retentionExpiryDate))) {
      if (stryMutAct_9fa48("974")) {
        {}
      } else {
        stryCov_9fa48("974");
        return err(createRetentionValidationError(stryMutAct_9fa48("975") ? "" : (stryCov_9fa48("975"), "retentionExpiryDate"), stryMutAct_9fa48("976") ? "" : (stryCov_9fa48("976"), "retentionExpiryDate must be a valid ISO 8601 date string")));
      }
    }
    if (stryMutAct_9fa48("979") ? typeof metadata.recordType !== "string" && metadata.recordType.length === 0 : stryMutAct_9fa48("978") ? false : stryMutAct_9fa48("977") ? true : (stryCov_9fa48("977", "978", "979"), (stryMutAct_9fa48("981") ? typeof metadata.recordType === "string" : stryMutAct_9fa48("980") ? false : (stryCov_9fa48("980", "981"), typeof metadata.recordType !== (stryMutAct_9fa48("982") ? "" : (stryCov_9fa48("982"), "string")))) || (stryMutAct_9fa48("984") ? metadata.recordType.length !== 0 : stryMutAct_9fa48("983") ? false : (stryCov_9fa48("983", "984"), metadata.recordType.length === 0)))) {
      if (stryMutAct_9fa48("985")) {
        {}
      } else {
        stryCov_9fa48("985");
        return err(createRetentionValidationError(stryMutAct_9fa48("986") ? "" : (stryCov_9fa48("986"), "recordType"), stryMutAct_9fa48("987") ? "" : (stryCov_9fa48("987"), "recordType must be a non-empty string")));
      }
    }
    return ok(metadata);
  }
}

/**
 * Calculates the retention expiry date from a start date and retention period.
 * Returns an ISO 8601 date string.
 */
export function calculateRetentionExpiryDate(startDate: string, retentionPeriodDays: number): string {
  if (stryMutAct_9fa48("988")) {
    {}
  } else {
    stryCov_9fa48("988");
    const start = new Date(startDate);
    stryMutAct_9fa48("989") ? start.setTime(start.getDate() + retentionPeriodDays) : (stryCov_9fa48("989"), start.setDate(stryMutAct_9fa48("990") ? start.getDate() - retentionPeriodDays : (stryCov_9fa48("990"), start.getDate() + retentionPeriodDays)));
    return stryMutAct_9fa48("991") ? start.toISOString() : (stryCov_9fa48("991"), start.toISOString().slice(0, 10));
  }
}