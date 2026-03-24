"use client";

import { useState } from "react";
import { Phone, ArrowRight, Clock, Building2, CheckCircle2, LogIn, Loader2, MapPin } from "lucide-react";
import { lookupGuestCheckInBookings, requestGuestCheckIn } from "@/actions/checkin.actions";
import { useGeolocation } from "@/hooks/useGeolocation";

type BookingResult = {
  id: string;
  title: string;
  facilityName: string;
  startTime: string;
  endTime: string;
  checkInRequested: boolean;
  alreadyCheckedIn: boolean;
};

export default function GuestCheckInFlow() {
  const [step, setStep] = useState<"phone" | "bookings">("phone");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState<BookingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const { getPosition } = useGeolocation();

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setError(null);
    setLoading(true);
    const result = await lookupGuestCheckInBookings({ phone: phone.trim() });
    setLoading(false);
    if ("error" in result) {
      setError(result.error as string);
      return;
    }
    if (!result.bookings || result.bookings.length === 0) {
      setError("No approved bookings found for this phone number today.");
      return;
    }
    setBookings(result.bookings);
    setStep("bookings");
  }

  async function handleRequestCheckIn(bookingId: string) {
    setError(null);
    setRequestingId(bookingId);

    // Try to get location for proximity verification
    const coords = await getPosition();

    const result = await requestGuestCheckIn({
      bookingId,
      phone: phone.trim(),
      ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
    });
    setRequestingId(null);
    if (result && "error" in result) {
      setError(result.error as string);
      return;
    }
    // Update local state
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, checkInRequested: true } : b))
    );
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (step === "phone") {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-[rgba(200,163,90,0.12)] flex items-center justify-center mx-auto">
            <Phone size={24} className="text-[var(--gold)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
            Guest Check-In
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Enter the phone number you used when booking to request check-in.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full"
              placeholder="0201234567"
              required
              minLength={9}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Looking up…</>
            ) : (
              <>Find My Bookings <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
          Today&apos;s Bookings
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Request check-in for your approved bookings. Staff will confirm your arrival.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => (
          <div key={b.id} className="card p-4 border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--navy)] text-sm">{b.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Building2 size={11} /> {b.facilityName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatTime(b.startTime)} – {formatTime(b.endTime)}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                {b.alreadyCheckedIn ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={12} /> Checked In
                  </span>
                ) : b.checkInRequested ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                    <Clock size={12} /> Requested
                  </span>
                ) : (
                  <button
                    onClick={() => handleRequestCheckIn(b.id)}
                    disabled={requestingId === b.id}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {requestingId === b.id ? (
                      <><Loader2 size={12} className="animate-spin" /> Requesting…</>
                    ) : (
                      <><LogIn size={12} /> Request Check-In</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => { setStep("phone"); setBookings([]); setError(null); }}
        className="btn-secondary w-full text-sm"
      >
        ← Use a different phone number
      </button>
    </div>
  );
}
