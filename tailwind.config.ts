import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:  {
          DEFAULT: "var(--navy)",
          mid:     "var(--navy-mid)",
          light:   "var(--navy-light)",
          glass:   "var(--navy-glass)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          bright:  "var(--gold-bright)",
          pale:    "var(--gold-pale)",
          muted:   "var(--gold-muted)",
        },
        cream: {
          DEFAULT: "var(--cream)",
          dark:    "var(--cream-dark)",
        },
        white: "var(--white)",
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
        border: "hsl(var(--ui-border))",
        input: "hsl(var(--ui-input))",
        ring: "hsl(var(--ui-ring))",
        background: "hsl(var(--ui-background))",
        foreground: "hsl(var(--ui-foreground))",
        primary: {
          DEFAULT: "hsl(var(--ui-primary))",
          foreground: "hsl(var(--ui-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--ui-secondary))",
          foreground: "hsl(var(--ui-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--ui-destructive))",
          foreground: "hsl(var(--ui-destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--ui-muted))",
          foreground: "hsl(var(--ui-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--ui-accent))",
          foreground: "hsl(var(--ui-accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--ui-popover))",
          foreground: "hsl(var(--ui-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--ui-card))",
          foreground: "hsl(var(--ui-card-foreground))",
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
