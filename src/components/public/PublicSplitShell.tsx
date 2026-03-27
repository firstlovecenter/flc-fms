"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { ThemeModeSwitcher } from "@/components/theme/theme-mode-switcher";

type CurrentPage = "home" | "guest" | "checkin" | "patron" | "weddings" | "namings";

interface PublicSplitShellProps {
  current: CurrentPage;
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}

const FEATURES = [
  "Real-time booking visibility",
  "Simple guest reservation flow",
  "Trusted church facility operations",
];

const LEFT_SPLIT_VIDEO_PRIMARY = "/left-split-bg.mp4";
const LEFT_SPLIT_VIDEO_FALLBACK = "/splash-bg.mp4";
const LEFT_SPLIT_IMAGE_PRIMARY = "/left-split-bg.jpg";
const LEFT_SPLIT_IMAGE_FALLBACK = "/fl-logo-white.webp";

function BrandingPanel({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        maxWidth: 560,
        borderRadius: 24,
        padding: "34px 34px 30px",
        background: "linear-gradient(145deg, rgba(7, 18, 34, 0.72) 0%, rgba(12, 27, 50, 0.58) 100%)",
        border: "1px solid rgba(181, 203, 238, 0.18)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 22px 52px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,163,90,0.15)", border: "1px solid rgba(200,163,90,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>First Love Center</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Facility Management</div>
        </div>
      </div>

      <p style={{ color: "#D7BF8E", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.7rem", marginBottom: 10 }}>{eyebrow}</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.7rem", fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 18 }}>{title}</h1>
      <p style={{ color: "rgba(232,240,255,0.72)", lineHeight: 1.75, marginBottom: 40 }}>{subtitle}</p>

      {FEATURES.map((item) => (
        <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(200,163,90,0.15)", border: "1px solid rgba(200,163,90,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <span style={{ fontSize: "0.85rem", color: "rgba(232,240,255,0.78)" }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function PublicSplitShell({ current, eyebrow, title, subtitle, children }: PublicSplitShellProps) {
  const active = "var(--navy)";
  const idle = "var(--muted)";

  const [leftSplitImage, setLeftSplitImage] = useState(LEFT_SPLIT_IMAGE_PRIMARY);

  return (
    <div style={{ height: "100vh", display: "flex", position: "relative", overflow: "hidden" }} className="bg-navy dark:bg-transparent">

      {/* ── Desktop left panel ── */}
      <div style={{ flex: 2, position: "relative", overflow: "hidden" }} className="hidden lg:flex items-center justify-center">
        {/* Background media */}
        <img
          src={leftSplitImage}
          alt=""
          aria-hidden="true"
          onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <video autoPlay muted loop playsInline poster={leftSplitImage} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}>
          <source src={LEFT_SPLIT_VIDEO_PRIMARY} type="video/mp4" />
          <source src={LEFT_SPLIT_VIDEO_FALLBACK} type="video/mp4" />
        </video>
        {/* Tint + depth */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg, rgba(6,15,30,0.84) 0%, rgba(8,20,40,0.68) 48%, rgba(17,33,59,0.6) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 14% 86%, rgba(224, 186, 112, 0.14) 0%, rgba(224, 186, 112, 0) 70%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 55% at 88% 14%, rgba(150, 174, 215, 0.2) 0%, rgba(150, 174, 215, 0) 75%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(3,8,16,0.38) 0%, rgba(3,8,16,0) 55%)" }} />
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, padding: "60px", width: "100%" }}>
          <BrandingPanel eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 3, background: "var(--cream)", display: "flex", flexDirection: "column" }}>
        {/* Sticky Navigation */}
        <div
          className="px-4 py-5 sm:px-8 lg:px-[50px]"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--cream)",
            borderBottom: "1px solid rgba(10,22,40,0.08)",
            boxShadow: "0 1px 3px rgba(10,22,40,0.03)"
          }}>
          <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
              <Link href="/" className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm" style={{ color: current === "home" ? active : idle }}>
                Home
              </Link>
              <Link href="/guest/book" className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm" style={{ color: current === "guest" ? active : idle }}>
                Guest Booking
              </Link>
              <Link href="/guest/checkin" className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm" style={{ color: current === "checkin" ? active : idle }}>
                Check-In
              </Link>
              <Link href="/catalog/weddings" className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm" style={{ color: current === "weddings" ? active : idle }}>
                Weddings
              </Link>
              <Link href="/catalog/namings" className="btn-ghost shrink-0 px-3 py-2 text-xs sm:text-sm" style={{ color: current === "namings" ? active : idle }}>
                Namings
              </Link>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <Link href="/login" className="btn-primary px-3 py-2 text-xs sm:text-sm">Sign In</Link>
                <ThemeModeSwitcher />
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-8 sm:px-8 lg:px-[50px]" style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
