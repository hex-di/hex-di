/**
 * Virtual Module for Client-Side DevTools
 *
 * Provides virtual module resolution for injecting DevTools into the client.
 *
 * @packageDocumentation
 */

import type { ResolvedConfig, OverlayConfig } from "./types.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Virtual module ID for the DevTools client.
 */
export const VIRTUAL_MODULE_ID = "virtual:hex-di-devtools-client";

/**
 * Resolved virtual module ID (with null byte prefix).
 */
export const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

// =============================================================================
// Module Generation
// =============================================================================

/**
 * Generates the client-side DevTools script.
 *
 * @param config - Resolved plugin configuration
 * @param relayUrl - URL of the relay server
 * @returns JavaScript module code
 */
export function generateClientModule(config: ResolvedConfig, relayUrl: string): string {
  const overlayConfig = config.overlay;

  return `
// HexDI DevTools Client - Auto-generated
// Do not edit manually

const DEVTOOLS_CONFIG = ${JSON.stringify(
    {
      relayUrl,
      overlay: overlayConfig,
    },
    null,
    2
  )};

// Initialize DevTools connection
async function initDevTools() {
  console.log('[HexDI DevTools] Initializing client...');

  try {
    // Check if relay is available
    const relayUrl = DEVTOOLS_CONFIG.relayUrl;
    if (!relayUrl) {
      console.warn('[HexDI DevTools] No relay URL configured');
      return;
    }

    console.log('[HexDI DevTools] Connecting to relay:', relayUrl);

    // Note: In a full implementation, this would:
    // 1. Import DevToolsFloating from @hex-di/devtools-react
    // 2. Create a relay data source
    // 3. Render the floating DevTools panel

    // For now, just log that we're ready
    console.log('[HexDI DevTools] Client ready');

    // Dispatch event for other scripts
    window.dispatchEvent(new CustomEvent('hexdi:devtools:ready', {
      detail: { relayUrl }
    }));

  } catch (error) {
    console.error('[HexDI DevTools] Initialization error:', error);
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDevTools);
} else {
  initDevTools();
}

// Export for programmatic access
export const devtoolsConfig = DEVTOOLS_CONFIG;
export { initDevTools };
`;
}

/**
 * Generates the HTML snippet for injecting DevTools.
 *
 * @param overlayConfig - Overlay configuration
 * @returns HTML script tag
 */
export function generateHtmlSnippet(_overlayConfig: Required<OverlayConfig>): string {
  return `
<!-- HexDI DevTools -->
<script type="module">
  import '${VIRTUAL_MODULE_ID}';
</script>
`;
}

/**
 * Transforms index.html to inject DevTools.
 *
 * @param html - Original HTML content
 * @param config - Resolved plugin configuration
 * @returns Transformed HTML content
 */
export function transformHtml(html: string, config: ResolvedConfig): string {
  if (!config.autoInject || !config.overlay.enabled) {
    return html;
  }

  const snippet = generateHtmlSnippet(config.overlay);

  // Insert before closing </body> tag
  return html.replace("</body>", `${snippet}</body>`);
}
