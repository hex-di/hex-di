/**
 * Embed Mode Detector
 *
 * Checks whether the playground is running in embed mode by
 * inspecting the `?embed=true` query parameter.
 *
 * @packageDocumentation
 */

/**
 * Returns true if the current URL has `?embed=true` query parameter.
 *
 * Safely returns false if `window` or `location` are not available
 * (e.g., during SSR or testing without jsdom).
 */
export function isEmbedMode(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("embed") === "true";
  } catch {
    return false;
  }
}

/**
 * Parsed embed mode query parameters.
 */
export interface EmbedOptions {
  /** Whether embed mode is active. */
  readonly embed: boolean;
  /** Forced theme (light or dark). Undefined means use system preference. */
  readonly theme: "light" | "dark" | undefined;
  /** Which panel to show initially. */
  readonly panel: string | undefined;
  /** Whether to auto-run code on load. */
  readonly autorun: boolean;
  /** Whether the editor is read-only. */
  readonly readonly: boolean;
  /** Console visibility. */
  readonly console: "show" | "hide";
}

/**
 * Parse embed-related query parameters from the current URL.
 */
export function parseEmbedOptions(): EmbedOptions {
  try {
    const params = new URLSearchParams(window.location.search);

    const themeParam = params.get("theme");
    const theme = themeParam === "light" || themeParam === "dark" ? themeParam : undefined;

    const consoleParam = params.get("console");
    const consoleVisibility: "show" | "hide" = consoleParam === "show" ? "show" : "hide";

    return {
      embed: params.get("embed") === "true",
      theme,
      panel: params.get("panel") ?? undefined,
      autorun: params.get("autorun") === "true",
      readonly: params.get("readonly") === "true",
      console: consoleVisibility,
    };
  } catch {
    return {
      embed: false,
      theme: undefined,
      panel: undefined,
      autorun: false,
      readonly: false,
      console: "hide",
    };
  }
}
