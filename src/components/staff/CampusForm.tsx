"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { createCampus } from "@/actions/campus.actions";

const schema = z.object({
  name:      z.string().min(2),
  subdomain: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only"),
  address:   z.string().optional(),
  phone:     z.string().optional(),
  email:     z.string().email().optional().or(z.literal("")),
  domain:    z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CampusForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await createCampus(data);
    if ("error" in result && result.error) { setError(result.error as string); return; }
    router.push("/campuses");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Campus Name *</label>
          <input {...register("name")} className="input" placeholder="Accra Central Church" />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Subdomain *</label>
          <div className="flex items-center">
            <input {...register("subdomain")} className="input rounded-r-none" placeholder="accra" />
            <span className="border border-l-0 border-gray-300 bg-[var(--cream)] px-3 py-2 text-sm text-[var(--muted)] rounded-r-lg">.platform.com</span>
          </div>
          {errors.subdomain && <p className="text-red-500 text-xs mt-1">{errors.subdomain.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Email</label>
          <input {...register("email")} type="email" className="input" placeholder="accra@church.org" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--slate)] mb-1">Phone</label>
          <input {...register("phone")} className="input" placeholder="+233..." />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Address</label>
        <input {...register("address")} className="input" placeholder="14 Liberation Rd, Accra" />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--slate)] mb-1">Custom Domain (optional)</label>
        <input {...register("domain")} className="input" placeholder="facilities.accrachurch.org" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Creating…" : "Create Campus"}</button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
