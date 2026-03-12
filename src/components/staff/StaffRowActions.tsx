"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, KeyRound, UserX, UserCheck, Pencil } from "lucide-react";
import { deactivateStaffMember, reactivateStaffMember, resetStaffPassword } from "@/actions/staff.actions";
import EditStaffModal from "./EditStaffModal";

interface Props {
  userId: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  inactive?: boolean;
  profilePicture?: string | null;
}

export default function StaffRowActions({ userId, role, name, email, phone, inactive, profilePicture }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    setLoading("deactivate");
    await deactivateStaffMember(userId);
    router.refresh();
    setLoading(null);
    setOpen(false);
  }

  async function handleReactivate() {
    setLoading("reactivate");
    await reactivateStaffMember(userId);
    router.refresh();
    setLoading(null);
    setOpen(false);
  }

  async function handleResetPassword() {
    if (!confirm(`Reset password for ${name}? A new temporary password will be generated.`)) return;
    setLoading("reset");
    await resetStaffPassword(userId);
    setLoading(null);
    setResetSent(true);
    setOpen(false);
    router.refresh();
  }

  if (resetSent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 max-w-56">
        Temporary password sent to the staff member notification channels.
        <button onClick={() => setResetSent(false)} className="text-green-700 hover:text-green-900 ml-2 font-semibold">Dismiss</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="p-1.5 rounded-lg hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--slate)]"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-[var(--border)] rounded-xl shadow-lg w-44 py-1 text-sm">
            {inactive ? (
              <button
                onClick={handleReactivate}
                disabled={loading === "reactivate"}
                className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--cream)] text-green-700 disabled:opacity-50"
              >
                <UserCheck size={14} /> Reactivate
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setOpen(false); setEditOpen(true); }}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--cream)] text-[var(--slate)]"
                >
                  <Pencil size={14} /> Edit Details
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!!loading}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--cream)] text-[var(--slate)] disabled:opacity-50"
                >
                  <KeyRound size={14} /> Reset Password
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={!!loading}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 text-red-600 disabled:opacity-50"
                >
                  <UserX size={14} /> Deactivate
                </button>
              </>
            )}
          </div>
        </>
      )}

      <EditStaffModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        staff={{ id: userId, name, email, phone, role, profilePicture }}
      />
    </div>
  );
}
