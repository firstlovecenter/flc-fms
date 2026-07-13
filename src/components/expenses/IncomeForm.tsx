"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { recordIncome, getBookingsForIncomeLink } from "@/actions/income.actions";
import { Button } from "@/components/ui/button";
import { Input, inputStyles } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const schema = z.object({
  title:      z.string().min(2, "Title is required"),
  narration:  z.string().min(10, "Provide a detailed narration"),
  amount:     z.coerce.number().positive("Amount must be positive"),
  category:   z.string().min(2, "Category is required"),
  source:     z.string().optional(),
  bookingId:  z.string().optional(),
  accountId:  z.string().min(1, "Select which account this income is recorded against"),
  receivedAt: z.string().min(1, "Date is required"),
});

type FormData = z.infer<typeof schema>;

type BookingOption = {
  id: string;
  title: string;
  totalAmount: { toString(): string };
  startTime: Date;
  facility: { name: string } | null;
};

type AccountOption = { id: string; name: string };

const CATEGORIES = [
  "Federal", "Events", "Weddings", "Namings",
  "ECG", "Fuel", "Donations", "Other",
];

export default function IncomeForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingOption[]>([]);

  useEffect(() => {
    getBookingsForIncomeLink().then(setBookings).catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { receivedAt: new Date().toISOString().split("T")[0] },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await recordIncome({
      title:      data.title,
      narration:  data.narration,
      amount:     data.amount,
      category:   data.category,
      source:     data.source || undefined,
      bookingId:  data.bookingId || undefined,
      accountId:  data.accountId,
      receivedAt: new Date(data.receivedAt),
    });

    if ("error" in result && result.error) {
      setError(result.error as string);
    } else {
      router.push("/transactions?tab=income");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} ><Card className="p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div>
        <Label htmlFor="income-title">Title *</Label>
        <Input id="income-title" {...register("title")} placeholder="e.g. Sunday Offering — 5 Jan 2025" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <Label htmlFor="income-narration">Narration *</Label>
        <Textarea
          id="income-narration"
          {...register("narration")}
          rows={3}
          placeholder="Detailed description of the income source, how it was collected, etc."
        />
        {errors.narration && <p className="text-red-500 text-xs mt-1">{errors.narration.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="income-amount">Amount (GH₵) *</Label>
          <Input id="income-amount" {...register("amount")} type="text" inputMode="decimal" placeholder="0.00" />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>
        <div>
          <Label htmlFor="income-category">Category *</Label>
          <select id="income-category" {...register("category")} className={cn(inputStyles)}>
            <option value="">Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="income-source">Source</Label>
          <Input id="income-source" {...register("source")} placeholder="e.g. Church Service, Wire Transfer" />
        </div>
        <div>
          <Label htmlFor="income-received-at">Date Received *</Label>
          <Input id="income-received-at" {...register("receivedAt")} type="date" max={new Date().toISOString().split("T")[0]} />
          <p className="text-xs text-[var(--muted)] mt-1">You can pick a past date for income received earlier.</p>
          {errors.receivedAt && <p className="text-red-500 text-xs mt-1">{errors.receivedAt.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="income-account">Account *</Label>
        <select id="income-account" {...register("accountId")} className={cn(inputStyles)} defaultValue="">
          <option value="" disabled>Select which account this income goes into…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
      </div>

      {bookings.length > 0 && (
        <div>
          <Label htmlFor="income-booking">Link to Booking (optional)</Label>
          <select id="income-booking" {...register("bookingId")} className={cn(inputStyles)}>
            <option value="">— No booking linked —</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} {b.facility ? `(${b.facility.name})` : ""} — GH₵{Number(b.totalAmount).toFixed(2)}
              </option>
            ))}
          </select>
          <p className="text-xs text-[var(--muted)] mt-1">Link this income to an existing approved booking</p>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? "Saving…" : "Record Income"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
      </div>
    </Card></form>
  );
}
