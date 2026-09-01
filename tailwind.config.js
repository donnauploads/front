/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
      borderRadius: {
        '2xl': '0.5rem',
      },
    },
    extend: {
      colors: {
        // State Bank Bank — PRD palette
        // Primary deep emerald + accent green
        "brand-deep": "#1A4D3E",
        // Vivid mid-emerald — matches the brand swatch. Drives `bg-fern`
        // everywhere it's used directly (buttons, toggles, pills, etc.).
        fern: "#1fef2d",

        // Surfaces — driven by CSS variables defined in globals.css so
        // the same `bg-flush` class works in both dark and light themes.
        // The literal hex values are the dark-mode defaults; light-mode
        // values swap via `html.light` in globals.css.
        flush: "rgb(var(--color-flush) / <alpha-value>)",
        kale: "rgb(var(--color-kale) / <alpha-value>)",
        dollar: "#1F8F5F",    // brand mid
        highlight: "#3CCD88", // hover accent
        mint: "#D6F2E2",      // tertiary bg, chip
        lettuce: "#ffffff",   // light section bg
        pebble: "#D0D3D6",    // borders on light
        shade: "#333333",     // text on light
        scrim: "#303030",

        // semantic aliases used by components
        bg: {
          DEFAULT: "#0A1F1A",
          deep: "#0A1F1A",
          panel: "#1A4D3E",
          card: "#1A4D3E",
          soft: "#F8F8F5",
        },
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          muted: "rgb(var(--color-ink-muted) / <alpha-value>)",
          dim: "#5E8773",
          dark: "#1A4D3E",
        },
        brand: {
          // Same vivid mid-emerald as `fern` so the Button component's
          // `bg-brand` primary variant matches every other green button.
          DEFAULT: "#059f40",
          // Slightly lifted for hover so the button still gives visual
          // feedback. Picked to read brighter without going neon.
          bright: "#3FD685",
          deep: "#1A4D3E",
          // Darker text on the brighter fill so it stays readable.
          ink: "#0A1F1A",
        },
        accent: {
          mint: "#D6F2E2",
          lettuce: "#EEF8F1",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "0.125rem",
        sm: "0.25rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 80px -10px rgba(43, 182, 115, 0.35)",
        card: "0 30px 80px -30px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        // Chime-style dark-green radial composite, retuned to State Bank palette — desktop
        "chime-hero": [
          "radial-gradient(62% 77% at -10% 108%, #1f6a4d 0%, #0a1f1a00 100%)",
          "radial-gradient(62% 57% at 131% 74%, #1f6a4df5 0%, #1f6a4d1c 79%, #0a1f1a00 99%)",
          "radial-gradient(11% 15% at 82% 80%, #1f6a4d17 0%, #0a1f1a00 99%)",
          "linear-gradient(207deg, #1f6a4df5 1%, #0a1f1a00 56%)",
        ].join(", "),
        "chime-hero-mobile": [
          "radial-gradient(70% 59% at 100% 14%, #1f6a4d 0%, #1f6a4dd4 23%, #2bb67300 100%)",
          "radial-gradient(51% 63% at 90% 115%, #0e2920 0%, #0e2920 25%, #2bb67300 100%)",
          "radial-gradient(84% 55% at 3% -17%, #0e2920 0%, #0e2920 41%, #2bb67300 100%)",
          "radial-gradient(72% 58% at -2% 83%, #1f6a4d 0%, #1f6a4dd4 23%, #2bb67300 100%)",
          "radial-gradient(88% 57% at 50% 49%, #1f6a4dab 0%, #2bb67300 100%)",
        ].join(", "),
        "chime-split": [
          "radial-gradient(70% 60% at 0% 0%, #1f6a4dab 0%, #2bb67300 100%)",
          "radial-gradient(70% 60% at 100% 100%, #1f6a4dab 0%, #2bb67300 100%)",
        ].join(", "),
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fold-rotate": {
          "0%": { transform: "rotate(0deg) scale(1.2)" },
          "100%": { transform: "rotate(360deg) scale(1.2)" },
        },
        "fold-rotate-rev": {
          "0%": { transform: "rotate(0deg) scale(1.4)" },
          "100%": { transform: "rotate(-360deg) scale(1.4)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        float: "float 6s ease-in-out infinite",
        "fold-rotate": "fold-rotate 40s linear infinite",
        "fold-rotate-rev": "fold-rotate-rev 55s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
}
