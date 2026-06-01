"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";

export function ThemeModeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="btn-icon w-[34px] h-[34px]" aria-hidden />;
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
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="btn-icon border border-[var(--border)] hover:border-[var(--gold)] hover:text-[var(--gold)]"
      aria-label={`${label} — click to switch`}
      title={`${label} (click to switch)`}
    >
      <Icon size={16} />
    </button>
  );
}
