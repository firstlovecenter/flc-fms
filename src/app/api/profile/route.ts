import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role === "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { name: true, email: true, phone: true, profilePicture: true, role: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; phone?: string; profilePicture?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, phone, profilePicture } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.sub },
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      ...(profilePicture !== undefined ? { profilePicture } : {}),
    },
    select: { name: true, email: true, phone: true, profilePicture: true },
  });

  // Re-issue session with updated name
  await setSession({
    sub: session.sub,
    role: session.role as Parameters<typeof setSession>[0]["role"],
    name: updated.name,
    email: updated.email,
    permissions: session.permissions as Record<string, boolean>,
    mustChangePassword: session.mustChangePassword ?? false,
  });

  return NextResponse.json(updated);
}
