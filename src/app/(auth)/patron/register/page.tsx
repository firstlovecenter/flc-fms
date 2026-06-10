"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerPatron } from "@/actions/auth.actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthShell, { AuthBrandLink } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" disabled={pending} className="w-full">
      {pending ? "Creating account…" : "Create Account"}
    </Button>
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
        <Card className="p-9">
          <h1 className="text-[1.6rem] font-semibold text-[var(--navy)] mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Create Account
          </h1>
          <p className="text-[var(--text-muted)] text-[0.875rem] mb-7">Register to book facilities</p>

          {state?.error && (
            <div className="alert alert-error mb-5">{state.error}</div>
          )}

          <form action={action} className="flex flex-col gap-3.5">
            <div className="form-group">
              <Label htmlFor="reg-name">Full Name</Label>
              <Input id="reg-name" name="name" required placeholder="Kwame Asante" />
            </div>
            <div className="form-group">
              <Label htmlFor="reg-email">Email Address</Label>
              <Input id="reg-email" name="email" type="email" required placeholder="kwame@example.com" />
            </div>
            <div className="form-group">
              <Label htmlFor="reg-phone">Phone Number</Label>
              <Input id="reg-phone" name="phone" type="tel" required placeholder="+233..." />
            </div>
            <div className="form-group">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" name="password" type="password" required minLength={8} placeholder="Min. 8 characters" />
            </div>
            <div className="mt-1.5">
              <SubmitButton />
            </div>
          </form>

          <p className="text-center mt-5 text-[0.82rem] text-[var(--text-muted)]">
            Already have an account?{" "}
            <Link href="/patron/login" className="link-gold">Sign in →</Link>
          </p>
        </Card>
    </AuthShell>
  );
}
