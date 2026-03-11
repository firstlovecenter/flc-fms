"use client";

import { useState } from "react";
import { Phone, ArrowRight, ShieldCheck, CreditCard, Loader2 } from "lucide-react";
import {
  lookupPendingPayments,
  requestPaymentOTP,
  verifyPaymentOTP,
  initiatePublicPayment,
} from "@/actions/public-payment.actions";

type Step = "phone" | "select" | "otp" | "payments";

interface PatronResult {
  patronId: string;
  name: string;
  phoneMasked: string;
  pendingCount: number;
}

interface BookingDetail {
  id: string;
  title: string;
  facilityName: string;
  startTime: string;
  endTime: string;
  amount: number;
}

export default function PaymentFlow() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<PatronResult[]>([]);
  const [selectedPatron, setSelectedPatron] = useState<PatronResult | null>(null);
  const [otpMaskedPhone, setOtpMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await lookupPendingPayments({ phone: phone.trim() });
    setLoading(false);
    if ("error" in res) { setError(res.error as string); return; }
    if (!res.results || res.results.length === 0) {
      setError("No pending payments found for this phone number.");
      return;
    }
    setResults(res.results as PatronResult[]);
    if (res.results.length === 1) {
      // Auto-select if only one match
      await handleSelectPatron(res.results[0] as PatronResult);
    } else {
      setStep("select");
    }
  }

  async function handleSelectPatron(patron: PatronResult) {
    setSelectedPatron(patron);
    setError(null);
    setLoading(true);
    const res = await requestPaymentOTP(patron.patronId);
    setLoading(false);
    if ("error" in res) { setError(res.error as string); return; }
    setOtpMaskedPhone(res.phoneMasked ?? patron.phoneMasked);
    setStep("otp");
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatron) return;
    setError(null);
    setLoading(true);
    const res = await verifyPaymentOTP({ patronId: selectedPatron.patronId, otp: otp.trim() });
    setLoading(false);
    if ("error" in res) { setError(res.error as string); return; }
    setSessionToken(res.sessionToken!);
    setBookings(res.bookings as BookingDetail[]);
    setStep("payments");
  }

  async function handlePay(bookingId: string) {
    setError(null);
    setLoading(true);
    const res = await initiatePublicPayment(bookingId, sessionToken);
    setLoading(false);
    if ("error" in res) { setError(res.error as string); return; }
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GH", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="card w-full" style={{ maxWidth: 480, padding: 0 }}>
      {error && (
        <div
          style={{
            padding: "12px 20px",
            background: "rgba(239,68,68,0.08)",
            borderBottom: "1px solid rgba(239,68,68,0.15)",
            color: "#b91c1c",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Phone lookup */}
      {step === "phone" && (
        <form onSubmit={handleLookup} style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Phone size={18} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--navy)" }}>
              Enter your phone number
            </span>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+233XXXXXXXXX"
            className="input"
            style={{ marginBottom: 16, fontSize: "1.1rem", letterSpacing: 1 }}
            required
            minLength={9}
          />
          <button
            type="submit"
            disabled={loading || phone.length < 9}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Look Up Payments
          </button>
        </form>
      )}

      {/* Step 1b: Select patron if multiple matches */}
      {step === "select" && (
        <div style={{ padding: 24 }}>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 16 }}>
            Multiple accounts found. Select yours:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((r) => (
              <button
                key={r.patronId}
                onClick={() => handleSelectPatron(r)}
                disabled={loading}
                style={{
                  padding: "14px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  background: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                className="hover:bg-[var(--cream)]"
              >
                <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.95rem" }}>
                  {r.name}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                  {r.phoneMasked} • {r.pendingCount} pending payment{r.pendingCount !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setStep("phone"); setResults([]); setError(null); }}
            className="btn-secondary w-full mt-4"
          >
            Back
          </button>
        </div>
      )}

      {/* Step 2: OTP verification */}
      {step === "otp" && (
        <form onSubmit={handleVerifyOTP} style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <ShieldCheck size={18} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--navy)" }}>
              Verify your identity
            </span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 16 }}>
            A 6-digit code has been sent to <strong>{otpMaskedPhone}</strong>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="input"
            style={{
              marginBottom: 16,
              fontSize: "1.4rem",
              fontFamily: "monospace",
              letterSpacing: 8,
              textAlign: "center",
            }}
            required
          />
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Verify & View Payments
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
            className="btn-secondary w-full mt-3"
          >
            Back
          </button>
        </form>
      )}

      {/* Step 3: Payment list */}
      {step === "payments" && (
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <CreditCard size={18} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--navy)" }}>
              Your Pending Payments
            </span>
          </div>

          {bookings.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", textAlign: "center", padding: 20 }}>
              No pending payments found.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {bookings.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 16,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: "0.95rem", marginBottom: 4 }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 8 }}>
                    {b.facilityName} • {formatDate(b.startTime)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--navy)", fontSize: "1.1rem" }}>
                      GH₵{b.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handlePay(b.id)}
                      disabled={loading}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-1"
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CreditCard size={14} />
                      )}
                      Pay Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setStep("phone");
              setBookings([]);
              setSessionToken("");
              setOtp("");
              setPhone("");
              setError(null);
            }}
            className="btn-secondary w-full mt-4"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
