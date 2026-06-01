import { redirect } from "next/navigation";

/** @deprecated Use /catalog/facilities/[id] */
export default function VenueRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/catalog/facilities/${params.id}`);
}
