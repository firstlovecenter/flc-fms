"use client";

import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { logout } from "@/actions/auth.actions";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface PatronNavbarProps {
  initials: string;
  name: string;
}

const NAV = [
  { href: "/patron/dashboard", label: "Dashboard" },
  { href: "/patron/book", label: "Book" },
  { href: "/patron/bookings", label: "My Bookings" },
  { href: "/patron/receipts", label: "Receipts" },
  { href: "/patron/profile", label: "Profile" },
];

export default function PatronNavbar({ initials, name }: PatronNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/patron/login");
  }

  return (
    <>
      <nav
        style={{
          background: "rgba(249,246,240,0.95)",
          backdropFilter: "blur(16px) saturate(1.5)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 20px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href="/patron/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "var(--navy)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--navy)",
              }}
            >
              <span className="hidden sm:inline">First Love Center</span>
              <span className="sm:hidden">FLC</span>
            </span>
          </Link>

          {/* Center nav — desktop only */}
          <div className="hidden md:flex" style={{ gap: 4 }}>
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "6px 14px",
                  borderRadius: 100,
                  fontSize: "0.82rem",
                  fontWeight: pathname === href ? 600 : 500,
                  color: pathname === href ? "var(--navy)" : "var(--slate)",
                  background: pathname === href ? "rgba(10,22,40,0.06)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* User + logout — desktop */}
            <div className="hidden md:flex" style={{ alignItems: "center", gap: 8 }}>
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
              <span
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "var(--navy)",
                }}
              >
                {name.split(" ")[0]}
              </span>
            </div>
            <div className="hidden md:block" style={{ width: 1, height: 20, background: "var(--border)" }} />
            <button
              onClick={handleLogout}
              className="hidden md:flex"
              style={{
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "var(--muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>

            {/* Hamburger — mobile */}
            <button
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "rgba(10,22,40,0.06)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--navy)",
              }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden"
            style={{
              borderTop: "1px solid var(--border)",
              padding: "12px 20px 16px",
              background: "rgba(249,246,240,0.98)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  fontWeight: pathname === href ? 600 : 400,
                  color: pathname === href ? "var(--navy)" : "var(--slate)",
                  background: pathname === href ? "rgba(10,22,40,0.06)" : "transparent",
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--navy)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "var(--gold-bright)",
                  }}
                >
                  {initials}
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)" }}>{name}</span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "var(--muted)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
