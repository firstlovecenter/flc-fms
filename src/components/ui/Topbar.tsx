"use client";

import { Bell, Menu } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:      "Super Admin",
  FACILITY_MANAGER: "Facility Manager",
  VICAR:            "Vicar",
  PATRON:           "Patron",
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
  const initials = name.split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <header className="topbar" style={{
      background: "linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(200, 163, 90, 0.15)",
      boxShadow: "0 4px 12px rgba(10, 22, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    }}>
      {/* Left — hamburger (mobile) + portal label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--r-sm)",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(200, 163, 90, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--slate)",
              flexShrink: 0,
            }}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}
        <div style={{ 
          fontSize: "0.8rem", 
          color: "var(--gold)", 
          fontWeight: 600, 
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          <span className="hidden sm:inline">{ROLE_LABELS[role] ?? role} Portal</span>
          <span className="sm:hidden">FLC</span>
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Bell */}
        <button style={{
          width: "36px", 
          height: "36px", 
          borderRadius: "var(--r-sm)",
          background: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(200, 163, 90, 0.15)",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          cursor: "pointer", 
          color: "var(--slate)", 
          transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          backdropFilter: "blur(8px)",
        }}
        onMouseEnter={(e) => { 
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(200, 163, 90, 0.15)"; 
          (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(200, 163, 90, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => { 
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.08)"; 
          (e.currentTarget as HTMLButtonElement).style.color = "var(--slate)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        }}>
          <Bell size={16} strokeWidth={1.5} />
        </button>

        {/* Divider — hidden on very small screens */}
        <div className="hidden sm:block" style={{ width: "1px", height: "28px", background: "rgba(200, 163, 90, 0.2)" }} />

        {/* User pill */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "10px",
          paddingRight: "8px",
        }}>
          <div style={{
            width: "36px", 
            height: "36px", 
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(200, 163, 90, 0.4) 0%, rgba(200, 163, 90, 0.2) 100%)",
            border: "1px solid rgba(200, 163, 90, 0.3)",
            backdropFilter: "blur(8px)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            fontSize: "0.75rem", 
            fontWeight: 700, 
            color: "var(--gold)",
            boxShadow: "0 2px 8px rgba(200, 163, 90, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div className="hidden sm:flex" style={{ flexDirection: "column", gap: "2px" }}>
            <div style={{ 
              fontSize: "0.85rem", 
              fontWeight: 600, 
              color: "var(--navy)", 
              lineHeight: 1.2 
            }}>
              {name}
            </div>
            <div style={{ 
              fontSize: "0.7rem", 
              color: "var(--gold)", 
              lineHeight: 1.2,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}>
              {ROLE_LABELS[role]}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
