/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    screens: {
      xs:    "360px",
      sm:    "480px",
      md:    "768px",
      lg:    "1024px",
      xl:    "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0f0f10",
          1: "#1a1a1d",
          2: "#242428",
          3: "#2e2e33",
          4: "#38383f",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong:  "rgba(255,255,255,0.14)",
        },
        accent: {
          DEFAULT: "#7c6af7",
          hover:   "#6b59e6",
          muted:   "rgba(124,106,247,0.15)",
          glow:    "rgba(124,106,247,0.35)",
        },
        text: {
          primary:   "#f0f0f2",
          secondary: "#9898a6",
          muted:     "#5c5c6b",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-14px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(14px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0" },
        },
        pulse: {
          "0%, 100%": { transform: "scale(1)",   opacity: "0.6" },
          "50%":       { transform: "scale(1.4)", opacity: "1"   },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "bounce-in": {
          "0%":   { transform: "scale(0.85)", opacity: "0" },
          "60%":  { transform: "scale(1.04)", opacity: "1" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.2s ease-out forwards",
        "slide-in-left":  "slide-in-left 0.2s ease-out forwards",
        "slide-in-right": "slide-in-right 0.2s ease-out forwards",
        blink:            "blink 1s ease-in-out infinite",
        pulse:            "pulse 1.4s ease-in-out infinite",
        shimmer:          "shimmer 2s linear infinite",
        "spin-slow":      "spin-slow 2s linear infinite",
        "bounce-in":      "bounce-in 0.3s ease-out forwards",
      },
      boxShadow: {
        glow:         "0 0 20px rgba(124,106,247,0.25), 0 0 60px rgba(124,106,247,0.1)",
        "glow-sm":    "0 0 10px rgba(124,106,247,0.2)",
        card:         "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3)",
        float:        "0 8px 32px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};