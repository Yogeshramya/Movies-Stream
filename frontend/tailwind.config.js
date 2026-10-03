/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0c10",
        surface: "#12161f",
        "surface-hover": "#1b212e",
        "surface-border": "#252d3d",
        brand: {
          50: "#eef7ff",
          100: "#d9ecff",
          400: "#38bdf8",
          500: "#0284c7",
          600: "#0369a1",
          700: "#075985",
        },
        accent: {
          red: "#ef4444",
          amber: "#f59e0b",
          emerald: "#10b981",
          violet: "#8b5cf6",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 35px -5px rgba(56, 189, 248, 0.25)",
        "tv-focus": "0 0 0 4px #38bdf8, 0 0 30px 6px rgba(56, 189, 248, 0.4)",
      }
    },
  },
  plugins: [],
}
