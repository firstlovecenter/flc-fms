"use client";

import { useState } from "react";
import { Phone, ArrowRight, Clock, Building2, CheckCircle2, LogIn, Loader2, MapPin } from "lucide-react";
import { lookupGuestCheckInBookings, requestGuestCheckIn } from "@/actions/checkin.actions";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

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
      if ("upcomingDates" in result && result.upcomingDates && (result.upcomingDates as { date: string; facilityName: string }[]).length > 0) {
        const dates = (result.upcomingDates as { date: string; facilityName: string }[]);
        const uniqueDays = [...new Set(dates.map((d) => {
          const dt = new Date(d.date);
          return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        }))];
        setError(
          `No bookings for today. Your upcoming booking${
            dates.length > 1 ? "s are" : " is"
          } on: ${uniqueDays.join(", ")}. Check-in is available on the day of your booking.`
        );
      } else {
        setError("No approved bookings found for this phone number.");
      }
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
          <div className="w-14 h-14 rounded-full bg-[rgba(255,66,102,0.12)] flex items-center justify-center mx-auto">
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
          <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
        )}

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone Number</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0201234567"
              required
              minLength={9}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !phone.trim()}
            className="w-full gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Looking up…</>
            ) : (
              <>Find My Bookings <ArrowRight size={16} /></>
            )}
          </Button>
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
        <div className="bg-danger/10 border border-danger/25 rounded-lg p-3 text-danger text-sm">{error}</div>
      )}

      <div className="space-y-3">
        {bookings.map((b) => (
          <Card key={b.id} className="p-4 border border-gray-100">
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
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={12} /> Checked In
                  </span>
                ) : b.checkInRequested ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/15 px-2.5 py-1 rounded-full">
                    <Clock size={12} /> Requested
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleRequestCheckIn(b.id)}
                    disabled={requestingId === b.id}
                    className="gap-1.5"
                  >
                    {requestingId === b.id ? (
                      <><Loader2 size={12} className="animate-spin" /> Requesting…</>
                    ) : (
                      <><LogIn size={12} /> Request Check-In</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => { setStep("phone"); setBookings([]); setError(null); }}
        className="w-full"
      >
        ← Use a different phone number
      </Button>
    </div>
  );
}
