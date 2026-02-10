/**
 * Shared chaos simulation utilities for trade step adapters.
 *
 * Provides configurable failure injection for demonstrating
 * saga compensation patterns.
 *
 * @packageDocumentation
 */

import { err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { TradingError, TradeSagaStepName } from "@pokenerve/shared/types/trading";
import { CommunicationError } from "@pokenerve/shared/types/trading";

interface ChaosConfig {
  enabled: boolean;
  failureProbability: number;
}

const chaosConfig: ChaosConfig = {
  enabled: false,
  failureProbability: 0.3,
};

function setChaosEnabled(enabled: boolean): void {
  chaosConfig.enabled = enabled;
}

function setChaosFailureProbability(probability: number): void {
  chaosConfig.failureProbability = probability;
}

function getChaosConfig(): Readonly<ChaosConfig> {
  return chaosConfig;
}

function maybeFail<T>(stepName: TradeSagaStepName): Result<T, TradingError> | null {
  if (!chaosConfig.enabled) return null;
  if (Math.random() >= chaosConfig.failureProbability) return null;
  return err(CommunicationError({ step: stepName }));
}

export { setChaosEnabled, setChaosFailureProbability, getChaosConfig, maybeFail };
export type { ChaosConfig };
