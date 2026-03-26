"use client";

import { useState } from "react";
import { requestCeremonyCode } from "@/actions/ceremony-code.actions";

export default function CeremonyCodeRequestForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    ceremonyType: "WEDDING" as "WEDDING" | "NAMING",
    notes: "",
  });
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
      <div className="card p-8 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-green-600"
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
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-8 space-y-5 max-w-lg mx-auto">
      <div>
        <label className="label">Ceremony Type</label>
        <select
          name="ceremonyType"
          value={form.ceremonyType}
          onChange={handleChange}
          className="input"
          required
        >
          <option value="WEDDING">Wedding</option>
          <option value="NAMING">Naming Ceremony</option>
        </select>
      </div>

      <div>
        <label className="label">Full Name *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          className="input"
          placeholder="Your full name"
          required
        />
      </div>

      <div>
        <label className="label">Phone Number *</label>
        <input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          className="input"
          placeholder="e.g. 0244000000"
          required
        />
      </div>

      <div>
        <label className="label">Email Address *</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="input"
          placeholder="you@email.com"
          required
        />
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          className="input"
          rows={3}
          placeholder="e.g. preferred date range, any special requests"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Request Booking Code"}
      </button>
    </form>
  );
}
