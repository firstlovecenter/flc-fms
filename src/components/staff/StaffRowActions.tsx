"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, KeyRound, UserX, UserCheck, Pencil, UserCog, Shield } from "lucide-react";
import { deactivateStaffMember, reactivateStaffMember, resetStaffPassword } from "@/actions/staff.actions";
import { impersonateUser } from "@/actions/impersonation.actions";
import EditStaffModal from "./EditStaffModal";

interface Props {
  userId: string;
  role: string;
  name: string;
  email: string;
  phone: string | null;
  inactive?: boolean;
  profilePicture?: string | null;
  currentUserRole: string;
  /** Holds staff:manage and may act on this account (see checkStaffTarget). */
  canManage?: boolean;
}

export default function StaffRowActions({ userId, role, name, email, phone, inactive, profilePicture, currentUserRole, canManage = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);

  function report(result: unknown) {
    if (result && typeof result === "object" && "error" in result && (result as { error?: string }).error) {
      setImpersonateError((result as { error: string }).error);
      return false;
    }
    return true;
  }

  const canImpersonate = currentUserRole === "SUPER_ADMIN" && role !== "SUPER_ADMIN" && !inactive;

  async function handleImpersonate() {
    setLoading("impersonate");
    setImpersonateError(null);
    const result = await impersonateUser(userId);
    // impersonateUser redirects on success; result only returned on error
    if (result?.error) setImpersonateError(result.error);
    setLoading(null);
    setOpen(false);
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${name}? They will no longer be able to log in.`)) return;
    setLoading("deactivate");
    report(await deactivateStaffMember(userId));
    router.refresh();
    setLoading(null);
    setOpen(false);
  }

  async function handleReactivate() {
    setLoading("reactivate");
    report(await reactivateStaffMember(userId));
    router.refresh();
    setLoading(null);
    setOpen(false);
  }

  async function handleResetPassword() {
    if (!confirm(`Reset password for ${name}? A new temporary password will be generated.`)) return;
    setLoading("reset");
    const ok = report(await resetStaffPassword(userId));
    setLoading(null);
    if (ok) setResetSent(true);
    setOpen(false);
    router.refresh();
  }

  if (resetSent) {
    return (
      <div role="status" className="rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-xs text-success max-w-60">
        Temporary password sent to the staff member notification channels.
        <button onClick={() => setResetSent(false)} className="ml-2 font-semibold underline">Dismiss</button>
      </div>
    );
  }

  if (impersonateError) {
    return (
      <div role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger max-w-60">
        {impersonateError}
        <button onClick={() => setImpersonateError(null)} className="ml-2 font-semibold underline">Dismiss</button>
      </div>
    );
  }

  if (!canManage && !canImpersonate) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={`Actions for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-muted hover:text-[var(--navy)]"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-10 z-20 w-52 rounded-2xl border border-border/70 bg-popover p-1.5 text-sm shadow-[0_16px_40px_-16px_rgb(28_25_23/0.3)] animate-slide-in-down">
            {!canManage ? (
              canImpersonate && (
                <button
                  onClick={handleImpersonate}
                  disabled={loading === "impersonate"}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-inventory hover:bg-muted disabled:opacity-50"
                >
                  <UserCog size={14} /> {loading === "impersonate" ? "Starting…" : "Impersonate"}
                </button>
              )
            ) : inactive ? (
              <button
                onClick={handleReactivate}
                disabled={loading === "reactivate"}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-success hover:bg-muted disabled:opacity-50"
              >
                <UserCheck size={14} /> Reactivate
              </button>
            ) : (
              <>
                {canImpersonate && (
                  <>
                    <button
                      onClick={handleImpersonate}
                      disabled={loading === "impersonate"}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-inventory hover:bg-muted disabled:opacity-50"
                    >
                      <UserCog size={14} /> {loading === "impersonate" ? "Starting…" : "Impersonate"}
                    </button>
                    <div className="my-1 h-px bg-border/70" />
                  </>
                )}
                <button
                  onClick={() => { setOpen(false); setEditOpen(true); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[var(--navy)] hover:bg-muted"
                >
                  <Pencil size={14} /> Edit details
                </button>
                {role !== "SUPER_ADMIN" && (
                  <Link
                    href={`/staff/${userId}/permissions`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[var(--navy)] hover:bg-muted"
                  >
                    <Shield size={14} /> Edit permissions
                  </Link>
                )}
                <button
                  onClick={handleResetPassword}
                  disabled={!!loading}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[var(--navy)] hover:bg-muted disabled:opacity-50"
                >
                  <KeyRound size={14} /> Reset password
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={!!loading}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-danger hover:bg-danger/5 disabled:opacity-50"
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
        currentUserRole={currentUserRole}
        staff={{ id: userId, name, email, phone, role, profilePicture }}
      />
    </div>
  );
}
