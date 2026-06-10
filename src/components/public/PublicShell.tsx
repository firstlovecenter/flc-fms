"use client";

import { ReactNode, useState } from "react";
import { Phone, Mail, Check } from "lucide-react";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import type { PublicNavPage } from "@/components/public/public-nav";
import PageContainer from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

const FEATURES = [
  "Real-time booking visibility",
  "Simple guest reservation flow",
  "Trusted church facility operations",
];

const LEFT_SPLIT_IMAGE_PRIMARY = "/left-split-bg.jpg";
const LEFT_SPLIT_IMAGE_FALLBACK = "/fl-logo-white.webp";

function ContactStrip({ officePhone, officeEmail }: { officePhone?: string; officeEmail?: string }) {
  if (!officePhone && !officeEmail) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-[var(--border)] text-caption text-[var(--text-muted)] min-w-0">
      {officePhone && (
        <a href={`tel:${officePhone}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-white transition-colors break-all">
          <Phone size={11} className="shrink-0" aria-hidden /> {officePhone}
        </a>
      )}
      {officeEmail && (
        <a href={`mailto:${officeEmail}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-white transition-colors break-all">
          <Mail size={11} className="shrink-0" aria-hidden /> {officeEmail}
        </a>
      )}
    </div>
  );
}

function BrandingPanel({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: ReactNode }) {
  return (
    <div className="card-glass-dark w-full max-w-[560px] rounded-[var(--r-lg)] p-8 md:p-9 animate-fade-in">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-11 h-11 rounded-xl bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.3)] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <div className="text-heading-md font-bold text-white leading-none font-display">First Love Center</div>
          <div className="text-eyebrow text-[rgba(255,255,255,0.35)] mt-1">Facility Management</div>
        </div>
      </div>
      <p className="section-eyebrow mb-2">{eyebrow}</p>
      <h1 className="font-display text-display-xl text-white leading-[1.15] mb-4">{title}</h1>
      <p className="text-[rgba(232,240,255,0.72)] leading-relaxed mb-8 text-body">{subtitle}</p>
      <div className="space-y-3.5">
        {FEATURES.map((item) => (
          <div key={item} className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.2)] flex items-center justify-center flex-shrink-0">
              <Check size={10} className="text-[var(--gold)]" strokeWidth={3} aria-hidden />
            </div>
            <span className="text-body-sm text-[rgba(232,240,255,0.78)]">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileHeroStrip({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: ReactNode }) {
  return (
    <div className="lg:hidden px-4 pt-4 pb-2 sm:px-8 border-b border-[var(--border)] bg-gradient-to-br from-[var(--navy)] to-[var(--navy-mid)] text-white">
      <p className="text-eyebrow text-[var(--gold-bright)] mb-1.5">{eyebrow}</p>
      <h1 className="font-display text-heading-lg leading-snug mb-2">{title}</h1>
      <p className="text-body-sm text-[rgba(232,240,255,0.8)] line-clamp-2">{subtitle}</p>
    </div>
  );
}

export type PublicShellProps = {
  current: PublicNavPage;
  children: ReactNode;
  officePhone?: string;
  officeEmail?: string;
  layout?: "split" | "top";
  /** Split layout: left panel hero */
  eyebrow?: string;
  title?: string;
  subtitle?: ReactNode;
  maxWidth?: "md" | "lg" | "xl";
  className?: string;
};

export default function PublicShell({
  current,
  children,
  officePhone,
  officeEmail,
  layout = "top",
  eyebrow,
  title,
  subtitle,
  maxWidth = "lg",
  className,
}: PublicShellProps) {
  const [leftSplitImage, setLeftSplitImage] = useState(LEFT_SPLIT_IMAGE_PRIMARY);
  const showBookCta = current !== "guest";

  if (layout === "split" && eyebrow && title && subtitle !== undefined) {
    return (
      <div className="surface-warm flex relative overflow-x-hidden min-h-dvh bg-[var(--navy)] dark:bg-transparent lg:h-screen lg:overflow-hidden">
        <div className="hidden lg:flex flex-[2] relative overflow-hidden items-center justify-center">
          <img
            src={leftSplitImage}
            alt=""
            aria-hidden
            onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(6,15,30,0.84)] via-[rgba(8,20,40,0.68)] to-[rgba(17,33,59,0.6)]" />
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_14%_86%,rgba(224,186,112,0.14)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_88%_14%,rgba(150,174,215,0.2)_0%,transparent_75%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,8,16,0.38)] via-transparent" />
          <div className="relative z-10 p-12 xl:p-16 w-full">
            <BrandingPanel eyebrow={eyebrow} title={title} subtitle={subtitle} />
          </div>
        </div>

        <div className="flex-[3] min-w-0 w-full bg-[var(--page-bg,var(--cream))] dark:bg-[rgba(8,15,28,0.96)] flex flex-col">
          <MobileHeroStrip eyebrow={eyebrow} title={title} subtitle={subtitle} />
          <header className="sticky top-0 z-20 px-4 py-4 sm:px-8 lg:px-12 bg-[var(--page-bg,var(--cream))] dark:bg-[rgba(8,15,28,0.92)] dark:backdrop-blur-md border-b border-[var(--border)] shadow-[var(--shadow-xs)]">
            <PageContainer maxWidth="lg" className="px-0">
              <PublicSiteNav current={current} variant="split" showBookCta={showBookCta} />
              <ContactStrip officePhone={officePhone} officeEmail={officeEmail} />
            </PageContainer>
          </header>
          <div className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:overflow-y-auto animate-fade-in min-w-0">
            <PageContainer maxWidth="lg" className="px-0">
              {children}
            </PageContainer>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("surface-warm min-h-screen bg-[var(--page-bg,var(--cream))] dark:bg-transparent relative overflow-x-hidden", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[radial-gradient(circle,rgba(200,163,90,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/3 -left-16 w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(10,22,40,0.04)_0%,transparent_70%)] dark:opacity-40" />
      </div>
      <header className="sticky top-0 z-20 bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(10,18,30,0.85)] backdrop-blur-md border-b border-[var(--border)]">
        <nav className="py-3.5">
          <PageContainer maxWidth={maxWidth}>
            <PublicSiteNav current={current} variant="top" showBookCta={showBookCta} />
          </PageContainer>
        </nav>
        {(officePhone || officeEmail) && (
          <div className="border-t border-[var(--border)] bg-[rgba(10,22,40,0.02)] dark:bg-[rgba(255,255,255,0.02)]">
            <PageContainer maxWidth={maxWidth} className="py-1.5">
              <ContactStrip officePhone={officePhone} officeEmail={officeEmail} />
            </PageContainer>
          </div>
        )}
      </header>
      <main className="relative z-10 py-8 md:py-12 animate-fade-in">
        <PageContainer maxWidth={maxWidth}>{children}</PageContainer>
      </main>
    </div>
  );
}
