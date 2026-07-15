import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "cfms_token";
const IMPERSONATION_COOKIE_NAME = "cfms_impersonation_token";

export interface SessionPayload {
  sub: string;        // userId or patronId
  role: Role | "PATRON";
  name: string;
  email: string;
  permissions?: Record<string, boolean>;
  mustChangePassword?: boolean;
  /** Set when a SUPER_ADMIN is impersonating this user. */
  impersonatedBy?: { id: string; name: string };
}

export async function signJWT(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET);
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await signJWT(payload);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/"});
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Save the original SUPER_ADMIN session so impersonation can be reversed. */
export async function setImpersonationBackup(payload: SessionPayload): Promise<void> {
  const token = await signJWT(payload);
  (await cookies()).set(IMPERSONATION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function getImpersonationBackup(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(IMPERSONATION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export async function clearImpersonationBackup(): Promise<void> {
  (await cookies()).delete(IMPERSONATION_COOKIE_NAME);
}
