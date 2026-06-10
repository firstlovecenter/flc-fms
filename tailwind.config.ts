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
          DEFAULT: "hsl(var(--navy-hsl) / <alpha-value>)",
          mid:     "hsl(var(--navy-mid-hsl) / <alpha-value>)",
          light:   "hsl(var(--navy-light-hsl) / <alpha-value>)",
          glass:   "var(--navy-glass)",
        },
        gold: {
          DEFAULT: "hsl(var(--gold-hsl) / <alpha-value>)",
          bright:  "hsl(var(--gold-bright-hsl) / <alpha-value>)",
          pale:    "hsl(var(--gold-pale-hsl) / <alpha-value>)",
          muted:   "hsl(var(--gold-muted-hsl) / <alpha-value>)",
        },
        // cream/white intentionally stay var()-based: dark mode maps them to
        // transparent / translucent panels, which channels can't express.
        cream: {
          DEFAULT: "var(--cream)",
          dark:    "var(--cream-dark)",
        },
        white: "var(--white)",
        success: "hsl(var(--success-hsl) / <alpha-value>)",
        warning: "hsl(var(--warning-hsl) / <alpha-value>)",
        danger:  "hsl(var(--danger-hsl) / <alpha-value>)",
        info:    "hsl(var(--info-hsl) / <alpha-value>)",
        // Per-domain accents (staff/admin surfaces)
        bookings:    "hsl(var(--accent-bookings) / <alpha-value>)",
        facilities:  "hsl(var(--accent-facilities) / <alpha-value>)",
        inventory:   "hsl(var(--accent-inventory) / <alpha-value>)",
        maintenance: "hsl(var(--accent-maintenance) / <alpha-value>)",
        events:      "hsl(var(--accent-events) / <alpha-value>)",
        finance:     "hsl(var(--accent-finance) / <alpha-value>)",
        duty:        "hsl(var(--accent-duty) / <alpha-value>)",
        sidebar: {
          DEFAULT:    "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary:    "hsl(var(--sidebar-primary) / <alpha-value>)",
          accent:     "hsl(var(--sidebar-accent) / <alpha-value>)",
          border:     "hsl(var(--sidebar-border) / <alpha-value>)",
          ring:       "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        // Legacy alias scale — resolves to tokens; remove once usages migrate
        brand: {
          50:  "hsl(var(--gold-pale-hsl) / <alpha-value>)",
          100: "hsl(var(--gold-bright-hsl) / <alpha-value>)",
          200: "hsl(var(--gold-hsl) / <alpha-value>)",
          500: "hsl(var(--gold-hsl) / <alpha-value>)",
          600: "hsl(var(--gold-muted-hsl) / <alpha-value>)",
          700: "hsl(var(--navy-light-hsl) / <alpha-value>)",
          800: "hsl(var(--navy-mid-hsl) / <alpha-value>)",
          900: "hsl(var(--navy-hsl) / <alpha-value>)",
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
        display: ["var(--font-display)"],
        sans:    ["var(--font-body)"],
      },
      spacing: {
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
      },
      borderRadius: {
        DEFAULT: "var(--r-sm)",
        sm:  "var(--r-sm)",
        md:  "var(--r-md)",
        lg:  "var(--r-lg)",
        xl:  "28px",
      },
      fontSize: {
        "display-xl": ["2.5rem", { lineHeight: "1.15", fontWeight: "700" }],
        "display-lg": ["2rem", { lineHeight: "1.2", fontWeight: "700" }],
        "heading-lg": ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }],
        "heading-md": ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500" }],
        eyebrow: ["0.6875rem", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "0.08em" }],
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
