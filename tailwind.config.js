/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ergo: { 400: "#FF7E63", 500: "#FF5537", 600: "#E8442A" }, // primary orange
        ink: "#040404",        // header / primary text
        body: "#3D3D3D",       // body text
        muted: "#5D7789",      // labels / secondary
        page: "#F2F2F2",       // page background
        line: "#E6E6E6",       // borders
        availbg: "#C8F9E2",    // available pill bg
        availfg: "#0F7C4E",    // available pill text
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: { "2.5xl": "1.25rem", "4xl": "2rem" },
      boxShadow: { soft: "0 10px 40px -16px rgba(0,0,0,0.18)" },
      keyframes: { floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-5px)" } } },
      animation: { floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
