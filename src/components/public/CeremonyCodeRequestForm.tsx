"use client";

import { useState, useRef } from "react";
import { Upload, X, FileImage } from "lucide-react";
import { requestCeremonyCode } from "@/actions/ceremony-code.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

export default function CeremonyCodeRequestForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    ceremonyType: "WEDDING" as "WEDDING" | "NAMING",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);
    if (!file) {
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setUploadError("Only JPEG, PNG, WebP, or PDF files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be 5MB or smaller.");
      return;
    }

    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  }

  function removeFile() {
    setReceiptFile(null);
    setReceiptPreview(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadError(null);

    try {
      // Upload receipt first if provided
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const fd = new FormData();
        fd.append("file", receiptFile);
        const res = await fetch("/api/upload-receipt", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.url) {
          setUploadError(json.error ?? "Receipt upload failed. Please try again.");
          setLoading(false);
          return;
        }
        receiptUrl = json.url as string;
      }

      const result = await requestCeremonyCode({ ...form, receiptUrl });
      if ("error" in result) {
        setError(result.error ?? "An error occurred.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="p-8 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-success/10 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--navy)]">
          Request received!
        </h2>
        <p className="text-[var(--slate)] text-sm max-w-sm mx-auto">
          Your request has been received. You will receive your booking code via
          SMS and email once your payment is confirmed.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} ><Card className="p-8 space-y-5 max-w-lg mx-auto">
      <div className="form-group">
        <Label htmlFor="ceremony-type">Ceremony Type</Label>
        <NativeSelect
          id="ceremony-type"
          name="ceremonyType"
          value={form.ceremonyType}
          onChange={handleChange}
          className="w-full"
          required
        >
          <option value="WEDDING">Wedding</option>
          <option value="NAMING">Naming Ceremony</option>
        </NativeSelect>
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-name">Full Name *</Label>
        <Input
          id="ceremony-name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Your full name"
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-phone">Phone Number *</Label>
        <Input
          id="ceremony-phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="e.g. 0244000000"
          required
        />
      </div>

      <div className="form-group">
        <Label htmlFor="ceremony-email">Email Address *</Label>
        <Input
          id="ceremony-email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@email.com"
          required
        />
      </div>

      {/* Payment Receipt Upload */}
      <div>
        <Label htmlFor="receipt-upload">
          Payment Receipt / Screenshot *
        </Label>
        <p className="text-xs text-[var(--muted)] mb-2">
          Upload a screenshot or photo of your payment confirmation. Accepted formats: JPEG, PNG, WebP, PDF (max 5MB).
        </p>

        {!receiptFile ? (
          <label
            htmlFor="receipt-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[rgba(22,26,31,0.18)] rounded-xl cursor-pointer hover:border-[var(--gold)] hover:bg-[rgba(255,66,102,0.04)] transition-colors"
          >
            <Upload size={22} className="text-[var(--muted)] mb-2" />
            <span className="text-sm font-medium text-[var(--navy)]">Click to upload receipt</span>
            <span className="text-xs text-[var(--muted)] mt-0.5">or drag and drop</span>
            <input
              id="receipt-upload"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              required
            />
          </label>
        ) : (
          <div className="relative border border-[rgba(22,26,31,0.10)] rounded-xl overflow-hidden bg-gray-50">
            {receiptPreview ? (
              <img
                src={receiptPreview}
                alt="Payment receipt preview"
                className="w-full max-h-48 object-contain"
              />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <FileImage size={28} className="text-[var(--navy)] flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--navy)] truncate">{receiptFile.name}</p>
                  <p className="text-xs text-[var(--muted)]">{(receiptFile.size / 1024).toFixed(0)} KB · PDF</p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={removeFile}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center hover:bg-danger/10"
              title="Remove file"
              aria-label="Remove file"
            >
              <X size={12} className="text-danger" />
            </button>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-danger mt-1">{uploadError}</p>
        )}
      </div>

      <div>
        <Label htmlFor="ceremony-notes">Notes (optional)</Label>
        <Textarea
          id="ceremony-notes"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          placeholder="e.g. preferred date range, any special requests"
        />
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? "Submitting…" : "Request Booking Code"}
      </Button>
    </Card></form>
  );
}
