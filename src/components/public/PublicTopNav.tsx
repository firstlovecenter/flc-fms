"use client";

import { Phone, Mail } from "lucide-react";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PageContainer from "@/components/layout/PageContainer";
import type { PublicNavPage } from "@/components/public/public-nav";

export default function PublicTopNav({
  current,
  officePhone,
  officeEmail,
  maxWidth = "lg",
}: {
  current?: PublicNavPage;
  officePhone?: string;
  officeEmail?: string;
  maxWidth?: "md" | "lg" | "xl";
}) {
  return (
    <header className="sticky top-0 z-20 bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(10,18,30,0.85)] backdrop-blur-md border-b border-[var(--border)]">
      <nav className="py-3.5">
        <PageContainer maxWidth={maxWidth}>
          <PublicSiteNav
            current={current}
            variant="top"
            showBookCta={current !== "guest"}
          />
        </PageContainer>
      </nav>
      {(officePhone || officeEmail) && (
        <div className="border-t border-[var(--border)] bg-[rgba(22,26,31,0.02)] dark:bg-[rgba(255,255,255,0.02)]">
          <PageContainer maxWidth={maxWidth} className="py-1.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-[var(--text-muted)] min-w-0">
              {officePhone && (
                <a href={`tel:${officePhone}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-[#fff] transition-colors break-all">
                  <Phone size={11} className="shrink-0" aria-hidden /> {officePhone}
                </a>
              )}
              {officeEmail && (
                <a href={`mailto:${officeEmail}`} className="flex items-center gap-1 hover:text-[var(--navy)] dark:hover:text-[#fff] transition-colors break-all">
                  <Mail size={11} className="shrink-0" aria-hidden /> {officeEmail}
                </a>
              )}
            </div>
          </PageContainer>
        </div>
      )}
    </header>
  );
}
