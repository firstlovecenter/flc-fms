"use client";

import { useEffect } from "react";

/**
 * Dialogs, sheets and menus portal to <body>, outside the page wrapper that
 * carries the theme class. While mounted, this puts the same class on <body>
 * so overlays match the page.
 */
export default function BodyScope({ className }: { className: string }) {
  useEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
  return null;
}
