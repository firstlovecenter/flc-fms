"use client";

import { Bell, Menu, Search } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:      "Super Admin",
  FACILITY_MANAGER: "Facility Manager",
  VICAR:            "Vicar",
  PATRON:           "Patron",
  BOOKING_MANAGER:  "Booking Manager",
};

export default function Topbar({
  name,
  role,
  onMenuToggle,
}: {
  name: string;
  role: string;
  onMenuToggle?: () => void;
}) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="topbar flex items-center justify-between px-4 h-14 bg-white dark:bg-[rgba(10,17,29,0.85)] border-b border-[var(--border)] backdrop-blur-md shadow-[var(--shadow-sm)] flex-shrink-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--slate)] hover:text-[var(--navy)] hover:bg-[var(--cream)] transition-colors"
            aria-label="Open menu"
          >
            <Menu size={17} />
          </button>
        )}
        <span className="hidden sm:inline text-[0.78rem] font-semibold text-[var(--gold)] uppercase tracking-[0.05em]">
          {ROLE_LABELS[role] ?? role} Portal
        </span>
        <span className="sm:hidden text-[0.78rem] font-semibold text-[var(--gold)] uppercase tracking-[0.05em]">FLC</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search hint */}
        <button
          className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--muted)] text-xs hover:border-[var(--border-dark)] hover:text-[var(--slate)] transition-colors"
          aria-label="Search (coming soon)"
          disabled
        >
          <Search size={13} />
          <span>Search…</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-[var(--border)] text-[0.62rem] font-medium text-[var(--muted)] font-mono">⌘K</kbd>
        </button>

        {/* Bell */}
        <button
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--slate)] hover:text-[var(--navy)] hover:bg-[var(--cream)] hover:border-[var(--border-dark)] hover:-translate-y-0.5 transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell size={15} strokeWidth={1.5} />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-7 bg-[var(--border)]" />

        {/* User pill */}
        <div className="flex items-center gap-2.5 pr-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.72rem] font-bold text-[var(--gold)] flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(200,163,90,0.22) 0%, rgba(200,163,90,0.1) 100%)",
              border: "1px solid rgba(200,163,90,0.2)",
              boxShadow: "0 2px 8px rgba(200,163,90,0.08)",
            }}
          >
            {initials}
          </div>
          <div className="hidden sm:flex flex-col gap-px">
            <span className="text-[0.84rem] font-semibold text-[var(--navy)] leading-none">{name}</span>
            <span className="text-[0.68rem] font-medium text-[var(--gold)] uppercase tracking-[0.03em] leading-none">{ROLE_LABELS[role]}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
