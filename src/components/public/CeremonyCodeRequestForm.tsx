"use client";

import { useState, useEffect } from "react";
import { requestCeremonyCode } from "@/actions/ceremony-code.actions";
import { getCeremonyBookableFacilities } from "@/actions/ceremony-venue.actions";
import { getCeremonyVenueAvailabilitySummaries, type CeremonyVenueAvailabilitySummary } from "@/actions/availability.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, CalendarX } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type CeremonyVenue = {
  id: string;
  name: string;
  flatPrice: number;
};

/** Formats a YYYY-MM-DD ceremony date string as "Sat, Aug 2" without timezone shift. */
function formatCeremonyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CeremonyCodeRequestForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    ceremonyType: "WEDDING" as "WEDDING" | "NAMING",
    facilityId: "",
    notes: "",
  });
  const [venues, setVenues] = useState<CeremonyVenue[]>([]);
  const [availability, setAvailability] = useState<Record<string, CeremonyVenueAvailabilitySummary>>({});

  useEffect(() => {
    getCeremonyBookableFacilities(form.ceremonyType)
      .then((v) => {
        const list = v as CeremonyVenue[];
        setVenues(list);
        setForm((prev) => ({ ...prev, facilityId: list[0]?.id ?? "" }));
      })
      .catch(() => setVenues([]));
    getCeremonyVenueAvailabilitySummaries(form.ceremonyType)
      .then(setAvailability)
      .catch(() => setAvailability({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ceremonyType]);

  const selectedVenue = venues.find((v) => v.id === form.facilityId);
  const selectedAvailability = availability[form.facilityId];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await requestCeremonyCode(form);
      if ("error" in result) {
        setError(result.error ?? "An error occurred.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="p-8 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--navy)]">
          Request received!
        </h2>
        <p className="text-[var(--slate)] text-sm max-w-sm mx-auto">
          Your request has been received. You will receive your booking code via
          SMS and email once your payment is confirmed.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} ><Card className="p-8 space-y-5 max-w-lg mx-auto">
      <div className="form-group">
        <Label htmlFor="ceremony-type">Ceremony Type</Label>
        <NativeSelect
          id="ceremony-type"
          name="ceremonyType"
          value={form.ceremonyType}
          onChange={handleChange}
          className="w-full"
          required
        >
          <option value="WEDDING">Wedding</option>
          <option value="NAMING">Naming Ceremony</option>
        </NativeSelect>
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-venue">Venue *</Label>
        <NativeSelect
          id="ceremony-venue"
          name="facilityId"
          value={form.facilityId}
          onChange={handleChange}
          className="w-full"
          required
          disabled={venues.length === 0}
        >
          {venues.length === 0 && <option value="">No venues available</option>}
          {venues.map((v) => {
            const a = availability[v.id];
            const suffix = a?.nextAvailableDate
              ? ` — next available ${formatCeremonyDate(a.nextAvailableDate)}`
              : a && a.datesChecked > 0
              ? " — no open dates soon"
              : "";
            return (
              <option key={v.id} value={v.id}>
                {v.name}{suffix}
              </option>
            );
          })}
        </NativeSelect>
        {selectedVenue && (
          <p className="text-xs text-[var(--muted)] mt-1">
            Amount to pay: <strong>{formatCurrency(selectedVenue.flatPrice)}</strong>
          </p>
        )}
        {selectedAvailability && selectedAvailability.datesChecked > 0 && (
          selectedAvailability.nextAvailableDate ? (
            <p className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 mt-1">
              <CalendarCheck size={12} />
              Next available {formatCeremonyDate(selectedAvailability.nextAvailableDate)}
              <span className="text-[var(--muted)] font-normal">
                ({selectedAvailability.availableDatesCount} of {selectedAvailability.datesChecked} open)
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] mt-1">
              <CalendarX size={12} /> No open ceremony dates in the next few months
            </p>
          )
        )}
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-name">Full Name *</Label>
        <Input
          id="ceremony-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Your full name"
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-phone">Phone Number *</Label>
        <Input
          id="ceremony-phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="e.g. 0244000000"
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-email">Email Address *</Label>
        <Input
          id="ceremony-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@email.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="ceremony-notes">Notes (optional)</Label>
        <Textarea
          id="ceremony-notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="e.g. preferred date range, any special requests"
        />
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? "Submitting…" : "Request Booking Code"}
      </Button>
    </Card></form>
  );
}
