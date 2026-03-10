"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PublicTopNav({ current }: { current?: "catalog" | "guest" | "patron" }) {
  const active = "var(--gold)";
  const idle = "rgba(255,255,255,0.65)";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "linear-gradient(90deg, rgba(10, 22, 40, 0.85) 0%, rgba(28, 48, 88, 0.75) 100%)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(200, 163, 90, 0.2)",
        boxShadow: "0 4px 12px rgba(10, 22, 40, 0.15), inset 0 1px 0 rgba(200, 163, 90, 0.1)",
      }}
    >
      <nav className="max-w-7xl mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 no-underline transition-all hover:opacity-90" style={{ animation: "fade-in 0.3s ease-out" }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--r-sm)",
              background: "linear-gradient(135deg, rgba(200, 163, 90, 0.3) 0%, rgba(200, 163, 90, 0.15) 100%)",
              border: "1.5px solid rgba(200, 163, 90, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 8px rgba(200, 163, 90, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span style={{ 
            fontFamily: "var(--font-display)", 
            color: "#fff", 
            fontSize: "1.15rem", 
            fontWeight: 700,
            letterSpacing: "0.5px",
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            First Love Center
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link 
            href="/catalog" 
            style={{ 
              padding: "8px 18px",
              borderRadius: "20px",
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "catalog" ? active : idle,
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              background: current === "catalog" ? "rgba(200, 163, 90, 0.15)" : "transparent",
              border: `1px solid ${current === "catalog" ? "rgba(200, 163, 90, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (current !== "catalog") {
                (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (current !== "catalog") {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
              }
            }}
          >
            Catalog
          </Link>
          <Link 
            href="/guest/book" 
            style={{ 
              padding: "8px 18px",
              borderRadius: "20px",
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "none",
              color: current === "guest" ? active : idle,
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              background: current === "guest" ? "rgba(200, 163, 90, 0.15)" : "transparent",
              border: `1px solid ${current === "guest" ? "rgba(200, 163, 90, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
              backdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (current !== "guest") {
                (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (current !== "guest") {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.1)";
              }
            }}
          >
            Guest Booking
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/login"
            style={{
              padding: "9px 20px",
              borderRadius: "var(--r-sm)",
              fontSize: "0.9rem",
              fontWeight: 500,
              textDecoration: "none",
              color: "rgba(255, 255, 255, 0.85)",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              cursor: "pointer",
              display: "inline-flex",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.15)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.25)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.1)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.15)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            Sign In
          </Link>
          <Link 
            href="/guest/book"
            style={{
              padding: "9px 20px",
              borderRadius: "var(--r-sm)",
              fontSize: "0.9rem",
              fontWeight: 600,
              textDecoration: "none",
              color: "var(--navy)",
              background: "linear-gradient(135deg, var(--gold) 0%, #C09250 100%)",
              border: "1px solid rgba(200, 163, 90, 0.3)",
              boxShadow: "0 4px 12px rgba(200, 163, 90, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(200, 163, 90, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(200, 163, 90, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            Book Now <ArrowRight size={15} strokeWidth={2.5} />
          </Link>
        </div>
      </nav>
    </header>
  );
}
