import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Aviation HUD palette
        bg: {
          0: "#03060B", // deep black w/ blue tint
          1: "#070C16",
          2: "#0B121F",
          3: "#0F1828",
        },
        ink: {
          0: "#F4F7FB",
          1: "#C8D3E3",
          2: "#8A9AB3",
          3: "#5A6A82",
        },
        line: {
          DEFAULT: "rgba(140, 180, 230, 0.10)",
          strong: "rgba(140, 180, 230, 0.22)",
        },
        cyan: {
          400: "#22D3EE",
          500: "#00D4FF",
          600: "#0BA9D6",
        },
        signal: {
          orange: "#F97316",
          green: "#10B981",
          amber: "#F59E0B",
          red: "#EF4444",
          violet: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,212,255,0.35), 0 0 24px rgba(0,212,255,0.25)",
        "glow-orange":
          "0 0 0 1px rgba(249,115,22,0.45), 0 0 24px rgba(249,115,22,0.30)",
        panel:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.45)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(140,180,230,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(140,180,230,0.06) 1px, transparent 1px)",
        radar:
          "radial-gradient(circle at center, rgba(0,212,255,0.18), transparent 60%)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        ping2: {
          "0%": { transform: "scale(1)", opacity: "0.9" },
          "80%, 100%": { transform: "scale(2.5)", opacity: "0" },
        },
        glow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(0,212,255,0.5)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0,212,255,0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        scan: "scan 4s linear infinite",
        ping2: "ping2 2.2s cubic-bezier(0,0,0.2,1) infinite",
        glow: "glow 2.4s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
