"use client";

import { useEffect } from "react";
import { isStaleBuildError, reloadForStaleBuild } from "@/lib/stale-build";

const ACTION_NOT_FOUND_HEADER = "x-nextjs-action-not-found";

function isServerActionRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  );
  return headers.has("Next-Action");
}

/**
 * Recovers clients left on an old build after a deploy by reloading the page.
 *
 * - Server Action calls whose ID no longer exists are detected from the
 *   response header, even when the calling component catches the error.
 * - Uncaught chunk-load / unknown-action errors are caught globally.
 */
export default function StaleBuildGuard() {
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function patchedFetch(input, init) {
      const response = await originalFetch.call(this, input, init);
      if (response.headers.has(ACTION_NOT_FOUND_HEADER) && isServerActionRequest(input, init)) {
        reloadForStaleBuild();
      }
      return response;
    };

    const onError = (event: ErrorEvent) => {
      if (isStaleBuildError(event.error ?? event.message)) reloadForStaleBuild();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleBuildError(event.reason)) reloadForStaleBuild();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
