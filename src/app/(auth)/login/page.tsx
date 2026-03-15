"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAnyAccount } from "@/actions/auth.actions";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const LEFT_SPLIT_VIDEO_PRIMARY = "/left-split-bg.mp4";
const LEFT_SPLIT_VIDEO_FALLBACK = "/splash-bg.mp4";
const LEFT_SPLIT_IMAGE_PRIMARY = "/left-split-bg.jpg";
const LEFT_SPLIT_IMAGE_FALLBACK = "/fl-logo-white.webp";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full"
      style={{ minHeight: 44, justifyContent: "center" }}
    >
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
  const [leftSplitImage, setLeftSplitImage] = useState(LEFT_SPLIT_IMAGE_PRIMARY);
  const [showLaunchSplash, setShowLaunchSplash] = useState(false);
  const [launchSplashExiting, setLaunchSplashExiting] = useState(false);

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
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!standalone) return;

    setShowLaunchSplash(true);
    const beginExit = window.setTimeout(() => setLaunchSplashExiting(true), 2100);
    const finish = window.setTimeout(() => setShowLaunchSplash(false), 2800);

    return () => {
      window.clearTimeout(beginExit);
      window.clearTimeout(finish);
    };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", position: "relative", background: "var(--cream)" }} className="lg:bg-navy dark:bg-transparent">
      {showLaunchSplash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            transition: "opacity 0.7s ease, transform 0.7s ease",
            opacity: launchSplashExiting ? 0 : 1,
            transform: launchSplashExiting ? "translateY(-24px)" : "translateY(0)",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <img
            src={leftSplitImage}
            alt=""
            onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <video autoPlay muted loop playsInline poster={leftSplitImage} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}>
            <source src={LEFT_SPLIT_VIDEO_PRIMARY} type="video/mp4" />
            <source src={LEFT_SPLIT_VIDEO_FALLBACK} type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(10,22,40,0.86) 0%, rgba(10,22,40,0.68) 100%)" }} />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "0 24px",
              textAlign: "center",
            }}
          >
            <img src="/fl-logo-white.webp" alt="FLC FMS" style={{ width: 86, height: 86, objectFit: "contain" }} />
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "#fff", margin: 0, lineHeight: 1.2 }}>
              FLC FMS
            </p>
            <p style={{ color: "rgba(255,255,255,0.84)", margin: 0, fontSize: "0.84rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Preparing Sign-In
            </p>
            <div style={{ width: 140, height: 2, marginTop: 8, background: "rgba(255,255,255,0.18)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: "var(--gold)", transformOrigin: "left", animation: "splashBar 2800ms linear forwards" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-3/5"
        style={{ flex: "0 0 60%", alignItems: "center", justifyContent: "center", padding: "60px", position: "relative", overflow: "hidden" }}
      >
        {/* Background media */}
        <img
          src={leftSplitImage}
          alt=""
          aria-hidden="true"
          onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <video autoPlay muted loop playsInline poster={leftSplitImage} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}>
          <source src={LEFT_SPLIT_VIDEO_PRIMARY} type="video/mp4" />
          <source src={LEFT_SPLIT_VIDEO_FALLBACK} type="video/mp4" />
        </video>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg, rgba(6,15,30,0.84) 0%, rgba(8,20,40,0.68) 48%, rgba(17,33,59,0.6) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 14% 86%, rgba(224, 186, 112, 0.14) 0%, rgba(224, 186, 112, 0) 70%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 55% at 88% 14%, rgba(150, 174, 215, 0.2) 0%, rgba(150, 174, 215, 0) 75%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(3,8,16,0.38) 0%, rgba(3,8,16,0) 55%)" }} />

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
        </div>
      </div>

      {/* ── Form panel (full-width on mobile, fixed-width on desktop) ── */}
      <div
        style={{
          background: "var(--cream)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          // Desktop: wider auth panel; Mobile: full viewport
        }}
        className="w-full lg:w-2/5 lg:shrink-0 min-h-dvh lg:min-h-0"
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="label" style={{ margin: 0 }}>Password</label>
                </div>
                <input name="password" type="password" required className="input" placeholder="••••••••" autoComplete="current-password" />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <SubmitBtn />
                <Link
                  href="/patron/register"
                  className="btn-secondary w-full"
                  style={{ minHeight: 44, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  Create Account
                </Link>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginTop: -2 }}>
                <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: "var(--navy)", fontWeight: 600, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>
            </form>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
              <Link href="/" className="btn-secondary" style={{ fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>← Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
