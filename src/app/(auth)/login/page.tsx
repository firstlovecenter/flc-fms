"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAnyAccount } from "@/actions/auth.actions";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary" style={{ width: "100%", padding: "11px", justifyContent: "center", marginTop: 8 }}>
      {pending ? "Signing in…" : <><span>Sign In</span> <ArrowRight size={15} /></>}
    </button>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [state, action] = useFormState(
    async (_: unknown, fd: FormData) => loginAnyAccount(fd),
    null
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      const fallback = ("redirectTo" in state && state.redirectTo) ? state.redirectTo : "/dashboard";
      const safeFrom = from && from.startsWith("/") ? from : null;
      router.push(safeFrom ?? fallback);
    }
  }, [state, from, router]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setGoogleError(null);
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential, from }),
            });

            const data = await res.json();
            if (!res.ok || !data?.success) {
              setGoogleError(data?.error ?? "Google login failed.");
              return;
            }

            router.push(data.redirectTo || "/dashboard");
          } catch {
            setGoogleError("Google login failed.");
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: "340",
      });
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [from, router]);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", background: "var(--navy)", position: "relative" }}>
      {/* ── Desktop left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: "60px", position: "relative", overflow: "hidden" }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: "20%", left: "10%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,163,90,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <svg style={{ position: "absolute", top: "25%", right: "5%", opacity: 0.06 }} width="320" height="320" viewBox="0 0 320 320" fill="none">
          <circle cx="160" cy="160" r="150" stroke="#C8A35A" strokeWidth="1"/>
          <circle cx="160" cy="160" r="110" stroke="#C8A35A" strokeWidth="0.5"/>
          <circle cx="160" cy="160" r="70"  stroke="#C8A35A" strokeWidth="0.5"/>
          <line x1="10" y1="160" x2="310" y2="160" stroke="#C8A35A" strokeWidth="0.5"/>
          <line x1="160" y1="10" x2="160" y2="310" stroke="#C8A35A" strokeWidth="0.5"/>
        </svg>

        <div style={{ position: "relative", maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(200,163,90,0.15)", border: "1px solid rgba(200,163,90,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>First Love Center</div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Facility Management</div>
            </div>
          </div>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.8rem", fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 20 }}>
            Welcome back<br /><em style={{ color: "var(--gold)", fontStyle: "italic" }}>to Revival Campus</em>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.75, marginBottom: 40 }}>
            JESUS! SAVIOUR OF THE WORLD!.
          </p>

          {["Easy facility bookings & management", "Instant notifications & updates", "Secure payments & receipts"].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(200,163,90,0.15)", border: "1px solid rgba(200,163,90,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.55)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form panel (full-width on mobile, fixed-width on desktop) ── */}
      <div
        style={{
          background: "var(--cream)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          // Desktop: fixed right column; Mobile: full viewport
        }}
        className="w-full lg:w-[480px] lg:shrink-0 min-h-dvh lg:min-h-0"
      >
        {/* Mobile-only header */}
        <div
          className="flex lg:hidden items-center gap-3 px-6 py-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 700, color: "var(--navy)", lineHeight: 1 }}>First Love Center</div>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2 }}>Facility Management</div>
          </div>
        </div>

        {/* Form content */}
        <div
          className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10"
        >
          <div style={{ width: "100%", maxWidth: 380 }}>
            <div style={{ marginBottom: 32, textAlign: "center" }}>
              {/* Mobile-only welcome heading */}
              <div className="lg:hidden" style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, color: "var(--navy)", lineHeight: 1.3 }}>
                  Welcome back to{" "}
                  <em style={{ color: "var(--gold)", fontStyle: "italic" }}>Revival Campus Facilities</em>
                </p>
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.9rem", fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>Sign In</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Enter your credentials below.</p>
            </div>

            <form action={action} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {state?.error && (
                <div className="alert alert-error">{state.error as string}</div>
              )}

              <div className="form-group">
                <label className="label">Email address</label>
                <input name="email" type="email" required className="input" placeholder="you@organization.org" autoComplete="email" />
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <input name="password" type="password" required className="input" placeholder="••••••••" autoComplete="current-password" />
              </div>

              <SubmitBtn />
            </form>

            <div className="divider" style={{ margin: "28px 0" }}>or</div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div ref={googleButtonRef} />
            </div>

            {googleError && (
              <div className="alert alert-error" style={{ marginTop: 10 }}>{googleError}</div>
            )}

            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--muted)", marginTop: 8 }}>
              New patron?{" "}
              <Link href="/patron/register" style={{ color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>
                Create account →
              </Link>
            </p>

            <p style={{ textAlign: "center", marginTop: 10, fontSize: "0.85rem" }}>
              <Link href="/catalog" style={{ color: "var(--muted)", textDecoration: "none" }}>← Back to catalog</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
