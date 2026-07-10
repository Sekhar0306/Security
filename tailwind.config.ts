import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0F1720",
        surface: "#16212C",
        surfaceAlt: "#1C2A37",
        border: "#28394A",
        ink: "#E8ECEF",
        muted: "#8B98A5",
        accent: "#6366F1",
        safe: "#2DD4BF",
        low: "#64B5F6",
        medium: "#E8A33D",
        high: "#F0654A",
        critical: "#E5484D",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
