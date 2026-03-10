"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setStep("reset");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>Password Reset</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24 }}>Your password has been reset successfully.</p>
          <Link href="/login" className="btn-primary" style={{ display: "inline-flex", padding: "10px 24px", textDecoration: "none" }}>
            Sign In <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--cream)", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/fl-logo.webp" alt="First Love Center" width={64} height={64} style={{ margin: "0 auto 16px", display: "block" }} />
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
            {step === "email" ? "Forgot Password" : "Reset Password"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            {step === "email"
              ? "Enter your email to receive a reset code."
              : "Enter the code sent to your phone/email and your new password."}
          </p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {step === "email" ? (
          <form onSubmit={handleRequestOTP} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="label">Email address</label>
              <input
                type="email"
                required
                className="input"
                placeholder="you@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "11px", justifyContent: "center" }}>
              {loading ? "Sending…" : <><span>Send Reset Code</span> <ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="label">Reset Code</label>
              <input
                type="text"
                required
                className="input"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.2rem" }}
              />
            </div>

            <div className="form-group">
              <label className="label">New Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "11px", justifyContent: "center" }}>
              {loading ? "Resetting…" : <><span>Reset Password</span> <ArrowRight size={15} /></>}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setError(null); }}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <ArrowLeft size={14} /> Request a new code
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--muted)", marginTop: 24 }}>
          <Link href="/login" style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>
            <ArrowLeft size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
