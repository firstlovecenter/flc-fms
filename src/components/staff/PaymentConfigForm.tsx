"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Save } from "lucide-react";
import { configurePaymentGateway } from "@/actions/payment.actions";
import { formatDateTime } from "@/lib/utils";

const schema = z.object({
  provider:      z.enum(["PAYSTACK", "FLUTTERWAVE", "HUBTEL"]),
  publicKey:     z.string().min(5, "Public key required"),
  secretKey:     z.string().min(5, "Secret key required"),
  webhookSecret: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const PROVIDER_HINTS: Record<string, { pub: string; sec: string; webhook: string }> = {
  PAYSTACK: {
    pub:     "pk_live_... or pk_test_...",
    sec:     "sk_live_... or sk_test_...",
    webhook: "Your Paystack webhook secret (from dashboard → Settings → API)",
  },
  FLUTTERWAVE: {
    pub:     "FLWPUBK_...",
    sec:     "FLWSECK_...",
    webhook: "Secret hash from Flutterwave dashboard → Webhooks",
  },
  HUBTEL: {
    pub:     "Merchant account number",
    sec:     "clientId:clientSecret (combined with colon)",
    webhook: "Optional verification token",
  },
};

interface Props {
  campusId: string;
  currentProvider: string | null;
  currentPublicKey: string | null;
  lastUpdated: Date | null;
}

export default function PaymentConfigForm({ campusId, currentProvider, currentPublicKey, lastUpdated }: Props) {
  const router = useRouter();
  const [showSecret, setShowSecret]   = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      provider:  (currentProvider as FormData["provider"]) ?? "PAYSTACK",
      publicKey: currentPublicKey ?? "",
    },
  });

  const provider = watch("provider");
  const hints    = PROVIDER_HINTS[provider] ?? PROVIDER_HINTS.PAYSTACK;

  async function onSubmit(data: FormData) {
    setError(null);
    setSaved(false);
    const result = await configurePaymentGateway(data);
    if ("error" in result && result.error) { setError(result.error as string); return; }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Provider *</label>
          <select {...register("provider")} className="input">
            <option value="PAYSTACK">Paystack</option>
            <option value="FLUTTERWAVE">Flutterwave</option>
            <option value="HUBTEL">Hubtel</option>
          </select>
        </div>

        {/* Public key */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Public Key *</label>
          <input
            {...register("publicKey")}
            className="input font-mono text-sm"
            placeholder={hints.pub}
          />
          {errors.publicKey && <p className="text-red-500 text-xs mt-1">{errors.publicKey.message}</p>}
        </div>
      </div>

      {/* Secret key */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">
          Secret Key * <span className="font-normal text-[var(--muted)]">(stored encrypted — always re-enter to update)</span>
        </label>
        <div className="relative">
          <input
            {...register("secretKey")}
            type={showSecret ? "text" : "password"}
            className="input font-mono text-sm pr-10"
            placeholder={hints.sec}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowSecret((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--slate)]"
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.secretKey && <p className="text-red-500 text-xs mt-1">{errors.secretKey.message}</p>}
      </div>

      {/* Webhook secret */}
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">
          Webhook Secret <span className="font-normal text-[var(--muted)]">(recommended)</span>
        </label>
        <div className="relative">
          <input
            {...register("webhookSecret")}
            type={showWebhook ? "text" : "password"}
            className="input font-mono text-sm pr-10"
            placeholder={hints.webhook}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowWebhook((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--slate)]"
          >
            {showWebhook ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Webhook URL hint */}
      <div className="bg-[var(--cream)] border border-[var(--border)] rounded-lg p-3 text-xs font-mono text-[var(--muted)]">
        Register this webhook URL with {provider}:
        <span className="text-[var(--navy)] ml-1">
          https://[campus].platform.com/api/webhooks/{provider.toLowerCase()}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
          <Save size={15} />
          {isSubmitting ? "Saving…" : "Save Configuration"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved successfully</span>}
        {lastUpdated && (
          <span className="text-xs text-[var(--muted)] ml-auto">Last updated: {formatDateTime(lastUpdated)}</span>
        )}
      </div>
    </form>
  );
}
