import { NextResponse } from "next/server";
import { getSanityFacilities } from "@/lib/sanity/facility";

export async function GET() {
  const facilities = await getSanityFacilities();
  return NextResponse.json({ facilities });
}
