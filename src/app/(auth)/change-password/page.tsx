"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd      = new FormData(e.currentTarget);
    const current = fd.get("current") as string;
    const next    = fd.get("new")     as string;
    const confirm = fd.get("confirm") as string;

    if (next !== confirm) { setError("Passwords do not match."); return; }
    if (next.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to change password.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--hero-from))] to-[hsl(var(--hero-to))] text-[#fff] shadow-[0_6px_16px_-6px_hsl(var(--hero-to)/0.6)]">
            <KeyRound size={22} />
          </div>
          <h1 className="text-[1.6rem] font-medium tracking-tight text-[var(--navy)]">Set your password</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Your account was created with a temporary password. Please set a new one to continue.
          </p>
        </div>

        <Card className="rounded-[1.5rem] p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="alert alert-error">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Current (Temporary) Password</label>
              <div className="relative">
                <Input
                  name="current"
                  type={showCurrent ? "text" : "password"}
                  required
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button type="button" aria-label={showCurrent ? "Hide password" : "Show password"} onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">New Password</label>
              <div className="relative">
                <Input
                  name="new"
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  className="pr-10"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
                <button type="button" aria-label={showNew ? "Hide password" : "Show password"} onClick={() => setShowNew(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--navy)]">Confirm New Password</label>
              <Input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving…" : "Set new password"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
