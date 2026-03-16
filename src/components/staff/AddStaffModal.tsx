"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, X } from "lucide-react";
import { createStaffUser } from "@/actions/auth.actions";

const schema = z.object({
  name:  z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone number is required"),
  role:  z.enum(["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"]),
});
type FormData = z.infer<typeof schema>;

interface Props {
  canAssignSuperAdmin?: boolean;
}

export default function AddStaffModal({ canAssignSuperAdmin = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);
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
    setCreated(true);
    router.refresh();
    reset();
  }

  function handleClose() {
    setOpen(false);
    setCreated(false);
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

            {created ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 font-semibold mb-1">✅ Staff member created!</p>
                  <p className="text-sm text-green-600">Login details have been sent through the configured notification channels.</p>
                </div>
                <p className="text-xs text-[var(--muted)] text-center">The staff member will still be required to change the temporary password on first login.</p>
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
                    <option value="BOOKING_MANAGER">Booking Manager</option>
                    <option value="FACILITY_MANAGER">Facility Manager</option>
                    {canAssignSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                  </select>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Vicars have granular permissions. Booking Managers handle bookings. Facility Managers have full campus access.
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                    {isSubmitting ? "Creating…" : "Create Staff"}
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
