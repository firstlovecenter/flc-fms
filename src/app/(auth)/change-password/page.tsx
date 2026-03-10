"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-3">
            <KeyRound size={22} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--navy)]">Set Your Password</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Your account was created with a temporary password. Please set a new one to continue.
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Current (Temporary) Password</label>
              <div className="relative">
                <input
                  name="current"
                  type={showCurrent ? "text" : "password"}
                  required
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowCurrent(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">New Password</label>
              <div className="relative">
                <input
                  name="new"
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  className="input pr-10"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                />
                <button type="button" onClick={() => setShowNew(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--slate)] mb-1">Confirm New Password</label>
              <input
                name="confirm"
                type="password"
                required
                className="input"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Saving…" : "Set New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
