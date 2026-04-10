"use client";

import { useTransition } from "react";
import { stopImpersonating } from "@/actions/impersonation.actions";

interface Props {
  adminName: string;
  targetName: string;
  targetRole: string;
}

export default function ImpersonationBanner({ adminName, targetName, targetRole }: Props) {
  const [pending, startTransition] = useTransition();

  const label = targetRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 20px",
        background: "linear-gradient(90deg, #7c3aed 0%, #6d28d9 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        flexWrap: "wrap",
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#fff" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 20,
            padding: "2px 10px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            fontSize: "0.72rem",
            textTransform: "uppercase",
          }}
        >
          Impersonating
        </span>
        <span>
          Viewing as <strong>{targetName}</strong> ({label}) &mdash; logged in as{" "}
          <strong>{adminName}</strong>
        </span>
      </div>

      <button
        onClick={() => startTransition(async () => { await stopImpersonating(); })}
        disabled={pending}
        style={{
          padding: "4px 14px",
          borderRadius: 8,
          border: "1.5px solid rgba(255,255,255,0.6)",
          background: "transparent",
          color: "#fff",
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          whiteSpace: "nowrap",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!pending) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {pending ? "Stopping…" : "Stop Impersonating"}
      </button>
    </div>
  );
}
