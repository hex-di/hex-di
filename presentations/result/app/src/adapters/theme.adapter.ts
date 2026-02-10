import { createAtomAdapter } from "@hex-di/store";
import { ThemeModeAtom, type ThemeMode } from "../ports/theme.port.js";

const STORAGE_KEY = "hex-di-presentation-theme";

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "mixed") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "mixed";
}

export const themeAdapter = createAtomAdapter({
  provides: ThemeModeAtom,
  initial: readStoredMode(),
  lifetime: "singleton",
});
