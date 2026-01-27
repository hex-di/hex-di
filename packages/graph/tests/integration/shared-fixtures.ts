/**
 * Shared fixtures for integration tests.
 *
 * Re-exports rich interface variants from main fixtures file.
 */

// Re-export rich interface variants for integration tests
export type {
  LoggerWithError as Logger,
  ConfigWithTypes as Config,
  DatabaseFull as Database,
  CacheServiceFull as Cache,
  UserServiceFull as UserService,
  EmailService,
  UserRepository,
  NotificationService,
} from "../fixtures.js";

// Re-export rich ports (same port names but with full interfaces)
export {
  LoggerWithErrorPort as LoggerPort,
  ConfigWithTypesPort as ConfigPort,
  DatabaseFullPort as DatabasePort,
  CacheFullPort as CachePort,
  UserServiceFullPort as UserServicePort,
  EmailServicePort,
  UserRepositoryPort,
  NotificationServicePort,
} from "../fixtures.js";
