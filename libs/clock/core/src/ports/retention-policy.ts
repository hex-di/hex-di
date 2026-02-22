/**
 * RetentionPolicyPort — configurable retention period management for GxP audit records.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";

/** Service interface for RetentionPolicyPort. */
export interface RetentionPolicyService {
  readonly getRetentionPeriodDays: (recordType: string) => number;
  readonly isRetentionConfigured: () => boolean;
  readonly getSupportedRecordTypes: () => ReadonlyArray<string>;
}

/** Injectable retention policy port for configurable GxP data retention management. */
export const RetentionPolicyPort = port<RetentionPolicyService>()({
  name: "RetentionPolicy",
  direction: "outbound",
  description: "Configurable retention period management for GxP audit records",
  category: "clock/retention",
  tags: ["retention", "gxp", "compliance", "data-lifecycle"],
});
