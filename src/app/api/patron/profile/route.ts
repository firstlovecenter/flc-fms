import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patron = await prisma.user.findFirst({
    where: { id: session.sub, isPatron: true },
    select: { name: true, email: true, phone: true, profilePicture: true }});

  if (!patron) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(patron);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; email?: string; phone?: string; profilePicture?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { name, email, phone, profilePicture } = body;
  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name, email, and phone are required." }, { status: 400 });
  }

  // Check email uniqueness within campus
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" }, NOT: { id: session.sub } }});
  if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

  const updated = await prisma.user.update({
    where: { id: session.sub },
    data: {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || null,
      ...(profilePicture !== undefined ? { profilePicture } : {}),
    },
    select: { name: true, email: true, phone: true, profilePicture: true }});

  return NextResponse.json(updated);
}
