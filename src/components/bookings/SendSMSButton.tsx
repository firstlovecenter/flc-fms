"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { sendCustomSMSToBooker } from "@/actions/sms.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATES = [
  { label: "Access Code", template: "Your access code for booking \"{title}\" is: [CODE]. Please present this at the reception desk." },
  { label: "Reminder", template: "Reminder: Your booking \"{title}\" is scheduled for {date}. Please arrive 15 minutes early." },
  { label: "Update", template: "Update regarding your booking \"{title}\": [YOUR MESSAGE HERE]" },
  { label: "Check-in Info", template: "For your booking \"{title}\", please check in at the reception desk upon arrival. Bring a valid ID." },
];

type Props = {
  bookingId: string;
  bookingTitle: string;
  bookerName: string;
  bookerPhone: string;
};

export default function SendSMSButton({ bookingId, bookingTitle, bookerName, bookerPhone }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyTemplate(tpl: string) {
    setMessage(tpl.replace("{title}", bookingTitle).replace("{date}", ""));
    setError(null);
    setSuccess(null);
  }

  function handleSend() {
    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await sendCustomSMSToBooker({ bookingId, message: message.trim() });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setSuccess(`SMS sent to ${bookerName}`);
        setMessage("");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => { setOpen(true); setError(null); setSuccess(null); }}
        className="gap-1.5"
      >
        <MessageSquare size={14} /> Send SMS
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--navy)]">Send SMS</h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  To: {bookerName} ({bookerPhone})
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && <div className="bg-danger/10 text-danger text-sm rounded-lg p-3 border border-danger/25">{error}</div>}
              {success && <div className="bg-success/10 text-success text-sm rounded-lg p-3 border border-success/25">{success}</div>}

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Quick Templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => applyTemplate(t.template)}
                      className="px-2.5 py-1 rounded-full text-xs border border-[var(--border)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">
                  Message <span className="font-normal">({message.length}/480)</span>
                </label>
                <Textarea
                  className="w-full"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your SMS message…"
                  maxLength={480}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="gap-1.5"
                  disabled={isPending || !message.trim()}
                  onClick={handleSend}
                >
                  <Send size={14} /> {isPending ? "Sending…" : "Send SMS"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
