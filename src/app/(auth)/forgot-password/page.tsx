"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import AuthShell, { AuthBrandLink } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
      <AuthShell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={26} className="text-success" />
          </div>
          <h2 className="text-[1.5rem] font-bold text-[var(--navy)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Password Reset
          </h2>
          <p className="text-[var(--text-muted)] text-[0.9rem] mb-6">
            Your password has been reset successfully.
          </p>
          <Link href="/login" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
            Sign In <ArrowRight size={15} />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
        <AuthBrandLink />
        <Card className="p-9">
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
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="you@organization.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Sending…" : <><span>Send Reset Code</span> <ArrowRight size={15} /></>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-[18px]">
              <div className="form-group">
                <Label htmlFor="reset-otp">Reset Code</Label>
                <Input
                  id="reset-otp"
                  type="text"
                  required
                  className="text-center text-[1.2rem] tracking-[0.3em]"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>

              <div className="form-group">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  required
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <Label htmlFor="reset-confirm">Confirm Password</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Resetting…" : <><span>Reset Password</span> <ArrowRight size={15} /></>}
              </Button>

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
        </Card>
    </AuthShell>
  );
}
