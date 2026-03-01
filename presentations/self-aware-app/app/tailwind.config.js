/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        hex: {
          bg: "#020408",
          surface: "#08101C",
          "surface-light": "#0C1829",
          primary: "#00F0FF",
          "primary-light": "#5FFFFF",
          "primary-dark": "#008F99",
          accent: "#FF5E00",
          "accent-dark": "#CC4A00",
          text: "#DAE6F0",
          muted: "#586E85",
          green: "#A6E22E",
          pink: "#F92672",
          amber: "#FFB020",
          "amber-dark": "#CC8A00",
        },
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["Fira Code", "monospace"],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        scanline: "scanline 6s linear infinite",
        "spin-slow": "spin-slow 25s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotateX(0deg)" },
          "50%": { transform: "translateY(-10px) rotateX(2deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};
