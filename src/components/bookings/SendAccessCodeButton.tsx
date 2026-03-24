"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { sendAccessCodeToBooker } from "@/actions/sms.actions";

type Props = {
  bookingId: string;
  bookerName: string;
};

export default function SendAccessCodeButton({ bookingId, bookerName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleSend() {
    setStatus("idle");
    startTransition(async () => {
      const result = await sendAccessCodeToBooker(bookingId);
      if ("error" in result && result.error) {
        setStatus("error");
        setMessage(result.error);
      } else {
        setStatus("sent");
        setMessage(`Access code sent to ${bookerName}`);
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleSend}
        disabled={isPending}
        className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-50"
      >
        {isPending ? (
          <><Loader2 size={14} className="animate-spin" /> Sending…</>
        ) : (
          <><KeyRound size={14} /> Send Access Code</>
        )}
      </button>
      {status === "sent" && (
        <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">{message}</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full">{message}</span>
      )}
    </div>
  );
}
