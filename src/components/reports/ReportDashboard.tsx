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
import { Card } from "@/components/ui/card";

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
    <div className="space-y-6">
      {/* Date range controls */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Calendar size={14} />
          <span>Period:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                period === p.value
                  ? "bg-[var(--navy)] text-white border-[var(--navy)]"
                  : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)]"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPeriod("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              period === "custom"
                ? "bg-[var(--navy)] text-white border-[var(--navy)]"
                : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)]"
            }`}
          >
            Custom
          </button>
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="text-sm py-1.5 px-2 w-auto"
            />
            <span className="text-[var(--muted)] text-xs">to</span>
            <Input
              type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="text-sm py-1.5 px-2 w-auto"
            />
            <Button onClick={handleCustom} size="sm">Apply</Button>
          </div>
        )}
        {isPending && <span className="text-xs text-[var(--muted)] animate-pulse">Loading…</span>}

        {/* Download button */}
        <div className="sm:ml-auto">
          <a href={downloadUrl} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}>
            <Download size={13} /> Download CSV
          </a>
        </div>
      </Card>

      {/* Tab navigation */}
      <div className="flex gap-1 flex-wrap border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-[var(--navy)] text-[var(--navy)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--slate)] hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
        {tabData[tab].component}
      </div>
    </div>
  );
}
