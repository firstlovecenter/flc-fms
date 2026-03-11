"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { updateStaffMember } from "@/actions/staff.actions";

const schema = z.object({
  name:  z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone number is required"),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  staff: { id: string; name: string; email: string; phone: string | null; role: string };
}

export default function EditStaffModal({ open, onClose, staff }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: staff.name, email: staff.email, phone: staff.phone ?? "" },
  });

  useEffect(() => {
    if (open) reset({ name: staff.name, email: staff.email, phone: staff.phone ?? "" });
  }, [open, staff, reset]);

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await updateStaffMember(staff.id, data);
    if (result && "error" in result) { setError(result.error as string); return; }
    router.refresh();
    onClose();
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Edit Staff — {staff.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)]">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Full Name *</label>
            <input {...register("name")} className="input" />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email *</label>
            <input {...register("email")} type="email" className="input" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone *</label>
            <input {...register("phone")} className="input" />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div className="text-xs text-[var(--muted)]">
            Role: <strong>{staff.role.replace("_", " ")}</strong> — Role changes are not supported via edit.
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
