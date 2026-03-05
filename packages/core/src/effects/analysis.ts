/**
 * Runtime analysis utilities for effect-capability profiles.
 *
 * @packageDocumentation
 */

// =============================================================================
// Types
// =============================================================================

/** A runtime capability profile entry. */
export interface CapabilityProfileEntry {
  readonly capability: string;
  readonly errorTags: ReadonlyArray<string>;
}

// =============================================================================
// Analysis
// =============================================================================

/**
 * Analyze an array of error tag objects to extract the capability profile.
 * Each error tag may have a `_capability` field.
 */
export function analyzeCapabilityProfile(
  errorTags: ReadonlyArray<{ readonly _tag: string; readonly _capability?: string }>
): ReadonlyArray<CapabilityProfileEntry> {
  const capMap = new Map<string, string[]>();

  for (const tag of errorTags) {
    if (tag._capability !== undefined) {
      const existing = capMap.get(tag._capability);
      if (existing) {
        existing.push(tag._tag);
      } else {
        capMap.set(tag._capability, [tag._tag]);
      }
    }
  }

  const entries: CapabilityProfileEntry[] = [];
  for (const [capability, tags] of capMap) {
    entries.push(Object.freeze({ capability, errorTags: Object.freeze(tags) }));
  }

  return Object.freeze(entries);
}

/**
 * Check if a set of error tags only exercises granted capabilities.
 */
export function verifyCapabilityUsage(
  errorTags: ReadonlyArray<{ readonly _tag: string; readonly _capability?: string }>,
  grantedCapabilities: ReadonlySet<string>
): { readonly valid: boolean; readonly unauthorized: ReadonlyArray<string> } {
  const unauthorized: string[] = [];

  for (const tag of errorTags) {
    if (tag._capability !== undefined && !grantedCapabilities.has(tag._capability)) {
      unauthorized.push(tag._capability);
    }
  }

  return Object.freeze({
    valid: unauthorized.length === 0,
    unauthorized: Object.freeze([...new Set(unauthorized)]),
  });
}
