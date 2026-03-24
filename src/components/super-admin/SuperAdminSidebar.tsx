"use client";

import Link from "next/link";
import { LayoutDashboard, Users, FileText, LogOut, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { logout } from "@/actions/auth.actions";

interface SuperAdminSidebarProps {
  initials: string;
  name: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Manage Users", icon: Users },
  { href: "/audit", label: "Audit Logs", icon: FileText },
];

export default function SuperAdminSidebar({ initials, name, isOpen = false, onClose }: SuperAdminSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Close on route change
  useEffect(() => { onClose?.(); /* eslint-disable-next-line */ }, [pathname]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const sidebarContent = (
    <aside
      style={{
        width: 240,
        background: "var(--navy)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Gold glow */}
      <div
        style={{
          position: "absolute",
          top: -60,
          left: -60,
          width: 240,
          height: 240,
          background: "radial-gradient(circle, rgba(200,163,90,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: "rgba(200,163,90,0.15)",
            border: "1px solid rgba(200,163,90,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="16"
            height="16"
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            First Love Center
          </div>
          <div
            style={{
              fontSize: "0.6rem",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginTop: 3,
            }}
          >
            Super Admin
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              flexShrink: 0,
            }}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ padding: "20px 20px 8px" }}>
        <span
          style={{
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          Navigation
        </span>
      </div>

      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                marginBottom: 2,
                fontSize: "0.83rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)",
                border: isActive ? "1px solid rgba(200,163,90,0.28)" : "1px solid transparent",
                background: isActive ? "rgba(200,163,90,0.14)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (pathname !== href) {
                  el.style.background = "rgba(255,255,255,0.06)";
                  el.style.color = "rgba(255,255,255,0.85)";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (pathname !== href) {
                  el.style.background = "transparent";
                  el.style.color = "rgba(255,255,255,0.5)";
                }
              }}
            >
              <Icon size={16} style={{ opacity: isActive ? 0.9 : 0.6 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: "12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--navy-mid)",
              border: "1px solid rgba(200,163,90,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--gold-bright)",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: "0.62rem",
                color: "rgba(255,255,255,0.28)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Super Admin
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "9px 12px",
            borderRadius: 8,
            fontSize: "0.82rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.4)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
          }}
        >
          <LogOut size={15} style={{ opacity: 0.6 }} /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex" style={{ flexShrink: 0, height: "100%" }}>
        {sidebarContent}
      </div>

      {/* Mobile: backdrop + slide-in drawer */}
      {isOpen && (
        <div
          className="lg:hidden"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,22,40,0.6)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "relative",
              height: "100%",
              width: 240,
              zIndex: 51,
              display: "flex",
              flexDirection: "column",
              animation: "slideInSidebar 0.22s ease-out",
            }}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}


interface SuperAdminSidebarProps {
  initials: string;
  name: string;
}
