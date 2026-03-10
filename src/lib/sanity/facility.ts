import { sanityClient, isSanityEnabled } from "./client";

export type SanityFacility = {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  capacity?: number;
  hourlyRate?: number;
};

const FACILITY_QUERY = `*[_type == "facility"] | order(name asc) {
  _id,
  name,
  description,
  capacity,
  "hourlyRate": pricePerHour,
  "imageUrl": mainImage.asset->url
}`;

export async function getSanityFacilities(): Promise<SanityFacility[]> {
  if (!isSanityEnabled() || !sanityClient) return [];
  return sanityClient.fetch<SanityFacility[]>(FACILITY_QUERY);
}
