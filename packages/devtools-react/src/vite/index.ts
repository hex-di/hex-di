/**
 * Vite Plugin for HexDI DevTools (part of @hex-di/devtools-react)
 *
 * Auto-inject HexDI DevTools into your Vite application with:
 * - Auto-start relay server for browser apps
 * - DevTools panel overlay
 * - Virtual module for client-side integration
 *
 * ## Quick Start
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { hexDIDevTools } from '@hex-di/devtools-react/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     hexDIDevTools({
 *       // Auto-start relay server for browser apps
 *       relay: {
 *         enabled: true,
 *         port: 47100,
 *       },
 *       // DevTools panel overlay
 *       overlay: {
 *         enabled: true,
 *         position: 'bottom-right',
 *         hotkey: 'ctrl+shift+d',
 *       },
 *     }),
 *   ],
 * });
 * ```
 *
 * ## Configuration Options
 *
 * - `relay.enabled` - Enable relay server (default: true)
 * - `relay.port` - Relay server port (default: 47100)
 * - `relay.host` - Relay server host (default: '127.0.0.1')
 * - `overlay.enabled` - Enable DevTools overlay (default: true)
 * - `overlay.position` - Overlay button position (default: 'bottom-right')
 * - `overlay.hotkey` - Keyboard shortcut (default: 'ctrl+shift+d')
 * - `autoInject` - Auto-inject client script (default: true)
 * - `includeInProduction` - Include in production builds (default: false)
 *
 * @packageDocumentation
 */

// =============================================================================
// Main Plugin Export
// =============================================================================

export { hexDIDevTools } from './plugin.js';

// =============================================================================
// Type Exports
// =============================================================================

export type {
  HexDIDevToolsOptions,
  RelayConfig,
  OverlayConfig,
  ResolvedConfig,
  ClientInfo,
  RelayState,
} from './types.js';

// =============================================================================
// Utilities (for advanced usage)
// =============================================================================

export {
  RelayServer,
  createRelayServer,
  resolveRelayConfig,
} from './auto-relay.js';

export {
  createDevToolsMiddleware,
  createCorsMiddleware,
} from './middleware.js';

export {
  VIRTUAL_MODULE_ID,
  RESOLVED_VIRTUAL_MODULE_ID,
  generateClientModule,
  generateHtmlSnippet,
  transformHtml,
} from './virtual-module.js';
