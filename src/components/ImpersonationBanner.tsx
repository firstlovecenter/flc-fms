"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { stopImpersonating } from "@/actions/impersonation.actions";

interface Props {
  adminName: string;
  targetName: string;
  targetRole: string;
}

export default function ImpersonationBanner({ adminName, targetName, targetRole }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const label = targetRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-5 py-2 bg-gradient-to-r from-violet-600 to-violet-700 border-b border-white/15 flex-wrap z-50 shrink-0"
    >
      <div className="flex items-center gap-2 text-[0.82rem] text-[#fff]">
        <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-0.5 font-bold tracking-[0.04em] text-[0.72rem] uppercase">
          Impersonating
        </span>
        <span>
          Viewing as <strong>{targetName}</strong> ({label}) &mdash; logged in as{" "}
          <strong>{adminName}</strong>
        </span>
      </div>

      <button
        onClick={() => startTransition(async () => {
          const result = await stopImpersonating();
          if ("redirectTo" in result) router.push(result.redirectTo);
        })}
        disabled={pending}
        className="px-3.5 py-1 rounded-lg border border-white/60 bg-transparent text-[#fff] text-[0.8rem] font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Stopping…" : "Stop Impersonating"}
      </button>
    </div>
  );
}
