import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { auditLog } from "@/lib/audit";

type GoogleTokenInfo = {
  aud: string;
  email: string;
  email_verified: "true" | "false";
  name?: string;
};

function isSafeRedirect(path: string | null) {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export async function POST(req: NextRequest) {
  try {
    const db = prisma as any;
    const body = await req.json();
    const credential = body?.credential as string | undefined;
    const from = body?.from as string | undefined;

    if (!credential) {
      return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google login is not configured." }, { status: 500 });
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: "no-store" }
    );

    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Invalid Google token." }, { status: 401 });
    }

    const tokenInfo = (await verifyRes.json()) as GoogleTokenInfo;
    if (tokenInfo.aud !== clientId || tokenInfo.email_verified !== "true") {
      return NextResponse.json({ error: "Google account validation failed." }, { status: 401 });
    }

    const email = tokenInfo.email?.toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Google account email is missing." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.isActive) {
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      await setSession({
        sub: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        permissions: user.permissions as Record<string, boolean>,
        mustChangePassword: user.mustChangePassword,
      });

      auditLog({ userId: user.id, action: "LOGIN_GOOGLE", entity: "User", entityId: user.id });

      const redirectTo = isSafeRedirect(from ?? null) ? from : "/dashboard";
      return NextResponse.json({ success: true, redirectTo });
    }

    let patron = await db.patron.findFirst({ where: { email } });

    if (!patron) {
      const fallbackName = tokenInfo.name?.trim() || email.split("@")[0] || "Google Patron";
      const randomPasswordHash = await bcrypt.hash(crypto.randomUUID(), 12);

      patron = await db.patron.create({
        data: {
          email,
          name: fallbackName,
          passwordHash: randomPasswordHash,
          isVerified: true,
        },
      });
    }

    await setSession({ sub: patron.id, role: "PATRON", name: patron.name, email: patron.email });
    auditLog({ userId: patron.id, action: "LOGIN_GOOGLE", entity: "Patron", entityId: patron.id });

    const redirectTo = isSafeRedirect(from ?? null) ? from : "/patron/dashboard";
    return NextResponse.json({ success: true, redirectTo });
  } catch {
    return NextResponse.json({ error: "Google login failed." }, { status: 500 });
  }
}
