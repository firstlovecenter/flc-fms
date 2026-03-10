import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { notifyPasswordChanged } from "@/lib/notifications/sms";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PATRON") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { current?: string; next?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { current, next } = body;
  if (!current || !next) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (next.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const patron = await prisma.patron.findUnique({ where: { id: session.sub } });
  if (!patron) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const valid = await bcrypt.compare(current, patron.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const hash = await bcrypt.hash(next, 12);
  await prisma.patron.update({ where: { id: session.sub }, data: { passwordHash: hash } });

  // Notify patron of password change
  if (patron.phone) {
    await notifyPasswordChanged({ phone: patron.phone, name: patron.name });
  }
  await sendPasswordChangedEmail({ to: patron.email, name: patron.name });

  return NextResponse.json({ success: true });
}
