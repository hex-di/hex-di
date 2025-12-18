/**
 * Data source exports for @hex-di/devtools.
 *
 * @packageDocumentation
 */

// DataSource interface
export type {
  DataSource,
  DataSourceConnectionState,
  DataSourceEvent,
  DataSourceListener,
} from "./data-source.js";

// LocalDataSource for same-process access
export { LocalDataSource } from "./local-data-source.js";

// RemoteDataSource for WebSocket access
export {
  RemoteDataSource,
  type RemoteDataSourceOptions,
  type WebSocketLike,
} from "./remote-data-source.js";
