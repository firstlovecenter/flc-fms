"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { Home } from "lucide-react";

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
      <div className="min-h-dvh bg-[var(--cream)] dark:bg-transparent flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-[400px] text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={26} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-[1.5rem] font-bold text-[var(--navy)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Password Reset
          </h2>
          <p className="text-[var(--text-muted)] text-[0.9rem] mb-6">
            Your password has been reset successfully.
          </p>
          <Link href="/login" className="btn-primary inline-flex">
            Sign In <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--cream)] dark:bg-transparent flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <div className="w-9 h-9 bg-[var(--navy)] rounded-[9px] flex items-center justify-center">
              <Home size={17} className="text-[var(--gold)]" />
            </div>
            <span className="text-[1.25rem] font-semibold text-[var(--navy)]" style={{ fontFamily: "var(--font-display)" }}>
              First Love Center
            </span>
          </Link>
        </div>

        <div className="card p-9">
          <div className="text-center mb-7">
            <h2 className="text-[1.5rem] font-bold text-[var(--navy)] mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
              {step === "email" ? "Forgot Password" : "Reset Password"}
            </h2>
            <p className="text-[0.85rem] text-[var(--text-muted)]">
              {step === "email"
                ? "Enter your email to receive a reset code."
                : "Enter the code sent to your phone/email and your new password."}
            </p>
          </div>

          {error && <div className="alert alert-error mb-5">{error}</div>}

          {step === "email" ? (
            <form onSubmit={handleRequestOTP} className="flex flex-col gap-[18px]">
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

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? "Sending…" : <><span>Send Reset Code</span> <ArrowRight size={15} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-[18px]">
              <div className="form-group">
                <label className="label">Reset Code</label>
                <input
                  type="text"
                  required
                  className="input text-center text-[1.2rem] tracking-[0.3em]"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
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

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? "Resetting…" : <><span>Reset Password</span> <ArrowRight size={15} /></>}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); }}
                className="flex items-center justify-center gap-1.5 text-[0.85rem] text-[var(--text-muted)] hover:text-[var(--navy)] transition-colors bg-transparent border-none cursor-pointer"
              >
                <ArrowLeft size={14} /> Request a new code
              </button>
            </form>
          )}

          <p className="text-center text-[0.85rem] mt-6">
            <Link href="/login" className="link-gold inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
