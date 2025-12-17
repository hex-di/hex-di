/**
 * DevTools Middleware for Vite Dev Server
 *
 * Provides API endpoints for DevTools communication.
 *
 * @packageDocumentation
 */

import type { Connect } from 'vite';
import type { ResolvedConfig } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * DevTools API response.
 */
interface DevToolsApiResponse {
  readonly version: string;
  readonly relayUrl: string | null;
  readonly features: readonly string[];
}

// =============================================================================
// Middleware Implementation
// =============================================================================

/**
 * Creates the DevTools middleware for the Vite dev server.
 *
 * The middleware provides:
 * - `/hex-di-devtools/api/info` - DevTools server info
 * - `/hex-di-devtools/api/health` - Health check endpoint
 * - `/hex-di-devtools/client.js` - Client-side script
 *
 * @param config - Resolved plugin configuration
 * @param relayUrl - URL of the relay server if running
 * @returns Connect-style middleware
 */
export function createDevToolsMiddleware(
  config: ResolvedConfig,
  relayUrl: string | null
): Connect.NextHandleFunction {
  const apiResponse: DevToolsApiResponse = {
    version: '0.1.0',
    relayUrl,
    features: [
      'graph-export',
      'tracing',
      'snapshot',
      config.relay.enabled ? 'relay' : null,
      config.overlay.enabled ? 'overlay' : null,
    ].filter((f): f is string => f !== null),
  };

  return (req, res, next) => {
    const url = req.url ?? '';

    // API: Info endpoint
    if (url === '/hex-di-devtools/api/info' || url === '/hex-di-devtools/api/info/') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify(apiResponse));
      return;
    }

    // API: Health check
    if (url === '/hex-di-devtools/api/health' || url === '/hex-di-devtools/api/health/') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Pass to next middleware
    next();
  };
}

/**
 * Creates CORS middleware for DevTools endpoints.
 *
 * @returns Connect-style middleware
 */
export function createCorsMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';

    // Add CORS headers for DevTools endpoints
    if (url.startsWith('/hex-di-devtools/')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
    }

    next();
  };
}
