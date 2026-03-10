import { NextRequest, NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/redis";
import { notifyPasswordChanged } from "@/lib/notifications/sms";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { current?: string; next?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { current, next } = body;
  if (!current || !next) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(current, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const newHash = await bcrypt.hash(next, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false }});

  // Notify user of password change
  if (user.phone) {
    await notifyPasswordChanged({ phone: user.phone, name: user.name });
  }
  await sendPasswordChangedEmail({ to: user.email, name: user.name });

  // Re-issue session without mustChangePassword flag
  await setSession({
    sub:                user.id,
    role:               user.role,
    name:               user.name,
    email:              user.email,
    permissions:        user.permissions as Record<string, boolean>,
    mustChangePassword: false});

  return NextResponse.json({ success: true });
}
