"use client";

export default function OfflinePage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF8F3", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <img src="/fl-logo.webp" alt="First Love Center" width={80} height={80} style={{ margin: "0 auto 24px" }} />
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>You&apos;re Offline</h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 24, padding: "10px 24px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
