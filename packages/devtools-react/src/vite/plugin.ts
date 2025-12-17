/**
 * Vite Plugin for HexDI DevTools
 *
 * Main plugin implementation that integrates DevTools with Vite.
 *
 * @packageDocumentation
 */

import type { Plugin, ViteDevServer, ResolvedConfig as ViteResolvedConfig } from 'vite';
import type { HexDIDevToolsOptions, ResolvedConfig } from './types.js';
import { RelayServer, createRelayServer, resolveRelayConfig } from './auto-relay.js';
import { createDevToolsMiddleware, createCorsMiddleware } from './middleware.js';
import {
  VIRTUAL_MODULE_ID,
  RESOLVED_VIRTUAL_MODULE_ID,
  generateClientModule,
  transformHtml,
} from './virtual-module.js';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_OPTIONS: HexDIDevToolsOptions = {
  relay: {
    enabled: true,
    port: 47100,
    host: '127.0.0.1',
  },
  overlay: {
    enabled: true,
    position: 'bottom-right',
    hotkey: 'ctrl+shift+d',
    defaultOpen: false,
  },
  autoInject: true,
  open: false,
  includeInProduction: false,
};

// =============================================================================
// Configuration Resolution
// =============================================================================

/**
 * Resolves plugin options with defaults.
 *
 * @param options - User-provided options
 * @returns Resolved configuration with all defaults applied
 */
function resolveOptions(options: HexDIDevToolsOptions): ResolvedConfig {
  return {
    relay: resolveRelayConfig(options.relay),
    overlay: {
      enabled: options.overlay?.enabled ?? DEFAULT_OPTIONS.overlay?.enabled ?? true,
      position: options.overlay?.position ?? DEFAULT_OPTIONS.overlay?.position ?? 'bottom-right',
      hotkey: options.overlay?.hotkey ?? DEFAULT_OPTIONS.overlay?.hotkey ?? 'ctrl+shift+d',
      defaultOpen: options.overlay?.defaultOpen ?? DEFAULT_OPTIONS.overlay?.defaultOpen ?? false,
    },
    autoInject: options.autoInject ?? DEFAULT_OPTIONS.autoInject ?? true,
    open: options.open ?? DEFAULT_OPTIONS.open ?? false,
    includeInProduction: options.includeInProduction ?? DEFAULT_OPTIONS.includeInProduction ?? false,
  };
}

// =============================================================================
// Plugin Implementation
// =============================================================================

/**
 * Creates the HexDI DevTools Vite plugin.
 *
 * This plugin provides:
 * - Auto-start relay server for browser apps
 * - DevTools panel overlay injection
 * - Virtual module for client-side DevTools
 * - Dev server middleware for DevTools API
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin object
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { hexDIDevTools } from '@hex-di/devtools-react/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     hexDIDevTools({
 *       relay: {
 *         enabled: true,
 *         port: 47100,
 *       },
 *       overlay: {
 *         enabled: true,
 *         position: 'bottom-right',
 *         hotkey: 'ctrl+shift+d',
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export function hexDIDevTools(options: HexDIDevToolsOptions = {}): Plugin {
  const config = resolveOptions(options);
  let relayServer: RelayServer | null = null;
  let viteConfig: ViteResolvedConfig;
  let isDev = false;

  return {
    name: 'hex-di-devtools',

    /**
     * Store Vite config for later use.
     */
    configResolved(resolved) {
      viteConfig = resolved;
      isDev = resolved.command === 'serve';
    },

    /**
     * Configure the dev server with middleware and relay.
     */
    configureServer(server: ViteDevServer) {
      // Skip in production builds
      if (!isDev && !config.includeInProduction) {
        return;
      }

      // Start relay server if enabled
      if (config.relay.enabled) {
        relayServer = createRelayServer(config.relay);
        relayServer.start().catch((err: Error) => {
          console.error('[HexDI DevTools] Failed to start relay server:', err.message);
        });
      }

      // Add CORS middleware first
      server.middlewares.use(createCorsMiddleware());

      // Add DevTools API middleware
      const relayUrl = relayServer?.getUrl() ?? null;
      server.middlewares.use(createDevToolsMiddleware(config, relayUrl));

      // Log startup info
      const relayInfo = relayServer
        ? `Relay: ${relayServer.getUrl()}`
        : 'Relay: disabled';
      console.log(`[HexDI DevTools] Plugin initialized | ${relayInfo}`);
    },

    /**
     * Resolve virtual module IDs.
     */
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      return null;
    },

    /**
     * Load virtual module content.
     */
    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        // Skip in production if not enabled
        if (!isDev && !config.includeInProduction) {
          return '// HexDI DevTools disabled in production';
        }

        const relayUrl = relayServer?.getUrl() ?? `ws://127.0.0.1:${config.relay.port}`;
        return generateClientModule(config, relayUrl);
      }
      return null;
    },

    /**
     * Transform HTML to inject DevTools.
     */
    transformIndexHtml(html) {
      // Skip in production if not enabled
      if (!isDev && !config.includeInProduction) {
        return html;
      }

      return transformHtml(html, config);
    },

    /**
     * Cleanup when server closes.
     */
    buildEnd() {
      if (relayServer) {
        relayServer.stop().catch((err: Error) => {
          console.error('[HexDI DevTools] Error stopping relay server:', err.message);
        });
        relayServer = null;
      }
    },
  };
}
