"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerPatron } from "@/actions/auth.actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthShell, { AuthBrandLink } from "@/components/layout/AuthShell";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-gold w-full justify-center py-3">
      {pending ? "Creating account…" : "Create Account"}
    </button>
  );
}

export default function PatronRegisterPage() {
  const router = useRouter();
  const [state, action] = useFormState(
    async (_: unknown, formData: FormData) => registerPatron(formData),
    null
  );

  useEffect(() => {
    if (state && "success" in state && state.success) router.push("/patron/dashboard");
  }, [state, router]);

  return (
    <AuthShell>
        <AuthBrandLink />
        <div className="card p-9">
          <h1 className="text-[1.6rem] font-semibold text-[var(--navy)] mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Create Account
          </h1>
          <p className="text-[var(--text-muted)] text-[0.875rem] mb-7">Register to book facilities</p>

          {state?.error && (
            <div className="alert alert-error mb-5">{state.error}</div>
          )}

          <form action={action} className="flex flex-col gap-3.5">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input name="name" required className="input" placeholder="Kwame Asante" />
            </div>
            <div className="form-group">
              <label className="label">Email Address</label>
              <input name="email" type="email" required className="input" placeholder="kwame@example.com" />
            </div>
            <div className="form-group">
              <label className="label">Phone Number</label>
              <input name="phone" type="tel" required className="input" placeholder="+233..." />
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input name="password" type="password" required minLength={8} className="input" placeholder="Min. 8 characters" />
            </div>
            <div className="mt-1.5">
              <SubmitButton />
            </div>
          </form>

          <p className="text-center mt-5 text-[0.82rem] text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href="/patron/login" className="link-gold">Sign in →</Link>
          </p>
        </div>
    </AuthShell>
  );
}
