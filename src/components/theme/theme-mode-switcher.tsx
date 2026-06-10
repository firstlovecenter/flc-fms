"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeModeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("size-[34px]", className)} aria-hidden />;
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
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(nextTheme)}
      className={cn(
        "border border-[var(--border)] hover:border-gold hover:text-gold",
        className
      )}
      aria-label={`${label} — click to switch`}
      title={`${label} (click to switch)`}
    >
      <Icon size={16} />
    </Button>
  );
}
