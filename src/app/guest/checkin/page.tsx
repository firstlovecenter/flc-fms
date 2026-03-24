import PublicTopNav from "@/components/public/PublicTopNav";
import GuestCheckInFlow from "@/components/public/GuestCheckInFlow";

export const metadata = {
  title: "Guest Check-In — CFMS",
  description: "Request check-in for your booking",
};

export default function GuestCheckInPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", top: -220, right: -180, width: 560, height: 560,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,163,90,0.15) 0%, rgba(200,163,90,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <PublicTopNav current="checkin" />

      <main className="max-w-5xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-6">
        <section
          className="rounded-[20px] border relative overflow-hidden bg-gradient-to-br from-[rgba(10,22,40,0.97)] to-[rgba(28,48,88,0.94)] dark:from-[rgba(15,26,43,0.65)] dark:to-[rgba(15,26,43,0.45)] dark:backdrop-blur-xl border-[rgba(200,163,90,0.34)] dark:border-[rgba(255,255,255,0.08)] shadow-xl text-white"
          style={{ padding: "26px 22px" }}
        >
          <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.65)" }}>
            Facility Check-In
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.9rem, 3vw, 2.6rem)", lineHeight: 1.1 }}>
            Guest Check-In
          </h1>
          <p style={{ color: "rgba(255,255,255,0.76)", marginTop: 6, maxWidth: 700 }}>
            Look up your booking by phone number and request check-in. Staff will confirm your arrival.
          </p>
        </section>

        <section className="card p-6 md:p-8 bg-gradient-to-b from-[#FFFFFF] to-[#FCFAF6] dark:from-[rgba(15,26,43,0.45)] dark:to-[rgba(15,26,43,0.45)]">
          <GuestCheckInFlow />
        </section>
      </main>
    </div>
  );
}
