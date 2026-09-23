import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--canvas))",
        foreground: "hsl(var(--ink))",
        canvas: "hsl(var(--canvas))",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",
        "surface-3": "hsl(var(--surface-3))",
        border: "hsl(var(--border))",
        ink: "hsl(var(--ink))",
        "ink-2": "hsl(var(--ink-2))",
        muted: "hsl(var(--muted))",
        cobalt: "hsl(var(--cobalt))",
        amber: "hsl(var(--amber))",
        mint: "hsl(var(--mint))",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        cinematic: "0 28px 90px rgba(0, 0, 0, .32)",
      },
    },
  },
  plugins: [],
};

export default config;
