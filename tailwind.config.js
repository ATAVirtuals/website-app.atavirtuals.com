/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: "class",
  daisyui: {
    themes: [
      {
        dark: {
          // Modern colors with vibrant accents
          primary: "#6366f1", // Indigo
          "primary-content": "#ffffff",

          // Secondary color - complementary to primary
          secondary: "#10b981", // Emerald
          "secondary-content": "#ffffff",

          // Accent color for highlights
          accent: "#f43f5e", // Rose
          "accent-content": "#ffffff",

          // Rich dark backgrounds with subtle gradation
          "base-100": "#0f172a", // Slate 900
          "base-200": "#1e293b", // Slate 800
          "base-300": "#0f172a", // Slate 900
          "base-content": "#f8fafc", // Slate 50

          // Neutral tones for subtle elements
          neutral: "#334155", // Slate 700
          "neutral-content": "#f8fafc", // Slate 50

          // Status colors with a modern feel
          info: "#3b82f6", // Blue 500
          success: "#22c55e", // Green 500
          warning: "#eab308", // Yellow 500
          error: "#ef4444", // Red 500

          // More subtle rounded corners for a modern look
          "--rounded-btn": "0.5rem",
          "--rounded-box": "1rem",
          "--rounded-badge": "0.5rem",

          // Card and button styling
          "--padding-card": "2rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-focus-scale": "0.98",
          "--border-btn": "1px",
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",

          // Enhanced tooltip styling
          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },

          // Link styling
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
