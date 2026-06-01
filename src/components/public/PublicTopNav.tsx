"use client";

import { Phone, Mail } from "lucide-react";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import type { PublicNavPage } from "@/components/public/public-nav";

export default function PublicTopNav({
  current,
  officePhone,
  officeEmail,
}: {
  current?: PublicNavPage;
  officePhone?: string;
  officeEmail?: string;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[rgba(255,255,255,0.88)] dark:bg-[rgba(10,18,30,0.85)] backdrop-blur-md border-b border-[rgba(10,22,40,0.08)] dark:border-[rgba(255,255,255,0.07)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 py-3.5 min-w-0">
        <PublicSiteNav
          current={current}
          variant="top"
          showBookCta={current !== "guest"}
        />
      </nav>

      {(officePhone || officeEmail) && (
        <div className="border-t border-[rgba(10,22,40,0.06)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(10,22,40,0.02)] dark:bg-[rgba(255,255,255,0.01)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 md:px-8 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-[var(--text-muted)] min-w-0">
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
        </div>
      )}
    </header>
  );
}
