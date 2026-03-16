import { NextResponse } from "next/server";
import { getBookingContent } from "@/lib/sanity/booking-content";

export async function GET() {
  const content = await getBookingContent();
  return NextResponse.json(content);
}
