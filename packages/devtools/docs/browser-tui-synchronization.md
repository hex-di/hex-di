# Browser/TUI Synchronization

This document describes the browser/TUI synchronization infrastructure implemented for HexDI DevTools.

## Overview

The synchronization system enables real-time state sharing between browser-based and terminal-based (TUI) DevTools clients. Multiple TUI clients can observe the same application simultaneously, with state changes propagating bidirectionally.

## Architecture

### Core Components

#### 1. State Broadcaster (`src/network/state-broadcaster.ts`)
Broadcasts state changes from the browser to TUI clients with intelligent debouncing:

- **Immediate Broadcasts**: Selection changes (graph node selection, service selection, etc.) are broadcast immediately for responsive UX
- **Debounced Broadcasts**: Filter and preference changes are debounced (default 300ms) to reduce message traffic
- **Configurable**: Debounce delay and verbosity are configurable

**Key Methods:**
- `broadcastImmediate(state, changes?)` - Broadcast immediately
- `broadcastDebounced(state, changes?)` - Broadcast with debouncing
- `broadcastSelection(state)` - Broadcast selection changes immediately
- `broadcastFilters(state)` - Broadcast filter changes with debouncing
- `flush()` - Flush pending debounced updates immediately
- `cancel()` - Cancel pending debounced updates

#### 2. State Receiver (`src/network/state-receiver.ts`)
Receives and applies state updates from remote clients with conflict resolution:

- **Conflict Resolution**: Configurable strategy (remote-wins, local-wins, merge)
- **Auto-Apply**: Can automatically apply updates or queue them for manual review
- **Timestamp-Based**: Ignores outdated updates using timestamps

**Key Methods:**
- `receive(params, localState)` - Receive and process state update
- `applyUpdate(params, localState)` - Apply update to local state
- `applyPendingUpdates(localState)` - Apply all queued updates
- `clearPendingUpdates()` - Clear queued updates

#### 3. Action Sync (`src/network/action-sync.ts`)
Manages bidirectional action synchronization:

- **Action Replay**: Tracks action history for replay on reconnection
- **Loop Prevention**: Ignores actions from self to prevent loops
- **Type-Safe**: Maps sync actions to DevToolsAction types

**Key Methods:**
- `sendAction(action)` - Send action to remote clients
- `receiveAction(params)` - Receive and apply remote action
- `replayActions(fromTimestamp)` - Replay actions from history
- `getHistory()` - Get action history
- `clearHistory()` - Clear action history

#### 4. Connection Manager (`src/network/connection-manager.ts`)
Manages WebSocket connections with auto-reconnection:

- **Auto-Reconnection**: Exponential backoff reconnection strategy
- **Connection Tracking**: Tracks connection state and duration
- **Event System**: Emits connection, disconnection, and error events
- **Timeout Handling**: Connection timeout with configurable duration

**Key Methods:**
- `connect()` - Connect to WebSocket server
- `disconnect(reason)` - Disconnect from server
- `send(data)` - Send message through WebSocket
- `on(listener)` - Add event listener
- `off(listener)` - Remove event listener
- `getState()` - Get current connection state
- `isConnected()` - Check if connected

## Protocol Extensions

The WebSocket protocol has been extended to support synchronization:

### New Methods

#### `devtools.syncState` (Notification)
Broadcast partial state updates to all connected clients.

**Parameters:**
```typescript
interface SyncStateParams {
  readonly graph?: {
    readonly selectedNodeId?: string | null;
    readonly highlightedNodeIds?: readonly string[];
    readonly zoom?: number;
    readonly panOffset?: { x: number; y: number };
  };
  readonly timeline?: {
    readonly filterText?: string;
    readonly grouping?: string;
    readonly sortOrder?: string;
    readonly sortDescending?: boolean;
  };
  readonly inspector?: {
    readonly filterText?: string;
    readonly selectedServicePortName?: string | null;
    readonly selectedScopeId?: string | null;
  };
  readonly panel?: {
    readonly activeTabId?: string;
    readonly isOpen?: boolean;
  };
  readonly timestamp: number;
  readonly priority?: "immediate" | "debounced";
}
```

#### `devtools.syncAction` (Notification)
Broadcast user actions to all connected clients.

**Parameters:**
```typescript
interface SyncActionParams {
  readonly action: {
    readonly type: string;
    readonly payload?: unknown;
  };
  readonly source: string;
  readonly timestamp: number;
}
```

#### `devtools.syncPreferences` (Notification)
Broadcast preference changes (filters, view settings).

**Parameters:**
```typescript
interface SyncPreferencesParams {
  readonly timeline?: {
    readonly filterText?: string;
    readonly grouping?: string;
    readonly sortOrder?: string;
    readonly showOnlyCacheHits?: boolean;
    readonly showOnlySlow?: boolean;
  };
  readonly inspector?: {
    readonly filterText?: string;
    readonly showDependencies?: boolean;
    readonly showDependents?: boolean;
  };
  readonly timestamp: number;
}
```

#### `devtools.getSyncStatus` (Request)
Get current synchronization status.

**Response:**
```typescript
interface GetSyncStatusResult {
  readonly isConnected: boolean;
  readonly clientCount: number;
  readonly lastSyncTimestamp: number;
  readonly connectedClients: readonly {
    readonly id: string;
    readonly role: "browser" | "tui";
    readonly connectedAt: number;
  }[];
}
```

## Usage Examples

### Browser-Side Setup

```typescript
import { StateBroadcaster, ConnectionManager } from "@hex-di/devtools";
import { createNotification, Methods } from "@hex-di/devtools-core";

// Set up connection
const connection = new ConnectionManager({
  url: "ws://localhost:9229/devtools",
  autoReconnect: true,
});

// Set up broadcaster
const broadcaster = new StateBroadcaster(
  (params) => {
    const notification = createNotification(Methods.SYNC_STATE, params);
    connection.send(JSON.stringify(notification));
  },
  { debounceDelayMs: 300 }
);

// Broadcast state changes
connection.on((event) => {
  if (event.type === "connected") {
    // Start broadcasting state
    broadcaster.broadcastImmediate(currentState);
  }
});

await connection.connect();
```

### TUI-Side Setup

```typescript
import { StateReceiver, ActionSync, ConnectionManager } from "@hex-di/devtools";

// Set up connection
const connection = new ConnectionManager({
  url: "ws://localhost:9229/devtools",
  autoReconnect: true,
});

// Set up receiver
const receiver = new StateReceiver(
  (action) => dispatch(action),
  { autoApply: true, defaultResolution: "remote-wins" }
);

// Set up action sync
const actionSync = new ActionSync(
  (params) => {
    const notification = createNotification(Methods.SYNC_ACTION, params);
    connection.send(JSON.stringify(notification));
  },
  (action) => dispatch(action),
  { clientId: "tui-1" }
);

// Handle incoming messages
connection.on((event) => {
  if (event.type === "message") {
    const message = JSON.parse(event.data);

    if (message.method === Methods.SYNC_STATE) {
      receiver.receive(message.params, currentState);
    } else if (message.method === Methods.SYNC_ACTION) {
      actionSync.receiveAction(message.params);
    }
  }
});

await connection.connect();
```

## State Synchronization Strategy

### Immediate Sync (No Debouncing)
- Graph node selection
- Service selection
- Scope selection
- Trace selection
- Tab changes

### Debounced Sync (300ms default)
- Filter text changes
- Grouping/sorting changes
- Zoom/pan changes
- Toggle states

### Conflict Resolution
When local and remote states conflict:

1. **Data State**: Remote wins (graph structure, traces, etc.)
2. **UI Preferences**: Local wins (zoom, pan offset, etc.)
3. **Selections**: Remote wins (node selection, service selection, etc.)

## Connection Management

### Auto-Reconnection
- Initial delay: 1000ms
- Max delay: 30000ms
- Backoff multiplier: 2x
- Infinite retry by default

### Connection States
- `disconnected` - Not connected
- `connecting` - Connection in progress
- `connected` - Connected and ready
- `reconnecting` - Attempting to reconnect
- `error` - Error occurred

### Reconnection Strategy
1. Connection lost
2. Wait initial delay (1s)
3. Attempt reconnection
4. If failed, double the delay (2s, 4s, 8s, ...)
5. Cap at max delay (30s)
6. Repeat until connected

## Testing

Comprehensive test suite covering:

1. **State Broadcasting**: Immediate and debounced broadcasts
2. **Bidirectional Action Sync**: Send/receive actions, loop prevention
3. **Selection Sync**: Immediate propagation
4. **Filter Sync**: Debounced propagation
5. **Connection Management**: Status tracking, events
6. **Multi-Client Support**: Multiple observers

Run tests:
```bash
pnpm --filter @hex-di/devtools test tests/sync/browser-tui-sync.test.ts
```

## Future Enhancements

1. **State Compression**: Compress large state updates for network efficiency
2. **Delta Updates**: Send only changed fields instead of full state
3. **Conflict Resolution UI**: Show conflicts in UI and let user choose
4. **Client Roles**: Different sync behavior for observer vs controller roles
5. **Rate Limiting**: Protect against message flooding
6. **Offline Queue**: Queue actions when disconnected, replay on reconnect
7. **End-to-End Encryption**: Secure sensitive data in transit

## Performance Considerations

- **Debouncing**: Reduces message traffic by 80-90% for filter changes
- **Priority System**: Critical updates (selections) bypass debouncing
- **Timestamp Validation**: Prevents processing of stale updates
- **Action History Limit**: Caps at 100 actions to prevent memory issues
- **Connection Pooling**: Reuses WebSocket connections

## Security Considerations

- Validate all incoming messages
- Sanitize action payloads
- Rate limit message handling
- Implement authentication for production use
- Consider TLS for encrypted transport
