"use client";

import { ReactNode, useState } from "react";
import { Phone, Mail, Check } from "lucide-react";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import type { PublicNavPage } from "@/components/public/public-nav";

interface PublicSplitShellProps {
  current: PublicNavPage;
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  officePhone?: string;
  officeEmail?: string;
}

const FEATURES = [
  "Real-time booking visibility",
  "Simple guest reservation flow",
  "Trusted church facility operations",
];

const LEFT_SPLIT_IMAGE_PRIMARY = "/left-split-bg.jpg";
const LEFT_SPLIT_IMAGE_FALLBACK = "/fl-logo-white.webp";

function BrandingPanel({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: ReactNode }) {
  return (
    <div className="card-glass-dark w-full max-w-[560px] rounded-[24px] p-[34px_34px_30px] animate-fade-in">
      {/* Logo mark */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-11 h-11 rounded-xl bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.3)] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <div className="text-[1.15rem] font-bold text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
            First Love Center
          </div>
          <div className="text-[0.62rem] text-[rgba(255,255,255,0.3)] uppercase tracking-[0.07em] mt-1">
            Facility Management
          </div>
        </div>
      </div>

      {/* Hero copy */}
      <p className="section-eyebrow mb-2">{eyebrow}</p>
      <h1 className="text-[2.6rem] font-bold text-white leading-[1.15] mb-4" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h1>
      <p className="text-[rgba(232,240,255,0.72)] leading-[1.75] mb-10 text-[0.95rem]">
        {subtitle}
      </p>

      {/* Feature list */}
      <div className="space-y-3.5">
        {FEATURES.map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.2)] flex items-center justify-center flex-shrink-0">
              <Check size={10} className="text-[var(--gold)]" strokeWidth={3} />
            </div>
            <span className="text-[0.85rem] text-[rgba(232,240,255,0.78)]">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicSplitShell({ current, eyebrow, title, subtitle, children, officePhone, officeEmail }: PublicSplitShellProps) {
  const [leftSplitImage, setLeftSplitImage] = useState(LEFT_SPLIT_IMAGE_PRIMARY);

  return (
    <div className="flex relative overflow-x-hidden min-h-dvh bg-[var(--navy)] dark:bg-transparent lg:h-screen lg:overflow-hidden">

      {/* ── Desktop left panel ── */}
      <div className="hidden lg:flex flex-[2] relative overflow-hidden items-center justify-center">
        {/* Background media */}
        <img
          src={leftSplitImage}
          alt=""
          aria-hidden="true"
          onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Layered tints */}
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(6,15,30,0.84)] via-[rgba(8,20,40,0.68)] to-[rgba(17,33,59,0.6)]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 14% 86%, rgba(224,186,112,0.14) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(75% 55% at 88% 14%, rgba(150,174,215,0.2) 0%, transparent 75%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,8,16,0.38)] via-transparent" />
        {/* Content */}
        <div className="relative z-10 p-[60px] w-full">
          <BrandingPanel eyebrow={eyebrow} title={title} subtitle={subtitle} />
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-[3] min-w-0 w-full bg-[var(--cream)] dark:bg-[rgba(8,15,28,0.96)] flex flex-col">
        {/* Sticky Navigation */}
        <div className="px-4 py-4 sm:px-8 lg:px-[50px] sticky top-0 z-10 bg-[var(--cream)] dark:bg-[rgba(8,15,28,0.92)] dark:backdrop-blur-md border-b border-[rgba(10,22,40,0.08)] dark:border-[rgba(255,255,255,0.06)] shadow-[0_1px_3px_rgba(10,22,40,0.03)]">
          <div className="max-w-[900px] mx-auto w-full min-w-0">
            <PublicSiteNav current={current} variant="split" showBookCta={current !== "guest"} />
            {(officePhone || officeEmail) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-[rgba(10,22,40,0.06)] dark:border-[rgba(255,255,255,0.05)] text-[0.7rem] text-[var(--text-muted)] min-w-0">
                {officePhone && (
                  <a href={`tel:${officePhone}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-white transition-colors break-all">
                    <Phone size={11} className="shrink-0" /> {officePhone}
                  </a>
                )}
                {officeEmail && (
                  <a href={`mailto:${officeEmail}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-white transition-colors break-all">
                    <Mail size={11} className="shrink-0" /> {officeEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-8 sm:px-8 lg:px-[50px] lg:overflow-y-auto flex-1 animate-fade-in min-w-0">
          <div className="w-full max-w-[900px] mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
