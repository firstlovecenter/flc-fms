"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { updateStaffMember, updateStaffProfilePicture, updateStaffRole } from "@/actions/staff.actions";
import MediaUploader from "@/components/ui/MediaUploader";

const schema = z.object({
  name:  z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(9, "Phone number is required"),
  role: z.enum(["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"]),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserRole: string;
  staff: { id: string; name: string; email: string; phone: string | null; role: string; profilePicture?: string | null };
}

export default function EditStaffModal({ open, onClose, currentUserRole, staff }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [profileImages, setProfileImages] = useState<string[]>(
    staff.profilePicture ? [staff.profilePicture] : []
  );

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: staff.name, email: staff.email, phone: staff.phone ?? "", role: staff.role as FormData["role"] },
  });

  const roleOptions: FormData["role"][] =
    currentUserRole === "SUPER_ADMIN"
      ? ["SUPER_ADMIN", "FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"]
      : ["FACILITY_MANAGER", "BOOKING_MANAGER", "VICAR"];

  useEffect(() => {
    if (open) {
      reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? "",
        role: staff.role as FormData["role"],
      });
      setProfileImages(staff.profilePicture ? [staff.profilePicture] : []);
    }
  }, [open, staff, reset]);

  async function onSubmit(data: FormData) {
    setError(null);

    const detailsResult = await updateStaffMember(staff.id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
    });
    if (detailsResult && "error" in detailsResult) {
      setError(detailsResult.error as string);
      return;
    }

    if (data.role !== staff.role) {
      const roleResult = await updateStaffRole(staff.id, data.role);
      if (roleResult && "error" in roleResult && roleResult.error) {
        setError(roleResult.error as string);
        return;
      }
    }

    // If profile picture changed, save it
    const newPicture = profileImages[0] ?? null;
    if (newPicture !== (staff.profilePicture ?? null)) {
      if (newPicture) await updateStaffProfilePicture(staff.id, newPicture);
    }

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

          {/* Profile Picture */}
          <MediaUploader
            mediaType="staff"
            mediaId={staff.id}
            images={profileImages}
            onImagesChange={setProfileImages}
            max={1}
            label="Profile Picture"
          />
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
          <div>
            <label className="block text-sm font-medium text-[var(--slate)] mb-1">Role *</label>
            <select {...register("role")} className="input">
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.replace("_", " ")}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--muted)] mt-1">
              Facility Manager and Super Admin can update staff roles from this form.
            </p>
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
