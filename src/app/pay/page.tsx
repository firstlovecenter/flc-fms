import PaymentFlow from "./PaymentFlow";

export const metadata = {
  title: "Pay — CFMS",
  description: "Complete your booking payment",
};

export default function PayPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #FAF8F3 0%, #F5F0E8 100%)",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32, marginTop: 24 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            color: "var(--navy)",
            marginBottom: 4,
          }}
        >
          Booking Payments
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          Look up and pay for your approved bookings
        </p>
      </div>
      <PaymentFlow />
    </div>
  );
}
