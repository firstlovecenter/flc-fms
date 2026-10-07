"use client";

import { useEffect } from "react";
import { isStaleBuildError, reloadForStaleBuild } from "@/lib/stale-build";

// Root error boundary. Replaces Next's bare "Application error: a client-side
// exception has occurred" screen, and auto-recovers when the error comes from
// running an outdated build after a deploy.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (isStaleBuildError(error)) reloadForStaleBuild();
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: 16,
          margin: 0,
          background: "#FAF5E5",
          color: "#1f1f1f",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, marginBottom: 20, opacity: 0.75 }}>
            The app may have just been updated. Reloading usually fixes this.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#c8102e", color: "#fff", fontSize: 14 }}
            >
              Reload
            </button>
            <button
              onClick={() => reset()}
              style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ccc", background: "transparent", fontSize: 14 }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
