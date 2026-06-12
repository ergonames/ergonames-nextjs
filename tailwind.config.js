/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand (constant across themes)
        ergo: { 400: "#FF7E64", 500: "#FF5638", 600: "#E8452B" }, // brand orange from Logo V4 masters
        mint: "#1EF79C",
        // Semantic — driven by CSS variables, switch with .dark
        page: "rgb(var(--page) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        body: "rgb(var(--body) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: { display: ["var(--font-display)", "system-ui", "sans-serif"], sans: ["var(--font-display)", "system-ui", "sans-serif"] },
      boxShadow: { soft: "0 12px 44px -18px rgba(0,0,0,0.22)" },
      keyframes: {
        "fade-up": { "0%": { opacity: 0, transform: "translateY(10px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        "scale-in": { "0%": { opacity: 0, transform: "scale(0.96)" }, "100%": { opacity: 1, transform: "scale(1)" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-5px)" } },
        "pulse-ring": { "0%": { boxShadow: "0 0 0 0 rgba(255,85,55,0.45)" }, "70%": { boxShadow: "0 0 0 12px rgba(255,85,55,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(255,85,55,0)" } },
        "bar": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.4s ease both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        floaty: "floaty 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
        bar: "bar 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};
