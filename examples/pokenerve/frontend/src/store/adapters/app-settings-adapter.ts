/**
 * App settings atom adapter.
 *
 * @packageDocumentation
 */

import { createAtomAdapter } from "@hex-di/store";
import { AppSettingsPort } from "../ports/app-settings.js";

const appSettingsAdapter = createAtomAdapter({
  provides: AppSettingsPort,
  lifetime: "singleton",
  initial: {
    theme: "dark" as const,
    brainViewEnabled: false,
    animationsEnabled: true,
  },
});

export { appSettingsAdapter };
