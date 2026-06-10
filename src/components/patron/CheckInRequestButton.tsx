"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, MapPin } from "lucide-react";
import { requestCheckIn } from "@/actions/checkin.actions";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";

export default function CheckInRequestButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { getPosition } = useGeolocation();

  async function handleRequest() {
    if (!confirm("Request check-in for this booking? Staff will be notified.")) return;
    setLoading(true);

    // Try to get location for proximity verification
    const coords = await getPosition();

    const result = await requestCheckIn(
      bookingId,
      coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined
    );
    if (result && "error" in result) {
      alert(result.error);
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      onClick={handleRequest}
      disabled={loading}
      className="gap-2"
    >
      {loading ? <MapPin size={16} className="animate-pulse" /> : <LogIn size={16} />}
      {loading ? "Verifying location…" : "Request Check-In"}
    </Button>
  );
}
