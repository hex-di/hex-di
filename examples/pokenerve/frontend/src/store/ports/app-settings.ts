/**
 * App settings atom port.
 *
 * Holds application-wide preferences (theme, brain view, animations).
 *
 * @packageDocumentation
 */

import { createAtomPort } from "@hex-di/store";

interface AppSettings {
  readonly theme: "dark" | "light";
  readonly brainViewEnabled: boolean;
  readonly animationsEnabled: boolean;
}

const AppSettingsPort = createAtomPort<AppSettings>()({
  name: "AppSettings",
  description: "Application preferences",
  category: "store",
});

export { AppSettingsPort };
export type { AppSettings };
