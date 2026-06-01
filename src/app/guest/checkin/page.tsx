import PublicShell from "@/components/public/PublicShell";
import GuestCheckInFlow from "@/components/public/GuestCheckInFlow";
import GuestPageHero from "@/components/public/GuestPageHero";

export const metadata = {
  title: "Guest Check-In — FLC FMS",
  description: "Request check-in for your booking",
};

export default function GuestCheckInPage() {
  return (
    <PublicShell layout="top" current="checkin" maxWidth="md">
      <div className="space-y-6">
        <GuestPageHero
          eyebrow="Facility Check-In"
          title="Guest Check-In"
          description="Look up your booking by phone number and request check-in. Staff will confirm your arrival."
        />
        <section className="card p-6 md:p-8">
          <GuestCheckInFlow />
        </section>
      </div>
    </PublicShell>
  );
}
