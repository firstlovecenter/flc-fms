"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { submitFacilityFeedback } from "@/actions/feedback.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const schema = z
  .object({
    type: z.enum(["COMPLAINT", "FEEDBACK", "SUGGESTION"]),
    isAnonymous: z.enum(["yes", "no"]),
    submitterName: z.string().optional(),
    submitterEmail: z.string().optional(),
    submitterPhone: z.string().optional(),
    facilityId: z.string().optional(),
    subject: z.string().min(3, "Subject is required"),
    message: z.string().min(20, "Please provide at least 20 characters"),
  })
  .superRefine((data, ctx) => {
    if (data.isAnonymous === "yes") return;
    if (!data.submitterName || data.submitterName.trim().length < 2) {
      ctx.addIssue({ code: "custom", message: "Name is required", path: ["submitterName"] });
    }
    const emailOk =
      !!data.submitterEmail && z.string().email().safeParse(data.submitterEmail).success;
    const phoneOk = !!data.submitterPhone && data.submitterPhone.trim().length >= 9;
    if (!emailOk && !phoneOk) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a valid email or phone number",
        path: ["submitterEmail"],
      });
    }
  });

type FormData = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: "COMPLAINT", label: "Complaint" },
  { value: "FEEDBACK", label: "Feedback" },
  { value: "SUGGESTION", label: "Suggestion" },
] as const;

export default function FeedbackForm({
  facilities,
}: {
  facilities: { id: string; name: string }[];
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [wasAnonymous, setWasAnonymous] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "FEEDBACK",
      isAnonymous: "no",
      facilityId: "",
      subject: "",
      message: "",
    },
  });

  const isAnonymous = watch("isAnonymous") === "yes";

  async function onSubmit(data: FormData) {
    setServerError(null);
    const anonymous = data.isAnonymous === "yes";

    const result = await submitFacilityFeedback({
      type: data.type,
      isAnonymous: anonymous,
      submitterName: anonymous ? undefined : data.submitterName,
      submitterEmail: anonymous ? undefined : data.submitterEmail,
      submitterPhone: anonymous ? undefined : data.submitterPhone,
      facilityId: data.facilityId || undefined,
      subject: data.subject,
      message: data.message,
    });

    if ("error" in result && result.error) {
      setServerError(result.error);
      return;
    }

    if ("id" in result && result.id) {
      setWasAnonymous(anonymous);
      setSubmittedId(result.id);
    }
  }

  if (submittedId) {
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} className="text-success" />
        </div>
        <h3 className="font-display text-2xl font-bold text-[var(--navy)] dark:text-gray-100">
          Submission Received
        </h3>
        <p className="text-[var(--slate)] dark:text-gray-300 max-w-md mx-auto">
          {wasAnonymous
            ? "Thank you. Your submission was received anonymously. Because no contact details were provided, we cannot follow up with you directly."
            : "Thank you. We have received your submission and may contact you using the details you provided if follow-up is needed."}
        </p>
        <p className="text-sm text-[var(--muted)]">
          Reference: <strong>{submittedId.slice(0, 8).toUpperCase()}</strong>
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold mt-2 text-[var(--navy)] dark:text-[var(--gold)]"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && <div className="alert alert-error">{serverError}</div>}

      <Card className="p-4 md:p-5 space-y-4">
        <p className="text-xs uppercase tracking-wider font-bold text-[var(--muted)]">
          Submission Details
        </p>

        <div>
          <Label htmlFor="fb-type">Type</Label>
          <NativeSelect id="fb-type" {...register("type")} className="w-full">
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        {facilities.length > 0 && (
          <div>
            <Label htmlFor="fb-facility">Facility (optional)</Label>
            <NativeSelect id="fb-facility" {...register("facilityId")} className="w-full">
              <option value="">Select a facility (optional)</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}

        <div>
          <Label htmlFor="fb-subject">Subject</Label>
          <Input
            id="fb-subject"
            {...register("subject")}
            placeholder="Brief summary of your complaint or feedback"
          />
          {errors.subject && (
            <p className="text-xs text-danger mt-1">{errors.subject.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="fb-message">Message</Label>
          <Textarea
            id="fb-message"
            {...register("message")}
            rows={5}
            placeholder="Describe your experience, concern, or suggestion in detail..."
          />
          {errors.message && (
            <p className="text-xs text-danger mt-1">{errors.message.message}</p>
          )}
        </div>
      </Card>

      <Card className="p-4 md:p-5 space-y-4">
        <p className="text-xs uppercase tracking-wider font-bold text-[var(--muted)]">
          Your Identity
        </p>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--navy)] mb-2">
            Would you like to stay anonymous?
          </legend>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="no" {...register("isAnonymous")} className="accent-[var(--navy)]" />
            No — I want to be contacted if needed
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" value="yes" {...register("isAnonymous")} className="accent-[var(--navy)]" />
            Yes — keep me anonymous
          </label>
        </fieldset>

        {!isAnonymous && (
          <div className="space-y-4 pt-2 border-t border-[var(--border)]">
            <div>
              <Label htmlFor="fb-name">Your Name</Label>
              <Input id="fb-name" {...register("submitterName")} placeholder="Full name" />
              {errors.submitterName && (
                <p className="text-xs text-danger mt-1">{errors.submitterName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fb-email">Email</Label>
                <Input
                  id="fb-email"
                  type="email"
                  {...register("submitterEmail")}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <Label htmlFor="fb-phone">Phone</Label>
                <Input
                  id="fb-phone"
                  type="tel"
                  {...register("submitterPhone")}
                  placeholder="024 000 0000"
                />
              </div>
            </div>
            {errors.submitterEmail && (
              <p className="text-xs text-danger">{errors.submitterEmail.message}</p>
            )}
            <p className="text-xs text-[var(--muted)]">
              Provide at least one of email or phone so we can reach you.
            </p>
          </div>
        )}
      </Card>

      <Button type="submit" variant="gold" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting…" : "Submit Feedback"}
      </Button>
    </form>
  );
}
