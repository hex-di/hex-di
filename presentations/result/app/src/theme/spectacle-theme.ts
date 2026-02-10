/**
 * Spectacle theme mapped from the presentation design tokens.
 *
 * These values mirror the CSS custom properties in tokens.css,
 * but expressed in Spectacle's theme format so that Spectacle's
 * built-in components (Heading, Text, etc.) pick them up if used.
 */
export const spectacleTheme = {
  colors: {
    primary: "#7a00e6",
    secondary: "#3c217b",
    tertiary: "#171717",
  },
  fonts: {
    header: '"Work Sans", "Raleway", sans-serif',
    text: '"Work Sans", "Raleway", sans-serif',
    monospace: '"JetBrains Mono", "Fira Code", monospace',
  },
  fontSizes: {
    h1: "3rem",
    h2: "2rem",
    text: "1.125rem",
  },
};

/**
 * Default slide transition for the Deck.
 *
 * Smooth directional slide with fade.
 */
export const defaultTransition = {
  from: { opacity: 0, transform: "translateX(30%)" },
  enter: { opacity: 1, transform: "translateX(0)" },
  leave: { opacity: 0, transform: "translateX(-30%)" },
};
