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
        // Ergo-branded palette
        ergo: {
          400: "#FF7E63",
          500: "#FF5537", // primary orange (Figma)
          600: "#E8442A",
        },
        mint: "#1EF79C", // success / accent
        ink: {
          950: "#0D0F19", // page background (Figma navy)
          900: "#11131F",
          850: "#161A28",
          800: "#1C2133", // elevated surface
          700: "#27304A", // borders
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "ergo-glow":
          "radial-gradient(60% 50% at 50% 0%, rgba(255,85,55,0.18) 0%, rgba(255,85,55,0) 70%)",
        "ergo-gradient": "linear-gradient(135deg, #FF7A45 0%, #FF5C19 100%)",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(255,85,55,0.45)",
        card: "0 8px 40px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
