/**
 * Standard electronic signature meaning constants.
 *
 * These are the recommended vocabulary for hasSignature policy `meaning` fields.
 * Organizations may extend this with site-specific meanings.
 */

export const SIGNATURE_MEANINGS = Object.freeze({
  /** The signer authored/created the record. */
  AUTHORED: "authored",
  /** The signer reviewed the record. */
  REVIEWED: "reviewed",
  /** The signer approved the record. */
  APPROVED: "approved",
  /** The signer rejected the record. */
  REJECTED: "rejected",
  /** A second signer verified the record (counter-signature). */
  WITNESSED: "witnessed",
  /** The signer released the record for the next workflow stage. */
  RELEASED: "released",
  /** The signer witnessed the destruction/disposal of the record. */
  WITNESSED_DESTRUCTION: "witnessed-destruction",
} as const);

export type SignatureMeaning = (typeof SIGNATURE_MEANINGS)[keyof typeof SIGNATURE_MEANINGS];
