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
      className="btn-primary w-full justify-center min-h-[44px]"
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
    <div className="min-h-dvh flex relative bg-[var(--cream)] dark:bg-transparent lg:bg-navy">
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
      <div className="hidden lg:flex lg:w-3/5 flex-[0_0_60%] items-center justify-center p-[60px] relative overflow-hidden">
        {/* Background media */}
        <img
          src={leftSplitImage}
          alt=""
          aria-hidden="true"
          onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <video autoPlay muted loop playsInline poster={leftSplitImage} className="absolute inset-0 w-full h-full object-cover">
          <source src={LEFT_SPLIT_VIDEO_PRIMARY} type="video/mp4" />
          <source src={LEFT_SPLIT_VIDEO_FALLBACK} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-[rgba(6,15,30,0.84)] via-[rgba(8,20,40,0.68)] to-[rgba(17,33,59,0.6)]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 14% 86%, rgba(224,186,112,0.14) 0%, transparent 70%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(75% 55% at 88% 14%, rgba(150,174,215,0.2) 0%, transparent 75%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,8,16,0.38)] via-transparent" />

        <div className="relative max-w-[440px]">
          {/* Logo mark */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-[rgba(200,163,90,0.15)] border border-[rgba(200,163,90,0.3)] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div>
              <div className="text-[1.2rem] font-bold text-white leading-none" style={{ fontFamily: "var(--font-display)" }}>
                First Love Center
              </div>
              <div className="text-[0.62rem] text-[rgba(255,255,255,0.3)] uppercase tracking-[0.07em] mt-1">
                Facility Management
              </div>
            </div>
          </div>

          <h1 className="text-[2.8rem] font-bold text-white leading-[1.15] mb-5" style={{ fontFamily: "var(--font-display)" }}>
            Welcome back<br /><em className="text-[var(--gold)] italic">to Revival Campus</em>
          </h1>
        </div>
      </div>

      {/* ── Form panel (full-width on mobile, fixed-width on desktop) ── */}
      <div className="w-full lg:w-2/5 lg:shrink-0 min-h-dvh lg:min-h-0 bg-[var(--cream)] dark:bg-[rgba(8,15,28,0.96)] flex flex-col overflow-y-auto">
        {/* Mobile-only header */}
        <div className="flex lg:hidden items-center gap-3 px-6 py-5 border-b border-[var(--border)]">
          <div className="w-9 h-9 rounded-[10px] bg-[var(--navy)] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div className="text-[1rem] font-bold text-[var(--navy)] leading-none" style={{ fontFamily: "var(--font-display)" }}>
              First Love Center
            </div>
            <div className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-[0.07em] mt-0.5">
              Facility Management
            </div>
          </div>
        </div>

        {/* Form content */}
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 text-center">
              {/* Mobile-only welcome heading */}
              <div className="lg:hidden mb-4">
                <p className="text-[1.1rem] font-semibold text-[var(--navy)] leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                  Welcome back to{" "}
                  <em className="text-[var(--gold)] italic">Revival Campus Facilities</em>
                </p>
              </div>
              <h2 className="text-[1.9rem] font-bold text-[var(--navy)] mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                Sign In
              </h2>
              <p className="text-[0.85rem] text-[var(--text-muted)]">Enter your credentials below.</p>
            </div>

            <form action={action} className="flex flex-col gap-[18px]">
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

              <div className="grid grid-cols-2 gap-3 mt-2">
                <SubmitBtn />
                <Link
                  href="/patron/register"
                  className="btn-secondary w-full inline-flex items-center justify-center min-h-[44px] no-underline"
                >
                  Create Account
                </Link>
              </div>

              <div className="flex justify-center -mt-0.5">
                <Link href="/forgot-password" className="link-gold text-[0.8rem]">
                  Forgot password?
                </Link>
              </div>
            </form>

            <div className="flex justify-center mt-2.5">
              <Link href="/" className="btn-secondary text-[0.85rem] inline-flex items-center gap-1.5">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
