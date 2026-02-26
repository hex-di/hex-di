export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        auth: {
          bg: "#060210",
          surface: "#0E0A20",
          "surface-light": "#181230",
          primary: "#A78BFA",
          "primary-light": "#C4B5FD",
          "primary-dark": "#7C3AED",
          accent: "#F59E0B",
          "accent-dark": "#D97706",
          text: "#E8E0F0",
          muted: "#6B6085",
          green: "#34D399",
          pink: "#F472B6",
          red: "#EF4444",
          teal: "#2DD4BF",
          blue: "#60A5FA",
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
