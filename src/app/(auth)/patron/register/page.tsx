"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { registerPatron } from "@/actions/auth.actions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-gold w-full" style={{ padding: "12px", justifyContent: "center" }}>
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
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, background: "var(--navy)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Home size={17} style={{ color: "var(--gold)" }} />
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 600, color: "var(--navy)" }}>First Love Center</span>
          </Link>
        </div>

        <div className="card-elevated" style={{ padding: "36px 32px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 600, color: "var(--navy)", marginBottom: 4 }}>Create Account</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: 28 }}>Register to book facilities</p>

          {state?.error && (
            <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 8, padding: "10px 14px", color: "#9F1239", fontSize: "0.85rem", marginBottom: 20 }}>
              {state.error}
            </div>
          )}

          <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--navy)", marginBottom: 6 }}>Full Name</label>
              <input name="name" required className="input" placeholder="Kwame Asante" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--navy)", marginBottom: 6 }}>Email Address</label>
              <input name="email" type="email" required className="input" placeholder="kwame@example.com" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--navy)", marginBottom: 6 }}>Phone Number</label>
              <input name="phone" type="tel" required className="input" placeholder="+233..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 500, color: "var(--navy)", marginBottom: 6 }}>Password</label>
              <input name="password" type="password" required minLength={8} className="input" placeholder="Min. 8 characters" />
            </div>
            <div style={{ marginTop: 6 }}>
              <SubmitButton />
            </div>
          </form>

          <p style={{ textAlign: "center", marginTop: 22, fontSize: "0.82rem", color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/patron/login" style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>Sign in →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
