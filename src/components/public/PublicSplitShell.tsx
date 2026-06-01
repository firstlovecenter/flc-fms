"use client";

import { ReactNode } from "react";
import PublicShell from "@/components/public/PublicShell";
import type { PublicNavPage } from "@/components/public/public-nav";

interface PublicSplitShellProps {
  current: PublicNavPage;
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  officePhone?: string;
  officeEmail?: string;
}

/** @deprecated Use PublicShell with layout="split" — kept for existing imports */
export default function PublicSplitShell(props: PublicSplitShellProps) {
  return <PublicShell layout="split" {...props} />;
}
