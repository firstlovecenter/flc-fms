import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:  {
          DEFAULT: "#0A1628",
          mid:     "#132040",
          light:   "#1C3058",
        },
        gold: {
          DEFAULT: "#C8A35A",
          bright:  "#E2B96A",
          pale:    "#F5EAD0",
          muted:   "#8A6D35",
        },
        cream: {
          DEFAULT: "#F9F6F0",
          dark:    "#F1EBE0",
        },
        brand: {
          50:  "#F5EAD0",
          100: "#E2B96A",
          200: "#C8A35A",
          500: "#C8A35A",
          600: "#A8862A",
          700: "#0A1628",
          800: "#132040",
          900: "#080F1A",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        sans:    ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm:  "8px",
        md:  "14px",
        lg:  "20px",
        xl:  "28px",
      },
      boxShadow: {
        xs:   "0 1px 2px rgba(10,22,40,0.05)",
        sm:   "0 1px 4px rgba(10,22,40,0.07), 0 2px 8px rgba(10,22,40,0.04)",
        md:   "0 4px 16px rgba(10,22,40,0.09), 0 2px 6px rgba(10,22,40,0.05)",
        lg:   "0 12px 40px rgba(10,22,40,0.13), 0 4px 14px rgba(10,22,40,0.07)",
        xl:   "0 24px 64px rgba(10,22,40,0.18), 0 8px 24px rgba(10,22,40,0.10)",
        gold: "0 0 0 3px rgba(200,163,90,0.28), 0 0 20px rgba(200,163,90,0.12)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
