/**
 * Logger Adapters
 *
 * Platform-specific logging implementations:
 * - ConsoleLoggerAdapter: Browser/development (uses console.*)
 * - StderrLoggerAdapter: Node.js/MCP/TUI (uses stderr)
 * - NoopLoggerAdapter: Production/silent (discards all)
 *
 * @packageDocumentation
 */

export {
  ConsoleLoggerAdapter,
  createConsoleLoggerAdapter,
} from './console-logger.adapter.js';

export {
  StderrLoggerAdapter,
  createStderrLoggerAdapter,
} from './stderr-logger.adapter.js';

export { NoopLoggerAdapter } from './noop-logger.adapter.js';
