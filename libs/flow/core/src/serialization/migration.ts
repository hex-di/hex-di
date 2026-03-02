/**
 * State Migration (GxP F5)
 *
 * Provides a migration registry and runner for upgrading serialized machine
 * state across versions. Each migration transforms context and optionally
 * remaps state names from one version to the next.
 *
 * @packageDocumentation
 */

import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { SerializedMachineState } from "./serialization.js";
import { createError } from "@hex-di/result";

// =============================================================================
// Migration Types
// =============================================================================

/**
 * A single state migration from one version to the next.
 */
export interface StateMigration {
  /** The version this migration upgrades FROM. */
  readonly fromVersion: number;
  /** The version this migration upgrades TO. */
  readonly toVersion: number;
  /**
   * Transforms the serialized context.
   * @param context - The context at fromVersion
   * @returns The context at toVersion
   */
  readonly migrateContext: (context: unknown) => unknown;
  /**
   * Optional state name remapping.
   * @param stateName - The state name at fromVersion
   * @returns The state name at toVersion, or undefined to keep unchanged
   */
  readonly migrateState?: (stateName: string) => string | undefined;
}

// =============================================================================
// Migration Error
// =============================================================================

/**
 * Error when a migration path cannot be found or a migration step fails.
 */
export const MigrationFailed = createError("MigrationFailed");
export type MigrationFailed = Readonly<{
  _tag: "MigrationFailed";
  fromVersion: number;
  toVersion: number;
  message: string;
}>;

// =============================================================================
// Migration Registry
// =============================================================================

/**
 * Registry for state migrations.
 *
 * Migrations are registered as steps from one version to the next.
 * The registry automatically chains migrations to create a path from
 * any source version to any target version.
 *
 * @example
 * ```typescript
 * const registry = new MigrationRegistry();
 * registry.register({
 *   fromVersion: 1,
 *   toVersion: 2,
 *   migrateContext: (ctx) => ({ ...ctx, newField: 'default' }),
 * });
 * registry.register({
 *   fromVersion: 2,
 *   toVersion: 3,
 *   migrateContext: (ctx) => ({ ...ctx, renamedField: ctx.oldField }),
 *   migrateState: (s) => s === 'loading' ? 'fetching' : undefined,
 * });
 * ```
 */
export class MigrationRegistry {
  private readonly migrations: Map<number, StateMigration> = new Map();

  /**
   * Registers a migration step.
   * @param migration - The migration to register
   */
  register(migration: StateMigration): void {
    this.migrations.set(migration.fromVersion, migration);
  }

  /**
   * Returns the migration step for a given source version, if any.
   */
  get(fromVersion: number): StateMigration | undefined {
    return this.migrations.get(fromVersion);
  }

  /**
   * Returns all registered migrations.
   */
  getAll(): readonly StateMigration[] {
    return Array.from(this.migrations.values());
  }
}

// =============================================================================
// Migration Runner
// =============================================================================

/**
 * Applies migrations to a serialized machine state to bring it
 * from its current version to the target version.
 *
 * Chains migration steps in order: v1 → v2 → v3 → ... → target.
 * Returns a new SerializedMachineState at the target version.
 *
 * @param serialized - The serialized state to migrate
 * @param targetVersion - The version to migrate to
 * @param registry - The migration registry containing migration steps
 * @returns Result with the migrated state, or MigrationFailed error
 */
export function applyMigrations(
  serialized: SerializedMachineState,
  targetVersion: number,
  registry: MigrationRegistry
): Result<SerializedMachineState, MigrationFailed> {
  let currentVersion = serialized.version;
  let currentContext: unknown = serialized.context;
  let currentStateName: string = serialized.state;

  // Already at target version
  if (currentVersion === targetVersion) {
    return ok(serialized);
  }

  // Only support forward migrations
  if (currentVersion > targetVersion) {
    return err(
      MigrationFailed({
        fromVersion: currentVersion,
        toVersion: targetVersion,
        message: `Downgrade migration not supported (${currentVersion} → ${targetVersion})`,
      })
    );
  }

  // Chain migrations: v1 → v2 → ... → target
  while (currentVersion < targetVersion) {
    const migration = registry.get(currentVersion);
    if (migration === undefined) {
      return err(
        MigrationFailed({
          fromVersion: currentVersion,
          toVersion: targetVersion,
          message: `No migration registered from version ${currentVersion}`,
        })
      );
    }

    currentContext = migration.migrateContext(currentContext);

    if (migration.migrateState !== undefined) {
      const remapped = migration.migrateState(currentStateName);
      if (remapped !== undefined) {
        currentStateName = remapped;
      }
    }

    currentVersion = migration.toVersion;
  }

  return ok({
    version: targetVersion,
    machineId: serialized.machineId,
    state: currentStateName,
    context: currentContext,
    timestamp: serialized.timestamp,
    machineDefinitionHash: serialized.machineDefinitionHash,
  });
}
