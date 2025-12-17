# HexDI DevTools Architecture Refactor Tasks

## Phase 1: Fix Resource Leaks

- [x] Task 1.1: Fix TUI Container Resource Leak
  - Modified `packages/devtools-tui/src/app/client.ts` to return both client and dispose function
  - Added `DevToolsClientResult` interface with `client` and `dispose` properties
  - Updated `createDevToolsClient` to create container and return proper cleanup
  - Updated CLI (`packages/devtools-tui/src/cli/index.ts`) to use new API
  - Updated exports in `app/index.ts` and `index.ts`

- [x] Task 1.2: Fix MCP Server Hidden Global State
  - Converted `createRemoteDataGetter` function to `RemoteDataGetter` class
  - Added `DisposableDataGetter` interface extending `DataGetter` with `dispose()` method
  - Class properly stores `container` reference for disposal
  - Added `dispose()` method to `HexDIMcpServer` for cleanup
  - Updated `createDataGetter()` to return both `dataGetter` and `disposable` references

## Phase 2: Consolidate Port Definitions

- [x] Task 2.1: Move PresenterDataSourcePort to devtools-core
  - Created `packages/devtools-core/src/ports/presenter-data-source.port.ts` with sync presenter contract
  - Updated `packages/devtools-core/src/ports/index.ts` to export new port
  - Updated `packages/devtools-core/src/index.ts` to export presenter port types
  - Updated `packages/devtools-ui/src/data-source/data-source.port.ts` to re-export from devtools-core with deprecation notice
  - Updated all presenters in `packages/devtools-ui/src/presenters/*.ts` to import from `@hex-di/devtools-core`

- [x] Task 2.2: Move WebSocketPort to devtools-core
  - Created `packages/devtools-core/src/ports/websocket.port.ts` with WebSocket types
  - Updated `packages/devtools-core/src/ports/index.ts` to export WebSocket port
  - Updated `packages/devtools-core/src/index.ts` to export WebSocket types
  - Updated `packages/devtools-network/src/client/ports/websocket.port.ts` to re-export from devtools-core with deprecation notice
  - Updated adapters in `packages/devtools-network/src/client/adapters/*.ts` to import from `@hex-di/devtools-core`

## Verification

- [x] `pnpm --filter @hex-di/devtools-tui build` - Passes
- [x] `pnpm --filter @hex-di/devtools-mcp build` - Passes
- [x] `pnpm --filter @hex-di/devtools-core build` - Passes
- [x] `pnpm --filter @hex-di/devtools-ui build` - Passes
- [x] `pnpm --filter @hex-di/devtools-network build` - Passes
