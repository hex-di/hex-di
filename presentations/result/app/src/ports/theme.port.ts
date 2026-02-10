import { createAtomPort } from "@hex-di/store";

export type ThemeMode = "light" | "dark" | "mixed";

export const ThemeModeAtom = createAtomPort<ThemeMode>()({
  name: "ThemeMode",
  description: "Presentation theme mode (mixed follows slide defaults, light/dark overrides)",
  category: "presentation",
});
