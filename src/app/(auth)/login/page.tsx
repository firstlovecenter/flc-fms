"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAnyAccount } from "@/actions/auth.actions";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Home } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LEFT_SPLIT_IMAGE_PRIMARY = "/left-split-bg.jpg";
const LEFT_SPLIT_IMAGE_FALLBACK = "/fl-logo-white.webp";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full min-h-[44px]"
    >
      {pending ? "Signing in…" : <><span>Sign in</span> <ArrowRight size={15} /></>}
    </Button>
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
  const [showPassword, setShowPassword] = useState(false);

  const [state, action] = useFormState(
    async (_: unknown, fd: FormData) => loginAnyAccount(fd),
    null
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      const fallback = ("redirectTo" in state && state.redirectTo) ? state.redirectTo : "/dashboard";
      // Same-site paths only: "//host" and "/\host" are read by browsers as
      // another site, which would make this an open redirect.
      const safeFrom = from && /^\/(?![\/\\])/.test(from) ? from : null;
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
    <div className="relative flex min-h-dvh bg-background lg:p-3">
      {showLaunchSplash && (
        <div
          className={cn(
            "fixed inset-0 z-[120] flex items-center justify-center overflow-hidden pointer-events-none transition-all duration-700",
            launchSplashExiting ? "opacity-0 -translate-y-6" : "opacity-100 translate-y-0"
          )}
          aria-hidden
        >
          <img
            src={leftSplitImage}
            alt=""
            onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(28,25,23,0.86)] to-[rgba(28,25,23,0.66)]" />
          <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 text-center">
            <img src="/fl-logo-white.webp" alt="FLC FMS" className="w-[86px] h-[86px] object-contain" />
            <p className="text-2xl font-medium tracking-tight text-[#fff] m-0">FLC FMS</p>
            <p className="text-sm text-[#fff]/80 m-0">Preparing sign-in</p>
            <div className="w-[140px] h-0.5 mt-2 bg-[rgb(255_255_255/0.2)] rounded-full overflow-hidden">
              <div className="w-full h-full bg-[var(--gold)] origin-left animate-[splashBar_2800ms_linear_forwards]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Photo panel (desktop): floats on the canvas like the console sidebar ── */}
      <div className="relative hidden flex-[0_0_55%] overflow-hidden rounded-[1.75rem] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img
          src={leftSplitImage}
          alt=""
          aria-hidden="true"
          onError={() => setLeftSplitImage(LEFT_SPLIT_IMAGE_FALLBACK)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(28,25,23,0.9)] via-[rgba(28,25,23,0.45)] to-[rgba(28,25,23,0.25)]" />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--hero-from))] to-[hsl(var(--hero-to))] text-[#fff] shadow-[0_6px_16px_-6px_hsl(var(--hero-to)/0.6)]">
            <Home size={18} aria-hidden />
          </span>
          <span className="leading-none">
            <span className="block text-base font-semibold tracking-tight text-[#fff]">First Love Center</span>
            <span className="mt-1 block text-xs font-medium text-[rgb(255_255_255/0.7)]">Facility management</span>
          </span>
        </div>

        <div className="relative max-w-[460px]">
          <h1 className="text-[2.75rem] font-medium leading-[1.1] tracking-tight text-[#fff]">
            Welcome back to Revival Campus.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[rgb(255_255_255/0.78)]">
            Bookings, facilities, duty logs and finances for the campus, in one place.
          </p>
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      <div className="flex min-h-dvh w-full flex-col lg:min-h-0 lg:flex-1">
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[380px]">
            {/* Brand (phones and tablets; the photo panel carries it on desktop) */}
            <Link href="/" className="mb-10 inline-flex items-center gap-2.5 no-underline lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--hero-from))] to-[hsl(var(--hero-to))] text-[#fff] shadow-[0_6px_16px_-6px_hsl(var(--hero-to)/0.6)]">
                <Home size={18} aria-hidden />
              </span>
              <span className="leading-none">
                <span className="block text-base font-semibold tracking-tight text-[var(--navy)]">First Love Center</span>
                <span className="mt-1 block text-xs font-medium text-[var(--muted)]">Facility management</span>
              </span>
            </Link>

            <h2 className="text-[2rem] font-medium leading-tight tracking-tight text-[var(--navy)]">Sign in</h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">Staff and patrons both sign in here.</p>

            <form action={action} className="mt-8 flex flex-col gap-4">
              {state?.error && (
                <div role="alert" className="alert alert-error">{state.error as string}</div>
              )}

              <div className="form-group">
                <Label htmlFor="login-email">Email address</Label>
                <Input id="login-email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
              </div>

              <div className="form-group">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <Link href="/forgot-password" className="text-xs font-medium text-[var(--gold)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] hover:bg-muted hover:text-[var(--navy)]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <SubmitBtn />
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              New here?{" "}
              <Link href="/patron/register" className="font-medium text-[var(--gold)] hover:underline">
                Create a patron account
              </Link>
            </p>
          </div>
        </div>

        <div className="flex justify-center pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--navy)]">
            <ArrowLeft size={14} /> Back to the website
          </Link>
        </div>
      </div>
    </div>
  );
}
