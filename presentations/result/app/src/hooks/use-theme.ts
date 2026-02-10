import { useEffect } from "react";
import { useAtom } from "@hex-di/store-react";
import { ThemeModeAtom, type ThemeMode } from "../ports/theme.port.js";

const STORAGE_KEY = "hex-di-presentation-theme";

export function useTheme(): {
  readonly mode: ThemeMode;
  setMode(mode: ThemeMode): void;
} {
  const [mode, setMode] = useAtom(ThemeModeAtom);

  // Persist theme changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable
    }
  }, [mode]);

  return { mode, setMode };
}
