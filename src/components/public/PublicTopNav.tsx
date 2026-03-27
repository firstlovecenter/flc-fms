"use client";

import Link from "next/link";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { ThemeModeSwitcher } from "@/components/theme/theme-mode-switcher";

export default function PublicTopNav({
  current,
  officePhone,
  officeEmail,
}: {
  current?: "home" | "guest" | "checkin" | "patron" | "catalog" | "weddings" | "namings" | "ceremony-request";
  officePhone?: string;
  officeEmail?: string;
}) {
  const active = "var(--navy)";
  const idle = "var(--muted)";

  return (
    <header
      className="sticky top-0 z-20 bg-[rgba(255,255,255,0.88)] backdrop-blur-md border-b border-[rgba(10,22,40,0.08)] dark:bg-[rgba(10,18,30,0.6)] dark:border-[rgba(255,255,255,0.1)]"
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-3">
        <Link href="/" className="flex items-center no-underline" aria-label="Home">
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--navy)",
              border: "1px solid rgba(10, 22, 40, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 rounded-full border border-[rgba(10,22,40,0.1)] bg-white px-1.5 py-1">
          <Link 
            href="/" 
            style={{ 
              padding: "7px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "home" ? active : idle,
              transition: "all 0.2s ease",
              background: current === "home" ? "rgba(10, 22, 40, 0.08)" : "transparent",
            }}
          >
            Home
          </Link>
          <Link 
            href="/guest/book" 
            style={{ 
              padding: "7px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "guest" ? active : idle,
              transition: "all 0.2s ease",
              background: current === "guest" ? "rgba(10, 22, 40, 0.08)" : "transparent",
            }}
          >
            Guest Booking
          </Link>
          <Link
            href="/guest/checkin"
            style={{
              padding: "7px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "checkin" ? active : idle,
              transition: "all 0.2s ease",
              background: current === "checkin" ? "rgba(10, 22, 40, 0.08)" : "transparent",
            }}
          >
            Check-In
          </Link>
          <Link
            href="/catalog/weddings"
            style={{
              padding: "7px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "weddings" ? active : idle,
              transition: "all 0.2s ease",
              background: current === "weddings" ? "rgba(10, 22, 40, 0.08)" : "transparent",
            }}
          >
            Weddings
          </Link>
          <Link
            href="/catalog/namings"
            style={{
              padding: "7px 16px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "namings" ? active : idle,
              transition: "all 0.2s ease",
              background: current === "namings" ? "rgba(10, 22, 40, 0.08)" : "transparent",
            }}
          >
            Namings
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/guest/checkin"
            className="md:hidden"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              fontSize: "0.8rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "checkin" ? "var(--navy)" : "var(--muted)",
              transition: "all 0.2s ease",
            }}
          >
            Check-In
          </Link>
          <Link 
            href="/login"
            className="hidden sm:inline-flex"
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: "0.85rem",
              fontWeight: 500,
              textDecoration: "none",
              color: "var(--navy)",
              background: "white",
              border: "1px solid rgba(10, 22, 40, 0.12)",
              transition: "all 0.2s ease",
              cursor: "pointer",
              display: "inline-flex",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(10, 22, 40, 0.04)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "white";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            Sign In
          </Link>
          <ThemeModeSwitcher />
          {current !== "guest" && (
            <Link 
              href="/guest/book"
              className="inline-flex"
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
                color: "white",
                background: "var(--navy)",
                border: "1px solid rgba(10, 22, 40, 0.08)",
                transition: "all 0.2s ease",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.opacity = "0.92";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
            >
              <span className="hidden sm:inline">Book Now</span>
              <span className="sm:hidden">Book</span>
              <ArrowRight size={15} strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </nav>
      {(officePhone || officeEmail) && (
        <div className="border-t border-[rgba(10,22,40,0.06)] dark:border-[rgba(255,255,255,0.06)] bg-[rgba(10,22,40,0.02)] dark:bg-[rgba(255,255,255,0.02)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 py-1.5 flex items-center gap-4 text-[0.72rem] text-[var(--muted)]">
            {officePhone && (
              <a href={`tel:${officePhone}`} className="flex items-center gap-1 hover:text-[var(--navy)] transition-colors">
                <Phone size={11} /> {officePhone}
              </a>
            )}
            {officeEmail && (
              <a href={`mailto:${officeEmail}`} className="flex items-center gap-1 hover:text-[var(--navy)] transition-colors">
                <Mail size={11} /> {officeEmail}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
