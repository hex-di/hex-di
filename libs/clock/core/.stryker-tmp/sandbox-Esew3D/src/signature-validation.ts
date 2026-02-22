/**
 * Signature validation for SignableTemporalContext (21 CFR 11.50).
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
import type { SignableTemporalContext } from "./temporal-context.js";

/** Error returned when signature validation fails. */
export interface SignatureValidationError {
  readonly _tag: "SignatureValidationError";
  readonly field: string;
  readonly message: string;
}

/** Factory for SignatureValidationError — frozen per GxP error immutability. */
export function createSignatureValidationError(field: string, message: string): SignatureValidationError {
  if (stryMutAct_9fa48("992")) {
    {}
  } else {
    stryCov_9fa48("992");
    return Object.freeze(stryMutAct_9fa48("993") ? {} : (stryCov_9fa48("993"), {
      _tag: "SignatureValidationError" as const,
      field,
      message
    }));
  }
}

/**
 * Validates a SignableTemporalContext.
 *
 * Returns ok(ctx) for unsigned contexts.
 * For signed contexts, validates all 5 signature fields are non-empty strings.
 * Enforces 21 CFR 11.50 requirements.
 */
export function validateSignableTemporalContext(ctx: SignableTemporalContext): Result<SignableTemporalContext, SignatureValidationError> {
  if (stryMutAct_9fa48("994")) {
    {}
  } else {
    stryCov_9fa48("994");
    if (stryMutAct_9fa48("997") ? ctx.signature !== undefined : stryMutAct_9fa48("996") ? false : stryMutAct_9fa48("995") ? true : (stryCov_9fa48("995", "996", "997"), ctx.signature === undefined)) {
      if (stryMutAct_9fa48("998")) {
        {}
      } else {
        stryCov_9fa48("998");
        return ok(ctx);
      }
    }
    const {
      signature
    } = ctx;
    const requiredFields = ["signerName", "signerId", "signedAt", "meaning", "method"] as const;
    for (const field of requiredFields) {
      if (stryMutAct_9fa48("999")) {
        {}
      } else {
        stryCov_9fa48("999");
        const value = signature[field];
        if (stryMutAct_9fa48("1002") ? typeof value !== "string" && value.length === 0 : stryMutAct_9fa48("1001") ? false : stryMutAct_9fa48("1000") ? true : (stryCov_9fa48("1000", "1001", "1002"), (stryMutAct_9fa48("1004") ? typeof value === "string" : stryMutAct_9fa48("1003") ? false : (stryCov_9fa48("1003", "1004"), typeof value !== (stryMutAct_9fa48("1005") ? "" : (stryCov_9fa48("1005"), "string")))) || (stryMutAct_9fa48("1007") ? value.length !== 0 : stryMutAct_9fa48("1006") ? false : (stryCov_9fa48("1006", "1007"), value.length === 0)))) {
          if (stryMutAct_9fa48("1008")) {
            {}
          } else {
            stryCov_9fa48("1008");
            return err(createSignatureValidationError(field, stryMutAct_9fa48("1009") ? `` : (stryCov_9fa48("1009"), `Signature field '${field}' must be a non-empty string (21 CFR 11.50)`)));
          }
        }
      }
    }
    return ok(ctx);
  }
}