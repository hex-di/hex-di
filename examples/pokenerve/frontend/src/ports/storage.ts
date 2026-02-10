/**
 * Persistence port definition.
 *
 * Defines the contract for key-value persistence used to store
 * trainer data, favorites, preferences, and research notes.
 * All operations return Result types for safe error handling.
 *
 * @packageDocumentation
 */

import { port } from "@hex-di/core";
import { createError } from "@hex-di/result";
import type { Result } from "@hex-di/result";

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

const QuotaExceeded = createError("QuotaExceeded");
type QuotaExceeded = Readonly<{ _tag: "QuotaExceeded"; key: string }>;

const SerializationError = createError("SerializationError");
type SerializationError = Readonly<{ _tag: "SerializationError"; message: string }>;

const StorageUnavailable = createError("StorageUnavailable");
type StorageUnavailable = Readonly<{ _tag: "StorageUnavailable" }>;

type PersistenceError = QuotaExceeded | SerializationError | StorageUnavailable;

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

interface PersistenceService {
  get<T>(key: string): Result<T | null, PersistenceError>;
  set<T>(key: string, value: T): Result<void, PersistenceError>;
  remove(key: string): Result<void, PersistenceError>;
  clear(): Result<void, PersistenceError>;
}

// ---------------------------------------------------------------------------
// Port definition
// ---------------------------------------------------------------------------

const PersistencePort = port<PersistenceService>()({
  name: "Persistence",
  category: "infrastructure",
  description: "Key-value persistence for trainer data, favorites, and preferences",
});

export { PersistencePort, QuotaExceeded, SerializationError, StorageUnavailable };
export type { PersistenceService, PersistenceError };
