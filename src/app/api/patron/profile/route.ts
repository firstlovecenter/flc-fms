import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patron = await prisma.patron.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, phone: true }});

  if (!patron) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patron);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; email?: string; phone?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { name, email, phone } = body;
  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name, email, and phone are required." }, { status: 400 });
  }

  // Check email uniqueness within campus
  const existing = await prisma.patron.findFirst({
    where: { email: email.trim(), NOT: { id: session.sub } }});
  if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

  const updated = await prisma.patron.update({
    where: { id: session.sub },
    data: { name: name.trim(), email: email.trim(), phone: phone?.trim() || null },
    select: { name: true, email: true, phone: true }});

  return NextResponse.json(updated);
}
