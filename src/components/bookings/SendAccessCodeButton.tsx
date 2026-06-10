"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { sendAccessCodeToBooker } from "@/actions/sms.actions";
import { Button } from "@/components/ui/button";

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
      <Button
        type="button"
        variant="outline"
        onClick={handleSend}
        disabled={isPending}
        className="gap-1.5"
      >
        {isPending ? (
          <><Loader2 size={14} className="animate-spin" /> Sending…</>
        ) : (
          <><KeyRound size={14} /> Send Access Code</>
        )}
      </Button>
      {status === "sent" && (
        <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">{message}</span>
      )}
      {status === "error" && (
        <span className="text-xs text-danger bg-danger/10 px-2 py-1 rounded-full">{message}</span>
      )}
    </div>
  );
}
