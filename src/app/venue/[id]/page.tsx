import { redirect } from "next/navigation";

/** @deprecated Use /catalog/facilities/[id] */
export default async function VenueRedirectPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  redirect(`/catalog/facilities/${params.id}`);
}
