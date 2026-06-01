"use client";

import { useState, useCallback } from "react";
import SuperAdminSidebar from "@/components/super-admin/SuperAdminSidebar";
import { Menu } from "lucide-react";

export default function SuperAdminShell({
  children,
  initials,
  name,
}: {
  children: React.ReactNode;
  initials: string;
  name: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useCallback(() => setMenuOpen((o) => !o), []);
  const close  = useCallback(() => setMenuOpen(false), []);

  return (
    <div className="flex h-dvh bg-[var(--cream)] dark:bg-transparent overflow-hidden">
      <SuperAdminSidebar initials={initials} name={name} isOpen={menuOpen} onClose={close} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-[58px] bg-white dark:bg-[rgba(10,17,29,0.88)] border-b border-[var(--border)] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Hamburger — mobile only */}
            <button
              onClick={toggle}
              className="btn-icon lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="text-[0.78rem] text-[var(--text-muted)] font-medium">
              <span className="hidden sm:inline">Super Admin · Single Tenant</span>
              <span className="sm:hidden">Super Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[30px] h-[30px] rounded-full bg-[var(--navy)] flex items-center justify-center text-[0.7rem] font-bold text-[var(--gold-bright)] flex-shrink-0">
              {initials}
            </div>
            <span className="hidden sm:inline text-[0.82rem] font-semibold text-[var(--navy)] dark:text-[rgba(232,238,248,0.9)]">
              {name}
            </span>
          </div>
        </header>

        <main className="campus-main flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
