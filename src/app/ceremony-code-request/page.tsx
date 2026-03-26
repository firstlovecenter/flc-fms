import CeremonyCodeRequestForm from "@/components/public/CeremonyCodeRequestForm";

export const metadata = {
  title: "Request a Ceremony Booking Code",
};

export default function CeremonyCodeRequestPage() {
  return (
    <div className="w-full max-w-2xl mx-auto py-10 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[var(--navy)]">
          Request a Booking Code
        </h1>
        <p className="text-[var(--slate)] max-w-md mx-auto">
          To book a wedding or naming ceremony, payment must be made first.
          Submit your details below and we&apos;ll send your unique booking code
          once payment is confirmed.
        </p>
      </div>
      <CeremonyCodeRequestForm />
    </div>
  );
}
