"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FinancialTab  from "./tabs/FinancialTab";
import BookingsTab   from "./tabs/BookingsTab";
import FacilitiesTab from "./tabs/FacilitiesTab";
import InventoryTab  from "./tabs/InventoryTab";
import CeremonyTab   from "./tabs/CeremonyTab";
import PatronsTab    from "./tabs/PatronsTab";
import MaintenanceTab from "./tabs/MaintenanceTab";

type Tab = "financial" | "bookings" | "facilities" | "inventory" | "ceremony" | "patrons" | "maintenance";

const TABS: { id: Tab; label: string }[] = [
  { id: "financial",   label: "Financial" },
  { id: "bookings",    label: "Bookings" },
  { id: "facilities",  label: "Facilities" },
  { id: "inventory",   label: "Inventory" },
  { id: "ceremony",    label: "Ceremony" },
  { id: "patrons",     label: "Patrons" },
  { id: "maintenance", label: "Maintenance" },
];

const PRESETS = [
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "6 months", value: "6m" },
  { label: "12 months", value: "12m" },
  { label: "This year", value: "ytd" },
];

interface Props {
  activeTab: Tab;
  period: string;
  from: string;
  to: string;
  financial:   any;
  bookings:    any;
  facilities:  any;
  inventory:   any;
  ceremony:    any;
  patrons:     any;
  maintenance: any;
}

export default function ReportDashboard({
  activeTab: initialTab,
  period: initialPeriod,
  from: initialFrom,
  to: initialTo,
  financial, bookings, facilities, inventory, ceremony, patrons, maintenance,
}: Props) {
  const router = useRouter();
  const [tab, setTab]     = useState<Tab>(initialTab);
  const [period, setPeriod] = useState(initialPeriod);
  const [from, setFrom]   = useState(initialFrom);
  const [to, setTo]       = useState(initialTo);
  const [isPending, startTransition] = useTransition();

  function buildUrl(newTab?: Tab, newPeriod?: string, newFrom?: string, newTo?: string) {
    const t = newTab    ?? tab;
    const p = newPeriod ?? period;
    const f = newFrom   ?? from;
    const e = newTo     ?? to;
    const params = new URLSearchParams({ tab: t, period: p });
    if (p === "custom" && f) params.set("from", f);
    if (p === "custom" && e) params.set("to", e);
    return `/reports?${params.toString()}`;
  }

  function navigate(newTab?: Tab, newPeriod?: string, newFrom?: string, newTo?: string) {
    startTransition(() => router.push(buildUrl(newTab, newPeriod, newFrom, newTo)));
  }

  function handlePreset(value: string) {
    setPeriod(value);
    navigate(undefined, value);
  }

  function handleCustom() {
    if (from && to) navigate(undefined, "custom", from, to);
  }

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    navigate(newTab);
  }

  // Download URL for the current tab
  const dlParams = new URLSearchParams({ period });
  if (period === "custom" && from) dlParams.set("from", from);
  if (period === "custom" && to)   dlParams.set("to", to);
  const downloadUrl = `/api/reports/download/${tab}/csv?${dlParams.toString()}`;

  const tabData: Record<Tab, { component: React.ReactNode }> = {
    financial:   { component: <FinancialTab   data={financial}   downloadUrl={downloadUrl} /> },
    bookings:    { component: <BookingsTab    data={bookings}    downloadUrl={downloadUrl} /> },
    facilities:  { component: <FacilitiesTab  data={facilities}  downloadUrl={downloadUrl} /> },
    inventory:   { component: <InventoryTab   data={inventory}   downloadUrl={downloadUrl} /> },
    ceremony:    { component: <CeremonyTab    data={ceremony}    downloadUrl={downloadUrl} /> },
    patrons:     { component: <PatronsTab     data={patrons}     downloadUrl={downloadUrl} /> },
    maintenance: { component: <MaintenanceTab data={maintenance} downloadUrl={downloadUrl} /> },
  };

  return (
    <div className="space-y-5">
      {/* Report type: pills on wider screens, a dropdown on phones (no sideways scrolling) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Report"
          className="hidden flex-wrap gap-1 rounded-full border border-border/70 bg-card p-1 shadow-[var(--shadow-xs)] sm:inline-flex"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                "h-9 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))] shadow-[var(--shadow-xs)]"
                  : "text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="sm:hidden">
          <span className="sr-only">Report</span>
          <select
            value={tab}
            onChange={(e) => handleTabChange(e.target.value as Tab)}
            className="h-11 w-full rounded-full border border-border/70 bg-card px-4 text-sm font-medium text-[var(--navy)] shadow-[var(--shadow-xs)]"
          >
            {TABS.map((t) => (
              <option key={t.id} value={t.id}>{t.label} report</option>
            ))}
          </select>
        </label>
        <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline" }), "gap-2 self-start lg:self-auto")}>
          <Download size={15} /> Download CSV
        </a>
      </div>

      {/* Period */}
      <div className="flex flex-col gap-3 rounded-[1.25rem] border border-border/70 bg-card p-3 shadow-[var(--shadow-xs)] sm:flex-row sm:flex-wrap sm:items-center">
        <span className="flex items-center gap-2 px-1 text-sm text-[var(--muted)]">
          <Calendar size={14} /> Period
        </span>
        <div role="group" aria-label="Period" className="flex flex-wrap gap-1.5">
          {[...PRESETS, { value: "custom", label: "Custom" }].map((p) => {
            const active = period === p.value;
            return (
              <button
                key={p.value}
                type="button"
                aria-pressed={active}
                onClick={() => (p.value === "custom" ? setPeriod("custom") : handlePreset(p.value))}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3.5 text-xs font-medium transition-colors",
                  active
                    ? "border-[hsl(var(--btn))] bg-[hsl(var(--btn))] text-[hsl(var(--btn-foreground))]"
                    : "border-border/70 bg-card text-[var(--muted)] hover:border-foreground/30 hover:text-[var(--navy)]"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {period === "custom" && (
          <div className="grid grid-cols-2 items-center gap-2 sm:flex">
            <Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm sm:w-auto" />
            <Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm sm:w-auto" />
            <Button onClick={handleCustom} className="col-span-2 sm:col-span-1">Apply</Button>
          </div>
        )}
        {isPending && <span className="text-xs text-[var(--muted)] animate-pulse sm:ml-auto">Updating…</span>}
      </div>

      <div className={isPending ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
        {tabData[tab].component}
      </div>
    </div>
  );
}
