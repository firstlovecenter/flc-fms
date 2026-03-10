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
    <div style={{ display: "flex", height: "100dvh", background: "var(--cream)", overflow: "hidden" }}>
      <SuperAdminSidebar initials={initials} name={name} isOpen={menuOpen} onClose={close} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            height: 58,
            background: "var(--white)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hamburger — mobile only */}
            <button
              onClick={toggle}
              className="lg:hidden"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(10,22,40,0.05)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--navy)",
                flexShrink: 0,
              }}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500 }}>
              <span className="hidden sm:inline">Super Admin · Single Tenant</span>
              <span className="sm:hidden">Super Admin</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "var(--navy)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "var(--gold-bright)",
              }}
            >
              {initials}
            </div>
            <span className="hidden sm:inline" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--navy)" }}>
              {name}
            </span>
          </div>
        </header>

        <main className="campus-main" style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
