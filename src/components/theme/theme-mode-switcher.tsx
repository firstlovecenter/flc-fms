"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";

export function ThemeModeSwitcher() {
  return null; // Disabled temporarily to enforce light mode 
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme ?? "system";

  const nextTheme =
    currentTheme === "light" ? "dark"
    : currentTheme === "dark" ? "system"
    : "light";

  const label =
    currentTheme === "light" ? "Light mode"
    : currentTheme === "dark" ? "Dark mode"
    : "System mode";

  const Icon =
    currentTheme === "light" ? Sun
    : currentTheme === "dark" ? Moon
    : Laptop;

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }} aria-label="Theme mode switcher">
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        style={{
          border: "1px solid rgba(10, 22, 40, 0.16)",
          borderRadius: 8,
          width: 34,
          height: 34,
          background: "var(--white)",
          color: "var(--navy)",
          outline: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        aria-label={label}
        title={`${label} (click to switch)`}
      >
        <Icon size={16} />
      </button>
    </div>
  );
}
