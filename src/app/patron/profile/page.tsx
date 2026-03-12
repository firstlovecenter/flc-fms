"use client";

import { useState, useEffect } from "react";
import { User, KeyRound, Save, Eye, EyeOff } from "lucide-react";

export default function PatronProfilePage() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwMessage, setPwMessage]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/patron/profile")
      .then(r => r.json())
      .then(d => { setProfile({ name: d.name, email: d.email, phone: d.phone ?? "" }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/patron/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone") }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? { type: "success", text: "Profile updated." } : { type: "error", text: data.error ?? "Failed." });
    if (res.ok) setProfile({ name: data.name, email: data.email, phone: data.phone ?? "" });
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd      = new FormData(e.currentTarget);
    const current = fd.get("current") as string;
    const next    = fd.get("new")     as string;
    const confirm = fd.get("confirm") as string;

    if (next !== confirm) { setPwMessage({ type: "error", text: "Passwords do not match." }); return; }
    if (next.length < 8)  { setPwMessage({ type: "error", text: "Min. 8 characters." }); return; }

    setPwLoading(true);
    setPwMessage(null);
    const res = await fetch("/api/patron/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json();
    setPwLoading(false);
    setPwMessage(res.ok ? { type: "success", text: "Password changed." } : { type: "error", text: data.error ?? "Failed." });
    if (res.ok) (e.target as HTMLFormElement).reset();
  }

  if (loading) return <div className="p-8 text-[var(--muted)]">Loading…</div>;

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="page-title">My Profile</h1>

      {/* Profile details */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--slate)] font-semibold mb-5">
          <User size={18} /> Profile Details
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Full Name</label>
            <input name="name" defaultValue={profile.name} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email Address</label>
            <input name="email" type="email" defaultValue={profile.email} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone Number *</label>
            <input name="phone" type="tel" required defaultValue={profile.phone} className="input" placeholder="+233..." />
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--slate)] font-semibold mb-5">
          <KeyRound size={18} /> Change Password
        </div>

        {pwMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${pwMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {pwMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Current Password</label>
            <div className="relative">
              <input name="current" type={showCurrent ? "text" : "password"} required className="input pr-10" autoComplete="current-password" />
              <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">New Password</label>
            <div className="relative">
              <input name="new" type={showNew ? "text" : "password"} required minLength={8} className="input pr-10" autoComplete="new-password" placeholder="Min. 8 characters" />
              <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Confirm New Password</label>
            <input name="confirm" type="password" required className="input" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2">
            <KeyRound size={16} /> {pwLoading ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
