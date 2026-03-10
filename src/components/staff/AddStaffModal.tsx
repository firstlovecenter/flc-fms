"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, X, Copy, Check } from "lucide-react";
import { createStaffUser } from "@/actions/auth.actions";

const schema = z.object({
  name:  z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone number is required"),
  role:  z.enum(["FACILITY_MANAGER", "VICAR"]),
});
type FormData = z.infer<typeof schema>;

export default function AddStaffModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "VICAR" },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => v && fd.append(k, v));
    const result = await createStaffUser(fd);
    if ("error" in result && result.error) { setError(result.error as string); return; }
    if (result.tempPassword) setTempPassword(result.tempPassword);
    router.refresh();
    reset();
  }

  async function copyPassword() {
    if (tempPassword) {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose() {
    setOpen(false);
    setTempPassword(null);
    setError(null);
    reset();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <UserPlus size={16} /> Add Staff
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-[var(--navy)]">Add Staff Member</h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)]">
                <X size={18} />
              </button>
            </div>

            {tempPassword ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold mb-1">✅ Staff member created!</p>
                  <p className="text-sm text-green-600">Share this temporary password securely. It cannot be retrieved again.</p>
                </div>
                <div className="bg-[var(--cream)] border border-[var(--border)] rounded-lg p-3 flex items-center justify-between gap-3">
                  <code className="font-mono text-sm font-semibold text-gray-800 tracking-wider">{tempPassword}</code>
                  <button onClick={copyPassword} className="p-1.5 rounded hover:bg-gray-200 text-[var(--muted)] transition-colors">
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-[var(--muted)] text-center">The staff member must change this password on first login.</p>
                <button onClick={handleClose} className="btn-primary w-full">Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Full Name *</label>
                  <input {...register("name")} className="input" placeholder="Ama Boateng" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email *</label>
                  <input {...register("email")} type="email" className="input" placeholder="ama@campus.org" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone *</label>
                  <input {...register("phone")} className="input" placeholder="+233..." />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--slate)] mb-1">Role *</label>
                  <select {...register("role")} className="input">
                    <option value="VICAR">Vicar</option>
                    <option value="FACILITY_MANAGER">Facility Manager</option>
                  </select>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Vicars have granular permissions. Facility Managers have full campus access.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? "Creating…" : "Create & Generate Password"}
                  </button>
                  <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
