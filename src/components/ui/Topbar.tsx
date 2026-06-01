"use client";

import { useState, useCallback, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import Image from "next/image";
import PushNotificationToggle from "@/components/layout/PushNotificationToggle";
import CommandSearch from "@/components/ui/CommandSearch";

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
  profilePicture,
  onMenuToggle,
}: {
  name: string;
  role: string;
  profilePicture?: string;
  onMenuToggle?: () => void;
}) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
        {/* Search trigger */}
        <button
          onClick={openSearch}
          className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--muted)] text-xs hover:border-[var(--border-dark)] hover:text-[var(--slate)] transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search size={13} />
          <span>Search…</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-[var(--border)] text-[0.62rem] font-medium text-[var(--muted)] font-mono">⌘K</kbd>
        </button>

        {/* Mobile search button */}
        <button
          onClick={openSearch}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--cream-dark)] border border-[var(--border)] text-[var(--slate)] hover:text-[var(--navy)] hover:bg-[var(--cream)] transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search size={15} />
        </button>

        {/* Push notifications */}
        <PushNotificationToggle compact />

        {/* Divider */}
        <div className="hidden sm:block w-px h-7 bg-[var(--border)]" />

        {/* User pill */}
        <div className="flex items-center gap-2.5 pr-1">
          {profilePicture ? (
            <Image
              src={profilePicture}
              alt={name}
              width={32}
              height={32}
              unoptimized
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[rgba(200,163,90,0.2)]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.72rem] font-bold text-[var(--gold)] flex-shrink-0 bg-gradient-to-br from-[rgba(200,163,90,0.22)] to-[rgba(200,163,90,0.1)] border border-[rgba(200,163,90,0.2)] shadow-[0_2px_8px_rgba(200,163,90,0.08)]">
              {initials}
            </div>
          )}
          <div className="hidden sm:flex flex-col gap-px">
            <span className="text-[0.84rem] font-semibold text-[var(--navy)] leading-none">{name}</span>
            <span className="text-[0.68rem] font-medium text-[var(--gold)] uppercase tracking-[0.03em] leading-none">{ROLE_LABELS[role]}</span>
          </div>
        </div>
      </div>

      {/* Command search dialog */}
      {searchOpen && <CommandSearch onClose={() => setSearchOpen(false)} role={role} />}
    </header>
  );
}
