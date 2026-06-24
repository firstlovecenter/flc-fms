"use client";

import { useState, useEffect, useRef } from "react";
import { User, KeyRound, Save, Eye, EyeOff, Camera, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

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
      <Card className="p-6">
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
              <div className="w-20 h-20 rounded-full bg-gold/15 border-2 border-gold/25 flex items-center justify-center text-2xl font-bold text-gold">
                {initials || "?"}
              </div>
            )}
            <button
              type="button"
              aria-label="Change profile photo"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              {uploading ? <Loader2 size={20} className="text-[#fff] animate-spin" /> : <Camera size={20} className="text-[#fff]" />}
            </button>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Change Photo"}
            </Button>
            <p className="text-xs text-[var(--muted)] mt-1">JPG, PNG or WebP · max 5 MB · saved to Sanity</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-success/10 text-success border border-success/25" : "bg-danger/10 text-danger border border-danger/25"}`}>
            {message.text}
          </div>
        )}
      </Card>

      {/* Profile details */}
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--slate)] font-semibold mb-5">
          <User size={18} /> Profile Details
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label htmlFor="profile-name" className="text-[var(--slate)] mb-1">Full Name</Label>
            <Input id="profile-name" name="name" defaultValue={profile.name} required />
          </div>
          <div>
            <Label htmlFor="profile-email" className="text-[var(--slate)] mb-1">Email Address</Label>
            <Input id="profile-email" value={profile.email} readOnly className="bg-[var(--cream-dark)] text-[var(--muted)] cursor-not-allowed" title="Email cannot be changed here" />
            <p className="text-xs text-[var(--muted)] mt-1">Email changes must be done by an administrator.</p>
          </div>
          <div>
            <Label htmlFor="profile-phone" className="text-[var(--slate)] mb-1">Phone Number</Label>
            <Input id="profile-phone" name="phone" type="tel" defaultValue={profile.phone} placeholder="+233..." />
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card className="p-6">
        <div className="flex items-center gap-2 text-[var(--slate)] font-semibold mb-5">
          <KeyRound size={18} /> Change Password
        </div>
        {pwMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${pwMessage.type === "success" ? "bg-success/10 text-success border border-success/25" : "bg-danger/10 text-danger border border-danger/25"}`}>
            {pwMessage.text}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label htmlFor="pw-current" className="text-[var(--slate)] mb-1">Current Password</Label>
            <div className="relative">
              <Input id="pw-current" name="current" type={showCurrent ? "text" : "password"} required className="pr-10" autoComplete="current-password" />
              <button type="button" aria-label={showCurrent ? "Hide current password" : "Show current password"} onClick={() => setShowCurrent(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="pw-new" className="text-[var(--slate)] mb-1">New Password</Label>
            <div className="relative">
              <Input id="pw-new" name="new" type={showNew ? "text" : "password"} required minLength={8} className="pr-10" autoComplete="new-password" placeholder="Min. 8 characters" />
              <button type="button" aria-label={showNew ? "Hide new password" : "Show new password"} onClick={() => setShowNew(s => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="pw-confirm" className="text-[var(--slate)] mb-1">Confirm New Password</Label>
            <Input id="pw-confirm" name="confirm" type="password" required autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={pwLoading} className="gap-2">
            <KeyRound size={16} /> {pwLoading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
