"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ToggleLeft, ToggleRight, Mail, Clock } from "lucide-react";
import {
  createReportSubscription,
  deleteReportSubscription,
  toggleReportSubscription,
  type ReportFrequency,
  type ReportType,
} from "@/actions/report-subscription.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/card";

const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: "FINANCIAL",   label: "Financial" },
  { id: "BOOKINGS",    label: "Bookings" },
  { id: "FACILITIES",  label: "Facilities" },
  { id: "INVENTORY",   label: "Inventory" },
  { id: "CEREMONY",    label: "Ceremony" },
  { id: "PATRONS",     label: "Patrons" },
  { id: "MAINTENANCE", label: "Maintenance" },
];

const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  WEEKLY:    "Weekly (Mon 08:00)",
  MONTHLY:   "Monthly (1st, 07:00)",
  QUARTERLY: "Quarterly",
  YEARLY:    "Yearly (Jan 1)",
};

interface Subscription {
  id: string;
  name: string;
  email: string;
  frequency: string;
  reports: string[];
  isActive: boolean;
  createdAt: Date;
}

interface Props {
  initialSubscriptions: Subscription[];
}

export default function SubscriptionManager({ initialSubscriptions }: Props) {
  const router = useRouter();
  const [subs, setSubs]   = useState(initialSubscriptions);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [frequency, setFrequency] = useState<ReportFrequency>("MONTHLY");
  const [reports,   setReports]   = useState<ReportType[]>(["FINANCIAL", "BOOKINGS"]);

  function toggleReport(type: ReportType) {
    setReports((prev) =>
      prev.includes(type) ? prev.filter((r) => r !== type) : [...prev, type]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await createReportSubscription({ name, email, frequency, reports });
    setSaving(false);
    if ("error" in result) {
      setError(result.error ?? "Failed.");
      return;
    }
    setSubs((prev) => [result.subscription as Subscription, ...prev]);
    setAdding(false);
    setName(""); setEmail(""); setFrequency("MONTHLY"); setReports(["FINANCIAL", "BOOKINGS"]);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from scheduled reports?`)) return;
    await deleteReportSubscription(id);
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleReportSubscription(id, !current);
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !current } : s));
  }

  return (
    <div className="space-y-6">
      {/* Add subscription */}
      {!adding ? (
        <Button onClick={() => setAdding(true)} className="gap-2">
          <Plus size={15} /> Add Recipient
        </Button>
      ) : (
        <Card className="p-6 border-2 border-[var(--gold)] space-y-4">
          <h3 className="font-semibold text-[var(--navy)]">New Report Subscription</h3>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium text-[var(--slate)] mb-1">Full Name *</Label>
                <Input
                  required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rev. Samuel Mensah"
                />
              </div>
              <div>
                <Label className="block text-sm font-medium text-[var(--slate)] mb-1">Email Address *</Label>
                <Input
                  required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <Label className="block text-sm font-medium text-[var(--slate)] mb-1">Frequency</Label>
              <NativeSelect value={frequency} onChange={(e) => setFrequency(e.target.value as ReportFrequency)} className="w-full">
                {(Object.keys(FREQUENCY_LABELS) as ReportFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                ))}
              </NativeSelect>
            </div>

            <div>
              <Label className="block text-sm font-medium text-[var(--slate)] mb-2">Report Types *</Label>
              <div className="flex flex-wrap gap-2">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => toggleReport(rt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      reports.includes(rt.id)
                        ? "bg-[var(--navy)] text-white border-[var(--navy)]"
                        : "bg-white text-[var(--slate)] border-[var(--border)] hover:border-[var(--navy)]"
                    }`}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Add Subscription"}
              </Button>
              <Button type="button" onClick={() => { setAdding(false); setError(null); }} variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      {subs.length === 0 ? (
        <Card className="p-10 text-center text-[var(--muted)]">
          <Mail size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No subscriptions yet. Add a recipient to start sending scheduled reports.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => (
            <Card key={sub.id} className={`p-5 flex flex-col sm:flex-row gap-4 sm:items-center ${!sub.isActive ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[var(--navy)]">{sub.name}</p>
                  <StatusBadge
                    status={sub.isActive ? "APPROVED" : "CANCELLED"}
                    label={sub.isActive ? "Active" : "Paused"}
                    size="xs"
                  />
                </div>
                <p className="text-sm text-[var(--muted)] mt-0.5 flex items-center gap-1">
                  <Mail size={12} /> {sub.email}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-[var(--slate)]">
                    <Clock size={11} /> {FREQUENCY_LABELS[sub.frequency as ReportFrequency] ?? sub.frequency}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    Reports: {(sub.reports as string[]).map((r) => REPORT_TYPES.find((t) => t.id === r)?.label ?? r).join(", ")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(sub.id, sub.isActive)}
                  className="p-2 rounded-lg hover:bg-[var(--cream)] text-[var(--slate)]"
                  title={sub.isActive ? "Pause" : "Resume"}
                >
                  {sub.isActive ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => handleDelete(sub.id, sub.name)}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
