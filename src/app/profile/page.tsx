"use client";

import { useState, useEffect, useRef } from "react";
import { User, KeyRound, Save, Eye, EyeOff, Camera, Loader2 } from "lucide-react";
import Image from "next/image";

export default function StaffProfilePage() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", profilePicture: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwMessage, setPwMessage]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        setProfile({ name: d.name, email: d.email, phone: d.phone ?? "", profilePicture: d.profilePicture ?? "" });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mediaType", "profile");
    const res = await fetch("/api/upload-media", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { setMessage({ type: "error", text: data.error ?? "Upload failed." }); return; }
    const patchRes = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profile.name, phone: profile.phone, profilePicture: data.url }),
    });
    if (patchRes.ok) {
      setProfile(p => ({ ...p, profilePicture: data.url }));
      setMessage({ type: "success", text: "Profile picture updated." });
    }
  }

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        phone: fd.get("phone"),
        profilePicture: profile.profilePicture || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(res.ok ? { type: "success", text: "Profile updated." } : { type: "error", text: data.error ?? "Failed." });
    if (res.ok) setProfile(p => ({ ...p, name: data.name, phone: data.phone ?? "", profilePicture: data.profilePicture ?? "" }));
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
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json();
    setPwLoading(false);
    setPwMessage(res.ok ? { type: "success", text: "Password changed." } : { type: "error", text: data.error ?? "Failed." });
    if (res.ok) (e.target as HTMLFormElement).reset();
  }

  const initials = profile.name.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase();

  if (loading) return <div className="p-8 text-[var(--muted)]">Loading…</div>;

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="page-title">My Profile</h1>

      {/* Profile picture */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--slate)] font-semibold mb-5">
          <User size={18} /> Profile Picture
        </div>
        <div className="flex items-center gap-5">
          <div className="relative group">
            {profile.profilePicture ? (
              <Image
                src={profile.profilePicture}
                alt={profile.name}
                width={80}
                height={80}
                unoptimized
                className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[rgba(200,163,90,0.15)] border-2 border-[rgba(200,163,90,0.25)] flex items-center justify-center text-2xl font-bold text-[var(--gold)]">
                {initials || "?"}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploading ? <Loader2 size={20} className="text-white animate-spin" /> : <Camera size={20} className="text-white" />}
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary text-sm"
            >
              {uploading ? "Uploading…" : "Change Photo"}
            </button>
            <p className="text-xs text-[var(--muted)] mt-1">JPG, PNG or WebP · max 5 MB · saved to Sanity</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Profile details */}
      <div className="card p-6">
        <div className="flex items-center gap-2 text-[var(--slate)] font-semibold mb-5">
          <User size={18} /> Profile Details
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Full Name</label>
            <input name="name" defaultValue={profile.name} required className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email Address</label>
            <input value={profile.email} readOnly className="input bg-[var(--cream-dark)] text-[var(--muted)] cursor-not-allowed" title="Email cannot be changed here" />
            <p className="text-xs text-[var(--muted)] mt-1">Email changes must be done by an administrator.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone Number</label>
            <input name="phone" type="tel" defaultValue={profile.phone} className="input" placeholder="+233..." />
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
